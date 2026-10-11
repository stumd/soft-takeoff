import { THREE, cyl, group, textTex, windowTex, emissiveWindowTex, addMist, markCached, drawnTexture } from './kit.js';
import { Batch } from './batch.js';
import { G } from '../engine/stage.js';
import { QUALITY } from '../engine/quality.js';
import { rng } from '../engine/tween.js';
import { xAt, groundY, place } from './terrain.js';

// The world beyond the back gardens, seen side-on like the flats of a paper
// theatre. From front to back (world z):
//   -7 .. -16    allotments behind the houses          (surrounds.js)
//  -17 .. -21    the river, and a bridge
//  -22 .. -28    the far bank, flat: Meridian, data centres, factory, reactor
//  -29 .. -44    the city, climbing a gentle hill (terrain.js) in five rows;
//                each row back is smaller, finer-windowed and paler, so the
//                city recedes rather than standing as one wall
//  -48           the Spindle, rising from behind the crest
// Positions are given as screen-x (sx: left/right as the default camera sees
// it, in world units) and world z; see terrain.js.

export { xAt };

const LITE = QUALITY.lite;
// How far along the street the city extends, in screen-x.
const SX0 = LITE ? -32 : -44, SX1 = LITE ? 40 : 52;

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

// ---------------------------------------------------------------------------
// The ordinary city

const PAL = {
  brick: ['#9a5a46', '#a86a50', '#8a4a3a', '#b07a5a', '#94604c'],
  render: ['#d8cfc0', '#c9bfae', '#e0d6c4', '#b8ab98', '#cdbfa6'],
  concrete: ['#9aa5b1', '#8d98a6', '#a3a8ad', '#b4a99a', '#7f8b99', '#a89482'],
  glass: ['#8fa8bc', '#a5b8c8', '#7f97ad', '#9fb2bf'],
  ware: ['#8a6a5a', '#7a8590', '#a09080', '#6f7d7a', '#94877a'],
};
const ROOF = { slate: '#5a5e66', tile: '#8a5040', dark: '#4a4c52', lead: '#6a6f78' };
const pick = (r, a) => a[Math.floor(r() * a.length)];

// Rows of the city, front to back, each a little up the hill. `s` scales the
// buildings (a stand-in for perspective, which this orthographic view lacks),
// `unit` is the window pitch (finer further back), `peak` how much taller the
// row grows towards the old centre behind the garden, `mix` the kinds of
// building in the row: riverside terraces and sheds, then flats and offices,
// then the towers of the centre, then small, plain blocks on the crest.
const ROWS = [
  { z: -29.2, s: 1.0, h: [0.85, 1.5], peak: 0.35, unit: 0.66, mix: { terrace: 4, warehouse: 3, block: 3 } },
  { z: -31.9, s: 0.88, h: [1.1, 2.0], peak: 1.0, unit: 0.6, mix: { terrace: 3, block: 5, slab: 2 } },
  { z: -34.6, s: 0.78, h: [1.3, 2.4], peak: 2.3, unit: 0.54, mix: { block: 5, tower: 2.5, terrace: 2 } },
  { z: -37.3, s: 0.68, h: [1.2, 2.2], peak: 1.2, unit: 0.48, mix: { block: 6, terrace: 2.5, tower: 1 } },
  { z: -40.0, s: 0.58, h: [0.9, 1.6], peak: 0.5, unit: 0.42, mix: { block: 7, terrace: 3 }, far: true },
];
const CENTRE = 6; // screen-x of the old town centre, behind the garden
const bump = (sx) => Math.exp(-(((sx - CENTRE) / 11) ** 2));
// Downriver, behind the reactor, the riverside rows give way to open works
// land (and later the solar farm).
const works = (ri, sx) => ri === 0 && sx > 15.5 && sx < 28;

function pickKind(r, mix) {
  let t = 0;
  for (const k in mix) t += mix[k];
  let x = r() * t;
  for (const k in mix) if ((x -= mix[k]) <= 0) return k;
  return 'block';
}

const TREE = { old: ['#5f7a4a', '#6f8a4a', '#566f44'], snow: ['#e9eef2', '#dde5ea'], green: ['#5f9a4a', '#7fae4a', '#4f8a3c'] };

/**
 * The ordinary city. `variant`:
 *  old      - 2026ish
 *  snow     - roofs white
 *  green    - roofs planted, some buildings replaced (epilogue)
 *  thin     - partially demolished (kettle sequence midpoint)
 * Every building's random values are drawn whatever the variant, so the
 * variants are the same city with some buildings left out.
 */
export function city(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  const variant = p.variant || 'old';
  const snow = variant === 'snow', green = variant === 'green';
  const roofCol = (c) => (snow ? '#f2f5f8' : green ? '#6f9a55' : c);
  const trees = TREE[snow ? 'snow' : green ? 'green' : 'old'];
  const r = rng(77);
  const perClump = LITE ? 16 : 11;

  ROWS.forEach((row, ri) => {
    const s = row.s;
    let batch = new Batch();
    let count = 0, maxH = 0, clump = 0;
    const flush = () => {
      if (!batch.size) return;
      const c = group(batch.mesh(cityMat(ri * 3 + clump)));
      c.userData.h = maxH + 1;
      g.add(c);
      batch = new Batch();
      count = 0;
      maxH = 0;
      clump++;
    };
    // Is this building kept in this variant? (r() is drawn either way.)
    const keep = (roll, sx) => {
      if (variant === 'thin' && roll < 0.45) return false;
      if (green && roll < 0.33) return false;
      // fewer, further apart, out towards the ends of the street
      const edge = Math.min(1, Math.max(0, (Math.abs(sx - CENTRE) - 20) / 22));
      if (roll > 1 - edge * 0.65) return false;
      // lite: the back rows are sparser
      if (LITE && ri >= 3 && roll > 0.72) return false;
      return true;
    };
    const tree = (sx, z, k = 1) => {
      const x = xAt(sx, z), y = groundY(sx, z);
      const rad = (0.32 + r() * 0.22) * s * k;
      batch.ico(rad, pick(r, trees), x, y + rad * 0.8, z, { sy: 1.15 });
      if (!LITE && r() < 0.5) batch.ico(rad * 0.75, pick(r, trees), x + rad * 0.7, y + rad * 0.6, z + (r() - 0.5) * rad);
    };

    let sx = SX0 + r() * 3;
    while (sx < SX1) {
      // A block: buildings shoulder to shoulder, then a street, or a little park.
      const end = sx + (3.5 + r() * 6.5) * s;
      const roll0 = r();
      if (roll0 < 0.14 && ri < 4) {
        // a park, a churchyard, a bit of green
        const len = (1.6 + r() * 2.6) * s;
        const n = Math.round(len / (0.9 * s));
        for (let i = 0; i < n; i++) if (keep(r(), sx) || green) tree(sx + (i + 0.5) * (len / n), row.z + (r() - 0.5) * 1.6 * s, 1.1);
        sx += len + 0.4 * s;
        continue;
      }
      while (sx < end) {
        const kind = pickKind(r, row.mix);
        const roll = r();
        const zc = row.z + (r() - 0.5) * 0.8 * s;
        const hr = r(), pr = r(), cr = r(), xr = r(), wr = r();
        let w, used;
        const b = bump(sx);
        let h = (row.h[0] + Math.pow(hr, 1.3) * (row.h[1] - row.h[0]) + row.peak * b * (0.3 + pr * 0.9)) * s;
        // deep blocks: from this low angle their roofs fill the city in
        const d = (kind === 'tower' ? 0.9 + xr * 0.3 : 1.5 + xr * 1.0) * s;
        if (kind === 'terrace') {
          // a run of narrow two-storey houses under a pitched roof
          const n = 2 + Math.floor(wr * 4);
          const hw = (0.62 + cr * 0.2) * s;
          w = n * hw;
          used = w;
          h = (0.62 + hr * 0.22) * s;
        } else if (kind === 'warehouse') {
          w = (2.2 + wr * 2.4) * s;
          used = w;
          h = (0.55 + hr * 0.35) * s;
        } else if (kind === 'slab') {
          w = (2.6 + wr * 1.8) * s;
          used = w;
          h = Math.min(h, (1.2 + hr * 0.6) * s);
        } else if (kind === 'tower') {
          w = (0.7 + wr * 0.35) * s;
          used = w + 0.25 * s;
          h *= 1.45 + cr * 0.45;
        } else {
          w = (1.0 + wr * 1.4) * s;
          used = w;
        }
        const cx = sx + w / 2;
        sx += used + (r() < 0.12 ? (0.15 + r() * 0.3) * s : 0.03);
        if (works(ri, cx)) {
          // open ground downriver: a few trees
          if (roll < 0.85) tree(cx, zc, 1.2);
          if (roll < 0.4) tree(cx + 0.9, zc - 0.8, 1.1);
          continue;
        }
        if (!keep(roll, cx)) continue;
        const zf = zc + d / 2;
        const x = xAt(cx, zc), y = groundY(cx, zf) - 0.04;
        if (kind === 'terrace') {
          const n = Math.round(w / ((0.62 + cr * 0.2) * s));
          const wall = cr < 0.55 ? pick(r, PAL.brick) : pick(r, PAL.render);
          const rc = roofCol(cr < 0.5 ? ROOF.tile : ROOF.slate);
          batch.box(w, h, d, wall, x, y, zc, { unit: 1.5 * s });
          batch.roof(w + 0.06 * s, 0.27 * d, d + 0.1 * s, rc, x, y + h, zc);
          if (!row.far) for (let i = 0; i < n; i++) batch.box(0.1 * s, 0.22 * s, 0.12 * s, '#7a5040', xAt(cx - w / 2 + (i + 0.5) * (w / n), zc), y + h + 0.12 * s, zc - 0.12 * s);
        } else if (kind === 'warehouse') {
          const wall = pick(r, PAL.ware);
          batch.box(w, h, d, wall, x, y, zc);
          // a row of gables, ridges running back, and a big door
          const teeth = Math.max(2, Math.round(w / (0.9 * s)));
          const tw = w / teeth;
          for (let i = 0; i < teeth; i++) batch.roof(d + 0.04, 0.28 * s, tw, roofCol(i % 2 ? ROOF.lead : '#7d8288'), xAt(cx - w / 2 + (i + 0.5) * tw, zc), y + h, zc, { ry: Math.PI / 2 });
          batch.box(0.5 * s, 0.42 * s, 0.03, '#3a3e44', xAt(cx - w * 0.25, zf), y, zf + 0.01);
        } else {
          const pal = kind === 'tower' ? PAL.glass : kind === 'slab' ? PAL.concrete : pick(r, [PAL.concrete, PAL.concrete, PAL.render, PAL.brick]);
          const col = pick(r, pal);
          const unit = kind === 'tower' ? row.unit * 0.8 : row.unit;
          if (kind === 'tower') {
            // a setback two-thirds of the way up, and a mast
            const h1 = h * 0.66;
            batch.box(w, h1, d * 0.85, col, x, y, zc, { unit });
            batch.box(w * 0.74, h - h1, d * 0.65, col, x, y + h1, zc, { unit });
            batch.box(w * 0.8, 0.06 * s, d * 0.7, '#e8ecf0', x, y + h1, zc);
            if (!row.far) batch.box(0.04, 0.6 * s, 0.04, '#d8dce0', x, y + h, zc);
          } else {
            batch.box(w, h, d, col, x, y, zc, { unit });
            batch.box(w + 0.08 * s, 0.1 * s, d + 0.08 * s, roofCol('#6a6f78'), x, y + h, zc);
            if (!row.far && h > 1.5 * s && cr < 0.35) {
              // a stepped top
              batch.box(w * 0.6, 0.35 * s, d * 0.6, col, x, y + h + 0.1 * s, zc, { unit });
            } else if (!row.far && cr > 0.7) {
              batch.box(0.5 * s, 0.32 * s, 0.5 * s, roofCol('#80858c'), xAt(cx + (xr - 0.5) * w * 0.4, zc), y + h + 0.1 * s, zc);
            }
          }
          if (green && kind !== 'tower') {
            batch.box(w * 0.9, 0.2 * s, d * 0.9, '#6fa25a', x, y + h + 0.1 * s, zc);
            batch.ico(0.3 * s, '#7fae4a', x, y + h + 0.42 * s, zc);
            batch.box(w + 0.02, h * (0.3 + hr * 0.5), 0.05, '#5e8f48', x, y, zf + 0.01);
          }
        }
        // a street tree out front now and then
        if (!row.far && r() < 0.18) tree(sx + 0.1, zf + 0.35 * s, 0.8);
        maxH = Math.max(maxH, h + y);
        if (++count >= perClump) flush();
      }
      sx += (0.45 + r() * 0.6) * s;
    }
    flush();
  });

  // Old landmarks that survive every version: a church spire and a clock tower.
  const lm = new Batch();
  {
    const z = -33, sx = -7, s = 0.9, x = xAt(sx, z), y = groundY(sx, z + 0.7) - 0.05;
    lm.box(1.3 * s, 4.6 * s, 1.3 * s, '#b8ab98', x, y, z);
    lm.box(1.45 * s, 0.2 * s, 1.45 * s, '#9a8e7c', x, y + 4.6 * s, z);
    lm.cone(0.8 * s, 4.0 * s, roofCol('#7b8790'), x, y + 4.8 * s, z);
    lm.box(1.1 * s, 2.0 * s, 2.6 * s, '#b0a490', xAt(sx, z - 1.8), y, z - 1.8);
    lm.roof(2.7 * s, 0.7 * s, 1.2 * s, roofCol('#6f7a84'), xAt(sx, z - 1.8), y + 2.0 * s, z - 1.8, { ry: Math.PI / 2 });
    const z2 = -37.3, sx2 = 19, s2 = 0.7, x2 = xAt(sx2, z2), y2 = groundY(sx2, z2 + 0.6) - 0.05;
    lm.box(1.3 * s2, 6.4 * s2, 1.3 * s2, '#c2b29a', x2, y2, z2);
    lm.box(1.5 * s2, 0.3 * s2, 1.5 * s2, '#8a7e6e', x2, y2 + 6.4 * s2, z2);
    lm.cone(0.9 * s2, 1.6 * s2, roofCol('#6f7a84'), x2, y2 + 6.7 * s2, z2, { seg: 4, ry: Math.PI / 4 });
  }
  const landmarks = group(lm.mesh(batchMat()));
  landmarks.userData.h = 10;
  g.add(landmarks);
  return g;
}

// The river along the bottom of the allotments, glimpsed between the trees,
// and an old stone bridge that crosses it on the skew.
export function river(p = {}) {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: p.clean ? '#78b6cc' : '#7c94a0' });
  addMist(m, 0.6);
  const w = 160;
  const water = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 3.8), m);
  water.position.set(xAt(8, -19.2), -0.02, -19.2);
  g.add(water);
  // the far bank: a stone embankment
  const b = new Batch();
  b.box(w, 0.7, 0.6, '#9c958a', xAt(8, -21.3), 0, -21.3);
  b.box(w, 0.08, 0.7, '#b4ad9f', xAt(8, -21.3), 0.7, -21.3);
  // The bridge: from the towpath at sx -10 to the far bank at sx -15.
  const a = new THREE.Vector3(xAt(-10, -16.6), 0, -16.6), c = new THREE.Vector3(xAt(-15, -22), 0, -22);
  const len = a.distanceTo(c), ang = Math.atan2(c.x - a.x, c.z - a.z);
  const mid = a.clone().lerp(c, 0.5);
  const along = (t, side = 0) => [a.x + (c.x - a.x) * t + Math.cos(ang) * side, a.z + (c.z - a.z) * t - Math.sin(ang) * side];
  b.box(1.5, 0.22, len + 0.6, '#a89c88', mid.x, 0.95, mid.z, { ry: ang });
  for (const side of [-0.7, 0.7]) {
    const [px, pz] = along(0.5, side);
    b.box(0.12, 0.3, len + 0.6, '#b4a894', px, 1.17, pz, { ry: ang });
  }
  for (const t of [0.0, 0.36, 0.64, 1.0]) {
    const [px, pz] = along(t);
    b.box(1.4, 0.95, 0.5, '#9a8e7a', px, 0, pz, { ry: ang });
  }
  const bridge = b.mesh(batchMat(0.7));
  g.add(bridge);
  g.userData.h = 1.5;
  return g;
}

// ---------------------------------------------------------------------------
// The far bank between the big sites: old riverside sheds and boatyards,
// stacked containers, a few cottages, and trees along the embankment road.
// `taken` lists the sites that stand on the bank in this visit; the old
// riverside fills whatever they leave. `green`: the epilogue's parkland.

const SITES = {
  meridian: [1.2, 11.8], lattice: [1.2, 11.8], lake: [-2.6, 15.6], dc0: [-8, -0.4], dc1: [16.4, 22.8], dc2: [-22.8, -16.2],
  reactor: [10.8, 16.6], factory: [-16, -7.6], solar: [15.2, 30],
};

export function riverside(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  const green = !!p.green;
  const taken = (p.taken || []).map((k) => SITES[k]).filter(Boolean);
  const free = (a, c) => taken.every(([x0, x1]) => c < x0 - 0.2 || a > x1 + 0.2);
  const trees = green ? TREE.green : p.snow ? TREE.snow : TREE.old;
  const r = rng(515);
  const SXa = LITE ? -30 : -42, SXb = LITE ? 38 : 50;
  let batch = new Batch(), count = 0, maxH = 0;
  const flush = () => {
    if (!batch.size) return;
    const c = group(batch.mesh(cityMat(1)));
    c.userData.h = maxH + 1;
    g.add(c);
    batch = new Batch();
    count = 0;
    maxH = 0;
  };
  const tree = (sx, z, k = 1) => {
    const rad = (0.34 + r() * 0.2) * k;
    batch.cyl(0.05, 0.07, 0.4 * k, '#6b4a34', xAt(sx, z), 0, z, { seg: 4 });
    batch.ico(rad, pick(r, trees), xAt(sx, z), 0.35 * k + rad * 0.8, z, { sy: 1.1 });
  };
  // trees along the embankment road, with gaps to see the sites through
  for (let sx = SXa; sx < SXb; sx += 1.8 + r() * 2.4) {
    const roll = r(), zr = r();
    if (roll < (green ? 0.15 : 0.4)) continue;
    tree(sx, -22.0 + (zr - 0.5) * 0.3, green ? 1.2 : 1);
  }
  flush();
  let sx = SXa + r() * 2;
  while (sx < SXb) {
    const roll = r(), wr = r(), hr = r(), zr = r(), cr = r();
    const kind = green ? (roll < 0.7 ? 'park' : 'boathouse') : roll < 0.42 ? 'shed' : roll < 0.62 ? 'yard' : roll < 0.85 ? 'cottages' : 'park';
    const w = kind === 'shed' || kind === 'boathouse' ? 2.4 + wr * 2.2 : kind === 'yard' ? 2.0 + wr * 1.6 : kind === 'cottages' ? 2.2 + wr * 1.6 : 1.6 + wr * 2;
    const a = sx;
    sx += w + 0.5 + r() * 0.9;
    if (!free(a, a + w)) continue;
    const cx = a + w / 2;
    const zc = -24.8 - zr * 1.4;
    const x = xAt(cx, zc);
    if (kind === 'shed' || kind === 'boathouse') {
      const d = 2.2 + cr * 1.0, h = 0.7 + hr * 0.45;
      const wall = kind === 'boathouse' ? '#7a5e48' : pick(r, PAL.ware);
      batch.box(w, h, d, wall, x, 0, zc);
      batch.roof(w + 0.1, 0.32 * d, d + 0.15, p.snow ? '#f2f5f8' : green ? '#6f9a55' : pick(r, [ROOF.slate, ROOF.lead, '#7d8288']), x, h, zc);
      batch.box(0.7, 0.55, 0.03, '#3a3e44', xAt(cx - w * 0.2, zc + d / 2), 0, zc + d / 2 + 0.01);
      maxH = Math.max(maxH, h + 0.8);
    } else if (kind === 'yard') {
      const cols = ['#b8443a', '#2f6a8a', '#c8a03a', '#5a7a5a', '#8a8f96'];
      const n = 3 + Math.floor(hr * 4);
      for (let i = 0; i < n; i++) {
        const stack = r() < 0.4 ? 1 : 0;
        batch.box(1.2, 0.5, 0.5, pick(r, cols), xAt(a + 0.6 + (i % 3) * 1.25 * (w / 4), zc + (i < 3 ? 0.4 : -0.4)), stack * 0.5, zc + (i < 3 ? 0.4 : -0.4));
      }
      if (p.snow) batch.box(w, 0.06, 1.6, '#f2f5f8', x, 1.0, zc);
      maxH = Math.max(maxH, 1.1);
    } else if (kind === 'cottages') {
      const d = 1.6, h = 0.62 + hr * 0.2;
      batch.box(w, h, d, pick(r, cr < 0.5 ? PAL.brick : PAL.render), x, 0, zc, { unit: 1.5 });
      batch.roof(w + 0.06, 0.45, d + 0.1, p.snow ? '#f2f5f8' : ROOF.tile, x, h, zc);
      maxH = Math.max(maxH, h + 0.5);
    } else {
      const n = 2 + Math.floor(wr * 3);
      for (let i = 0; i < n; i++) tree(a + (i + 0.5) * (w / n), zc + (r() - 0.5) * 1.8, 1 + r() * 0.3);
      maxH = Math.max(maxH, 1.4);
    }
    if (++count >= 10) flush();
  }
  flush();
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
    // on tall legs at the downriver corner of the site, where it can be read
    // from the street (and from beside the title)
    bb.position.set(5.6, 4.2, D / 2 + 0.8);
    g.add(group(bb, mb(0.16, 3.5, 0.16, plainMist('#444'), 3.7, 0, D / 2 + 0.8), mb(0.16, 3.5, 0.16, plainMist('#444'), 7.5, 0, D / 2 + 0.8)));
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
  const spots = [[-4.2, -26.6, 7.5, 4.5], [19.6, -26.2, 6.5, 4], [-19.5, -27, 7, 4], [27, -27.2, 6, 4]];
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
  place(g, 13.6, -23.6);
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
  hb.box(15, 0.4, D / Math.cos(SLOPE) + 0.4, '#8f9f66', xAt(22.4, Z0 - D / 2), yAt(Z0 - D / 2) - 0.4, Z0 - D / 2, { rx: SLOPE });
  hill.add(hb.mesh(batchMat(0.8)));
  hill.userData.h = 2;
  g.add(hill);
  const pm = plainMist('#2a3d62', { k: 0.7 });
  for (let i = 0; i < rows; i++) {
    const row = new THREE.Group();
    const z = Z0 - 0.8 - (i % 6) * 1.35;
    const n = 4;
    for (let k = 0; k < n; k++) {
      const pn = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.9), pm);
      pn.rotation.x = -0.5;
      pn.position.set(k * 1.5, 0.3, 0);
      row.add(pn);
    }
    row.userData.h = 1;
    place(row, i < 6 ? 16.6 : 23.6, z, yAt(z) - groundY(20, z));
    g.add(row);
  }
  return g;
}

// Slender glass towers that went up in weeks: needles among the city rows,
// smaller the further up the hill they stand. Each tower is one
// vertex-coloured mesh, plus its lights.
const rowScale = (z) => Math.max(0.55, 1 - ((-29.2 - z) / 10.8) * 0.42);

export function newTowers(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  // [sx, z, height]
  const spots = [
    [-3, -33.4, 7.2], [2.6, -35.8, 6.4], [-10.5, -34.2, 6.6], [13.6, -34, 7], [-6.8, -36.8, 7.6], [-17.5, -33.2, 5.8], [19.5, -36.2, 6.4], [9.8, -37.6, 6.8], [-23.5, -32.4, 5.4], [25.5, -34.4, 5.8],
  ];
  const n = p.n ?? 3;
  for (let i = 0; i < n; i++) {
    const [sx, z, h0] = spots[i];
    const k = rowScale(z);
    const h = h0 * k;
    const t = new THREE.Group();
    const b = new Batch();
    // the last one (two, once there are more) is still being printed
    const partial = p.building && i >= n - (n > 3 ? 2 : 1);
    const hh = partial ? h * 0.55 : h;
    const w = 0.85 * k;
    const [c1, c2] = i % 2 ? ['#9fc0d8', '#c4d8e4'] : ['#c4d8e4', '#9fc0d8'];
    // a slight setback halfway up
    b.box(w, hh * 0.6, w, c1, 0, 0, 0);
    b.box(w * 0.8, hh * 0.4, w * 0.8, c2, 0, hh * 0.6, 0);
    for (let y = 1.1 * k; y < hh; y += 1.1 * k) {
      const q = y < hh * 0.6 ? 1 : 0.8;
      b.box(w * q + 0.05, 0.05, w * q + 0.05, '#eef3f6', 0, y, 0);
    }
    if (!partial) {
      b.cone(0.32 * k, 1.6 * k, '#e4ecf2', 0, hh, 0);
      b.box(0.02, 0.9 * k, 0.02, '#eef3f6', 0, hh + 1.6 * k, 0);
    } else {
      // the printer gantry
      b.box(0.1, hh + 1.6 * k, 0.1, '#e8b923', -0.7 * k, 0, -0.7 * k);
      b.box(0.1, hh + 1.6 * k, 0.1, '#e8b923', 0.7 * k, 0, 0.7 * k);
      b.box(1.6 * k, 0.14, 1.6 * k, '#e8b923', 0, hh + 0.8 * k, 0);
      t.add(mb(0.3 * k, 0.3 * k, 0.3 * k, glowMist('#ff9a3d', 1.4), 0, hh + 0.4 * k, 0));
    }
    t.add(b.mesh(batchMat()));
    t.add(mb(0.16, 0.16, 0.16, glowMist('#ff5a4a', 0.8), 0, hh + (partial ? 0 : 2.5 * k), 0));
    t.userData.h = hh + 4;
    place(t, sx, z, -0.05);
    g.add(t);
    // the hotspot marker sits on the first (most central) tower's spire
    if (i === 0) g.userData.anchor = new THREE.Vector3(t.position.x, t.position.y + hh * 0.75, z);
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
  place(g, -11.8, -24.4);
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

// The Spindle, far off in the east: a thread of white going up past the top
// of the sky. It rises from beyond the crest of the hill, thin and bright,
// ringed every so often with light; faintly self-lit, so it reads by day
// and glimmers by night.
export function spindle(p = {}) {
  const g = new THREE.Group();
  const H = 64;
  const m = new THREE.MeshLambertMaterial({ color: '#fbf8f2', emissive: '#fff6e4', emissiveIntensity: 0.55 });
  addMist(m, 0.3);
  const ringM = glowMist('#ffe6b0', 1.1);
  const day = new THREE.Color('#fff6e4'), night = new THREE.Color('#8a92a8');
  // under construction it is a stub with a glowing collar where it grows
  const segs = p.partial ? 2 : 16;
  const hh = H / 16;
  for (let i = 0; i < segs; i++) {
    const r0 = 0.26 - i * 0.009;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(r0 - 0.009, r0, hh, 8), m);
    s.position.y = i * hh + hh / 2;
    const seg = group(s);
    seg.userData.h = hh;
    g.add(seg);
    if (i % 3 === 1 || (p.partial && i === segs - 1)) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r0 + 0.5 - i * 0.012, 0.045, 5, 28), ringM);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = (i + 1) * hh - 0.3;
      g.add(ring);
    }
  }
  g.userData.stagger = true;
  g.userData.tick = () => m.emissive.copy(day).lerp(night, Math.min(1, G.night * 0.8));
  place(g, 11.2, -48.5, -0.2);
  // the hotspot marker: on the thread, a little above the skyline
  g.userData.anchor = new THREE.Vector3(0, 4.2, 0);
  return g;
}

// Epilogue architecture: towers that are mostly garden.
export function gardenCity(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  const r = rng(303);
  // [sx, z, height]
  const spots = [[-12, -35.6, 8.5], [-3.5, -33.8, 9.5], [3, -39.4, 7.5], [15, -35.6, 9], [22, -38.4, 7], [-20, -36.6, 7], [-8, -39.8, 8.5]];
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
    t.scale.setScalar(rowScale(z));
    place(t, sx, z, -0.05);
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
