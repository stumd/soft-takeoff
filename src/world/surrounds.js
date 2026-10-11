import * as THREE from 'three';
import { addMist, markCached } from './kit.js';
import { Batch } from './batch.js';
import { G } from '../engine/stage.js';
import { QUALITY } from '../engine/quality.js';
import { rng } from '../engine/tween.js';

// Everything around the plot, so the house sits in a street rather than on a
// floating slab: the ground, the neighbours' houses along the street, the far
// pavement, and the allotments that run down to the river behind. All of it
// is built into a few vertex-coloured meshes (one draw call for the lot, plus
// windows), casts no shadows, and fades with the same mist as the city.

const LITE = QUALITY.lite;

const TONES = {
  green: { grass: '#6f9a52', grass2: '#7ba55c', trees: ['#5f8f45', '#6fa04f', '#4f7f3c'], hedge: '#4f7d42', crop: '#6fae4a' },
  autumn: { grass: '#7c9550', grass2: '#879e58', trees: ['#d9822b', '#c4562c', '#e6a53a', '#7f8f3c'], hedge: '#4f7442', crop: '#8aa848' },
  dry: { grass: '#aaa564', grass2: '#b8b06c', trees: ['#7f9a45', '#8fa04f', '#9a9a4c'], hedge: '#6a7d42', crop: '#a8a050' },
  snow: { grass: '#e9eef2', grass2: '#f2f5f7', trees: null, hedge: '#dfe6e0', crop: '#f4f7f9', snow: true },
  gold: { grass: '#8ea55a', grass2: '#9aae60', trees: ['#8fa548', '#a3a84a', '#c9a040'], hedge: '#5a7d42', crop: '#b8a83a' },
  lush: { grass: '#66a656', grass2: '#74b062', trees: ['#5f9a4a', '#7fae4a', '#4f8a3c'], hedge: '#4f8a42', crop: '#7fbf5a', flowers: true },
};

const HOUSE_COLOURS = ['#9a4a36', '#a8573e', '#e6dcc6', '#8a4434', '#d9d2c4', '#b06a48', '#c9c0ae', '#7f4a3a'];
const ROOF_COLOURS = ['#5a4a44', '#4a4a50', '#6a564c', '#54504c'];

let mats = null;
function materials() {
  if (mats) return mats;
  const body = markCached(new THREE.MeshLambertMaterial({ vertexColors: true }));
  addMist(body);
  const dark = markCached(new THREE.MeshLambertMaterial({ color: '#2a3540' }));
  addMist(dark);
  const lit = markCached(new THREE.MeshLambertMaterial({ color: '#2a3540', emissive: '#ffc070', emissiveIntensity: 0 }));
  addMist(lit);
  mats = { body, dark, lit };
  return mats;
}

// A two-storey house facing the street, front at z = zf, from x0 to x1.
function house(b, win, r, x0, x1, zf, o) {
  const w = x1 - x0, cx = (x0 + x1) / 2, D = o.depth ?? 5, H = o.h ?? 4.8;
  const zc = zf - D / 2;
  const wall = HOUSE_COLOURS[Math.floor(r() * HOUSE_COLOURS.length)];
  const roofC = o.snow ? '#eef2f5' : ROOF_COLOURS[Math.floor(r() * ROOF_COLOURS.length)];
  b.box(w, H, D, wall, cx, 0, zc);
  // roof: ridge along the street, a little overhang
  b.roof(w + 0.3, 1.7, D + 0.5, roofC, cx, H, zc);
  b.box(0.45, 1.0, 0.45, '#7a5040', cx + (r() < 0.5 ? -1 : 1) * (w / 2 - 0.8), H + 0.9, zc - 0.6);
  // windows and door on the front
  const trim = '#f2efe8';
  const door = ['#2f4f6f', '#6a2f2f', '#2f5a3f', '#3a3a3a', '#7a6a2a'][Math.floor(r() * 5)];
  const doorX = r() < 0.5 ? x0 + 1.1 : x1 - 1.1;
  b.box(0.95, 2.0, 0.08, door, doorX, 0, zf + 0.04);
  b.box(1.3, 0.1, 0.5, '#9a958c', doorX, 0, zf + 0.25);
  const cols = Math.max(2, Math.floor(w / 1.8));
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < cols; i++) {
      const x = x0 + (i + 0.5) * (w / cols);
      if (row === 0 && Math.abs(x - doorX) < 1.0) continue;
      const y = row === 0 ? 0.95 : 3.05;
      b.box(1.0, 1.1, 0.06, trim, x, y - 0.05, zf + 0.02);
      const lit = r() < 0.4;
      win[lit ? 'lit' : 'dark'].box(0.86, 0.96, 0.04, '#2a3540', x, y + 0.02, zf + 0.05);
      b.box(1.1, 0.06, 0.16, '#e6e0d4', x, y - 0.08, zf + 0.08);
    }
  }
  // a side window, seen a little from the right
  win.dark.box(0.04, 0.9, 0.8, '#2a3540', x1 + 0.03, 3.05, zc + 0.6);
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
  // a shrub or two
  if (t.trees) b.ico(0.4 + r() * 0.2, t.hedge, x0 + 0.8 + r() * (x1 - x0 - 1.6), 0.35, 1.2 + r() * 1.2);
  if (t.flowers) for (let i = 0; i < 4; i++) b.ico(0.12, ['#f2c230', '#f4a9c0', '#ffffff', '#e0483a'][i], x0 + 0.6 + r() * (x1 - x0 - 1.2), 0.1, 0.4 + r() * 2.2);
}

function tree(b, r, t, x, z, s = 1) {
  const h = (2.0 + r() * 1.4) * s;
  b.cyl(0.14 * s, 0.2 * s, h, '#6b4a34', x, 0, z, { seg: LITE ? 4 : 6 });
  if (!t.trees) {
    // bare winter branches with a dusting of snow
    for (let i = 0; i < 4; i++) {
      const a = r() * Math.PI * 2;
      b.cyl(0.03 * s, 0.05 * s, 1.2 * s, '#6b4a34', x + Math.cos(a) * 0.3 * s, h - 0.4 * s, z + Math.sin(a) * 0.3 * s, { seg: 4, rz: Math.cos(a) * 0.7, rx: -Math.sin(a) * 0.7 });
    }
    b.ico(0.35 * s, '#ffffff', x, h + 0.2 * s, z, { sy: 0.4 });
    return;
  }
  const n = LITE ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, rad = r() * 0.6 * s;
    b.ico((0.7 + r() * 0.4) * s, t.trees[i % t.trees.length], x + Math.cos(a) * rad, h + (r() - 0.2) * 0.8 * s, z + Math.sin(a) * rad);
  }
}

function car(b, r, x, z, flip) {
  const c = ['#3f6fa0', '#b8312f', '#d8d4cc', '#2f3a40', '#6a8a5a', '#8a8f96'][Math.floor(r() * 6)];
  b.box(2.1, 0.45, 0.95, c, x, 0.27, z);
  b.box(1.25, 0.42, 0.88, c, x + (flip ? 0.15 : -0.15), 0.7, z);
  b.box(1.15, 0.32, 0.9, '#2b3440', x + (flip ? 0.15 : -0.15), 0.76, z);
  for (const dx of [-0.68, 0.68]) for (const dz of [-0.45, 0.45]) b.cyl(0.2, 0.2, 0.14, '#1d1d1f', x + dx, 0.2, z + dz - 0.07, { rx: Math.PI / 2, seg: 8 });
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

  // The ground, from the far pavement to the river, under everything; and
  // across the river the far bank, which the city stands on and the mist eats.
  b.quad(XL, XR, -17.2, 220, t.grass, -0.03);
  b.quad(XL - 20, XR + 20, -40, -21.3, t.snow ? '#e4e8ec' : '#8a8a78', -0.03);
  // The far side of the street: pavement, kerb, a low wall and front gardens.
  b.box(XR - XL, 0.1, 1.3, t.snow ? '#eef2f4' : '#b9b4ab', (XL + XR) / 2, 0, 9.05);
  b.box(XR - XL, 0.12, 0.12, '#d6d2ca', (XL + XR) / 2, 0, 8.42);
  b.box(XR - XL, 0.4, 0.3, '#8a7f72', (XL + XR) / 2, 0, 10.0);
  b.box(XR - XL, 0.5, 0.5, t.hedge, (XL + XR) / 2, 0, 10.6);

  // Houses along our street, on both sides of the plot.
  const left = LITE ? [[-16.0, -9.8], [-22.8, -16.6], [-29.6, -23.4]] : [[-16.0, -9.8], [-22.8, -16.6], [-29.6, -23.4], [-36.4, -30.2], [-43.2, -37.0], [-50.0, -43.8]];
  const right = LITE ? [[17.2, 23.0], [23.6, 29.4], [30.0, 35.8], [36.4, 42.2]] : [[17.2, 23.0], [23.6, 29.4], [30.0, 35.8], [36.4, 42.2], [42.8, 48.6], [49.2, 55.0], [55.6, 61.4]];
  for (const [x0, x1] of [...left, ...right]) {
    house(b, win, r, x0, x1, -1.6, { snow: t.snow });
    frontGarden(b, r, x0 - 0.3, x1 + 0.3, t);
  }
  // Side fences between the plots, front garden to back.
  for (const [x0] of [...left, ...right]) b.box(0.06, 1.1, 4.6, '#8a6a4a', x0 - 0.3, 0, -4.4);

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
        b.box(1.5, 1.4, 1.2, ['#7d5b3e', '#5f7a6a', '#8a7a5a', '#6a5a7a'][Math.floor(r() * 4)], sx, 0, z1 + 0.9);
        b.roof(1.7, 0.4, 1.4, t.snow ? '#ffffff' : '#3b3f45', sx, 1.4, z1 + 0.9);
      } else if (roll < 0.5) {
        // bean poles
        for (let q = 0; q < 3; q++) b.cyl(0.03, 0.03, 1.8, '#a08a60', cx - 1 + q * 0.5, 0, z1 + 1.0, { seg: 4, rz: (q - 1) * 0.15 });
      } else if (roll < 0.62 && !t.snow) {
        // a greenhouse
        b.box(1.6, 1.2, 1.0, '#d8eef0', cx + 1.2, 0, z1 + 0.8);
        b.roof(1.7, 0.35, 1.1, '#e8f4f4', cx + 1.2, 1.2, z1 + 0.8);
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
  if (era >= 4) for (let x = -40; x < 60; x += 6) if (x < -13 || x > 19) tree(b, r, t, x + r(), 10.9, 1.0);

  // Parked cars along the street in the early years.
  if (era <= 2) {
    for (const [x, flip] of [[-17.5, false], [-27, true], [21, false], [33.5, true], [45, false]]) car(b, r, x, 5.2, flip);
  }

  const g = new THREE.Group();
  const m = b.mesh(body);
  m.receiveShadow = !LITE;
  g.add(m);
  const wl = win.lit.mesh(lit);
  const wd = win.dark.mesh(dark);
  if (wl) g.add(wl);
  if (wd) g.add(wd);
  g.userData.tick = () => {
    lit.emissiveIntensity = G.night * 1.25;
  };
  return g;
}
