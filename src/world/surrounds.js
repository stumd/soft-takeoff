import * as THREE from 'three';
import { addMist, markCached } from './kit.js';
import { Batch } from './batch.js';
import { G } from '../engine/stage.js';
import { QUALITY } from '../engine/quality.js';
import { rng } from '../engine/tween.js';
import { xAt, sxOf, groundY, HILL } from './terrain.js';

// Everything around the plot, so the house sits in a street rather than on a
// floating slab: the neighbours' houses along the street, the far side of the
// road, the allotments that run down to the river behind, the land the city
// stands on across the river, and (seen only from tall screens, which look
// from higher up) a far district beyond the hill. All of it is built into a few
// vertex-coloured meshes, casts no shadows, and fades with the same mist as
// the city.

const LITE = QUALITY.lite;

const TONES = {
  green: { grass: '#6f9a52', grass2: '#7ba55c', trees: ['#5f8f45', '#6fa04f', '#4f7f3c'], hedge: '#4f7d42', crop: '#6fae4a', bank: '#7a7c6c', hill: '#6f7c5c', ridge: ['#3f4a52', '#7c8a96'] },
  autumn: { grass: '#7c9550', grass2: '#879e58', trees: ['#d9822b', '#c4562c', '#e6a53a', '#7f8f3c'], hedge: '#4f7442', crop: '#8aa848', bank: '#7c786a', hill: '#7a7656', ridge: ['#444a56', '#828a98'] },
  dry: { grass: '#aaa564', grass2: '#b8b06c', trees: ['#7f9a45', '#8fa04f', '#9a9a4c'], hedge: '#6a7d42', crop: '#a8a050', bank: '#8c8870', hill: '#908a60', ridge: ['#58606a', '#949ca6'] },
  snow: { grass: '#e9eef2', grass2: '#f2f5f7', trees: null, hedge: '#dfe6e0', crop: '#f4f7f9', snow: true, bank: '#e2e7eb', hill: '#eef2f5', ridge: ['#9aa6b4', '#d4dce4'] },
  gold: { grass: '#8ea55a', grass2: '#9aae60', trees: ['#8fa548', '#a3a84a', '#c9a040'], hedge: '#5a7d42', crop: '#b8a83a', bank: '#848068', hill: '#868458', ridge: ['#4c545e', '#8a929e'] },
  lush: { grass: '#66a656', grass2: '#74b062', trees: ['#5f9a4a', '#7fae4a', '#4f8a3c'], hedge: '#4f8a42', crop: '#7fbf5a', flowers: true, bank: '#6f8a5e', hill: '#62884f', ridge: ['#4a6262', '#86a2a4'] },
};

const ROOF_COLOURS = ['#5a4a44', '#4a4a50', '#6a564c', '#54504c', '#7a4e40'];

let mats = null;
function materials() {
  if (mats) return mats;
  const body = markCached(new THREE.MeshLambertMaterial({ vertexColors: true }));
  addMist(body, 0.55);
  const dark = markCached(new THREE.MeshLambertMaterial({ color: '#2a3540' }));
  addMist(dark);
  const lit = markCached(new THREE.MeshLambertMaterial({ color: '#2a3540', emissive: '#ffc070', emissiveIntensity: 0 }));
  addMist(lit);
  // the far district: a silhouette against the sky behind it
  const hills = markCached(new THREE.MeshLambertMaterial({ vertexColors: true }));
  addMist(hills, 1, 0.6, -21.4);
  mats = { body, dark, lit, hills };
  return mats;
}

// The neighbours, nearest first. Each house is a little different: storeys,
// roof (ridge along the street, gable to the street, hipped, flat), bay
// windows, porches, dormers, a corner shop.
const LEFT = [
  { w: 6.2, wall: '#e6dcc6', roof: 'gable', bay: true },
  { w: 6.6, wall: '#9a4a36', roof: 'hip', porch: true },
  { w: 5.4, wall: '#d9d2c4', roof: 'front' },
  { w: 7.0, wall: '#b06a48', roof: 'gable', storeys: 1, porch: true },
  { w: 6.4, wall: '#c9c0ae', roof: 'flat', storeys: 3 },
  { w: 6.0, wall: '#8a4434', roof: 'gable', dormer: true, bay: true },
  { w: 6.6, wall: '#e0d6c4', roof: 'hip' },
];
const RIGHT = [
  { w: 5.8, wall: '#d9d2c4', roof: 'gable', bay: true },
  { w: 6.4, wall: '#7f4a3a', roof: 'gable', shop: true },
  { w: 6.2, wall: '#a8573e', roof: 'front', porch: true },
  { w: 5.6, wall: '#c9c0ae', roof: 'hip', dormer: true },
  { w: 7.0, wall: '#9a4a36', roof: 'gable', storeys: 1 },
  { w: 6.2, wall: '#e6dcc6', roof: 'front', bay: true },
  { w: 6.6, wall: '#b06a48', roof: 'flat', storeys: 3 },
];

// Is something of half-width hw at (x, z), behind the room as the default
// camera sees it? (The room runs from x -8 to 0 with its back wall at z -6:
// screen-x -6.0 to 1.7.) The allotment sheds there would stand on its back
// wall's line, as if on its roof.
function behindRoom(x, z, hw) {
  const sx = sxOf(x, z);
  return sx + hw > -6.6 && sx - hw < 2.3;
}

function plots() {
  const out = [];
  const nl = LITE ? 3 : LEFT.length, nr = LITE ? 4 : RIGHT.length;
  let x = -9.8;
  for (let i = 0; i < nl; i++) {
    out.push({ ...LEFT[i], x0: x - LEFT[i].w, x1: x });
    x -= LEFT[i].w + 0.6;
  }
  x = 17.2;
  for (let i = 0; i < nr; i++) {
    out.push({ ...RIGHT[i], x0: x, x1: x + RIGHT[i].w });
    x += RIGHT[i].w + 0.6;
  }
  return out;
}

// A house facing the street, front at z = zf, from x0 to x1.
function house(b, win, r, o, zf, t) {
  const { x0, x1 } = o;
  const w = x1 - x0, cx = (x0 + x1) / 2, D = o.storeys === 3 ? 6 : 5;
  const storeys = o.storeys ?? 2;
  const H = storeys === 1 ? 2.8 : storeys === 3 ? 7.0 : 4.8;
  const zc = zf - D / 2;
  const roofC = t.snow ? '#eef2f5' : ROOF_COLOURS[Math.floor(r() * ROOF_COLOURS.length)];
  b.box(w, H, D, o.wall, cx, 0, zc);
  // roof
  if (o.roof === 'gable') {
    b.roof(w + 0.3, 1.7, D + 0.5, roofC, cx, H, zc);
  } else if (o.roof === 'front') {
    // gable end to the street
    b.roof(D + 0.4, 1.9, w + 0.3, roofC, cx, H, zc, { ry: Math.PI / 2 });
  } else if (o.roof === 'hip') {
    b.cone(Math.SQRT1_2 * (D + 0.5), 1.8, roofC, cx, H, zc, { seg: 4, ry: Math.PI / 4, sx: (w + 0.3) / (D + 0.5) });
  } else {
    b.box(w + 0.1, 0.35, D + 0.1, '#8a8478', cx, H, zc);
  }
  if (o.roof !== 'flat') b.box(0.45, 1.0, 0.45, '#7a5040', cx + (r() < 0.5 ? -1 : 1) * (w / 2 - 0.8), H + (o.roof === 'hip' ? 0.6 : 0.9), zc - 0.6);
  if (o.dormer && o.roof !== 'flat') {
    b.box(1.3, 0.9, 0.9, o.wall, cx, H + 0.25, zf - 0.75);
    b.roof(1.5, 0.45, 1.1, roofC, cx, H + 1.15, zf - 0.75);
    win.dark.box(0.8, 0.55, 0.04, '#2a3540', cx, H + 0.4, zf - 0.28);
  }
  // door, windows
  const trim = '#f2efe8';
  const door = ['#2f4f6f', '#6a2f2f', '#2f5a3f', '#3a3a3a', '#7a6a2a'][Math.floor(r() * 5)];
  const doorX = r() < 0.5 ? x0 + 1.1 : x1 - 1.1;
  b.box(0.95, 2.0, 0.08, door, doorX, 0, zf + 0.04);
  b.box(1.3, 0.1, 0.5, '#9a958c', doorX, 0, zf + 0.25);
  if (o.porch) {
    b.box(1.5, 0.12, 0.8, roofC, doorX, 2.25, zf + 0.4);
    b.box(0.08, 2.25, 0.08, trim, doorX - 0.65, 0, zf + 0.75);
    b.box(0.08, 2.25, 0.08, trim, doorX + 0.65, 0, zf + 0.75);
  }
  const cols = Math.max(2, Math.floor(w / 1.8));
  for (let row = 0; row < storeys; row++) {
    const y = 0.95 + row * 2.1;
    if (row === 0 && o.shop) {
      // a shopfront: a wide lit window, a sign and an awning
      const sx0 = doorX < cx ? doorX + 0.7 : x0 + 0.3, sx1 = doorX < cx ? x1 - 0.3 : doorX - 0.7;
      win.lit.box(sx1 - sx0, 1.4, 0.04, '#2a3540', (sx0 + sx1) / 2, 0.5, zf + 0.05);
      b.box(w, 0.45, 0.1, '#2f4a3a', cx, 2.05, zf + 0.06);
      b.box(sx1 - sx0 + 0.2, 0.08, 0.9, ['#c8372d', '#2f6a8a', '#e8b923'][Math.floor(r() * 3)], (sx0 + sx1) / 2, 1.9, zf + 0.5, { rx: 0.35 });
      continue;
    }
    if (row === 0 && o.bay) {
      // a bay window on the ground floor
      const bx = doorX < cx ? cx + 0.9 : cx - 0.9;
      b.box(2.0, 1.8, 0.6, o.wall, bx, 0, zf + 0.3);
      b.box(2.2, 0.12, 0.75, roofC, bx, 1.8, zf + 0.32);
      win[r() < 0.5 ? 'lit' : 'dark'].box(1.6, 1.0, 0.04, '#2a3540', bx, 0.55, zf + 0.62);
      for (let i = 0; i < cols; i++) {
        const x = x0 + (i + 0.5) * (w / cols);
        if (Math.abs(x - bx) < 1.4 || Math.abs(x - doorX) < 1.0) continue;
        const lit = r() < 0.4;
        if (!LITE) b.box(1.0, 1.1, 0.06, trim, x, y - 0.05, zf + 0.02);
        win[lit ? 'lit' : 'dark'].box(0.86, 0.96, 0.04, '#2a3540', x, y + 0.02, zf + 0.05);
      }
      continue;
    }
    for (let i = 0; i < cols; i++) {
      const x = x0 + (i + 0.5) * (w / cols);
      if (row === 0 && Math.abs(x - doorX) < 1.0) continue;
      const lit = r() < 0.4;
      if (!LITE) b.box(1.0, 1.1, 0.06, trim, x, y - 0.05, zf + 0.02);
      win[lit ? 'lit' : 'dark'].box(0.86, 0.96, 0.04, '#2a3540', x, y + 0.02, zf + 0.05);
      if (!LITE) b.box(1.1, 0.06, 0.16, '#e6e0d4', x, y - 0.08, zf + 0.08);
    }
  }
  // a side window, seen a little from the right
  win.dark.box(0.04, 0.9, 0.8, '#2a3540', x1 + 0.03, storeys > 1 ? 3.05 : 0.95, zc + 0.6);
}

// A front garden: low wall or hedge along the pavement, a path to the door.
function frontGarden(b, r, x0, x1, t) {
  const hedge = r() < 0.5;
  const gateX = x0 + 1.1 + (x1 - x0 - 2.2) * (r() < 0.5 ? 0 : 1);
  for (const [a, c] of [[x0 + 0.1, gateX - 0.6], [gateX + 0.6, x1 - 0.1]]) {
    if (c - a < 0.2) continue;
    if (hedge) b.box(c - a, 0.75, 0.5, t.hedge, (a + c) / 2, 0, 3.0);
    else {
      b.box(c - a, 0.5, 0.25, '#9a5a44', (a + c) / 2, 0, 3.15);
      b.box(c - a + 0.05, 0.06, 0.3, '#c9c0b0', (a + c) / 2, 0.5, 3.15);
    }
  }
  for (let j = 0; j < 7; j++) b.box(0.9, 0.03, 0.55, '#c4bba9', gateX, 0, -1.0 + j * 0.65);
  // a shrub or two, and the bins
  if (t.trees) b.ico(0.4 + r() * 0.2, t.hedge, x0 + 0.8 + r() * (x1 - x0 - 1.6), 0.35, 1.2 + r() * 1.2);
  if (r() < 0.6) {
    const bx = gateX + (gateX < (x0 + x1) / 2 ? 1.2 : -1.2);
    b.box(0.5, 0.85, 0.55, ['#2f4a3a', '#3a3e44', '#2f4a6a'][Math.floor(r() * 3)], bx, 0, 2.2);
  }
  if (t.flowers) for (let i = 0; i < 4; i++) b.ico(0.12, ['#f2c230', '#f4a9c0', '#ffffff', '#e0483a'][i], x0 + 0.6 + r() * (x1 - x0 - 1.2), 0.1, 0.4 + r() * 2.2);
}

function tree(b, r, t, x, z, s = 1, y0 = 0) {
  const h = (2.0 + r() * 1.4) * s;
  b.cyl(0.14 * s, 0.2 * s, h, '#6b4a34', x, y0, z, { seg: LITE ? 4 : 6 });
  if (!t.trees) {
    // bare winter branches with a dusting of snow
    for (let i = 0; i < 4; i++) {
      const a = r() * Math.PI * 2;
      b.cyl(0.03 * s, 0.05 * s, 1.2 * s, '#6b4a34', x + Math.cos(a) * 0.3 * s, y0 + h - 0.4 * s, z + Math.sin(a) * 0.3 * s, { seg: 4, rz: Math.cos(a) * 0.7, rx: -Math.sin(a) * 0.7 });
    }
    b.ico(0.35 * s, '#ffffff', x, y0 + h + 0.2 * s, z, { sy: 0.4 });
    return;
  }
  const n = LITE ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, rad = r() * 0.6 * s;
    b.ico((0.7 + r() * 0.4) * s, t.trees[i % t.trees.length], x + Math.cos(a) * rad, y0 + h + (r() - 0.2) * 0.8 * s, z + Math.sin(a) * rad);
  }
}

function car(b, r, x, z, flip) {
  const c = ['#3f6fa0', '#b8312f', '#d8d4cc', '#2f3a40', '#6a8a5a', '#8a8f96'][Math.floor(r() * 6)];
  b.box(2.1, 0.45, 0.95, c, x, 0.27, z);
  b.box(1.25, 0.42, 0.88, c, x + (flip ? 0.15 : -0.15), 0.7, z);
  b.box(1.15, 0.32, 0.9, '#2b3440', x + (flip ? 0.15 : -0.15), 0.76, z);
  for (const dx of [-0.68, 0.68]) for (const dz of [-0.45, 0.45]) b.cyl(0.2, 0.2, 0.14, '#1d1d1f', x + dx, 0.2, z + dz - 0.07, { rx: Math.PI / 2, seg: LITE ? 5 : 8 });
}

// The land across the river, which the city stands on: flat along the bank,
// then the long rise of the hill to its crest. (Beyond the crest it belongs
// to the far district: see farDistrict().)
const LAND_ZS = [-21.3, -24, -27.5, -29, -30.5, -32, -33.5, -35, -36.5, -38, -39.5, -41, HILL.crest];
// (screen-x extent and grid step: the far land beyond the crest uses the same)
const LAND = LITE ? { sx0: -40, sx1: 52, step: 6 } : { sx0: -60, sx1: 72, step: 3 };
function land(b, t) {
  b.geos.push(landStrip(LAND.sx0, LAND.sx1, LAND.step, LAND_ZS, (z) => Math.min(1, Math.max(0, (-z - 25) / 12)), t.bank, t.hill));
}

// A strip of ground following the terrain, from screen-x SX0 to SX1, through
// the rows zs; its colour goes from c0 to c1 by k(z), patchy along the way.
// (In the same form as a batch's shapes: unindexed, blank uvs.)
function landStrip(SX0, SX1, step, zs, k, c0, c1) {
  const cols = Math.round((SX1 - SX0) / step);
  const pos = [], col = [], idx = [];
  const c = new THREE.Color(), cA = new THREE.Color(c0), cB = new THREE.Color(c1);
  for (let j = 0; j < zs.length; j++) {
    const z = zs[j];
    for (let i = 0; i <= cols; i++) {
      const sx = SX0 + i * step;
      pos.push(xAt(sx, z), groundY(sx, z), z);
      // patchy: lighter and darker ground in turn
      const v = 0.94 + 0.12 * Math.abs(Math.sin(sx * 0.37 + j * 1.7));
      c.copy(cA).lerp(cB, k(z)).multiplyScalar(v);
      col.push(c.r, c.g, c.b);
    }
  }
  const n = cols + 1;
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * n + i, b2 = a + 1, d = a + n, e = d + 1;
      // (wound to face up, towards the camera)
      idx.push(a, b2, d, b2, e, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ng = g.toNonIndexed();
  g.dispose();
  ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(ng.attributes.position.count * 2).fill(0.02), 2));
  return ng;
}

// Beyond the crest of the city's hill, the land falls gently away for a long
// way, and the city carries on at the bottom of it: a far district, cut out
// as one flat silhouette of roofs and towers (taller towards its own centre),
// like the furthest flat of a paper theatre. From a landscape screen both
// hide behind the crest; tall screens and the story's pull-backs look from
// higher up and see the land run back from the crest to the district, which
// stands on it, so a phone's tall frame holds land, not just sky. Both take
// most of their colour from the sky right behind them.
function farDistrict(t) {
  const b = new Batch();
  const SX0 = LITE ? -46 : -76, SX1 = LITE ? 56 : 86, Z = -95;
  // the land, first in the batch so it hides the foot of the district cheaply
  // (on the same grid as the hill's, so they meet without a seam)
  b.geos.push(landStrip(LAND.sx0, LAND.sx1, LAND.step, LITE ? [HILL.crest, Z - 0.3] : [HILL.crest, -52, -64, -78, Z - 0.3], (z) => Math.min(1, (HILL.crest - z) / 40), t.hill, t.ridge[1]));
  const r = rng(911);
  const steps = [];
  for (let sx = SX0; sx < SX1;) {
    const c = Math.exp(-(((sx - 4) / 16) ** 2));
    const w = 0.5 + r() * 1.1;
    const gap = r() < 0.12;
    steps.push([sx, w, gap ? 0 : 0.2 + r() * (0.6 + 1.7 * c) * (r() < 0.15 + 0.2 * c ? 1.6 : 1)]);
    sx += w;
  }
  const hill = (sx) => -20.9 + 0.5 * Math.sin(sx * 0.05 + 1.3) + 0.3 * Math.sin(sx * 0.14);
  // (its foot only just below the land in front of it)
  const shape = new THREE.Shape();
  shape.moveTo(SX0, hill(SX0) - 1.6);
  for (const [a, w, h] of steps) {
    shape.lineTo(a, hill(a) + h);
    shape.lineTo(a + w, hill(a + w) + h);
  }
  shape.lineTo(SX1, hill(SX1) - 1.6);
  shape.lineTo(SX0, hill(SX0) - 1.6);
  const geo = new THREE.ShapeGeometry(shape);
  // shape x is screen-x: stand it along the row at depth Z
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, xAt(p.getX(i), Z), p.getY(i), Z);
  geo.computeVertexNormals();
  b.add(geo, t.ridge[0]);
  geo.dispose();
  return b.mesh(materials().hills);
}

// The green across the road (see surrounds()), from x0 to x1: along its
// front a footpath, a low hedge, benches and flower beds; beyond a stretch of
// lawn with a few shrubs, a row of trees. Only the low front shows (under the
// bottom bar) in the usual view; the trees stand far enough back to come in
// only as the story pulls the camera back and up. Its own random stream, so
// the street's houses are unchanged.
function green(b, t, x0, x1) {
  const r = rng(4041);
  const path = t.snow ? '#f2f5f7' : '#c4b89c';
  const hedge = t.snow ? '#e8eef0' : t.hedge;
  b.box(x1 - x0, 0.03, 0.9, path, (x0 + x1) / 2, 0, 14.65);
  let x = x0;
  while (x < x1) {
    // a run of hedge, then a gap with a bench or a flower bed
    const w = 4 + r() * 4;
    b.box(w, 0.5 + r() * 0.15, 0.5, hedge, x + w / 2, 0, 15.6);
    x += w;
    const roll = r(), gap = 2.2 + r() * 1.4;
    const cx = x + gap / 2;
    if (roll < 0.5) {
      // a bench facing the street
      const wood = ['#7a5a3a', '#5a6a4a', '#6a4e3a'][Math.floor(r() * 3)];
      b.box(1.4, 0.08, 0.45, wood, cx, 0.42, 15.25);
      b.box(1.4, 0.4, 0.07, wood, cx, 0.5, 15.5);
      for (const dx of [-0.6, 0.6]) b.box(0.08, 0.42, 0.4, '#3a3a3a', cx + dx, 0, 15.25);
    } else if (!t.snow) {
      b.box(gap - 0.6, 0.18, 0.9, '#6a4e38', cx, 0, 15.6);
      const fl = t.flowers ? ['#f2c230', '#f4a9c0', '#ffffff'] : [t.crop, t.hedge];
      for (let i = 0; i < 4; i++) b.ico(0.16, fl[i % fl.length], cx - (gap - 1) / 2 + (i / 3) * (gap - 1), 0.25, 15.6);
    }
    x += gap;
    // a clipped bush or two on the lawn behind
    if (r() < 0.5) b.ico(0.32 + r() * 0.1, hedge, x - gap - w * r(), 0.2, 18 + r() * 2.5, { sy: 0.8 });
  }
  // a second footpath, and a row of small trees along it
  b.box(x1 - x0, 0.03, 0.9, path, (x0 + x1) / 2, 0, 22.6);
  for (let tx = x0 + r() * 3; tx < x1; tx += 5 + r() * 3) tree(b, r, t, tx, 24.2 + r() * 1.2, 0.58 + r() * 0.1);
}

/**
 * p.tone: lawn tone of the visit (green, autumn, dry, snow, gold, lush).
 * p.era:  index of the visit; early visits have parked cars, later ones more trees.
 */
export function surrounds(p = {}) {
  const t = TONES[p.tone] || TONES.green;
  const era = p.era ?? 0;
  const r = rng(404);
  const { body, dark, lit } = materials();
  const b = new Batch();
  const win = { lit: new Batch(), dark: new Batch() };
  const XL = -90, XR = 110;

  // The ground from the street to the river, under everything.
  b.quad(XL, XR, -17.2, 10.25, t.grass, -0.03);
  // Across the river: the land the city stands on.
  land(b, t);

  // The far side of the street: pavement, kerb, garden walls with gate
  // piers, hedges, bins, front gardens.
  b.box(XR - XL, 0.1, 1.3, t.snow ? '#eef2f4' : '#b9b4ab', (XL + XR) / 2, 0, 9.05);
  b.box(XR - XL, 0.12, 0.12, '#d6d2ca', (XL + XR) / 2, 0, 8.42);
  b.quad(XL, XR, 10.25, 60, t.snow ? '#e4eaee' : t.grass, -0.03);
  {
    const D0 = LITE ? -24 : -60, D1 = LITE ? 34 : 74;
    // Beyond the front gardens, a green runs along the street: a footpath
    // that the garden paths join, a low hedge, benches and a few trees. It is
    // below the frame until the story pulls the camera back and up. (Not on
    // the lite tier, whose phones keep subtitles over that part of the frame.)
    if (!LITE) green(b, t, D0, D1);
    let x = D0;
    while (x < D1) {
      const w = 5.4 + r() * 1.6;
      const gate = x + 1 + r() * (w - 2);
      const brick = r() < 0.55;
      for (const [a, c] of [[x + 0.15, gate - 0.55], [gate + 0.55, x + w - 0.15]]) {
        if (c - a < 0.2) continue;
        if (brick) {
          b.box(c - a, 0.42, 0.28, ['#9a5a44', '#8a6a5a', '#a8a090'][Math.floor(r() * 3)], (a + c) / 2, 0, 9.9);
          b.box(c - a + 0.04, 0.06, 0.34, '#c9c0b0', (a + c) / 2, 0.42, 9.9);
        } else {
          b.box(c - a, 0.45 + r() * 0.35, 0.55, t.hedge, (a + c) / 2, 0, 10.0);
        }
      }
      // gate piers
      for (const gx of [gate - 0.55, gate + 0.55]) b.box(0.3, 0.62, 0.3, '#b4ab9c', gx, 0, 9.9);
      // a path, a shrub, sometimes the bins or a bench
      b.box(1.0, 0.03, 4.0, t.snow ? '#f2f5f7' : '#b8ae9a', gate, 0, 12.2);
      if (r() < 0.7) b.ico(0.35 + r() * 0.25, t.snow ? '#f2f5f7' : t.hedge, x + 0.8 + r() * (w - 1.6), 0.3, 11.0 + r() * 2);
      const roll = r();
      if (roll < 0.35 && (x > 1 || x + w < -9)) b.box(0.5, 0.8, 0.55, ['#2f4a3a', '#3a3e44', '#2f4a6a'][Math.floor(r() * 3)], gate + 1.1, 0, 9.35);
      x += w;
    }
    // a post box on the corner
    b.cyl(0.24, 0.26, 1.05, '#c8372d', 25.5, 0, 9.3, { seg: 10 });
    b.cyl(0.27, 0.27, 0.12, '#a82a22', 25.5, 1.05, 9.3, { seg: 10 });
  }

  // Houses along our street, on both sides of the plot.
  const ps = plots();
  for (const o of ps) {
    house(b, win, r, o, -1.6, t);
    frontGarden(b, r, o.x0 - 0.3, o.x1 + 0.3, t);
    // side fence between plots, front garden to back
    b.box(0.06, 1.1, 4.6, '#8a6a4a', o.x0 - 0.3, 0, -4.4);
  }

  // Back gardens give way to allotments that run down to the river.
  const AZ0 = -7.0, AZ1 = -16.2;
  b.box(XR - XL, 1.5, 0.08, '#7a5e42', (XL + XR) / 2, 0, AZ0 + 0.2);
  for (let x = XL + 20; x < XR - 20; x += 5.2) {
    if (LITE && (x < -28 || x > 40)) continue;
    for (const [z0, z1] of [[AZ0 - 0.4, -11.2], [-11.9, AZ1]]) {
      const cx = x + 2.6, cz = (z0 + z1) / 2;
      // beds
      const beds = LITE ? 2 : 2 + Math.floor(r() * 2);
      for (let k = 0; k < beds; k++) {
        const bz = z1 + 0.6 + (k + 0.5) * ((z0 - z1 - 1.2) / beds);
        b.box(4.2, 0.12, 0.7, t.snow ? '#f6f8fa' : '#6a4e38', cx - 0.2, 0, bz);
        if (t.snow) continue;
        // a row of crops: a strip on phones, little plants elsewhere
        if (LITE) b.box(3.8, 0.22, 0.32, t.crop, cx - 0.2, 0.12, bz);
        else for (let q = 0; q < 5; q++) b.ico(0.16 + r() * 0.08, t.crop, cx - 2 + q * 0.95 + r() * 0.2, 0.2, bz + (r() - 0.5) * 0.3);
      }
      const roll = r();
      if (roll < 0.35) {
        // a shed
        const sx = cx + 1.4 * (r() < 0.5 ? -1 : 1);
        const col = ['#7d5b3e', '#5f7a6a', '#8a7a5a', '#6a5a7a'][Math.floor(r() * 4)];
        if (!behindRoom(sx, z1 + 0.9, 0.9)) {
          b.box(1.5, 1.4, 1.2, col, sx, 0, z1 + 0.9);
          b.roof(1.7, 0.4, 1.4, t.snow ? '#ffffff' : '#3b3f45', sx, 1.4, z1 + 0.9);
        }
      } else if (roll < 0.5) {
        // bean poles
        if (!behindRoom(cx - 0.5, z1 + 1.0, 0.8)) for (let q = 0; q < 3; q++) b.cyl(0.03, 0.03, 1.8, '#a08a60', cx - 1 + q * 0.5, 0, z1 + 1.0, { seg: 4, rz: (q - 1) * 0.15 });
      } else if (roll < 0.62 && !t.snow) {
        // a greenhouse
        if (!behindRoom(cx + 1.2, z1 + 0.8, 0.9)) {
          b.box(1.6, 1.2, 1.0, '#d8eef0', cx + 1.2, 0, z1 + 0.8);
          b.roof(1.7, 0.35, 1.1, '#e8f4f4', cx + 1.2, 1.2, z1 + 0.8);
        }
      }
      if (r() < 0.3) b.cyl(0.25, 0.25, 0.8, '#3a5a3a', cx - 2.2, 0, z0 - 0.4, { seg: 8 });
    }
  }
  // the path down the middle and the towpath along the river
  b.quad(XL, XR, -11.85, -11.25, t.snow ? '#f7f9fa' : '#b8ad94', 0.0);
  b.quad(XL, XR, -17.2, -16.4, t.snow ? '#f7f9fa' : '#c4b89c', 0.005);
  // a railing along the towpath
  b.box(XR - XL, 0.05, 0.05, '#4a4d50', (XL + XR) / 2, 0.85, -17.1);

  // Trees: along the river (with gaps to see across), and among the plots.
  const extra = era >= 4 ? 1 : 0;
  for (let x = -60; x < 80; x += 5.5 - extra * 1.5) {
    if (LITE && (x < -28 || x > 44)) continue;
    const skip = r();
    if (skip < 0.3) continue;
    tree(b, r, t, x + r() * 2, -16 + (r() - 0.5) * 0.8, 0.8 + r() * 0.3);
  }
  for (let i = 0; i < (LITE ? 5 : 9) + extra * 4; i++) tree(b, r, t, -30 + r() * 70, -8.5 - r() * 6, 0.7 + r() * 0.25);
  // Street trees along the far pavement, later on, when the road went green.
  // (Not in front of the plot, where they would hide the room.)
  // (Small, and not in front of the plot, where they would hide the street.)
  if (era >= 4) for (let x = -40; x < 60; x += 6) if (x < -15 || x > 27) tree(b, r, t, x + r(), 11.2, 0.62);

  // Parked cars along the street in the early years.
  if (era <= 2) {
    for (const [x, flip] of [[-17.5, false], [-27, true], [21, false], [33.5, true], [45, false]]) car(b, r, x, 5.2, flip);
  }

  const g = new THREE.Group();
  const m = b.mesh(body);
  m.receiveShadow = !LITE;
  g.add(m);
  g.add(farDistrict(t));
  const wl = win.lit.mesh(lit);
  const wd = win.dark.mesh(dark);
  if (wl) g.add(wl);
  if (wd) g.add(wd);
  g.userData.tick = () => {
    lit.emissiveIntensity = G.night * 1.25;
  };
  return g;
}
