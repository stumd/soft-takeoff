import { THREE, mat, drawnTexture } from './kit.js';
import { G, skyUniforms } from '../engine/stage.js';
import { QUALITY } from '../engine/quality.js';
import { rng } from '../engine/tween.js';
import { puffTex } from './city.js';
import { xAt } from './terrain.js';

// Things in the sky live on a layer glued to the back of the camera, in
// screen-ish units: y in [-13.5, 13.5], x in [-13.5 * aspect, 13.5 * aspect].
// Positions are designed for a landscape screen; on narrow ones, fitX pulls
// things in from beyond the edges so the moon is still in the sky.
export function fitX(x, margin = 2) {
  const lim = Math.max(0, G.skyHalfW - margin);
  return Math.max(-lim, Math.min(lim, x));
}

const mix = (a, b, t) => a + (b - a) * t;
const screenH = () => (typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 900);
// Pixels per sky unit: the layer is always 27 units tall, whatever the zoom.
const pxPerUnit = () => screenH() / 27;
// The highest a thing's centre may sit: `px` CSS pixels below the top edge.
const belowTop = (px) => 13.5 - px / pxPerUnit();
// 0 on screens 540px tall or more, 1 on landscape phones (360px): the same
// measure the stage uses to open its frame up on short screens.
const shortness = () => Math.max(0, Math.min(1, (540 - screenH()) / 180));

// Screen x, in sky units, of the city at screen-x `sx` (terrain.js) and
// depth z: the gaps between its spires are where the moon can go. `sky` is
// the sky layer (the parent of anything in it), which follows the camera's
// frame; null before the thing is in it.
const _w = new THREE.Vector3();
function skyX(sky, sx, z) {
  if (!sky) return null;
  return sky.worldToLocal(_w.set(xAt(sx, z), 0, z)).x;
}

// The local z, in the sky layer, that puts a point at (x, y) of the layer at
// world depth `z`. Things in the sky that should show in front of the far
// district (a flat cut-out at z -95, which on tall phones rises into the
// sky under the date card) and the land that runs back to it from the
// crest (surrounds.js), but behind the city, its hill and the Spindle
// (z -48.5), use a z just behind the Spindle (SKY_FRONT): the camera is
// orthographic, so this changes nothing else about them.
const SKY_FRONT = -50.5;
const _d = { a: 0, bx: 0, by: 0, bz: 1, ok: false };
function depthMap(sky) {
  if (!sky) return (_d.ok = false), _d;
  const a = sky.localToWorld(_w.set(0, 0, 0)).z;
  _d.bx = sky.localToWorld(_w.set(1, 0, 0)).z - a;
  _d.by = sky.localToWorld(_w.set(0, 1, 0)).z - a;
  _d.bz = sky.localToWorld(_w.set(0, 0, 1)).z - a;
  _d.a = a;
  _d.ok = _d.bz > 1e-4;
  return _d;
}
const zAt = (d, x, y, z) => (d.ok ? Math.max(0, (z - d.a - d.bx * x - d.by * y) / d.bz) : 0);

// Shared between the things in the sky: where the moon is, so that launches
// do not climb across it and its marker can keep clear of the date card.
const skyState = { moonX: 0, moonY: 0, moonAt: -1 };

// Where the night moon sits. Landscape screens have only a strip of sky above
// the city, and the moon goes in a gap between its spires: the one between
// the tall spire left of the Lattice and the Lattice's top, or, on landscape
// phones (whose strip is thinner still, and lower), the one east of the
// Spindle. Those gaps are in the city, so the moon follows them across
// screen shapes and the mouse's sway. Tall screens have open sky above the
// skyline, and it sits there, below the date card and a little left of the
// Spindle. It never rides higher than ~44px below the top edge.
export function moonSpot(p = {}, sky = null) {
  const t = G.tall;
  if (p.x != null) return [fitX(p.x, 2.5), Math.min(p.y - 2.8 * t, belowTop(44))];
  const short = shortness() > 0.2;
  const gap = skyX(sky, short ? 16.4 : 4.7, -48) ?? (short ? 12.1 : 1.2);
  const tallX = (skyX(sky, 11.2, -48.5) ?? 4.2) - 3.2;
  return [fitX(mix(gap, tallX, t), 2.5), Math.min(mix(11.55, 8.4, t), belowTop(44))];
}

// The moon's marker, in the moon's own units: above it when there is room
// under the top edge and clear of the date card (top left), otherwise beside
// it, on the right.
export function moonMarker() {
  const ppu = pxPerUnit();
  const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const mx = w / 2 + skyState.moonX * ppu;
  const my = (13.5 - skyState.moonY - 1.5) * ppu;
  const clearOfCard = mx - 16 > 240 || my - 16 > 95;
  return my >= 22 && clearOfCard ? [0, 1.5, 0] : [1.75, 0.5, 0];
}

// The band of sky the swarm's lines cross: high in the strip above the city
// on landscape screens, and lower, in the open sky, on tall ones.
export function swarmBand() {
  const t = G.tall;
  return [mix(10.0, 5.0, t), Math.min(mix(12.9, 10.6, t), belowTop(10))];
}

// Where "The lights" marker goes: in that band, in clear sky away from the
// moon, the Spindle, the Lattice (whose own marker sits just above it in
// other scenes) and the buttons in the top right corner.
export function swarmMarker() {
  const t = G.tall;
  const ppu = pxPerUnit();
  if (t > 0.5) return [fitX(-3.1, 1.6), 9.6, 0];
  if (shortness() > 0.2) {
    // landscape phones: the moon has the gap east of the Spindle; this goes
    // just right of the date card
    return [-G.skyHalfW + 270 / ppu, belowTop(30), 0];
  }
  const x = Math.min(mix(13.8, 9.5, t * 2), G.skyHalfW - 150 / ppu);
  const y = Math.min(mix(11.7, 10.4, t * 2), belowTop(42));
  return [x, y, 0];
}

function dotTex() {
  if (dotTex.t) return dotTex.t;
  dotTex.t = drawnTexture(32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });
  dotTex.t.userData.cached = true;
  return dotTex.t;
}

export function stars(p = {}) {
  const g = new THREE.Group();
  const r = rng(99);
  const n = p.n ?? 380;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (r() - 0.5) * 70;
    pos[i * 3 + 1] = -2 + Math.pow(r(), 0.7) * 16;
    pos[i * 3 + 2] = 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size: 2.2, map: dotTex(), transparent: true, depthWrite: false, fog: false, color: '#dfe8ff', sizeAttenuation: false });
  const pts = new THREE.Points(geo, m);
  g.add(pts);
  g.userData.tick = (dt, t) => {
    m.opacity = Math.max(0, (G.night - 0.35) / 0.65) * (0.85 + Math.sin(t * 2.3) * 0.1);
  };
  return g;
}

export function moon(p = {}) {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: '#f2efe2', fog: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 36), m);
  g.add(disc);
  const shade = new THREE.Mesh(new THREE.CircleGeometry(1.1, 36), new THREE.MeshBasicMaterial({ color: '#0c1630', fog: false, transparent: true, opacity: 0.85 }));
  shade.position.set(0.55, 0.15, 0.01);
  shade.scale.set(0.85, 0.95, 1);
  if (p.phase !== 'full') g.add(shade);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#9ab4ff', transparent: true, opacity: 0.35, depthWrite: false, fog: false }));
  halo.scale.set(6, 6, 1);
  halo.position.z = -0.1;
  g.add(halo);
  if (p.lights) {
    // Lights on the dark side of the moon: someone's factory.
    const r = rng(12);
    const lm = new THREE.MeshBasicMaterial({ color: '#ffd28a', fog: false });
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 0.9;
      const x = Math.cos(a) * rad + 0.25, y = Math.sin(a) * rad;
      if (Math.hypot(x, y) > 1.0) continue;
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.035 + r() * 0.03, 6), lm);
      d.position.set(x, y, 0.02);
      g.add(d);
    }
  }
  // Clear of the skyline: high in the band of sky on a landscape screen, a
  // little lower on tall ones, whose frame has more sky above the city.
  g.position.set(...moonSpot(p), 0);
  // (sideways it keeps to its gap in the city, so it moves with the view as
  // the city does: an open panel frames its disc, as it would a building)
  if (p.x == null) g.userData.focus = disc;
  g.userData.tick = () => {
    const sky = g.parent;
    const [x, y] = moonSpot(p, sky);
    g.position.x = x;
    g.position.y = y;
    // The night moon hangs in front of the far district and its land, so
    // that on small phones it is not hidden behind them, and behind
    // everything else. (its disc tilts by up to a world unit either way on
    // tall screens; the Spindle stands two units in front)
    if (!p.day) g.position.z = zAt(depthMap(sky), x, y, SKY_FRONT);
    skyState.moonX = x;
    skyState.moonY = y;
    skyState.moonAt = G.time;
    // The night sky's glow is the moonlight: keep it behind the moon, in the
    // sky shader's coordinates (whose y starts at the foot of the city).
    // Only while it is properly night, so that the next scene's light,
    // blending in as this moon sets, gets its own glow back.
    if (!p.day && G.night > 0.8) {
      const hz = skyUniforms.uHorizon.value;
      const fy = 0.5 + y / 27;
      skyUniforms.uGlowPos.value.set(0.5 + x / (2 * Math.max(1, G.skyHalfW)), Math.max(0, Math.min(1, (fy - hz) / Math.max(0.05, 1 - hz))));
    }
  };
  if (p.day) {
    m.transparent = true;
    m.opacity = 0.5;
    halo.material.opacity = 0;
    shade.material.opacity = 0;
  }
  return g;
}

// Clouds: soft clumps drifting across.
export function clouds(p = {}) {
  const g = new THREE.Group();
  const r = rng(p.seed || 4);
  const n = p.n ?? 9;
  const col = new THREE.Color(p.color || '#5a5f6a');
  const items = [];
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < (QUALITY.lite ? 3 : 6); k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: col, transparent: true, opacity: p.opacity ?? 0.9, depthWrite: false, fog: false }));
      const sc = 3 + r() * 4;
      s.scale.set(sc * 1.6, sc, 1);
      s.position.set((r() - 0.5) * 7, (r() - 0.5) * 1.4, 0);
      c.add(s);
    }
    c.position.set(-40 + r() * 80, 4 + r() * 10, 0);
    c.userData.speed = 0.3 + r() * 0.5;
    g.add(c);
    items.push(c);
  }
  g.userData.tick = (dt) => {
    for (const c of items) {
      c.position.x += dt * c.userData.speed * (p.speed ?? 1) * (1 + G.wind * 2);
      if (c.position.x > 42) c.position.x = -42;
    }
  };
  return g;
}

// The swarm: thousands of small lights in orbit, building something. From
// the garden they cross the sky in slow lines, east to west (right to left),
// evenly spaced like ants on a trail, never quite colliding. Warmer and
// bigger than the stars, and brightest at the head of each line, so they
// read as moving writing rather than more stars. One draw call, as before;
// lite draws fewer of them, at the old size and without the fading tails.
export function swarm(p = {}) {
  const g = new THREE.Group();
  const r = rng(1234);
  const lite = QUALITY.lite;
  const n = Math.round((p.n ?? 320) * (lite ? 0.6 : 1));
  const trains = [];
  for (let left = n; left > 0;) {
    const k = Math.min(left, 16 + Math.floor(r() * 30));
    trains.push({
      n: k,
      y: 0.18 + r() * 0.64, // height in the band (0 bottom, 1 top)
      slope: (r() - 0.5) * 0.36, // rise across the screen, in band heights
      curve: (r() - 0.5) * 0.24,
      gap: 0.3 + r() * 0.16, // between lights, in sky units
      speed: 0.35 + r() * 0.45, // sky units a second, westwards
      rest: 4 + r() * 22, // empty sky before the line comes round again
      phase: r() * 400,
      wig: r() * 6.28,
    });
    left -= k;
  }
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  {
    let i = 0;
    for (const tr of trains) {
      for (let k = 0; k < tr.n; k++, i++) {
        const b = 1 - 0.5 * (k / Math.max(1, tr.n - 1));
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = b;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  // (lite keeps the stars' shader: no fading tails, no extra program)
  if (!lite) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: lite ? 4.2 : 5.6, map: dotTex(), vertexColors: !lite, transparent: true, depthWrite: false, fog: false, color: p.color || '#ffc77a', sizeAttenuation: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, m);
  pts.frustumCulled = false;
  g.add(pts);
  // An invisible band so the lights can be clicked (behind the moon, so a
  // click on the moon is the moon's).
  const hit = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.z = -0.5;
  g.add(hit);
  g.userData.tick = (dt, t) => {
    const [lo, hi] = swarmBand();
    const H = Math.max(1, G.skyHalfW);
    const W = H + 1;
    // in front of the far district, like the moon, but just behind it
    const dm = depthMap(g.parent);
    let i = 0;
    for (const tr of trains) {
      const P = 2 * W + tr.n * tr.gap + tr.rest;
      const s0 = tr.phase - tr.speed * t;
      for (let k = 0; k < tr.n; k++, i++) {
        const u = (((s0 + k * tr.gap) % P) + P) % P;
        const x = -W + u;
        const xn = x / H;
        const yb = tr.y + tr.slope * xn + tr.curve * (xn * xn - 0.4);
        const y = lo + (hi - lo) * yb + 0.06 * Math.sin(x * 0.8 + tr.wig);
        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = zAt(dm, x, y, SKY_FRONT - 1.2);
      }
    }
    geo.attributes.position.needsUpdate = true;
    hit.position.y = (lo + hi) / 2;
    hit.scale.set(2 * W, hi - lo + 0.8, 1);
    m.opacity = (p.day ? 0.35 : 0.95) * (p.fade ?? 1);
  };
  return g;
}

// The ring: a pale band across the whole sky.
export function ring(p = {}) {
  const g = new THREE.Group();
  const curve = new THREE.EllipseCurve(0, 0, 46, 9.5, Math.PI * 0.03, Math.PI * 0.97, false, 0);
  const pts = curve.getPoints(80).map((v) => new THREE.Vector3(v.x, v.y, 0));
  const path = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(path, 120, p.width ?? 0.16, 6, false);
  const m = new THREE.MeshBasicMaterial({ color: p.color || '#f6f2ff', transparent: true, opacity: p.opacity ?? 0.55, fog: false, depthWrite: false });
  const mesh = new THREE.Mesh(tube, m);
  mesh.position.y = p.y ?? 3;
  g.add(mesh);
  // a second, fainter band
  const tube2 = new THREE.TubeGeometry(path, 120, (p.width ?? 0.16) * 2.6, 6, false);
  const m2 = new THREE.MeshBasicMaterial({ color: p.color || '#f6f2ff', transparent: true, opacity: (p.opacity ?? 0.55) * 0.25, fog: false, depthWrite: false });
  const mesh2 = new THREE.Mesh(tube2, m2);
  mesh2.position.y = (p.y ?? 3) - 0.35;
  g.add(mesh2);
  g.rotation.z = p.tilt ?? -0.06;
  return g;
}

// Rocket launches far away: a bright point climbing on a stalk of light.
export function launches(p = {}) {
  const g = new THREE.Group();
  const every = p.every ?? 12;
  const pool = [];
  const r = rng(p.seed || 3);
  for (let i = 0; i < 4; i++) {
    const trail = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1), new THREE.MeshBasicMaterial({ color: '#fff3dc', transparent: true, opacity: 0, fog: false, depthWrite: false }));
    trail.geometry.translate(0, 0.5, 0);
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#fff6e0', transparent: true, opacity: 0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    head.scale.set(1.2, 1.2, 1);
    const item = new THREE.Group();
    item.add(trail, head);
    g.add(item);
    pool.push({ item, trail, head, t: -1, x: 0, bend: 0 });
  }
  let next = p.first ?? 2;
  let idx = 0;
  g.userData.tick = (dt, t) => {
    next -= dt;
    if (next <= 0) {
      const L = pool[idx++ % pool.length];
      L.t = 0;
      L.x = fitX(p.x != null ? p.x + (r() - 0.5) * 6 : 6 + r() * 18, 1.5);
      // Never up across the moon. (Launches lean left as they climb, so
      // one starting to its right needs more room.)
      const dm = L.x - skyState.moonX;
      if (G.time - skyState.moonAt < 0.5 && dm > -1.8 && dm < 4.6) L.x = fitX(skyState.moonX + (dm < 1.4 ? -1.8 : 4.6), 1.5);
      L.bend = 0.05 + r() * 0.12;
      L.item.position.set(L.x, p.y0 ?? -1, 0);
      next = every * (0.6 + r() * 0.8);
    }
    for (const L of pool) {
      if (L.t < 0) continue;
      L.t += dt;
      const dur = 7;
      const k = L.t / dur;
      if (k >= 1) {
        L.t = -1;
        L.trail.material.opacity = 0;
        L.head.material.opacity = 0;
        continue;
      }
      const hgt = Math.pow(k, 1.6) * 16;
      L.trail.scale.y = Math.max(0.01, hgt);
      L.trail.rotation.z = -L.bend * k;
      L.head.position.set(Math.sin(-L.trail.rotation.z) * -hgt, hgt, 0.01);
      const fade = k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2;
      L.trail.material.opacity = 0.55 * fade * (1 - k * 0.5);
      L.head.material.opacity = fade;
    }
  };
  return g;
}

// A new star that opens like a flower: the orbital mirror.
export function flare(p = {}) {
  const g = new THREE.Group();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#fffaf0', transparent: true, opacity: 1, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  g.add(s);
  const petals = [];
  for (let i = 0; i < 6; i++) {
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1), new THREE.MeshBasicMaterial({ color: '#fff4e0', transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
    pm.geometry.translate(0, 0.5, 0);
    pm.rotation.z = (i / 6) * Math.PI * 2;
    g.add(pm);
    petals.push(pm);
  }
  g.position.set(p.x ?? 10, p.y ?? 9.5, 0);
  const open = p.open ?? 1;
  g.userData.setOpen = (k) => {
    s.scale.setScalar(0.6 + k * 2.6);
    petals.forEach((pm) => pm.scale.set(1, 0.01 + k * 1.6, 1));
  };
  g.userData.setOpen(open);
  g.userData.tick = (dt, t) => {
    s.material.opacity = 0.85 + Math.sin(t * 3) * 0.1;
    g.position.x = fitX(p.x ?? 10, 2.5);
  };
  return g;
}
