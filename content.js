// Coffee Time — content script
// Handles: custom cursor, dark overlay, blinking tab title.

const CURSOR_URL = chrome.runtime.getURL("cursor/cursor.png");

const OVERLAY_ID = "__break_reminder_overlay__";
const STYLE_ID = "__break_reminder_style__";
const BLINK_TITLE = "Time to Rest";

let breakActive = false;
let blinkTimer = null;
let originalTitle = null;
let currentLimitMs = 1 * 60 * 1000;

// ---------- CSS ----------

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    /* ===== Custom cursor ===== */
    html.__break_reminder_active,
    html.__break_reminder_active * {
      cursor: url("${CURSOR_URL}") 6 6, auto !important;
    }
    html.__break_reminder_active a,
    html.__break_reminder_active button,
    html.__break_reminder_active input,
    html.__break_reminder_active select,
    html.__break_reminder_active textarea,
    html.__break_reminder_active [role="button"],
    html.__break_reminder_active [onclick] {
      cursor: url("${CURSOR_URL}") 6 6, pointer !important;
    }

    /* ===== Dark overlay + blur (no text) ===== */
    #${OVERLAY_ID} {
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
      background: radial-gradient(
        ellipse at center,
        rgba(8, 8, 8, 0.55) 0%,
        rgba(4, 4, 4, 0.82) 70%,
        rgba(0, 0, 0, 0.92) 100%
      ) !important;
      backdrop-filter: blur(3px) saturate(0.75) !important;
      -webkit-backdrop-filter: blur(3px) saturate(0.75) !important;
      opacity: 0;
      transition: opacity 900ms ease-in-out;
    }

    #${OVERLAY_ID}.br-visible { opacity: 1 !important; }

    @media (prefers-reduced-motion: reduce) {
      #${OVERLAY_ID} { transition: none !important; }
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

// ---------- overlay ----------

function ensureOverlay() {
  let el = document.getElementById(OVERLAY_ID);
  if (el) return el;
  el = document.createElement("div");
  el.id = OVERLAY_ID;
  el.setAttribute("aria-hidden", "true");
  // No text, no card — just a dark layer.
  // At document_start, <body> may not exist yet — fall back to <html>.
  const host = document.body || document.documentElement;
  if (host) host.appendChild(el);
  return el;
}

function removeOverlay() {
  const el = document.getElementById(OVERLAY_ID);
  if (el) el.remove();
}

// ---------- blinking tab title ----------

function startTitleBlink() {
  if (blinkTimer) return;
  if (originalTitle === null) originalTitle = document.title || "";

  let flip = false;
  const paint = () => {
    try {
      document.title = flip ? BLINK_TITLE : originalTitle || BLINK_TITLE;
      flip = !flip;
    } catch (e) {}
  };

  paint();
  blinkTimer = setInterval(paint, 1200);
}

function stopTitleBlink() {
  if (blinkTimer) {
    clearInterval(blinkTimer);
    blinkTimer = null;
  }
  if (originalTitle !== null) {
    try { document.title = originalTitle; } catch (e) {}
  }
}

// ---------- activate / deactivate ----------

function activate(limitMs) {
  breakActive = true;
  if (limitMs) currentLimitMs = limitMs;

  try {
    injectStyle();
  } catch (e) {
    console.warn("[Coffee Time] style inject failed:", e);
  }

  document.documentElement.classList.add("__break_reminder_active");

  // Always make sure a connected overlay exists: on an SPA navigation the
  // original node can be detached, and we were leaving it detached before.
  let el = ensureOverlay();
  if (el && !el.isConnected) {
    const host = document.body || document.documentElement;
    if (host) {
      host.appendChild(el);
      el = document.getElementById(OVERLAY_ID) || el;
    }
  }

  if (el && el.isConnected) {
    // Force a reflow so the fade transition replays even if the class was
    // already present (e.g. re-activating after an SPA route change).
    void el.offsetWidth;
    el.classList.add("br-visible");
  }

  startTitleBlink();
}

function deactivate() {
  breakActive = false;
  document.documentElement.classList.remove("__break_reminder_active");
  stopTitleBlink();
  const el = document.getElementById(OVERLAY_ID);
  if (el) el.classList.remove("br-visible");
}

// ---------- messages from background ----------

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "BREAK_ON") {
    activate(msg.limitMs);
  } else if (msg?.type === "BREAK_OFF") {
    deactivate();
  }
});

// ---------- on page load ----------
// The content script runs at document_start, so <body> may not exist yet.

function boot() {
  (async () => {
    try {
      const st = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
      if (st?.ok && st.limitMs) currentLimitMs = st.limitMs;
      if (st?.breakOn) activate(currentLimitMs);
    } catch (e) {
      // service worker not ready yet
    }
  })();
}

boot();

window.addEventListener("pageshow", () => {
  if (breakActive) {
    document.documentElement.classList.add("__break_reminder_active");
    const el = ensureOverlay();
    if (el && el.isConnected) el.classList.add("br-visible");
  }
});
