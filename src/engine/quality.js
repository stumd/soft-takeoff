// Graphics tiers.
//   full - desktop: physically based materials, soft shadows, antialiasing
//   lite - phones and weak GPUs: Lambert materials, no MSAA, small shadows, fewer lights
//   text - no WebGL at all: the story is told without the diorama
// The tier is chosen once at startup, before any materials exist. If the GPU
// gives up mid-game we step down a tier and reload, resuming where we were.

const KEY = 'soft-takeoff-quality';
const RESUME_KEY = 'soft-takeoff-resume';
const LOSS_KEY = 'soft-takeoff-losses';
const TIERS = ['full', 'lite', 'text'];

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
function writeWindowName(v) {
  try { window.name = NAME_PREFIX + JSON.stringify(v); } catch (e) { /* ignore */ }
}
const carried = readWindowName();

function decide() {
  const params = new URLSearchParams(location.search);
  const forced = params.get('quality');
  const stored = read(local, KEY);
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

const d = decide();

export const QUALITY = {
  tier: d.tier,
  reason: d.reason,
  gpu: d.probe.gpu || '',
  probe: d.probe,
  get full() { return this.tier === 'full'; },
  get lite() { return this.tier === 'lite'; },
  get text() { return this.tier === 'text'; },
  losses: Number(read(session, LOSS_KEY + d.tier) || 0),
};

// Remember a tier for the next visit, without reloading. Also kept in
// window.name so it survives a reload of this frame when storage is blocked.
export function rememberTier(tier, why = 'after-loss') {
  write(local, KEY, tier);
  write(local, KEY + '-why', why);
  writeWindowName({ tier, why });
}

// Persist a tier and reload (used by the Graphics buttons in Help).
export function switchTier(tier, resume) {
  write(local, KEY, tier);
  write(local, KEY + '-why', 'chosen');
  const r = { ...(resume || {}), tier };
  write(session, RESUME_KEY, JSON.stringify(r));
  writeWindowName({ tier, why: 'chosen', note: r.note, wanted: tier });
  // Drop a ?quality= override so the new choice can take effect.
  try {
    const u = new URL(location.href);
    if (u.searchParams.has('quality')) {
      u.searchParams.delete('quality');
      location.replace(u.href);
      return;
    }
  } catch (e) { /* fall back to reload */ }
  location.reload();
}

export function clearTierChoice() {
  write(local, KEY, null);
}

export function noteLoss() {
  QUALITY.losses += 1;
  write(session, LOSS_KEY + QUALITY.tier, String(QUALITY.losses));
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
