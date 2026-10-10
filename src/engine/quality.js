// Graphics tiers.
//   full - desktop: physically based materials, soft shadows, antialiasing
//   lite - phones and weak GPUs: Lambert materials, no MSAA, small shadows, fewer lights
//   text - no WebGL at all: the story is told without the diorama
// The tier is chosen once at startup, before any materials exist. If the GPU
// gives up mid-game we step down in place (shadows off, then text) and
// remember the step for the next visit.
//
// Shadows are a separate switch. Real-time shadow maps make PowerVR D-Series
// GPUs (Pixel 10) reset the WebGL context within seconds, whatever the map
// size or filter, so those GPUs start without them; any device that loses
// its context also turns them off. Objects then get soft contact shadows.

const KEY = 'soft-takeoff-quality';
const RESUME_KEY = 'soft-takeoff-resume';
const LOSS_KEY = 'soft-takeoff-losses';
const SHADOW_KEY = 'soft-takeoff-shadows';
const LOG_KEY = 'soft-takeoff-loss-log';
const TIERS = ['full', 'lite', 'text'];
const SHADOW_BUG_GPU = /PowerVR|Imagination|img-tec/i;

function store(kind) {
  try {
    const s = kind === 'session' ? window.sessionStorage : window.localStorage;
    s.getItem('x');
    return s;
  } catch (e) {
    return null;
  }
}
const local = store('local');
const session = store('session');

function read(s, k) {
  try { return s ? s.getItem(k) : null; } catch (e) { return null; }
}
function write(s, k, v) {
  try { if (s) v == null ? s.removeItem(k) : s.setItem(k, v); } catch (e) { /* storage blocked */ }
}

function probeWebGL2() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return { ok: false };
    let gpu = '';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) gpu = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '';
    const info = {
      ok: true,
      gpu,
      maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      fragUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    };
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return info;
  } catch (e) {
    return { ok: false };
  }
}

function looksMobile() {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const ua = navigator.userAgent || '';
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(ua);
  // iPads report a desktop UA but have touch and no hover.
  const tablet = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const lowMem = navigator.deviceMemory != null && navigator.deviceMemory <= 2;
  const fewCores = navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 2;
  return coarse || mobileUA || tablet || lowMem || fewCores;
}

// window.name survives a reload of this frame even when Web Storage is blocked
// (sandboxed viewers), so tier switches and notes ride along in it too.
const NAME_PREFIX = 'soft-takeoff:';
function readWindowName() {
  try {
    if (typeof window.name === 'string' && window.name.startsWith(NAME_PREFIX)) {
      const v = JSON.parse(window.name.slice(NAME_PREFIX.length));
      window.name = '';
      return v || {};
    }
  } catch (e) { /* ignore */ }
  return {};
}
const carried = readWindowName();
// Everything we want carried over the next reload, merged.
const carryOut = {};
function writeWindowName(v) {
  Object.assign(carryOut, v);
  try { window.name = NAME_PREFIX + JSON.stringify(carryOut); } catch (e) { /* ignore */ }
}
// Keep the shadow setting riding along even when nothing else changes.
if (carried.shadows) writeWindowName({ shadows: carried.shadows });

// Automatic step-downs saved before this version came from the shadow-map
// fault (now avoided), so they are forgotten; explicit choices are kept.
const POLICY = 2;
const stale = (why, v) => why !== 'chosen' && !(Number(v) >= POLICY);

function decide() {
  const params = new URLSearchParams(location.search);
  const forced = params.get('quality');
  let stored = read(local, KEY);
  if (stored && stale(read(local, KEY + '-why') || 'chosen', read(local, KEY + '-v'))) stored = null;
  if (carried.tier && stale(carried.why || 'after-loss', carried.v)) delete carried.tier;
  const probe = probeWebGL2();
  let tier;
  let reason;
  if (carried.tier && carried.why === 'chosen' && TIERS.includes(carried.tier)) {
    // A choice just made under Help → Graphics beats everything.
    tier = carried.tier;
    reason = 'chosen';
  } else if (forced && TIERS.includes(forced)) {
    tier = forced;
    reason = 'url';
  } else if (carried.tier && TIERS.includes(carried.tier)) {
    // A step-down after a graphics failure, carried even when storage is blocked.
    tier = carried.tier;
    reason = carried.why || 'after-loss';
  } else if (stored && TIERS.includes(stored)) {
    tier = stored;
    reason = read(local, KEY + '-why') || 'chosen';
  } else {
    tier = looksMobile() ? 'lite' : 'full';
    reason = 'auto';
  }
  if (!probe.ok && tier !== 'text') {
    tier = 'text';
    reason = 'no-webgl2';
  }
  return { tier, reason, probe };
}

// Stored values: 'on' / 'off' (chosen under Help → Graphics), 'lost' (turned
// off after the graphics stopped). A choice beats the GPU rule, so a PowerVR
// owner can still try shadows.
function decideShadows(probe) {
  const forced = new URLSearchParams(location.search).get('shadows');
  if (forced === '0' || forced === '1') return { shadows: forced === '1', why: 'url' };
  const v = carried.shadows || read(local, SHADOW_KEY);
  if (v === 'on' || v === 'off') return { shadows: v === 'on', why: 'chosen' };
  if (v === 'lost') return { shadows: false, why: 'lost' };
  if (SHADOW_BUG_GPU.test(probe.gpu || '')) return { shadows: false, why: 'gpu' };
  return { shadows: true, why: 'default' };
}

const d = decide();
const sh = decideShadows(d.probe);

// Losses are counted per page load; the per-tab total is kept for diagnostics.
const tabLosses = Number(read(session, LOSS_KEY) || 0);

export const QUALITY = {
  tier: d.tier,
  reason: d.reason,
  gpu: d.probe.gpu || '',
  probe: d.probe,
  shadows: sh.shadows,
  shadowWhy: sh.why,
  get full() { return this.tier === 'full'; },
  get lite() { return this.tier === 'lite'; },
  get text() { return this.tier === 'text'; },
  losses: 0,
  tabLosses,
  storage: !!local,
};

// Turn shadows off for good on this device after a loss.
export function shadowsLost() {
  QUALITY.shadows = false;
  QUALITY.shadowWhy = 'lost';
  write(local, SHADOW_KEY, 'lost');
  writeWindowName({ shadows: 'lost' });
}

// Help → Graphics: an explicit choice, applied by reloading.
export function chooseShadows(on, resume) {
  const v = on ? 'on' : 'off';
  write(local, SHADOW_KEY, v);
  write(session, RESUME_KEY, JSON.stringify({ ...(resume || {}) }));
  writeWindowName({ shadows: v, note: resume && resume.note });
  reloadWithout('shadows');
}

function reloadWithout(param) {
  try {
    const u = new URL(location.href);
    if (u.searchParams.has(param)) {
      u.searchParams.delete(param);
      location.replace(u.href);
      return;
    }
  } catch (e) { /* fall back to reload */ }
  location.reload();
}

// A short log of recent losses, kept across reloads so a report can say what
// the renderer was doing when the GPU gave up.
export function readLossLog() {
  try { return JSON.parse(read(local, LOG_KEY) || read(session, LOG_KEY) || '[]'); } catch (e) { return []; }
}
function writeLossLog(log) {
  while (log.length > 6) log.shift();
  const s = JSON.stringify(log);
  write(local, LOG_KEY, s);
  write(session, LOG_KEY, s);
}
export function logLoss(entry) {
  const log = readLossLog();
  log.push(entry);
  writeLossLog(log);
}
export function markLossRestored(ms) {
  const log = readLossLog();
  if (!log.length) return;
  log[log.length - 1].restored = ms;
  writeLossLog(log);
}

// Remember a tier for the next visit, without reloading. Also kept in
// window.name so it survives a reload of this frame when storage is blocked.
export function rememberTier(tier, why = 'after-loss') {
  write(local, KEY, tier);
  write(local, KEY + '-why', why);
  write(local, KEY + '-v', String(POLICY));
  writeWindowName({ tier, why, v: POLICY });
}

// Persist a tier and reload (used by the Graphics buttons in Help).
export function switchTier(tier, resume) {
  write(local, KEY, tier);
  write(local, KEY + '-why', 'chosen');
  const r = { ...(resume || {}), tier };
  write(session, RESUME_KEY, JSON.stringify(r));
  writeWindowName({ tier, why: 'chosen', note: r.note, wanted: tier });
  // Drop a ?quality= override so the new choice can take effect.
  reloadWithout('quality');
}

export function clearTierChoice() {
  write(local, KEY, null);
}

export function noteLoss() {
  QUALITY.losses += 1;
  QUALITY.tabLosses += 1;
  write(session, LOSS_KEY, String(QUALITY.tabLosses));
  return QUALITY.losses;
}

export function takeResume() {
  const raw = read(session, RESUME_KEY);
  write(session, RESUME_KEY, null);
  let v = null;
  try { v = raw ? JSON.parse(raw) : null; } catch (e) { v = null; }
  if (!v && (carried.note || carried.wanted)) v = { note: carried.note, tier: carried.wanted };
  return v;
}

export const TIER_LABELS = { full: 'Full', lite: 'Lite', text: 'Text only' };
