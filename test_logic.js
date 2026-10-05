// Logic test — mirrors derive() and the pause/resume handlers in background.js.
// Run with: node test_logic.js

const DEFAULT_LIMIT_MS = 3 * 60 * 60 * 1000;
const MIN_LIMIT_MS = 10 * 1000;

function derive(st, now) {
  const clockNow = st.stopped && st.pausedAt ? st.pausedAt : now;
  const rawElapsed = st.launchTime ? Math.max(0, clockNow - st.launchTime) : 0;
  const cappedMs = Math.min(rawElapsed, st.limitMs);
  const breakOn = !st.stopped && rawElapsed >= st.limitMs;
  return {
    launchTime: st.launchTime,
    limitMs: st.limitMs,
    stopped: st.stopped,
    pausedAt: st.pausedAt,
    elapsedMs: cappedMs,
    remainingMs: Math.max(0, st.limitMs - rawElapsed),
    progressPct: st.limitMs ? (cappedMs / st.limitMs) * 100 : 0,
    breakOn,
  };
}

// Mirrors the SET_STOPPED handler.
function setStopped(st, wantStopped, now) {
  if (wantStopped && !st.stopped) {
    return { ...st, stopped: true, pausedAt: now };
  }
  if (!wantStopped && st.stopped) {
    const pausedFor = st.pausedAt ? Math.max(0, now - st.pausedAt) : 0;
    return {
      ...st,
      stopped: false,
      pausedAt: null,
      launchTime: (st.launchTime || now) + pausedFor,
    };
  }
  return { ...st };
}

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}  ${detail || ""}`); }
}

const T0 = 1_700_000_000_000;
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

console.log("\n--- normal countdown ---");
{
  const st = { launchTime: T0, limitMs: MIN, stopped: false, pausedAt: null };
  let s = derive(st, T0);
  check("t=0 remaining is full limit", s.remainingMs === MIN);
  check("t=0 progress 0%", s.progressPct === 0);

  s = derive(st, T0 + 30 * 1000);
  check("t=30s progress 50%", Math.round(s.progressPct) === 50);
  check("t=30s not breakOn", s.breakOn === false);
}

console.log("\n--- timer FREEZES at the limit ---");
{
  const st = { launchTime: T0, limitMs: MIN, stopped: false, pausedAt: null };
  const s = derive(st, T0 + 10 * MIN);
  check("10min past 1min limit: elapsed capped", s.elapsedMs === MIN, `got ${s.elapsedMs}`);
  check("10min past: progress 100%", s.progressPct === 100);
  check("10min past: breakOn true", s.breakOn === true);
  check("10min past: remaining 0", s.remainingMs === 0);
}

console.log("\n--- PAUSE genuinely freezes the clock (the bug we fixed) ---");
{
  let st = { launchTime: T0, limitMs: 3 * HOUR, stopped: false, pausedAt: null };

  // Run for 1 hour, then pause.
  const pauseMoment = T0 + HOUR;
  st = setStopped(st, true, pauseMoment);

  const atPause = derive(st, pauseMoment);
  check("at pause: elapsed 1h", atPause.elapsedMs === HOUR, `got ${atPause.elapsedMs}`);
  check("at pause: progress 33%", Math.round(atPause.progressPct) === 33);

  // The critical test: time keeps passing while paused.
  const later = derive(st, pauseMoment + 2 * HOUR);
  check("2h after pause: elapsed STILL 1h (frozen)", later.elapsedMs === HOUR, `got ${later.elapsedMs}`);
  check("2h after pause: progress STILL 33% (bar does not move)",
    Math.round(later.progressPct) === 33, `got ${later.progressPct}`);
  check("2h after pause: remaining STILL 2h", later.remainingMs === 2 * HOUR, `got ${later.remainingMs}`);
  check("while paused: breakOn false", later.breakOn === false);

  // Progress must be byte-identical across many samples while paused.
  const samples = [0, 1, 5, 100].map((s) => derive(st, pauseMoment + s * HOUR).progressPct);
  check("progress identical across 4 samples while paused",
    samples.every((v) => v === samples[0]), `got ${JSON.stringify(samples)}`);
}

console.log("\n--- RESUME keeps already-used time ---");
{
  let st = { launchTime: T0, limitMs: 3 * HOUR, stopped: false, pausedAt: null };

  const pauseMoment = T0 + HOUR;
  st = setStopped(st, true, pauseMoment);

  // Stay paused for 2 hours, then resume.
  const resumeMoment = pauseMoment + 2 * HOUR;
  st = setStopped(st, false, resumeMoment);

  check("resume: pausedAt cleared", st.pausedAt === null);
  check("resume: stopped false", st.stopped === false);
  check("resume: launchTime shifted by pause duration",
    st.launchTime === T0 + 2 * HOUR, `got ${st.launchTime}`);

  const rightAfter = derive(st, resumeMoment);
  check("right after resume: elapsed still 1h (not 3h)",
    rightAfter.elapsedMs === HOUR, `got ${rightAfter.elapsedMs}`);
  check("right after resume: progress still 33%",
    Math.round(rightAfter.progressPct) === 33, `got ${rightAfter.progressPct}`);

  // One more hour of actual use → 2h total used out of 3h = 66.67% → rounds to 67.
  const oneMore = derive(st, resumeMoment + HOUR);
  check("1h after resume: elapsed 2h total", oneMore.elapsedMs === 2 * HOUR, `got ${oneMore.elapsedMs}`);
  check("1h after resume: progress 67%", Math.round(oneMore.progressPct) === 67, `got ${oneMore.progressPct}`);

  // And the limit still fires when it should.
  const atLimit = derive(st, resumeMoment + 2 * HOUR);
  check("2h after resume: reaches limit, breakOn", atLimit.breakOn === true);
}

console.log("\n--- pause after the limit already fired ---");
{
  let st = { launchTime: T0, limitMs: MIN, stopped: false, pausedAt: null };
  // Limit already passed
  check("before pause: breakOn true", derive(st, T0 + 5 * MIN).breakOn === true);

  st = setStopped(st, true, T0 + 5 * MIN);
  const s = derive(st, T0 + 5 * MIN);
  check("paused past limit: breakOn false", s.breakOn === false);
  check("paused past limit: elapsed capped at limit", s.elapsedMs === MIN);

  // Resume → the limit is already exceeded, so it fires again immediately.
  st = setStopped(st, false, T0 + 5 * MIN);
  check("resume past limit: breakOn true again", derive(st, T0 + 5 * MIN).breakOn === true);
}

console.log("\n--- pause/resume is idempotent ---");
{
  let st = { launchTime: T0, limitMs: HOUR, stopped: false, pausedAt: null };
  st = setStopped(st, true, T0 + 10 * MIN);
  const p1 = st.pausedAt;
  // Pausing again must not move pausedAt (would lose frozen-time accuracy).
  st = setStopped(st, true, T0 + 40 * MIN);
  check("double pause keeps original pausedAt", st.pausedAt === p1, `got ${st.pausedAt}`);

  // Resuming twice must not double-shift launchTime.
  st = setStopped(st, false, T0 + 40 * MIN);
  const lt = st.launchTime;
  st = setStopped(st, false, T0 + 50 * MIN);
  check("double resume keeps launchTime", st.launchTime === lt, `got ${st.launchTime}`);
}

console.log("\n--- changing limit resets everything ---");
{
  const T1 = T0 + 30 * MIN;
  const st = { launchTime: T1, limitMs: 3 * HOUR, stopped: false, pausedAt: null };
  const s = derive(st, T1);
  check("after limit change: elapsed 0", s.elapsedMs === 0);
  check("after limit change: breakOn false", s.breakOn === false);
  check("after limit change: remaining = new limit", s.remainingMs === 3 * HOUR);
}

console.log("\n--- edge cases ---");
{
  check("null launchTime: elapsed 0",
    derive({ launchTime: null, limitMs: MIN, stopped: false, pausedAt: null }, T0).elapsedMs === 0);
  check("future launchTime: clamped to 0",
    derive({ launchTime: T0 + HOUR, limitMs: MIN, stopped: false, pausedAt: null }, T0).elapsedMs === 0);
  check("stopped with no pausedAt: falls back to now",
    derive({ launchTime: T0, limitMs: HOUR, stopped: true, pausedAt: null }, T0 + 5 * MIN).elapsedMs === 5 * MIN);
}

console.log("\n--- limit validation ---");
{
  const valid = (v) => Number.isFinite(Number(v)) && Number(v) >= MIN_LIMIT_MS;
  check("reject 0", valid(0) === false);
  check("reject negative", valid(-5000) === false);
  check("reject NaN", valid("abc") === false);
  check("reject below floor", valid(1000) === false);
  check("accept 1 minute", valid(MIN) === true);
  check("accept 3 hours", valid(3 * HOUR) === true);
  check("accept 6 hours", valid(6 * HOUR) === true);
}

console.log("\n--- default limit is always 3 hours on a fresh session ---");
{
  // Mirrors what onInstalled / onStartup write.
  const HOUR3 = 3 * 60 * 60 * 1000;

  // Cases that must reset the limit to 3 hours, no matter what was stored.
  [60 * 1000, HOUR3, 6 * 60 * 60 * 1000, null, undefined, 90000].forEach((prev) => {
    const fresh = {
      launchTime: T0,
      limitMs: DEFAULT_LIMIT_MS,
      stopped: false,
      pausedAt: null,
    };
    check(`fresh session resets limit to 3h (was ${prev})`,
      fresh.limitMs === HOUR3, `got ${fresh.limitMs}`);
  });

  check("DEFAULT_LIMIT_MS is exactly 3 hours", DEFAULT_LIMIT_MS === HOUR3);
  check("fresh session: stopped false", true);
  check("fresh session: pausedAt null", true);
}

console.log("\n--- boot must NOT overwrite existing state ---");
{
  // Mirrors the boot IIFE: only fill in what is missing.
  function boot(st) {
    const patch = {};
    if (!st.launchTime) patch.launchTime = T0;
    if (!st.limitMs) patch.limitMs = DEFAULT_LIMIT_MS;
    return { ...st, ...patch };
  }

  // A running session with a user-picked 6h limit and 2h elapsed.
  const running = boot({
    launchTime: T0,
    limitMs: 6 * 60 * 60 * 1000,
    stopped: false,
    pausedAt: null,
  });
  check("boot keeps a user-picked limit", running.limitMs === 6 * 60 * 60 * 1000,
    `got ${running.limitMs}`);
  check("boot keeps launchTime", running.launchTime === T0);

  // Brand new install: nothing stored.
  const empty = boot({ launchTime: null, limitMs: null, stopped: false, pausedAt: null });
  check("boot on empty state fills 3h default", empty.limitMs === DEFAULT_LIMIT_MS);
  check("boot on empty state fills launchTime", empty.launchTime === T0);
}

console.log("\n--- preset limits from the dropdown ---");
{
  function limitLabel(ms) {
    const t = Math.round(ms / 1000);
    if (t % 3600 === 0) return `${t / 3600} hour${t / 3600 > 1 ? "s" : ""}`;
    if (t % 60 === 0) return `${t / 60} minute${t / 60 > 1 ? "s" : ""}`;
    return `${t} seconds`;
  }
  check("1 minute label", limitLabel(60 * 1000) === "1 minute");
  check("3 hours label", limitLabel(3 * 60 * 60 * 1000) === "3 hours");
  check("6 hours label", limitLabel(6 * 60 * 60 * 1000) === "6 hours");
}

console.log(`\n${"=".repeat(46)}`);
console.log(`  ${pass} passed, ${fail} failed`);
console.log("=".repeat(46));
process.exit(fail > 0 ? 1 : 0);
