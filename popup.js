// Coffee Time — popup UI
//
// The popup is a pure view of the background's state. It never mutates
// state locally — every change goes through a message and then re-renders
// from the authoritative snapshot that comes back.

const $ = (id) => document.getElementById(id);

const POLL_MS = 500;

let pollTimer = null;
let inFlight = false;

// ---------- formatting ----------

const pad = (n) => String(n).padStart(2, "0");

/** "3:05:00" / "2:45" — used for the big timer. */
function fmtClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "1h 14m" / "3m 12s" / "45s" — used for the secondary line. */
function fmtLong(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Human label for a limit value, used in the dropdown. */
function limitLabel(ms) {
  const t = Math.round(ms / 1000);
  if (t % 3600 === 0) return `${t / 3600} hour${t / 3600 > 1 ? "s" : ""}`;
  if (t % 60 === 0) return `${t / 60} minute${t / 60 > 1 ? "s" : ""}`;
  return `${t} seconds`;
}

// ---------- dropdown ----------

/**
 * Reflect the stored limit in the <select> without dispatching a change.
 * If the stored limit is not one of the presets, inject it as an option so
 * the select never silently misrepresents the real value.
 */
function syncLimitSelect(limitMs) {
  const sel = $("limitSelect");
  const value = String(limitMs);

  const known = Array.from(sel.options).some((o) => o.value === value);
  if (!known) {
    // Drop previously-injected non-preset options so the list doesn't grow.
    Array.from(sel.querySelectorAll("option[data-injected]")).forEach((o) => o.remove());
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = limitLabel(limitMs);
    opt.dataset.injected = "1";
    sel.appendChild(opt);
  }

  if (sel.value !== value) sel.value = value;
}

// ---------- render ----------

/**
 * Render one frame from a snapshot. Pure function of state → DOM.
 * Visual meaning:
 *   switch ON  + red pulse  → limit reached, time to rest
 *   switch ON  + green      → running normally, counting down
 *   switch OFF + amber      → user paused the reminder
 */
function render(snapshot) {
  const statusText = $("statusText");
  const remaining = $("remaining");
  const remainingUnit = $("remainingUnit");
  const bigWrap = $("bigWrap");
  const bar = $("bar");
  const elapsedText = $("elapsedText");
  const pctText = $("pctText");
  const hint = $("hint");
  const row = $("switchRow");
  const sw = $("reminderSwitch");
  const swSub = $("switchSub");

  const { limitMs, elapsedMs, remainingMs, progressPct, stopped, breakOn } = snapshot;

  syncLimitSelect(limitMs);

  // Progress bar — one computation, one source of truth.
  const pct = Math.max(0, Math.min(100, progressPct || 0));
  bar.style.width = `${pct.toFixed(1)}%`;
  pctText.textContent = `${pct.toFixed(0)}%`;

  // The switch is ON unless the user explicitly paused it.
  sw.setAttribute("aria-checked", stopped ? "false" : "true");

  if (stopped) {
    // ---------- paused ----------
    statusText.textContent = "Reminder is off";
    statusText.dataset.state = "off";
    bigWrap.dataset.state = "off";
    row.dataset.state = "off";

    remaining.textContent = "OFF";
    remainingUnit.textContent = "";
    elapsedText.textContent = `Ran ${fmtLong(elapsedMs)}`;

    sw.className = "switch pulsing amber";
    swSub.textContent = "Off";

    hint.textContent =
      "The reminder stays off until you turn it back on or restart Chrome.";
    return;
  }

  if (breakOn) {
    // ---------- limit reached ----------
    statusText.textContent = "Time to rest!";
    statusText.dataset.state = "alert";
    bigWrap.dataset.state = "alert";
    row.dataset.state = "alert";

    // Frozen at the limit — never climbs past it.
    remaining.textContent = fmtClock(limitMs);
    remainingUnit.textContent = "limit reached";
    elapsedText.textContent = `Elapsed ${fmtLong(limitMs)}`;

    sw.className = "switch pulsing";
    swSub.textContent = "On — time to rest";

    hint.textContent = "I will warn you if you are naughty";
    return;
  }

  // ---------- running normally ----------
  statusText.textContent = "Running normally";
  statusText.dataset.state = "on";
  bigWrap.dataset.state = "on";
  row.dataset.state = "on";

  remaining.textContent = fmtClock(remainingMs);
  remainingUnit.textContent = "remaining";
  elapsedText.textContent = `Elapsed ${fmtLong(elapsedMs)}`;

  sw.className = "switch";
  swSub.textContent = "On";

  hint.textContent = "Cursor and dark overlay turn on after the limit is reached.";
}

// ---------- data flow ----------

/** Fetch a fresh snapshot and render it. Never overlaps itself. */
async function tick() {
  if (inFlight) return;
  inFlight = true;
  try {
    const st = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
    if (st && st.ok) {
      render(st);
    } else {
      const s = $("statusText");
      s.textContent = "Can't read status";
      s.dataset.state = "on";
    }
  } catch (e) {
    const s = $("statusText");
    s.textContent = "Can't read status";
    s.dataset.state = "on";
  } finally {
    inFlight = false;
  }
}

/** Send a command, then re-render from the returned authoritative state. */
async function command(message) {
  try {
    const st = await chrome.runtime.sendMessage(message);
    if (st && st.ok && st.limitMs !== undefined) render(st);
  } catch (e) {
    /* ignore — the poll below will correct the UI */
  }
  tick();
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(tick, POLL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ---------- events ----------

// Toggling the switch pauses or resumes the reminder.
$("reminderSwitch").addEventListener("click", () => {
  const isOn = $("reminderSwitch").getAttribute("aria-checked") === "true";
  command({ type: "SET_STOPPED", stopped: isOn });
});

$("resetBtn").addEventListener("click", () => {
  command({ type: "RESET_TIMER" });
});

$("limitSelect").addEventListener("change", (e) => {
  const limitMs = Number(e.target.value);
  if (!Number.isFinite(limitMs) || limitMs <= 0) return;
  command({ type: "SET_LIMIT", limitMs });
});

// Pause polling while the popup is hidden; resume on reopen so the first
// frame is always fresh.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopPolling();
  } else {
    tick();
    startPolling();
  }
});

// ---------- boot ----------

tick();
startPolling();
