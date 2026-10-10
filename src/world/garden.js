import { THREE, box, cyl, sphere, ico, cone, group, mat, card, plane } from './kit.js';
import { G } from '../engine/stage.js';
import { rng } from '../engine/tween.js';

// The base of the diorama, the garden, Arthur's shed and the apple tree.

export const SLAB = { x0: -8.6, x1: 16.4, z0: -6.6, z1: 8.4 };

export function slab() {
  const g = new THREE.Group();
  const w = SLAB.x1 - SLAB.x0, d = SLAB.z1 - SLAB.z0;
  const cx = (SLAB.x0 + SLAB.x1) / 2, cz = (SLAB.z0 + SLAB.z1) / 2;
  g.add(box(w, 0.5, d, '#5a4434', { x: cx, y: -0.5, z: cz, receive: true }));
  g.add(box(w - 0.1, 0.9, d - 0.1, '#7d6a58', { x: cx, y: -1.4, z: cz }));
  g.add(box(w - 0.3, 0.3, d - 0.3, '#6b5a4a', { x: cx, y: -1.7, z: cz }));
  // a few stones in the soil band
  const r = rng(5);
  for (let i = 0; i < 26; i++) {
    const onX = r() < 0.6;
    const x = onX ? SLAB.x0 + r() * w : SLAB.x1 + 0.02;
    const z = onX ? SLAB.z1 + 0.02 : SLAB.z0 + r() * d;
    g.add(ico(0.08 + r() * 0.12, '#9a8a78', { x, y: -0.6 - r() * 1.0, z, sy: 0.6 }));
  }
  return g;
}

const LAWN = {
  green: '#7fa55a',
  dry: '#b7b26a',
  autumn: '#8ea35a',
  snow: '#f1f4f6',
  lush: '#6fae5a',
  gold: '#9fae5c',
};

export function lawn(p = {}) {
  const g = new THREE.Group();
  const c = LAWN[p.tone || 'green'];
  const m = mat(c, { rough: 1 });
  const add = (x0, x1, z0, z1) => {
    const pl = plane(x1 - x0, z1 - z0, c, { mat: m, x: (x0 + x1) / 2, y: 0.01, z: (z0 + z1) / 2 });
    g.add(pl);
  };
  add(0.2, 16.4, -6.6, 3.3); // garden + Tomasz
  add(-8.6, 0.2, 0.2, 3.3); // front garden
  add(-8.6, 0.2, -6.6, -6.2); // sliver behind the house
  add(-8.6, -8.2, -6.6, 0.2); // sliver left of the house
  // Patio by the garden door.
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) {
    g.add(box(0.56, 0.04, 0.56, p.tone === 'snow' ? '#e9edf0' : ((i + j) % 2 ? '#bdb5a6' : '#c9c1b2'), { x: 0.55 + i * 0.6, y: 0, z: -4.2 + j * 0.6, receive: true, cast: false }));
  }
  // Path from the gate to the street, and the front path.
  for (let j = 0; j < 5; j++) g.add(box(0.7, 0.03, 0.5, '#c4bba9', { x: 1.4, z: -0.2 + j * 0.65, cast: false }));
  for (let j = 0; j < 4; j++) g.add(box(0.8, 0.03, 0.55, '#c4bba9', { x: -1.5, z: 0.65 + j * 0.7, cast: false }));
  // Tufts / flowers / snow drifts
  const r = rng(11);
  if (p.tone === 'snow') {
    for (let i = 0; i < 18; i++) g.add(ico(0.2 + r() * 0.25, '#fbfcfd', { x: 0.5 + r() * 8.5, y: 0, z: -6 + r() * 9, sy: 0.35 }));
  } else {
    const flowers = p.flowers ? 60 : 8;
    for (let i = 0; i < flowers; i++) {
      const x = 2.8 + r() * 6, z = -4 + r() * 7;
      if (Math.hypot(x - 5.2, z + 1.6) < 0.5) continue;
      const fc = ['#f2e6a0', '#f4a9c0', '#ffffff', '#c9a0f0', '#f2c230'][Math.floor(r() * 5)];
      g.add(sphere(0.05, p.flowers ? fc : '#e9e4b0', { x, y: 0.08, z, cast: false }));
      g.add(cyl(0.01, 0.01, 0.08, '#4a7a3a', { x, z, cast: false }));
    }
  }
  return g;
}

export function hedge(p = {}) {
  const g = new THREE.Group();
  const c = p.snow ? '#dfe6e0' : '#4f7d42';
  const seg = (x0, x1, z) => g.add(box(x1 - x0, 0.75, 0.55, c, { x: (x0 + x1) / 2, z, r: 0.2, m: { flat: false } }));
  seg(-8.5, -2.1, 3.0);
  seg(-0.95, 0.2, 3.0);
  if (p.snow) {
    g.add(box(6.4, 0.08, 0.6, '#ffffff', { x: -5.3, y: 0.74, z: 3.0, r: 0.03 }));
  }
  // bins
  g.add(box(0.55, 0.95, 0.6, '#3f6b4a', { x: -7.6, z: 2.1, r: 0.04 }));
  g.add(box(0.6, 0.06, 0.66, '#35583e', { x: -7.6, y: 0.95, z: 2.08, r: 0.02 }));
  g.add(box(0.55, 0.95, 0.6, '#2f3438', { x: -6.9, z: 2.1, r: 0.04 }));
  g.add(box(0.6, 0.06, 0.66, '#26292c', { x: -6.9, y: 0.95, z: 2.08, r: 0.02 }));
  return g;
}

export function fence(p = {}) {
  const g = new THREE.Group();
  const c = p.color || '#8a6a4a';
  // Back fence (tall panels).
  for (let x = 0.4; x < 9.3; x += 1.8) {
    g.add(box(1.76, 1.6, 0.06, c, { x: x + 0.9, z: -6.45 }));
    g.add(box(0.1, 1.7, 0.1, '#5e4630', { x, z: -6.45 }));
    for (let k = 0.2; k < 1.6; k += 0.3) g.add(box(1.76, 0.015, 0.065, '#755a3e', { x: x + 0.9, y: k, z: -6.45 }));
  }
  // Side fence between us and Tomasz.
  for (let z = -6.4; z < 3.2; z += 1.6) {
    g.add(box(0.06, 1.15, 1.56, c, { x: 9.35, z: z + 0.8 }));
    g.add(box(0.1, 1.25, 0.1, '#5e4630', { x: 9.35, z }));
  }
  // Low front picket fence with a gate.
  const picket = (x0, x1, z) => {
    for (let x = x0; x <= x1; x += 0.22) g.add(box(0.08, 0.8, 0.04, '#efe9dc', { x, z }));
    g.add(box(x1 - x0, 0.06, 0.04, '#e2dccf', { x: (x0 + x1) / 2, y: 0.55, z: z - 0.03 }));
  };
  picket(0.3, 0.9, 3.3);
  picket(1.95, 9.2, 3.3);
  picket(9.5, 16.3, 3.3);
  // gate, slightly open
  const gate = new THREE.Group();
  gate.position.set(1.95, 0, 3.3);
  gate.rotation.y = 0.5;
  for (let x = 0.1; x < 1.0; x += 0.22) gate.add(box(0.08, 0.8, 0.04, '#efe9dc', { x: -x, z: 0 }));
  gate.add(box(1.0, 0.06, 0.04, '#e2dccf', { x: -0.5, y: 0.55, z: -0.03 }));
  g.add(gate);
  if (p.snow) {
    g.add(box(9.0, 0.06, 0.1, '#ffffff', { x: 4.8, y: 1.6, z: -6.45 }));
  }
  return g;
}

const CANOPY = {
  summer: ['#5f8f45', '#6fa04f', '#4f7f3c'],
  autumn: ['#d9822b', '#e6a53a', '#c4562c', '#e0b24a'],
  gold: ['#8fa548', '#a3a84a', '#7c9a42'],
  blossom: ['#f6d8e2', '#fbe9ef', '#eebfd0', '#ffffff'],
  late: ['#c96a2a', '#d99a3a', '#b8502a'],
};

export function appleTree(p = {}) {
  const g = new THREE.Group();
  const season = p.season || 'summer';
  const r = rng(21);
  const trunk = '#6b4a34';
  g.add(cyl(0.16, 0.22, 1.5, trunk, { seg: 8 }));
  const branches = [[0.6, 1.3, 0.2, -0.7], [-0.5, 1.4, -0.3, 0.6], [0.1, 1.5, 0.6, 0.2], [-0.2, 1.5, -0.5, -0.4]];
  for (const [x, y, z, rz] of branches) {
    const b = cyl(0.06, 0.1, 1.0, trunk, { x: x * 0.5, y, z: z * 0.5, seg: 6 });
    b.rotation.z = rz;
    b.rotation.x = z * 0.8;
    g.add(b);
  }
  const canopy = new THREE.Group();
  canopy.position.y = 0;
  g.add(canopy);
  if (season !== 'bare' && season !== 'snow') {
    const cols = CANOPY[season] || CANOPY.summer;
    const n = season === 'autumn' || season === 'late' ? 9 : 12;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, rad = r() * 1.1;
      canopy.add(ico(0.5 + r() * 0.35, cols[i % cols.length], { x: Math.cos(a) * rad, y: 2.2 + r() * 0.9, z: Math.sin(a) * rad, detail: 0 }));
    }
    if (p.apples || season === 'gold') {
      for (let i = 0; i < 16; i++) {
        const a = r() * Math.PI * 2, rad = 0.8 + r() * 0.6;
        canopy.add(sphere(0.07, i % 3 ? '#c8322a' : '#e0b02a', { x: Math.cos(a) * rad, y: 1.9 + r() * 0.9, z: Math.sin(a) * rad, ws: 8, hs: 6 }));
      }
    }
  } else {
    // bare twigs
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2;
      const t = cyl(0.02, 0.035, 0.9, trunk, { x: Math.cos(a) * 0.5, y: 1.9 + r() * 0.5, z: Math.sin(a) * 0.5, seg: 5 });
      t.rotation.z = Math.cos(a) * 0.8;
      t.rotation.x = -Math.sin(a) * 0.8;
      canopy.add(t);
      if (season === 'snow') canopy.add(box(0.12, 0.05, 0.12, '#ffffff', { x: Math.cos(a) * 0.75, y: 2.35 + r() * 0.3, z: Math.sin(a) * 0.75 }));
    }
  }
  if (p.fallen) {
    const cols = CANOPY[season] || CANOPY.autumn;
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, rad = r() * 2.0;
      g.add(box(0.12, 0.012, 0.09, cols[i % cols.length], { x: Math.cos(a) * rad, y: 0.02, z: Math.sin(a) * rad, ry: r() * 3, cast: false }));
    }
  }
  if (p.swing) {
    g.add(cyl(0.01, 0.01, 1.2, '#ddd', { x: 0.75, y: 0.55, z: -0.15 }));
    g.add(cyl(0.01, 0.01, 1.2, '#ddd', { x: 0.75, y: 0.55, z: 0.25 }));
    g.add(box(0.15, 0.04, 0.5, '#8a6a4a', { x: 0.75, y: 0.52, z: 0.05 }));
  }
  const phase = r() * 5;
  g.userData.tick = (dt, t) => {
    if (G.reducedMotion) return;
    const w = 0.012 + G.wind * 0.04;
    canopy.rotation.z = Math.sin(t * 0.9 + phase) * w;
    canopy.rotation.x = Math.cos(t * 0.7 + phase) * w * 0.7;
  };
  return g;
}

export function shed(p = {}) {
  const g = new THREE.Group();
  const wood = '#7d5b3e';
  const W = 2.5, D = 1.9, H = 2.0;
  g.add(box(W, H, D, wood, {}));
  for (let x = -W / 2 + 0.2; x < W / 2; x += 0.2) g.add(box(0.012, H, 0.01, '#6a4c33', { x, z: D / 2 + 0.005 }));
  for (let z = -D / 2 + 0.2; z < D / 2; z += 0.2) g.add(box(0.01, H, 0.012, '#6a4c33', { x: W / 2 + 0.005, z }));
  // door on the front
  g.add(box(0.8, 1.7, 0.04, '#5f8a7a', { x: -0.5, z: D / 2 + 0.02 }));
  g.add(sphere(0.03, '#c9b070', { x: -0.2, y: 0.9, z: D / 2 + 0.06 }));
  // window on the side
  g.add(box(0.03, 0.6, 0.8, '#f0ebe0', { x: W / 2 + 0.02, y: 1.0, z: 0 }));
  g.add(box(0.035, 0.5, 0.7, p.lit ? '#ffd28a' : '#2a3540', { x: W / 2 + 0.025, y: 1.05, z: 0, m: p.lit ? { emissive: '#ffb860', emissiveIntensity: 0.9 } : {} }));
  // pitched roof
  const roofC = p.snow ? '#f4f7f9' : '#3b3f45';
  const roofL = new THREE.Group();
  const slope = 0.45;
  for (const s of [-1, 1]) {
    const r = box(W + 0.3, 0.07, D / 2 / Math.cos(slope) + 0.2, roofC, {});
    r.position.set(0, H + Math.tan(slope) * D / 4 - 0.02, s * D / 4);
    r.rotation.x = s * slope;
    roofL.add(r);
  }
  g.add(roofL);
  // gable ends
  const tri = new THREE.Shape();
  tri.moveTo(-D / 2, 0);
  tri.lineTo(D / 2, 0);
  tri.lineTo(0, Math.tan(slope) * D / 2);
  tri.lineTo(-D / 2, 0);
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: W, bevelEnabled: false }), mat(wood));
  gable.rotation.y = Math.PI / 2;
  gable.position.set(-W / 2, H, 0);
  gable.castShadow = true;
  g.add(gable);
  if (p.solar) {
    for (let i = 0; i < 3; i++) {
      const pn = box(0.7, 0.04, 0.9, '#1d2c4a', { m: { metal: 0.4, rough: 0.25 } });
      pn.position.set(-0.8 + i * 0.8, H + Math.tan(slope) * D / 4 + 0.07, D / 4);
      pn.rotation.x = slope;
      g.add(pn);
      if (p.snow) {
        const sn = box(0.7, 0.03, 0.4, '#ffffff', {});
        sn.position.set(-0.8 + i * 0.8, H + Math.tan(slope) * D / 4 + 0.03, D / 4 + 0.2);
        sn.rotation.x = slope;
        g.add(sn);
      }
    }
  }
  if (p.sign) {
    // A hand-painted sign Arthur made: ARTHUR'S (in theory)
    g.add(box(0.9, 0.22, 0.03, '#efe6d0', { x: 0.6, y: 1.55, z: D / 2 + 0.03 }));
  }
  return g;
}

export function vegBed(p = {}) {
  const g = new THREE.Group();
  const W = 4.2, D = 0.9;
  g.add(box(W, 0.35, D, '#7a5a3e', {}));
  g.add(box(W - 0.12, 0.02, D - 0.12, '#4a3626', { y: 0.34 }));
  const r = rng(31);
  const kind = p.kind || 'cabbages';
  if (kind === 'snow') {
    g.add(box(W - 0.1, 0.08, D - 0.1, '#ffffff', { y: 0.35, r: 0.03 }));
    return g;
  }
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 0.3 + i * ((W - 0.6) / (n - 1));
    if (kind === 'cabbages') {
      g.add(ico(0.17, i % 2 ? '#7fae5a' : '#9cc46a', { x, y: 0.48, z: 0, sy: 0.8 }));
    } else if (kind === 'overgrown') {
      g.add(ico(0.22 + r() * 0.15, ['#6f9a42', '#8aa848', '#b8b45a'][i % 3], { x, y: 0.55, z: (r() - 0.5) * 0.3 }));
      if (i % 3 === 0) g.add(cyl(0.01, 0.01, 0.6, '#4a7a3a', { x: x + 0.1, y: 0.35 }));
    } else if (kind === 'tomatoes' || kind === 'ripe') {
      g.add(cyl(0.012, 0.012, 1.1, '#9a7a50', { x, y: 0.35 }));
      g.add(ico(0.18, '#4f8a3c', { x, y: 0.75, z: 0, sy: 1.4 }));
      const ripe = kind === 'ripe' ? 4 : 2;
      for (let k = 0; k < ripe; k++) g.add(sphere(0.05, k % 2 || kind === 'ripe' ? '#d8352a' : '#7fae4a', { x: x + (r() - 0.5) * 0.25, y: 0.6 + r() * 0.4, z: 0.15, ws: 8, hs: 6 }));
    } else if (kind === 'tended') {
      g.add(ico(0.14, '#6fae4a', { x, y: 0.46, z: -0.15 }));
      g.add(ico(0.12, '#8fc45a', { x: x + 0.15, y: 0.44, z: 0.18 }));
    }
  }
  return g;
}

export function grave(p = {}) {
  const g = new THREE.Group();
  g.add(box(0.32, 0.28, 0.08, '#b9b4aa', { r: 0.04 }));
  g.add(box(0.5, 0.04, 0.4, p.snow ? '#ffffff' : '#6a8a4a', { z: 0.25 }));
  if (!p.snow) g.add(sphere(0.06, '#d9e04a', { x: 0.18, y: 0.06, z: 0.12 }));
  if (p.flowers) for (let i = 0; i < 3; i++) g.add(sphere(0.05, ['#f2c230', '#f4a9c0', '#fff'][i], { x: -0.12 + i * 0.1, y: 0.06, z: 0.3 }));
  return g;
}

export function paddlingPool() {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.13, 8, 24), mat('#4aa3e0'));
  t.rotation.x = Math.PI / 2;
  t.position.y = 0.13;
  t.castShadow = true;
  g.add(t);
  g.add(cyl(0.68, 0.68, 0.18, '#8fd4f0', { m: { rough: 0.15, transparent: true, opacity: 0.85 } }));
  g.add(sphere(0.12, '#f2c230', { x: 0.3, y: 0.24, z: 0.1 }));
  return g;
}

export function gardenChairs(p = {}) {
  const g = new THREE.Group();
  const mk = (x, z, ry) => {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    c.rotation.y = ry;
    c.add(box(0.5, 0.04, 0.5, '#d8d2c4', { y: 0.38 }));
    c.add(box(0.5, 0.5, 0.04, '#d8d2c4', { y: 0.42, z: -0.24, rx: -0.15 }));
    for (const [lx, lz] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) c.add(cyl(0.015, 0.015, 0.38, '#888', { x: lx, z: lz }));
    g.add(c);
  };
  for (const [x, z, ry] of p.chairs || [[0, 0, 0]]) mk(x, z, ry);
  if (p.table) {
    g.add(cyl(0.4, 0.4, 0.03, '#d8d2c4', { x: p.table[0], y: 0.68, z: p.table[1] }));
    g.add(cyl(0.03, 0.03, 0.68, '#888', { x: p.table[0], z: p.table[1] }));
  }
  return g;
}

export function greenhouse(p = {}) {
  const g = new THREE.Group();
  const W = 3.0, D = 1.6, H = 1.7;
  const frame = '#f2f2ee';
  const glassM = new THREE.MeshStandardMaterial({ color: '#d8eef0', transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false });
  g.add(box(W, 0.2, D, '#a8754e', {}));
  for (const x of [-W / 2, -W / 4, 0, W / 4, W / 2]) for (const z of [-D / 2, D / 2]) g.add(box(0.04, H, 0.04, frame, { x, z }));
  for (const z of [-D / 2, D / 2]) g.add(box(W, 0.04, 0.04, frame, { y: H, z }));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W, H - 0.2, D), glassM);
  glass.position.y = 0.2 + (H - 0.2) / 2;
  g.add(glass);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(D / 2, D / 2, W, 4, 1, false, 0, Math.PI), glassM);
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = 0;
  roof.position.y = H;
  roof.scale.set(1, 1, 0.6);
  g.add(roof);
  for (let i = 0; i < 6; i++) {
    const x = -W / 2 + 0.3 + i * 0.48;
    g.add(ico(0.2, '#4f8a3c', { x, y: 0.55, z: 0, sy: 1.6 }));
    g.add(sphere(0.06, '#d8352a', { x: x + 0.1, y: 0.5, z: 0.18, ws: 8, hs: 6 }));
    g.add(sphere(0.06, '#e0582a', { x: x - 0.08, y: 0.75, z: 0.15, ws: 8, hs: 6 }));
  }
  return g;
}

export function basket(p = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.22, 0.17, 0.2, '#b08a5a'));
  for (let i = 0; i < 7; i++) g.add(sphere(0.07, i % 3 ? '#c8322a' : '#e0b02a', { x: Math.cos(i) * 0.1, y: 0.22, z: Math.sin(i) * 0.1, ws: 8, hs: 6 }));
  return g;
}

export function ladder(p = {}) {
  const g = new THREE.Group();
  for (const x of [-0.18, 0.18]) g.add(box(0.05, 2.2, 0.05, '#c8b48a', { x }));
  for (let y = 0.25; y < 2.2; y += 0.35) g.add(box(0.36, 0.04, 0.04, '#c8b48a', { y }));
  g.rotation.x = -0.2;
  return g;
}

export function lights(p = {}) {
  // Festoon lights strung from the house to the tree.
  const g = new THREE.Group();
  const from = new THREE.Vector3(0.1, 2.6, -3.8), to = new THREE.Vector3(4.6, 2.4, -1.4);
  const n = 14;
  const bulbs = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const v = from.clone().lerp(to, t);
    v.y -= Math.sin(t * Math.PI) * 0.45;
    const b = sphere(0.045, '#ffe9b0', { x: v.x, y: v.y, z: v.z, cast: false, m: { emissive: '#ffcf70', emissiveIntensity: 1.5 } });
    g.add(b);
    bulbs.push(b);
  }
  return g;
}
