import { THREE, cyl, group, textTex, windowTex, emissiveWindowTex, addMist, markCached, drawnTexture } from './kit.js';
import { Batch } from './batch.js';
import { G, VIEW_DEFAULT } from '../engine/stage.js';
import { QUALITY } from '../engine/quality.js';
import { rng } from '../engine/tween.js';

// The world beyond the back gardens, seen side-on like the flats of a paper
// theatre. Everything stands on the same ground (y = 0); further rows sit
// higher on screen, are paler (the mist shader fades by world z) and stand
// deeper in the ground mist. Rows from front to back (world z):
//   -7 .. -16    allotments behind the houses          (surrounds.js)
//  -17 .. -21    the river
//  -22 .. -28    the far bank: Meridian, data centres, factory, reactor
//  -30 .. -46    the city, in four rows, rising towards the middle
//  -50 ..        the Spindle
// Positions are given as screen-x (sx: left/right as the default camera sees
// it, in world units) and world z; xAt() turns that into world x.

const SA = Math.sin(VIEW_DEFAULT.az), CA = Math.cos(VIEW_DEFAULT.az);
export const xAt = (sx, z) => (sx + z * SA) / CA;
function place(obj, sx, z, y = 0) {
  obj.position.set(xAt(sx, z), y, z);
  return obj;
}

const LITE = QUALITY.lite;
// How far along the street the city extends, in screen-x.
const SX0 = LITE ? -28 : -40, SX1 = LITE ? 38 : 56;

const nightMats = [];

export function updateCityNight() {
  const v = Math.min(1.6, G.night + (G.pulse || 0));
  for (const m of nightMats) m.emissiveIntensity = v * (m.userData.nightK ?? 1.25);
}

// One material per window pattern; each building's colour is in its vertices.
function cityMat(variant = 0) {
  const key = 'v' + (variant % 4);
  if (cityMat.cache[key]) return cityMat.cache[key];
  const m = new THREE.MeshLambertMaterial({
    vertexColors: true, map: windowTex(variant % 4), emissive: '#ffc87a', emissiveMap: emissiveWindowTex(variant % 4), emissiveIntensity: 0,
  });
  addMist(m);
  markCached(m);
  nightMats.push(m);
  cityMat.cache[key] = m;
  return m;
}
cityMat.cache = {};

// Plain shapes (no windows) with colours in their vertices.
function batchMat(k = 1) {
  const key = 'b' + k;
  if (cityMat.cache[key]) return cityMat.cache[key];
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  addMist(m, k);
  markCached(m);
  cityMat.cache[key] = m;
  return m;
}

function plainMist(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (plainMist.cache[key]) return plainMist.cache[key];
  const { k, ...rest } = extra;
  const m = new THREE.MeshLambertMaterial({ color, ...rest });
  addMist(m, k ?? 1);
  markCached(m);
  plainMist.cache[key] = m;
  return m;
}
plainMist.cache = {};

function glowMist(color, intensity = 1) {
  const key = 'g' + color + intensity;
  if (plainMist.cache[key]) return plainMist.cache[key];
  const m = new THREE.MeshLambertMaterial({ color: '#111', emissive: color, emissiveIntensity: intensity });
  addMist(m, 0.8);
  markCached(m);
  plainMist.cache[key] = m;
  return m;
}

function mb(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  return m;
}

function placeIco(r, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), plainMist(color, { flatShading: true }));
  m.position.set(x, y, z);
  return m;
}
function placeCone(r, h, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), plainMist(color, { flatShading: true }));
  m.position.set(x, y + h / 2, z);
  return m;
}

// ---------------------------------------------------------------------------
// The ordinary city

const OLD_PALETTE = ['#9aa5b1', '#b4a99a', '#8d98a6', '#a89482', '#c2b8a8', '#7f8b99', '#b8aea0', '#958a80'];

// Rows of the city, front to back. Heights rise towards the middle of the
// view (the old centre is behind the garden), and with each row back, so the
// skyline climbs. `unit` is the window pitch: finer further away.
const ROWS = [
  { z: -29, h: [0.9, 1.9], peak: 0.4, w: [1.3, 2.6], unit: 0.8, gap: 1.3 },
  { z: -31.5, h: [1.0, 2.1], peak: 0.9, w: [1.2, 2.4], unit: 0.72, gap: 1.1 },
  { z: -34, h: [1.1, 2.3], peak: 1.6, w: [1.1, 2.2], unit: 0.64, gap: 0.9, spikes: 0.07 },
  { z: -36.5, h: [1.2, 2.5], peak: 2.5, w: [1.0, 2.0], unit: 0.56, gap: 0.7, spikes: 0.14 },
];
const CENTRE = 6; // screen-x of the old town centre, behind the garden
const bump = (sx) => Math.exp(-(((sx - CENTRE) / 12) ** 2));

/**
 * The ordinary city. `variant`:
 *  old      - 2026ish
 *  snow     - roofs white
 *  green    - roofs planted, some buildings replaced (epilogue)
 *  thin     - partially demolished (kettle sequence midpoint)
 */
export function city(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  const variant = p.variant || 'old';
  const r = rng(77);
  const perClump = LITE ? 12 : 8;
  ROWS.forEach((row, ri) => {
    let sx = SX0 + r() * 2;
    let batch = new Batch();
    let count = 0, maxH = 0, clump = 0;
    const flush = () => {
      if (!batch.size) return;
      const m = batch.mesh(cityMat(ri * 3 + clump));
      const c = group(m);
      c.userData.h = maxH + 1;
      g.add(c);
      batch = new Batch();
      count = 0;
      maxH = 0;
      clump++;
    };
    while (sx < SX1) {
      const w = row.w[0] + r() * (row.w[1] - row.w[0]);
      const d = 1.0 + r() * 0.8;
      const z = row.z + (r() - 0.5) * 0.8;
      let h = row.h[0] + Math.pow(r(), 1.4) * (row.h[1] - row.h[0]) + row.peak * bump(sx) * (0.4 + r() * 0.8);
      if (row.spikes && r() < row.spikes * (0.4 + bump(sx))) h *= 1.45;
      const col = OLD_PALETTE[Math.floor(r() * OLD_PALETTE.length)];
      const skip = r();
      const cx = sx + w / 2;
      // tighter in the old centre, looser (more sky between) towards the edges
      sx += w + row.gap * r() * (1.5 - bump(sx));
      if (variant === 'thin' && skip < 0.45) continue;
      if (variant === 'green' && skip < 0.35) continue;
      const x = xAt(cx, z);
      batch.box(w, h, d, col, x, 0, z, { unit: row.unit });
      batch.box(w + 0.1, 0.12, d + 0.1, '#6a6f78', x, h, z);
      if (variant === 'snow') batch.box(w + 0.12, 0.1, d + 0.12, '#f4f7fa', x, h + 0.12, z);
      if (variant === 'green') {
        batch.box(w * 0.9, 0.25, d * 0.9, '#6fa25a', x, h + 0.12, z);
        for (let k = 0; k < 2; k++) batch.ico(0.3 + r() * 0.3, k ? '#5f9a4a' : '#7fae4a', x + (r() - 0.5) * w * 0.6, h + 0.45, z + (r() - 0.5) * d * 0.6);
        batch.box(w + 0.02, h * (0.3 + r() * 0.5), 0.05, '#5e8f48', x, 0, z + d / 2);
      }
      if (variant !== 'green' && r() < 0.25) batch.box(0.6, 0.4, 0.6, '#80858c', x + (r() - 0.5) * w * 0.5, h + 0.12, z);
      maxH = Math.max(maxH, h);
      if (++count >= perClump) flush();
    }
    flush();
  });
  // Old landmarks that survive every version: a church spire and a clock tower.
  const lm = new Batch();
  {
    const z = -32, x = xAt(-7, z);
    lm.box(1.4, 5, 1.4, '#b8ab98', x, 0, z);
    lm.cone(0.85, 4.4, '#7b8790', x, 5, z);
    const z2 = -36.5, x2 = xAt(19, z2);
    lm.box(1.3, 6.4, 1.3, '#c2b29a', x2, 0, z2);
    lm.box(1.5, 0.3, 1.5, '#8a7e6e', x2, 6.4, z2);
    lm.cone(0.9, 1.6, '#6f7a84', x2, 6.7, z2, { seg: 4, ry: Math.PI / 4 });
  }
  const landmarks = group(lm.mesh(batchMat()));
  landmarks.userData.h = 10;
  g.add(landmarks);
  return g;
}

// The river along the bottom of the allotments, glimpsed between the trees.
export function river(p = {}) {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: p.clean ? '#78b6cc' : '#7c94a0' });
  addMist(m, 0.6);
  const w = 160;
  const water = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 3.6), m);
  water.position.set(xAt(8, -19), -0.02, -19);
  g.add(water);
  // the far bank: a stone embankment
  const bank = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, 0.6), plainMist('#9c958a', { k: 0.8 }));
  bank.position.set(xAt(8, -21.1), 0.35, -21.1);
  g.add(bank);
  g.userData.h = 1;
  return g;
}

// ---------------------------------------------------------------------------
// Construction cranes

function crane(h, jib, color = '#e8b923') {
  const g = new THREE.Group();
  const cm = plainMist(color);
  g.add(mb(0.4, h, 0.4, cm, 0, 0, 0));
  for (let y = 0.6; y < h; y += 1.2) g.add(mb(0.46, 0.06, 0.46, plainMist('#c49a1a'), 0, y, 0));
  const arm = new THREE.Group();
  arm.position.y = h;
  arm.add(mb(jib, 0.3, 0.3, cm, jib / 2 - 2, 0, 0));
  arm.add(mb(1.2, 0.6, 0.6, plainMist('#55585e'), -2.2, -0.3, 0));
  arm.add(mb(0.6, 1.0, 0.6, cm, 0, 0.3, 0));
  const cable = mb(0.03, 3, 0.03, plainMist('#333'), jib * 0.6, -3, 0);
  arm.add(cable);
  const lightM = new THREE.MeshBasicMaterial({ color: '#ff3b2a' });
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), lightM);
  light.position.set(0, 1.4, 0);
  arm.add(light);
  // Jibs mostly swing across the view, where they read best side-on.
  arm.rotation.y = (Math.random() - 0.5) * 1.2 + (Math.random() < 0.5 ? 0 : Math.PI);
  g.add(arm);
  const sp = 0.03 + Math.random() * 0.05;
  g.userData.tick = (dt, t) => {
    arm.rotation.y += dt * sp * Math.sin(t * 0.1);
    light.visible = G.night > 0.3 && Math.sin(t * 2.5) > 0;
  };
  g.userData.h = h + 1;
  return g;
}

// at: [[sx, z, height, jib]]
export function cranes(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  for (const [sx, z, h, jib] of p.at || [[-9, -31.5, 7.5, 6], [17, -34, 8, 6], [27, -29, 7, 5.5]]) {
    const c = crane(h, jib, p.color);
    place(c, sx, z);
    g.add(c);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Steam plumes (cooling towers on the data centres)

const puffTex = (() => {
  let t;
  return () => {
    if (t) return t;
    t = markCached(drawnTexture(64, 64, (ctx) => {
      const gr = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0.45)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 64, 64);
    }));
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();
export { puffTex };

export function plume(o = {}) {
  const g = new THREE.Group();
  const n = QUALITY.lite ? 3 : o.n ?? 8;
  const puffs = [];
  const tint = new THREE.Color(o.color || '#f4f0ea');
  for (let i = 0; i < n; i++) {
    const m = new THREE.SpriteMaterial({ map: puffTex(), color: tint, transparent: true, depthWrite: false, opacity: 0.0, fog: true });
    const s = new THREE.Sprite(m);
    s.userData.phase = i / n;
    g.add(s);
    puffs.push(s);
  }
  const rise = o.rise ?? 5, size = o.size ?? 1.6, speed = o.speed ?? 0.12;
  g.userData.tick = (dt, t) => {
    for (const s of puffs) {
      const k = (t * speed + s.userData.phase) % 1;
      s.position.set(Math.sin(k * 3 + s.userData.phase * 9) * 0.3 + k * (o.drift ?? 1.5), k * rise, 0);
      const sc = size * (0.4 + k * 1.4);
      s.scale.set(sc, sc, 1);
      s.material.opacity = Math.sin(k * Math.PI) * (o.opacity ?? 0.55) * (G.night > 0.7 ? 0.6 : 1);
    }
  };
  return g;
}

// ---------------------------------------------------------------------------
// Meridian Compute, across the river: from building site to data centre to lake.

const MERIDIAN = [6.5, -25.5]; // sx, z

export function meridian(p = {}) {
  const g = new THREE.Group();
  const stage = p.stage || 'complete';
  place(g, MERIDIAN[0], MERIDIAN[1]);
  g.scale.setScalar(0.8);
  g.userData.stagger = true;
  const W = 11, D = 6;
  if (stage === 'construction') {
    g.add(mb(W, 0.4, D, plainMist('#9c9890'), 0, 0, 0));
    const frame = new THREE.Group();
    const steel = plainMist('#6d7a86');
    for (let x = -W / 2; x <= W / 2 + 0.01; x += W / 6) for (let z = -D / 2; z <= D / 2 + 0.01; z += D / 3) frame.add(mb(0.18, 4, 0.18, steel, x, 0.4, z));
    for (const y of [1.6, 3.2]) frame.add(mb(W, 0.15, D, plainMist('#8d8a84'), 0, y + 0.4, 0));
    frame.userData.h = 4.5;
    g.add(frame);
    const c1 = crane(8.5, 7);
    c1.position.set(-3, 0, -2.5);
    g.add(c1);
    const hoard = billboardTex(['MERIDIAN COMPUTE', 'POWERING TOMORROW'], '#14243a', '#9fe0ff', true);
    const bb = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.4), new THREE.MeshLambertMaterial({ map: hoard, emissive: '#ffffff', emissiveMap: hoard, emissiveIntensity: 0.4 }));
    bb.material.userData.nightK = 0.9;
    bb.position.set(1.0, 6.2, D / 2 + 0.8);
    g.add(group(bb, mb(0.16, 5.5, 0.16, plainMist('#444'), -0.9, 0, D / 2 + 0.8), mb(0.16, 5.5, 0.16, plainMist('#444'), 2.9, 0, D / 2 + 0.8)));
    return g;
  }
  if (stage === 'lake') {
    // A lake with a wooded rim; the far shore is a gentle rise, so from across
    // the river the water reads as a bright band between the trees.
    const water = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.2, 28), plainMist('#86cadb', { k: 0.6 }));
    water.scale.set(1.15, 1, 0.55);
    water.position.y = 1.0;
    g.add(water);
    const shore = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 9.4, 1.0, 28), plainMist('#7fae5a', { k: 0.7 }));
    shore.scale.set(1.15, 1, 0.6);
    shore.position.y = 0.45;
    g.add(shore);
    const r = rng(8);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      if (Math.sin(a) > 0.55) continue; // keep the near shore open
      g.add(placeIco(0.6 + r() * 0.5, ['#5f9a4a', '#7fae4a'][i % 2], Math.cos(a) * 8.3, 1.3 + r() * 0.4, Math.sin(a) * 4.6));
    }
    // a heron or two
    for (const [x, z] of [[-2.5, 1.2], [3.2, 0.4]]) {
      g.add(mb(0.12, 0.7, 0.12, plainMist('#d8dde0'), x, 1.05, z));
      g.add(mb(0.4, 0.18, 0.18, plainMist('#c8ced2'), x + 0.12, 1.7, z));
    }
    g.userData.h = 2;
    return g;
  }
  const dark = plainMist('#3e4a58');
  const fin = plainMist('#5a6878');
  const full = stage === 'complete';
  const len = full ? W : W * 0.45;
  const body = group(mb(len, 4, D, dark, -W / 2 + len / 2, 0, 0));
  body.userData.h = 4;
  g.add(body);
  for (let x = -W / 2 + 0.4; x < -W / 2 + len; x += 0.55) g.add(mb(0.12, 3.8, 0.1, fin, x, 0, D / 2 + 0.05));
  // the logo strip
  const logo = billboardTex(['MERIDIAN'], '#0c1622', '#7fe6ff', false);
  if (full) {
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.6), new THREE.MeshBasicMaterial({ map: logo, fog: true }));
    lm.position.set(0, 3.2, D / 2 + 0.12);
    g.add(lm);
  }
  // Roof stacks with steam.
  const stacks = full ? 6 : 2;
  for (let i = 0; i < stacks; i++) {
    const x = -W / 2 + 1 + i * 1.8;
    const s = new THREE.Group();
    s.add(cyl(0.45, 0.6, 1.4, '', { mat: plainMist('#9aa3ab'), cast: false, receive: false }));
    s.position.set(x, 4, -0.5);
    if (p.steam !== false) {
      const pl = plume({ rise: 6, size: 2.2, speed: 0.1 + i * 0.01, opacity: 0.5 });
      pl.position.y = 1.4;
      s.add(pl);
    }
    s.userData.h = 2;
    g.add(s);
  }
  if (stage === 'dismantling') {
    // robot gantries taking it apart, panel by panel
    for (const x of [-1, 2.5]) {
      const gt = group(
        mb(0.25, 6, 0.25, plainMist('#e8b923'), x, 0, -D / 2 - 0.4),
        mb(0.25, 6, 0.25, plainMist('#e8b923'), x, 0, D / 2 + 0.4),
        mb(0.3, 0.3, D + 1.2, plainMist('#e8b923'), x, 6, 0),
      );
      gt.userData.h = 6.3;
      g.add(gt);
    }
    for (let i = 0; i < 8; i++) g.add(mb(0.9, 0.4, 0.9, plainMist('#4c5866'), 1 + (i % 4) * 1.1, 0, -1 + Math.floor(i / 4) * 1.1));
  }
  return g;
}

function billboardTex(lines, bg, fg, graffiti) {
  return textTex('city-bb-' + lines.join('|') + (graffiti ? 'g' : ''), lines, { w: 1024, h: 320, bg, fg, font: '800 76px "Inter", Arial, sans-serif' });
}

// More data centres along the far bank, each with its own plume.
export function datacentres(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  // [sx, z, w, d]
  const spots = [[21.5, -25.5, 7, 4], [-6, -26.5, 8, 4.5], [28, -27, 6, 4], [-17, -27, 7, 4]];
  const n = p.n ?? 3;
  for (let i = 0; i < n; i++) {
    const [sx, z, w, d] = spots[i];
    const dc = new THREE.Group();
    const building = i === 0 && p.building;
    if (building) {
      dc.add(mb(w, 0.3, d, plainMist('#9c9890'), 0, 0, 0));
      for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 4) dc.add(mb(0.15, 2.5, 0.15, plainMist('#6d7a86'), x, 0.3, 0));
      const c = crane(7.5, 6);
      c.position.set(-w / 2, 0, -d / 2 - 1);
      dc.add(c);
    } else {
      dc.add(mb(w, 3.2, d, plainMist('#46525f'), 0, 0, 0));
      for (let x = -w / 2 + 0.3; x < w / 2; x += 0.5) dc.add(mb(0.1, 3.0, 0.08, plainMist('#5d6b7a'), x, 0, d / 2 + 0.04));
      for (let k = 0; k < 3; k++) {
        const st = cyl(0.35, 0.45, 1.1, '', { mat: plainMist('#9aa3ab'), x: -w / 2 + 1 + k * 1.6, y: 3.2, z: 0, cast: false, receive: false });
        dc.add(st);
        if (p.steam !== false) {
          const pl = plume({ rise: 5, size: 1.8, speed: 0.11 + k * 0.013 });
          pl.position.set(-w / 2 + 1 + k * 1.6, 4.3, 0);
          dc.add(pl);
        }
      }
    }
    dc.userData.h = 4.5;
    dc.scale.setScalar(0.78);
    place(dc, sx, z);
    g.add(dc);
  }
  return g;
}

// Downriver: a squat white dome.
export function reactor(p = {}) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), plainMist('#d8d6d0'));
  dome.position.y = 2;
  g.add(mb(5.2, 2, 5.2, plainMist('#b8b6b0'), 0, 0, 0));
  g.add(dome);
  g.add(mb(1.2, 4.5, 1.2, plainMist('#c8c4bc'), 3.2, 0, -1));
  g.add(mb(1.24, 0.3, 1.24, plainMist('#d04030'), 3.2, 3.6, -1));
  g.userData.h = 4.5;
  g.scale.setScalar(0.8);
  place(g, 14.5, -23.5);
  return g;
}

// The solar farm "past the ring road", on a gentle slope downriver.
export function solarField(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  const rows = p.rows ?? 8;
  const SLOPE = 0.2, Z0 = -22.5, D = 9;
  const yAt = (z) => (Z0 - z) * Math.tan(SLOPE);
  const hill = new THREE.Group();
  const hb = new Batch();
  hb.box(18, 0.4, D / Math.cos(SLOPE) + 0.4, '#8f9f66', xAt(36, Z0 - D / 2), yAt(Z0 - D / 2) - 0.4, Z0 - D / 2, { rx: SLOPE });
  hill.add(hb.mesh(batchMat(0.8)));
  hill.userData.h = 2;
  g.add(hill);
  const pm = plainMist('#2a3d62', { k: 0.7 });
  for (let i = 0; i < rows; i++) {
    const row = new THREE.Group();
    const z = Z0 - 0.8 - (i % 6) * 1.35;
    const n = 7;
    for (let k = 0; k < n; k++) {
      const pn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.9), pm);
      pn.rotation.x = -0.5;
      pn.position.set(k * 1.75, 0.3, 0);
      row.add(pn);
    }
    row.userData.h = 1;
    place(row, i < 6 ? 29.5 : 41, z, yAt(z));
    g.add(row);
  }
  return g;
}

// Slender glass towers that went up in weeks: needles among the city rows.
// Each tower is one vertex-coloured mesh, plus its lights.
export function newTowers(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  // [sx, z, height]
  const spots = [
    [-11, -35, 6], [-2, -33.5, 6.8], [2.5, -37, 5.6], [-19, -34.5, 5.4], [14, -35, 6.6], [-6.5, -38, 7.4], [20, -37.5, 5.8], [-25, -33, 5], [26, -35.5, 5.4], [10.5, -38.5, 6.4],
  ];
  const n = p.n ?? 3;
  for (let i = 0; i < n; i++) {
    const [sx, z, h] = spots[i];
    const t = new THREE.Group();
    const b = new Batch();
    const glow = new Batch();
    const partial = p.building && i >= n - 2;
    const hh = partial ? h * 0.55 : h;
    const w = 0.85;
    const [c1, c2] = i % 2 ? ['#9fc0d8', '#c4d8e4'] : ['#c4d8e4', '#9fc0d8'];
    // a slight setback halfway up
    b.box(w, hh * 0.6, w, c1, 0, 0, 0);
    b.box(w * 0.8, hh * 0.4, w * 0.8, c2, 0, hh * 0.6, 0);
    for (let y = 1.1; y < hh; y += 1.1) {
      const k = y < hh * 0.6 ? 1 : 0.8;
      b.box(w * k + 0.05, 0.05, w * k + 0.05, '#eef3f6', 0, y, 0);
    }
    if (!partial) {
      b.cone(0.32, 1.6, '#e4ecf2', 0, hh, 0);
      b.box(0.02, 0.9, 0.02, '#eef3f6', 0, hh + 1.6, 0);
    } else {
      // the printer gantry
      b.box(0.1, hh + 1.6, 0.1, '#e8b923', -0.7, 0, -0.7);
      b.box(0.1, hh + 1.6, 0.1, '#e8b923', 0.7, 0, 0.7);
      b.box(1.6, 0.14, 1.6, '#e8b923', 0, hh + 0.8, 0);
      t.add(mb(0.3, 0.3, 0.3, glowMist('#ff9a3d', 1.4), 0, hh + 0.4, 0));
    }
    t.add(b.mesh(batchMat()));
    t.add(mb(0.16, 0.16, 0.16, glowMist('#ff5a4a', 0.8), 0, hh + (partial ? 0 : 2.5), 0));
    t.userData.h = hh + 4;
    place(t, sx, z);
    g.add(t);
  }
  return g;
}

export function factory(p = {}) {
  const g = new THREE.Group();
  const W = 9, D = 4.5;
  g.add(mb(W, 2.4, D, plainMist('#8a8f96'), 0, 0, 0));
  for (let i = 0; i < 6; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, D), plainMist('#6a7078'));
    tooth.position.set(-W / 2 + 0.75 + i * 1.5, 2.8, 0);
    tooth.rotation.z = 0.5;
    g.add(tooth);
    g.add(mb(0.1, 0.6, D, glowMist('#ffb35a', 1.2), -W / 2 + 1.45 + i * 1.5, 2.4, 0));
  }
  g.add(mb(W * 0.6, 1.4, 0.05, glowMist('#ff9a3d', 0.9), 0, 0.2, D / 2 + 0.03));
  g.userData.h = 3;
  g.scale.setScalar(0.8);
  place(g, -24, -24.5);
  return g;
}

// "The Lattice": what replaced Meridian. Nobody quite knew what it did.
export function lattice(p = {}) {
  const g = new THREE.Group();
  place(g, MERIDIAN[0] + 0.5, MERIDIAN[1] - 1);
  g.scale.setScalar(0.78);
  g.userData.stagger = true;
  const levels = p.levels ?? 7;
  const edgeMat = new THREE.LineBasicMaterial({ color: '#8ff0ff', transparent: true, opacity: 0.85, fog: true });
  const darkM = plainMist('#1f2630', { k: 0.6 });
  for (let i = 0; i < levels; i++) {
    const s = 4.2 - i * 0.38;
    const lvl = new THREE.Group();
    const geo = new THREE.BoxGeometry(s, 1.3, s);
    const core = new THREE.Mesh(new THREE.BoxGeometry(s * 0.55, 1.3, s * 0.55), darkM);
    lvl.add(core);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    lvl.add(edges);
    lvl.position.y = i * 1.45 + 0.65;
    lvl.rotation.y = i * 0.22;
    lvl.userData.h = 1.5;
    lvl.userData.spin = (i % 2 ? 1 : -1) * 0.04;
    g.add(lvl);
  }
  g.userData.tick = (dt, t) => {
    g.children.forEach((c, i) => {
      if (c.userData.spin) c.rotation.y += dt * c.userData.spin;
    });
    edgeMat.opacity = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.3)) * (0.4 + G.night);
  };
  return g;
}

// The Spindle, far off in the east: a thread of white going up past the top of the sky.
export function spindle(p = {}) {
  const g = new THREE.Group();
  const h = p.h ?? 46;
  const m = new THREE.MeshLambertMaterial({ color: '#f6f2ea', emissive: '#fff2d0', emissiveIntensity: 0.15 });
  addMist(m, 0.55);
  const segs = p.partial ? 5 : 12;
  for (let i = 0; i < segs; i++) {
    const r0 = 1.2 - i * 0.075, hh = h / 12;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(r0 - 0.07, r0, hh, 10), m);
    s.position.y = i * hh + hh / 2;
    const seg = group(s);
    seg.userData.h = hh;
    g.add(seg);
    if (i % 3 === 2) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r0 + 0.5, 0.08, 6, 24), glowMist('#ffe6b0', 0.8));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = (i + 1) * hh;
      g.add(ring);
    }
  }
  g.userData.stagger = true;
  place(g, 13.5, -50);
  return g;
}

// Epilogue architecture: towers that are mostly garden.
export function gardenCity(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  const r = rng(303);
  // [sx, z, height]
  const spots = [[-12, -37, 8.5], [-3.5, -35, 9.5], [3, -41, 7.5], [15, -37, 9], [22, -40, 7], [-20, -38, 7], [-8, -43, 8.5]];
  const white = plainMist('#f4f1e8');
  const glassy = plainMist('#cfe2e6');
  for (const [sx, z, h] of spots) {
    const t = new THREE.Group();
    const levels = Math.round(h / 1.9);
    for (let i = 0; i < levels; i++) {
      const rr = 1.15 - (i / levels) * 0.45 + Math.sin(i * 1.7 + sx) * 0.12;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr * 0.92, 0.22, 14), white);
      disc.position.y = i * 1.9 + 0.11;
      t.add(disc);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.5, rr * 0.55, 1.68, 12), glassy);
      core.position.y = i * 1.9 + 1.06;
      t.add(core);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + i * 0.9;
        t.add(placeIco(0.22 + r() * 0.12, ['#5f9a4a', '#7fae4a', '#8fbf5a'][k % 3], Math.cos(a) * rr * 0.82, i * 1.9 + 0.38, Math.sin(a) * rr * 0.82));
      }
    }
    t.add(placeIco(0.7, '#6fa85a', 0, levels * 1.9 + 0.25, 0));
    t.userData.h = levels * 1.9 + 1;
    place(t, sx, z);
    g.add(t);
  }
  // Floating gardens: islands of trees hanging in the air, tethered by a thread.
  for (const [sx, z, y] of [[-9, -30, 6.5], [18, -32, 7], [4.5, -28, 8]]) {
    const isl = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.7, 7), plainMist('#a8977f', { flatShading: true, k: 0.6 }));
    rock.rotation.x = Math.PI;
    isl.add(rock);
    for (let k = 0; k < 5; k++) isl.add(placeIco(0.35 + r() * 0.3, ['#5f9a4a', '#7fae4a'][k % 2], (r() - 0.5) * 1.6, 0.95, (r() - 0.5) * 1.6));
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, y + 3, 4), plainMist('#ffffff'));
    thread.position.y = -(y + 3) / 2;
    isl.add(thread);
    const base = new THREE.Group();
    base.add(isl);
    isl.position.y = y;
    const ph = r() * 6;
    base.userData.tick = (dt, t) => { isl.position.y = y + Math.sin(t * 0.4 + ph) * 0.25; };
    base.userData.h = 2;
    place(base, sx, z);
    g.add(base);
  }
  return g;
}
