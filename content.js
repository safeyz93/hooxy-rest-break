// Coffee Time — content script
// Handles: custom cursor, pulsing blur overlay, blinking tab title.

const CURSOR_URL = chrome.runtime.getURL("cursor/cursor.png");

const ROOT_ID = "__break_reminder_overlay__";
const STYLE_ID = "__break_reminder_style__";
const BLINK_TITLE = "Time to Rest";

// One full pulse cycle: clear -> blur -> black -> clear.
const PULSE_SECONDS = 9;

// The overlay is built from stacked layers, each with a FIXED blur level.
// Only their opacity is animated, which keeps the work on the GPU. Animating
// `backdrop-filter` itself would force a full-page repaint every frame.
//
// Delays ramp from the lightest layer to the heaviest, so the blur reads as
// "creeping in" rather than snapping on all at once.
const LAYERS = [
  { cls: "br-dark",  delay: 0.00 },
  { cls: "br-blur1", delay: 0.18 },
  { cls: "br-blur2", delay: 0.42 },
  { cls: "br-blur3", delay: 0.68 },
  { cls: "br-black", delay: 0.95 },
];

let breakActive = false;
let blinkTimer = null;
let originalTitle = null;
let currentLimitMs = 3 * 60 * 60 * 1000;

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

    /* ===== Pulsing blur overlay =====
       A single keyframe drives every layer, and only opacity is animated so
       the work stays on the GPU. Layers are staggered with a delay, which
       makes the blur appear to grow gradually instead of snapping on.
       The ramp is symmetric, with a short hold at the peak. */
    @keyframes br-pulse {
      0%   { opacity: 0; }
      11%  { opacity: .20; }
      22%  { opacity: .52; }
      33%  { opacity: .82; }
      44%  { opacity: 1; }
      56%  { opacity: 1; }
      67%  { opacity: .82; }
      78%  { opacity: .52; }
      89%  { opacity: .20; }
      100% { opacity: 0; }
    }

    #${ROOT_ID} {
      position: fixed !important;
      inset: -5% !important;          /* overscan so the scale shows no edge */
      z-index: 2147483647 !important;
      pointer-events: none !important;
      opacity: 0;
      transition: opacity 900ms ease-in-out;
    }
    #${ROOT_ID}.br-visible { opacity: 1 !important; }

    #${ROOT_ID} > div {
      position: absolute !important;
      inset: 0 !important;
      opacity: 0;
      will-change: opacity;
      backface-visibility: hidden;
      transform: translateZ(0);      /* promote to its own GPU layer */
    }

    /* Layer 1 — darkness + vignette */
    #${ROOT_ID} .br-dark {
      background: radial-gradient(
        ellipse at center,
        rgba(0, 0, 0, .30) 0%,
        rgba(0, 0, 0, .62) 48%,
        rgba(0, 0, 0, .88) 76%,
        rgba(0, 0, 0, .99) 100%
      ) !important;
    }

    /* Layers 2-4 — fixed blur levels, only opacity moves */
    #${ROOT_ID} .br-blur1 {
      backdrop-filter: blur(3px) saturate(.75) brightness(.90) !important;
      -webkit-backdrop-filter: blur(3px) saturate(.75) brightness(.90) !important;
    }
    #${ROOT_ID} .br-blur2 {
      backdrop-filter: blur(8px) saturate(.45) brightness(.78) !important;
      -webkit-backdrop-filter: blur(8px) saturate(.45) brightness(.78) !important;
    }
    #${ROOT_ID} .br-blur3 {
      backdrop-filter: blur(16px) saturate(.22) brightness(.62) !important;
      -webkit-backdrop-filter: blur(16px) saturate(.22) brightness(.62) !important;
    }

    /* Layer 5 — the final black veil */
    #${ROOT_ID} .br-black { background: rgba(0, 0, 0, .92) !important; }

    /* Only run the pulse while the reminder is active. */
    #${ROOT_ID}.br-visible > div {
      animation: br-pulse var(--br-dur, ${PULSE_SECONDS}s) ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      #${ROOT_ID}, #${ROOT_ID} > div {
        transition: none !important;
        animation: none !important;
      }
      /* Still darken the page — just without the pulsing. */
      #${ROOT_ID}.br-visible .br-dark,
      #${ROOT_ID}.br-visible .br-black { opacity: 1; }
      #${ROOT_ID}.br-visible .br-blur1 { opacity: .6; }
      #${ROOT_ID}.br-visible .br-blur2 { opacity: .4; }
      #${ROOT_ID}.br-visible .br-blur3 { opacity: .6; }
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

// ---------- overlay ----------

function ensureOverlay() {
  let el = document.getElementById(ROOT_ID);
  if (el) return el;

  el = document.createElement("div");
  el.id = ROOT_ID;
  el.setAttribute("aria-hidden", "true");

  for (const cfg of LAYERS) {
    const layer = document.createElement("div");
    layer.className = cfg.cls;
    // staggers the layers so the blur ramps in rather than snapping on
    layer.style.setProperty("--br-delay", `${cfg.delay}s`);
    layer.style.animationDelay = `${cfg.delay}s`;
    el.appendChild(layer);
  }

  el.style.setProperty("--br-dur", `${PULSE_SECONDS}s`);

  // At document_start, <body> may not exist yet — fall back to <html>.
  const host = document.body || document.documentElement;
  if (host) host.appendChild(el);
  return el;
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
  // original node can be detached.
  let el = ensureOverlay();
  if (el && !el.isConnected) {
    const host = document.body || document.documentElement;
    if (host) {
      host.appendChild(el);
      el = document.getElementById(ROOT_ID) || el;
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
  const el = document.getElementById(ROOT_ID);
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
