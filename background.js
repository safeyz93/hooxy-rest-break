// Coffee Time — background service worker (MV3)
//
// State model (all persisted in chrome.storage.local):
//   launchTime : epoch ms when the current session's clock started
//   limitMs    : user-selected time limit
//   stopped    : true when the user paused the reminder from the popup
//   pausedAt   : epoch ms when the user paused (only meaningful while stopped)
//
// Derived at read time — never stored — so there is a single source of truth:
//   elapsed = stopped ? (pausedAt - launchTime) : (now - launchTime)
//   breakOn = !stopped && elapsed >= limitMs
//
// While paused the clock is genuinely frozen: elapsed stops advancing, so the
// progress bar stops moving too. Resuming shifts launchTime forward by the
// paused duration, so no already-used time is lost.

const DEFAULT_LIMIT_MS = 3 * 60 * 60 * 1000; // 3 hours
const MIN_LIMIT_MS = 10 * 1000;              // sanity floor
const ALARM_NAME = "break-check";
const TICK_MINUTES = 0.5;                    // 30s — the MV3 minimum

// ---------- storage helpers ----------

async function readState() {
  const s = await chrome.storage.local.get([
    "launchTime",
    "limitMs",
    "stopped",
    "pausedAt",
  ]);
  return {
    launchTime: s.launchTime || null,
    limitMs: s.limitMs || DEFAULT_LIMIT_MS,
    stopped: !!s.stopped,
    pausedAt: s.pausedAt || null,
  };
}

/**
 * The single source of truth. Everything else derives from this.
 *
 * `elapsedMs` is capped at the limit so the display visibly stops, and is
 * frozen entirely while the reminder is paused.
 */
function derive(st, now = Date.now()) {
  // While paused, the clock reads as of the moment it was paused.
  const clockNow = st.stopped && st.pausedAt ? st.pausedAt : now;

  const rawElapsed = st.launchTime ? Math.max(0, clockNow - st.launchTime) : 0;
  const cappedMs = Math.min(rawElapsed, st.limitMs);
  const breakOn = !st.stopped && rawElapsed >= st.limitMs;

  return {
    launchTime: st.launchTime,
    limitMs: st.limitMs,
    stopped: st.stopped,
    pausedAt: st.pausedAt,
    elapsedMs: cappedMs,                                  // for display
    remainingMs: Math.max(0, st.limitMs - rawElapsed),
    progressPct: st.limitMs ? (cappedMs / st.limitMs) * 100 : 0,
    breakOn,
  };
}

/** Push the current visuals to every web tab. */
async function applyVisuals() {
  const snapshot = derive(await readState());
  const msg = snapshot.breakOn
    ? { type: "BREAK_ON", limitMs: snapshot.limitMs }
    : { type: "BREAK_OFF" };

  let tabs = [];
  try { tabs = await chrome.tabs.query({}); } catch (e) { return snapshot; }
  for (const t of tabs) {
    if (!t || !t.id || !t.url) continue;
    if (!/^https?:|^file:|^ftp:/.test(t.url)) continue;
    try { await chrome.tabs.sendMessage(t.id, msg); } catch (e) { /* no receiver */ }
  }

  try { await chrome.action.setBadgeText({ text: snapshot.breakOn ? "!" : "" }); } catch (e) {}
  return snapshot;
}

async function ensureAlarm() {
  try {
    await chrome.alarms.clear(ALARM_NAME);
    await chrome.alarms.create(ALARM_NAME, { periodInMinutes: TICK_MINUTES });
  } catch (e) {
    console.error("[Break] failed to create alarm:", e);
  }
}

/** Reset the clock to zero, keeping the current limit. */
async function resetClock({ alsoResume = false } = {}) {
  const s = await chrome.storage.local.get(["limitMs"]);
  const patch = { launchTime: Date.now(), pausedAt: null };
  if (alsoResume) patch.stopped = false;
  if (!s.limitMs) patch.limitMs = DEFAULT_LIMIT_MS;
  await chrome.storage.local.set(patch);
  return applyVisuals();
}

// ---------- lifecycle ----------
// The limit always returns to the 3-hour default: on install, on extension
// reload, and every time Chrome is launched from a closed state.

// Fresh install / extension reload → start clean from zero at 3 hours.
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    launchTime: Date.now(),
    limitMs: DEFAULT_LIMIT_MS,
    stopped: false,
    pausedAt: null,
  });
  await ensureAlarm();
  await applyVisuals();
});

// A browser launch → the clock restarts and the limit resets to 3 hours.
// (onStartup also fires on browser updates, which is fine: a restart means
// a fresh session.)
chrome.runtime.onStartup.addListener(async () => {
  await chrome.storage.local.set({
    launchTime: Date.now(),
    limitMs: DEFAULT_LIMIT_MS,
    stopped: false,
    pausedAt: null,
  });
  await ensureAlarm();
  await applyVisuals();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm && alarm.name === ALARM_NAME) await applyVisuals();
});

// A tab that finishes loading after the limit has passed gets the visuals
// immediately, without waiting for the next alarm tick.
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!info || info.status !== "complete") return;
  if (!tab || !tab.url || !/^https?:|^file:|^ftp:/.test(tab.url)) return;

  const snapshot = derive(await readState());
  if (!snapshot.breakOn) return;

  try {
    await chrome.tabs.sendMessage(tabId, { type: "BREAK_ON", limitMs: snapshot.limitMs });
  } catch (e) {}
});

// ---------- message API ----------
// This listener must NOT be async, and must return true so the response
// channel stays open until the promise resolves.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg.type !== "string") return;

  handleMessage(msg)
    .then((res) => { try { sendResponse(res); } catch (e) {} })
    .catch((e) => { try { sendResponse({ ok: false, error: String(e) }); } catch (_) {} });

  return true;
});

async function handleMessage(msg) {
  switch (msg.type) {
    case "GET_STATUS":
      return { ok: true, ...derive(await readState()) };

    // The user picked a different limit → restart the clock from zero.
    case "SET_LIMIT": {
      const limitMs = Number(msg.limitMs);
      if (!Number.isFinite(limitMs) || limitMs < MIN_LIMIT_MS) {
        return { ok: false, error: "invalid limit" };
      }
      await chrome.storage.local.set({
        limitMs,
        launchTime: Date.now(),
        stopped: false,
        pausedAt: null,
      });
      const snapshot = await applyVisuals();
      return { ok: true, ...snapshot };
    }

    // Pause / resume the reminder.
    // Pausing freezes the clock. Resuming shifts launchTime forward by the
    // paused duration so no already-used time is lost.
    case "SET_STOPPED": {
      const wantStopped = !!msg.stopped;
      const st = await readState();

      if (wantStopped && !st.stopped) {
        // Pausing: freeze right now.
        await chrome.storage.local.set({ stopped: true, pausedAt: Date.now() });
      } else if (!wantStopped && st.stopped) {
        // Resuming: push launchTime forward by however long we were paused.
        const pausedFor = st.pausedAt ? Math.max(0, Date.now() - st.pausedAt) : 0;
        const newLaunch = (st.launchTime || Date.now()) + pausedFor;
        await chrome.storage.local.set({
          stopped: false,
          pausedAt: null,
          launchTime: newLaunch,
        });
      }

      return { ok: true, ...(await applyVisuals()) };
    }

    case "STOP_REQUEST": {
      await chrome.storage.local.set({ stopped: true });
      return { ok: true, ...(await applyVisuals()) };
    }

    case "RESUME_REQUEST": {
      await chrome.storage.local.set({ stopped: false });
      return { ok: true, ...(await applyVisuals()) };
    }

    // Reset the clock to zero (reminder stays in whatever on/off state it was).
    case "RESET_TIMER": {
      const snapshot = await resetClock();
      return { ok: true, ...snapshot };
    }

    default:
      return { ok: false, error: "unknown type: " + msg.type };
  }
}

// ---------- boot ----------
// The MV3 worker can be killed and revived at any moment. Never cache state
// in module-level variables — always read it back from storage.

(async () => {
  const s = await chrome.storage.local.get(["launchTime", "limitMs"]);
  const patch = {};
  if (!s.launchTime) patch.launchTime = Date.now();
  if (!s.limitMs) patch.limitMs = DEFAULT_LIMIT_MS;
  if (Object.keys(patch).length) await chrome.storage.local.set(patch);
  await ensureAlarm();
})();
