import { THREE, box, cyl, sphere, ico, cone, group, mat, card, plane, textTex, stdMat } from './kit.js';
import { brickTex } from './textures.js';
import { robot, person } from './people.js';
import { G } from '../engine/stage.js';
import { QUALITY } from '../engine/quality.js';
import { rng } from '../engine/tween.js';

// The street along the front of the diorama, and Tomasz's house next door.
// Street runs along x; pavement z[3.4,4.6], road z[4.6,7.6], verge z[7.6,8.4].

const X0 = -8.6, X1 = 16.4;

function wheel(r, w, color, x, z, y) {
  return cyl(r, r, w, color, { x, y: y - w / 2, z, rx: Math.PI / 2 });
}
const W = X1 - X0, CX = (X0 + X1) / 2;

export function street(p = {}) {
  const g = new THREE.Group();
  const kind = p.kind || 'road';
  const snow = kind === 'snow';
  const r = rng(41);
  // Pavement
  if (kind !== 'meadow') {
    g.add(box(W, 0.1, 1.2, snow ? '#eef2f4' : '#b9b4ab', { x: CX, z: 4.0, cast: false }));
    for (let x = X0 + 0.6; x < X1; x += 0.9) g.add(box(0.012, 0.101, 1.2, '#a39e95', { x, z: 4.0, cast: false }));
    g.add(box(W, 0.12, 0.12, '#d6d2ca', { x: CX, z: 4.62, cast: false }));
  }
  if (kind === 'road' || kind === 'snow' || kind === 'dug') {
    g.add(box(W, 0.05, 3.0, snow ? '#4a4d52' : '#55585e', { x: CX, z: 6.1, cast: false }));
    for (let x = X0 + 0.4; x < X1; x += 2.2) g.add(box(1.1, 0.052, 0.1, '#e8e4d8', { x: x + 0.55, z: 6.1, cast: false }));
    g.add(box(W, 0.12, 0.12, '#d6d2ca', { x: CX, z: 7.6, cast: false }));
    g.add(box(W, 0.07, 0.8, snow ? '#f1f4f6' : '#7fa55a', { x: CX, z: 8.0, cast: false }));
    if (snow) {
      for (let i = 0; i < 12; i++) g.add(ico(0.2 + r() * 0.2, '#ffffff', { x: X0 + r() * W, y: 0.08, z: 4.65 + r() * 0.2, sy: 0.4 }));
    }
    if (kind === 'dug') {
      // A trench along the road for the new cables, a strip of fresh earth.
      g.add(box(12, 0.06, 0.9, '#5a4434', { x: 3, y: 0.0, z: 5.1, cast: false }));
      g.add(box(12, 0.02, 0.6, '#2a1f18', { x: 3, y: 0.05, z: 5.1, cast: false }));
      for (const x of [-3.3, 9.3]) {
        for (const dz of [4.75, 5.45]) {
          g.add(cone(0.12, 0.4, '#f06a2a', { x, z: dz }));
          g.add(cyl(0.12, 0.13, 0.05, '#f06a2a', { x, z: dz }));
        }
      }
      // spool of cable
      g.add(wheel(0.45, 0.5, '#8a6a4a', 10.5, 6.6, 0.5));
      g.add(wheel(0.35, 0.52, '#2a2a2e', 10.5, 6.6, 0.5));
    }
  } else if (kind === 'half') {
    // Half the road has become a planted strip.
    g.add(box(W, 0.05, 1.6, '#55585e', { x: CX, z: 6.8, cast: false }));
    g.add(box(W, 0.12, 0.12, '#d6d2ca', { x: CX, z: 7.6, cast: false }));
    g.add(box(W, 0.07, 0.8, '#7fa55a', { x: CX, z: 8.0, cast: false }));
    g.add(box(W, 0.06, 1.4, '#6d4f3a', { x: CX, z: 5.3, cast: false }));
    for (let x = X0 + 0.6; x < X1; x += 0.5) g.add(ico(0.12 + r() * 0.1, ['#6fae4a', '#8fc45a', '#5f9a42'][Math.floor(r() * 3)], { x, y: 0.1, z: 4.9 + r() * 1.0, sy: 0.7 }));
  } else if (kind === 'green' || kind === 'meadow') {
    // The road is gone: a greenway with a winding path.
    const lush = kind === 'meadow';
    g.add(box(W, 0.06, lush ? 5.0 : 3.8, lush ? '#6fae5a' : '#86b05e', { x: CX, z: lush ? 5.9 : 6.3, cast: false }));
    for (let x = X0; x < X1; x += 0.6) {
      const z = 5.9 + Math.sin(x * 0.35) * 0.6;
      g.add(box(0.62, 0.065, 0.9, '#d8cfb8', { x: x + 0.3, z, ry: Math.cos(x * 0.35) * 0.2, cast: false }));
    }
    const nf = lush ? 140 : 50;
    for (let i = 0; i < nf; i++) {
      const x = X0 + 0.3 + r() * (W - 0.6), z = 4.0 + r() * 4.2;
      if (Math.abs(z - (5.9 + Math.sin(x * 0.35) * 0.6)) < 0.6) continue;
      const fc = ['#f2e6a0', '#f4a9c0', '#ffffff', '#c9a0f0', '#f2c230', '#e0483a'][Math.floor(r() * 6)];
      g.add(sphere(lush ? 0.06 : 0.05, fc, { x, y: 0.12, z, cast: false, ws: 6, hs: 4 }));
    }
    for (let i = 0; i < (lush ? 40 : 20); i++) {
      const x = X0 + 0.3 + r() * (W - 0.6), z = 4.0 + r() * 4.2;
      if (Math.abs(z - (5.9 + Math.sin(x * 0.35) * 0.6)) < 0.7) continue;
      g.add(ico(0.18 + r() * 0.2, ['#5f9a42', '#7fae4a', '#4f8a3c'][i % 3], { x, y: 0.1, z, sy: 0.7 }));
    }
    if (lush) {
      // a little stream
      for (let x = X0; x < X1; x += 0.8) g.add(box(0.85, 0.07, 0.35, '#7fc4d8', { x: x + 0.4, z: 7.6 + Math.sin(x * 0.5) * 0.2, cast: false, m: { rough: 0.15 } }));
    }
  }
  return g;
}

export function streetTrees(p = {}) {
  const g = new THREE.Group();
  const r = rng(52);
  const big = p.size === 'big';
  const xs = p.xs || [-6.5, -2.8, 3.6, 7.8, 12.4];
  for (const x of xs) {
    const z = 7.9 + (r() - 0.5) * 0.4;
    const h = big ? 2.2 + r() * 0.6 : 1.1;
    g.add(cyl(big ? 0.13 : 0.05, big ? 0.17 : 0.07, h, '#6b4a34', { x, z, seg: 6 }));
    const cols = p.autumn ? ['#d9822b', '#e6a53a', '#c4562c'] : ['#5f8f45', '#6fa04f', '#7fb05a'];
    const n = big ? 6 : 3;
    for (let i = 0; i < n; i++) {
      g.add(ico((big ? 0.6 : 0.32) + r() * 0.2, cols[i % 3], { x: x + (r() - 0.5) * (big ? 1 : 0.4), y: h + (r() - 0.2) * (big ? 0.9 : 0.4), z: z + (r() - 0.5) * (big ? 1 : 0.4) }));
    }
    if (!big) g.add(cyl(0.015, 0.015, 1.0, '#c8b48a', { x: x + 0.12, z }));
  }
  return g;
}

export function lampPosts(p = {}) {
  const g = new THREE.Group();
  const lamps = [];
  for (const x of p.xs || [-4.0, 6.0, 15.4]) {
    const l = new THREE.Group();
    l.position.set(x, 0.1, 3.65);
    if (p.style === 'new') {
      l.add(cyl(0.04, 0.05, 3.0, '#d8dcdf'));
      const head = box(0.5, 0.06, 0.12, '#d8dcdf', { y: 3.0, x: 0.2 });
      l.add(head);
    } else {
      l.add(cyl(0.06, 0.08, 3.2, '#3a3d40'));
      l.add(box(0.06, 0.06, 0.5, '#3a3d40', { y: 3.15, z: 0.25 }));
      l.add(box(0.18, 0.1, 0.3, '#3a3d40', { y: 3.05, z: 0.5 }));
    }
    const bulbMat = stdMat({ color: '#fff1d0', emissive: p.style === 'new' ? '#e8f4ff' : '#ffb35a', emissiveIntensity: 0 });
    const bulb = p.style === 'new'
      ? box(0.42, 0.02, 0.1, '', { mat: bulbMat, y: 2.97, x: 0.2, cast: false })
      : box(0.14, 0.04, 0.24, '', { mat: bulbMat, y: 3.01, z: 0.5, cast: false });
    l.add(bulb);
    const pl = QUALITY.lite ? null : new THREE.PointLight(p.style === 'new' ? '#e8f0ff' : '#ffa850', 0, 7, 1.6);
    if (pl) {
      pl.position.set(0, 2.8, 0.5);
      l.add(pl);
    }
    lamps.push({ bulbMat, pl });
    g.add(l);
  }
  g.userData.tick = () => {
    const on = G.night > 0.3 ? Math.min(1, (G.night - 0.3) * 2.5) : 0;
    for (const l of lamps) {
      l.bulbMat.emissiveIntensity = on * 2.2;
      if (l.pl) l.pl.intensity = on * 6;
    }
  };
  return g;
}

export function car(p = {}) {
  const g = new THREE.Group();
  const c = p.color || '#3f6fa0';
  g.add(box(2.1, 0.45, 0.95, c, { y: 0.22, r: 0.12 }));
  g.add(box(1.25, 0.42, 0.88, c, { x: -0.15, y: 0.6, r: 0.12 }));
  g.add(box(1.15, 0.32, 0.9, '#2b3440', { x: -0.15, y: 0.66, r: 0.1, m: { rough: 0.2 } }));
  for (const x of [-0.68, 0.68]) for (const z of [-0.45, 0.45]) g.add(wheel(0.2, 0.14, '#1d1d1f', x, z, 0.2));
  g.add(box(0.04, 0.1, 0.22, '#fff6d8', { x: 1.05, y: 0.42, z: -0.3, m: { emissive: '#fff0c0', emissiveIntensity: p.lights ? 1 : 0.1 } }));
  g.add(box(0.04, 0.1, 0.22, '#fff6d8', { x: 1.05, y: 0.42, z: 0.3, m: { emissive: '#fff0c0', emissiveIntensity: p.lights ? 1 : 0.1 } }));
  if (p.snow) g.add(box(1.2, 0.08, 0.86, '#ffffff', { x: -0.15, y: 0.82, r: 0.03 }));
  return g;
}

export function lorry(p = {}) {
  // Tomasz's tractor unit, parked (or, at the end, kept).
  const g = new THREE.Group();
  const c = p.color || '#b8312f';
  g.add(box(3.2, 0.35, 1.2, '#2a2a2e', { y: 0.45 }));
  g.add(box(1.6, 1.9, 1.3, c, { x: 0.8, y: 0.55, r: 0.08 }));
  g.add(box(0.05, 0.75, 1.15, '#2b3440', { x: 1.61, y: 1.55, m: { rough: 0.2 } }));
  g.add(box(1.4, 0.3, 1.2, c, { x: 0.7, y: 2.45, r: 0.06 }));
  g.add(box(0.06, 0.3, 1.0, '#cfcfcf', { x: 1.62, y: 0.65 }));
  for (const x of [-1.1, -0.2, 1.0]) for (const z of [-0.58, 0.58]) g.add(wheel(0.42, 0.3, '#1d1d1f', x, z, 0.42));
  g.add(box(0.8, 0.12, 0.9, '#3a3a3e', { x: -0.9, y: 0.82 }));
  if (p.flowers) {
    g.add(box(1.0, 0.25, 0.6, '#6b4a34', { x: -0.9, y: 0.92 }));
    for (let i = 0; i < 8; i++) g.add(sphere(0.08, ['#f2c230', '#f4a9c0', '#e0483a', '#fff'][i % 4], { x: -1.3 + (i % 4) * 0.25, y: 1.25, z: -0.15 + Math.floor(i / 4) * 0.3 }));
  }
  if (p.rust) g.add(box(0.5, 0.3, 0.02, '#8a5a3a', { x: 0.4, y: 0.8, z: 0.66 }));
  return g;
}

export function van(p = {}) {
  const g = new THREE.Group();
  const c = p.color || '#f0f0ee';
  g.add(box(3.0, 1.5, 1.25, c, { y: 0.3, r: 0.1 }));
  g.add(box(0.8, 0.9, 1.2, c, { x: 1.7, y: 0.3, r: 0.1 }));
  g.add(box(0.05, 0.5, 1.05, '#2b3440', { x: 2.1, y: 0.75, rz: 0.3 }));
  for (const x of [-0.9, 1.5]) for (const z of [-0.6, 0.6]) g.add(wheel(0.3, 0.2, '#1d1d1f', x, z, 0.3));
  if (p.open) {
    g.add(box(0.05, 1.4, 1.2, '#2a2a2a', { x: -1.52, y: 0.35 }));
    g.add(box(1.4, 0.05, 1.3, '#9a9a9a', { x: -2.2, y: 0.3, rz: 0.4 }));
  }
  if (p.text) {
    const t = textTex('van-' + p.text, [p.text], { w: 512, h: 128, bg: c, fg: '#333', font: '700 56px "Fraunces", Georgia, serif' });
    g.add(card(2.2, 0.55, t, { x: -0.2, y: 1.15, z: 0.63 }));
  }
  return g;
}

// A driverless taxi that glides along the road on a loop.
export function robotaxi(p = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const c = p.color || '#f2f3f4';
  if (p.pod) {
    body.add(box(1.8, 1.1, 1.1, c, { y: 0.2, r: 0.4 }));
    body.add(box(1.5, 0.5, 1.12, '#24303c', { y: 0.65, r: 0.2, m: { rough: 0.15 } }));
    body.add(box(1.82, 0.04, 1.12, '#7fd7ff', { y: 0.45, m: { emissive: '#7fd7ff', emissiveIntensity: 1 } }));
  } else {
    body.add(box(2.0, 0.45, 0.95, c, { y: 0.22, r: 0.15 }));
    body.add(box(1.2, 0.4, 0.88, '#2a3440', { x: -0.1, y: 0.6, r: 0.14, m: { rough: 0.15 } }));
    body.add(cyl(0.12, 0.14, 0.14, '#222', { x: -0.1, y: 1.0 }));
    const spin = cyl(0.1, 0.1, 0.06, '#5ad', { x: -0.1, y: 1.14, m: { emissive: '#4ad', emissiveIntensity: 0.6 } });
    body.add(spin);
    body.userData.spin = spin;
  }
  for (const x of [-0.65, 0.65]) for (const z of [-0.45, 0.45]) body.add(wheel(0.19, 0.12, '#1d1d1f', x, z, 0.19));
  const lane = p.lane ?? 5.4;
  const dir = p.dir ?? 1;
  const speed = p.speed ?? 3.2;
  const period = (X1 - X0 + 8) / speed + (p.pause ?? 4);
  const offset = p.offset ?? 0;
  g.userData.tick = (dt, t) => {
    const tt = ((t + offset) % period) * speed;
    let x = dir > 0 ? X0 - 3 + tt : X1 + 3 - tt;
    const inside = x > X0 + 1 && x < X1 - 1;
    const edge = Math.min(x - X0, X1 - x);
    const s = inside ? Math.min(1, (edge - 1) / 1.2) : 0;
    g.visible = s > 0.01;
    body.scale.setScalar(Math.max(0.001, s));
    g.position.set(x, 0.05, lane);
    g.rotation.y = dir > 0 ? 0 : Math.PI;
    if (body.userData.spin) body.userData.spin.rotation.y += dt * 8;
  };
  return g;
}

// Delivery drone flying a lazy loop over the street and gardens.
export function drone(p = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  body.add(box(0.36, 0.1, 0.36, '#e8eaec', { r: 0.04 }));
  const props = [];
  for (const [x, z] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) {
    body.add(box(0.04, 0.03, 0.3, '#cfd3d6', { x: x / 2, y: 0.03, z: z / 2, ry: Math.atan2(x, z) }));
    const pr = cyl(0.14, 0.14, 0.01, '#9ab', { x, y: 0.09, z, m: { transparent: true, opacity: 0.35 } });
    body.add(pr);
    props.push(pr);
  }
  if (p.parcel !== false) body.add(box(0.24, 0.18, 0.24, '#c8a272', { y: -0.2 }));
  const blink = sphere(0.025, '#f33', { y: -0.02, x: 0.18, m: { emissive: '#f33', emissiveIntensity: 2 } });
  body.add(blink);
  const R = p.r ?? 7, cx = p.cx ?? 3, cz = p.cz ?? 0, h = p.h ?? 5.2;
  const sp = p.speed ?? 0.25;
  const ph = p.phase ?? 0;
  g.userData.tick = (dt, t) => {
    const a = t * sp + ph;
    g.position.set(cx + Math.cos(a) * R, h + Math.sin(t * 1.3) * 0.15, cz + Math.sin(a) * R * 0.6);
    g.rotation.y = -a;
    blink.visible = Math.sin(t * 6) > 0.6;
  };
  return g;
}

export function courier(p = {}) {
  const g = robot({ kind: 'courier' });
  return g;
}

export function workers(p = {}) {
  const g = new THREE.Group();
  for (const [x, z, ry] of p.at || [[-1.5, 5.0, 0.3], [5.5, 5.1, -0.4]]) {
    const r = robot({ kind: 'worker' });
    r.position.set(x, 0.05, z);
    r.rotation.y = ry;
    g.add(r);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Tomasz's house: x[10.4,15.8], z[-6.4,-1.6]

export function tomaszHouse(p = {}) {
  const g = new THREE.Group();
  const x0 = 10.4, x1 = 15.8, z0 = -6.4, z1 = -1.6, H = 4.8;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const bt = brickTex();
  bt.wrapS = bt.wrapT = THREE.RepeatWrapping;
  const bm = stdMat({ map: bt, roughness: 0.95 });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, H, z1 - z0), bm);
  // world-ish UVs
  const uv = walls.geometry.attributes.uv;
  const n = walls.geometry.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i));
    const su = nx > 0.5 ? (z1 - z0) / 2.5 : (x1 - x0) / 2.5;
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * (H / 2.5));
  }
  walls.position.set(cx, H / 2, cz);
  walls.castShadow = walls.receiveShadow = true;
  g.add(walls);
  // Roof (ridge along x).
  const roofC = p.snow ? '#eef2f5' : '#6a564c';
  const slope = 0.62;
  const dd = (z1 - z0) / 2;
  for (const s of [-1, 1]) {
    const r = box(x1 - x0 + 0.4, 0.12, dd / Math.cos(slope) + 0.35, roofC, {});
    r.position.set(cx, H + Math.tan(slope) * dd / 2 - 0.05, cz + s * dd / 2);
    r.rotation.x = s * slope;
    g.add(r);
  }
  const tri = new THREE.Shape();
  tri.moveTo(-dd, 0); tri.lineTo(dd, 0); tri.lineTo(0, Math.tan(slope) * dd); tri.lineTo(-dd, 0);
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: x1 - x0, bevelEnabled: false }), bm);
  gable.rotation.y = Math.PI / 2;
  gable.position.set(x0, H, cz);
  gable.castShadow = true;
  g.add(gable);
  g.add(box(0.5, 1.0, 0.5, '#7a5040', { x: x0 + 1.0, y: H + 1.2, z: cz - 0.6 }));
  // Front (+z) windows and door.
  const winMats = [];
  const win = (x, y, face = 'z') => {
    const wm = stdMat({ color: '#2a3540', emissive: '#ffc070', emissiveIntensity: 0, roughness: 0.2 });
    winMats.push(wm);
    if (face === 'z') {
      g.add(box(1.0, 1.1, 0.06, '#f2efe8', { x, y: y - 0.05, z: z1 + 0.02 }));
      g.add(box(0.86, 0.96, 0.02, '', { mat: wm, x, y: y + 0.02, z: z1 + 0.06 }));
      g.add(box(0.04, 0.96, 0.03, '#f2efe8', { x, y: y + 0.02, z: z1 + 0.07 }));
      g.add(box(1.1, 0.06, 0.18, '#e6e0d4', { x, y: y - 0.08, z: z1 + 0.08 }));
    } else {
      g.add(box(0.06, 1.1, 1.0, '#f2efe8', { x: x1 + 0.02, y: y - 0.05, z: x }));
      g.add(box(0.02, 0.96, 0.86, '', { mat: wm, x: x1 + 0.06, y: y + 0.02, z: x }));
    }
  };
  win(11.6, 1.0); win(14.6, 1.0); win(11.6, 3.1); win(13.2, 3.1); win(14.6, 3.1);
  win(-5.2, 1.0, 'x'); win(-2.8, 1.0, 'x'); win(-4.0, 3.1, 'x');
  g.add(box(0.95, 2.0, 0.08, p.door || '#2f4f6f', { x: 13.1, y: 0.0, z: z1 + 0.04 }));
  g.add(sphere(0.04, '#c9b070', { x: 13.4, y: 1.0, z: z1 + 0.1 }));
  g.add(box(1.3, 0.1, 0.5, '#9a958c', { x: 13.1, y: 0.0, z: z1 + 0.25 }));
  // Path to the gate.
  for (let j = 0; j < 7; j++) g.add(box(0.9, 0.03, 0.6, '#c4bba9', { x: 13.1, z: -1.0 + j * 0.65, cast: false }));
  const lit = p.lit ?? true;
  const seed = p.seed || 1;
  g.userData.tick = () => {
    winMats.forEach((m, i) => {
      const on = lit && ((i * 7 + seed) % 3 !== 0);
      m.emissiveIntensity = on ? G.night * 1.3 : 0;
    });
  };
  return g;
}

export function tomaszSign(p = {}) {
  const t = textTex('tsign', ['HUMAN DRIVERS', 'SAVE LIVES'], { w: 512, h: 384, bg: '#f3e64a', fg: '#1a1a1a', font: '800 74px "Inter", Arial, sans-serif' });
  return group(card(0.62, 0.46, t, { x: 14.6, y: 1.1, z: -1.5 }));
}

export function tomaszBanner(p = {}) {
  const t = textTex('tbanner', ['PEOPLE NOT PROGRAMS'], { w: 1024, h: 192, bg: '#fbf8ee', fg: '#b8312f', font: '900 104px "Inter", Arial, sans-serif', border: '#b8312f' });
  const g = new THREE.Group();
  const b = card(3.6, 0.68, t, { x: 12.9, y: 0.5, z: 3.36, m: {} });
  g.add(b);
  if (p.faded) b.material.color = new THREE.Color('#d8d2c4');
  return g;
}

export function tomaszVeg(p = {}) {
  const g = new THREE.Group();
  for (const [x, z] of [[10.8, 0.4], [15.2, 0.4]]) {
    g.add(box(1.6, 0.3, 2.2, '#7a5a3e', { x, z }));
    g.add(box(1.5, 0.02, 2.1, '#4a3626', { x, y: 0.3, z }));
    for (let i = 0; i < 6; i++) g.add(ico(0.16, i % 2 ? '#6fae4a' : '#8fc45a', { x: x - 0.4 + (i % 2) * 0.8, y: 0.42, z: z - 0.7 + Math.floor(i / 2) * 0.7 }));
  }
  if (p.chickens) {
    for (const [x, z] of [[12.0, 1.8], [12.6, 2.3], [14.0, 1.5]]) {
      g.add(box(0.22, 0.2, 0.3, '#f4efe4', { x, y: 0.12, z, r: 0.08 }));
      g.add(sphere(0.08, '#f4efe4', { x, y: 0.38, z: z + 0.15 }));
      g.add(box(0.03, 0.06, 0.04, '#d33', { x, y: 0.44, z: z + 0.15 }));
      g.add(cyl(0.01, 0.01, 0.12, '#e8a030', { x: x - 0.05, z }));
      g.add(cyl(0.01, 0.01, 0.12, '#e8a030', { x: x + 0.05, z }));
    }
  }
  return g;
}

export function gnome(p = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.1, 0.13, 0.25, '#3a6abf'));
  g.add(sphere(0.08, '#f0c8a8', { y: 0.32 }));
  g.add(sphere(0.07, '#ffffff', { y: 0.27, z: 0.04, sy: 1.3 }));
  g.add(cone(0.09, 0.22, '#d33', { y: 0.36 }));
  return g;
}

export function soldBoard(p = {}) {
  const t = textTex('sold-' + (p.text || 'SOLD'), [p.text || 'SOLD'], { w: 512, h: 256, bg: '#ffffff', fg: '#c8372d', font: '900 120px "Inter", Arial, sans-serif', border: '#c8372d' });
  return group(
    cyl(0.04, 0.04, 2.0, '#efe9dc', {}),
    card(1.1, 0.55, t, { y: 1.65, z: 0.05 }),
  );
}

export function billboard(p = {}) {
  const g = new THREE.Group();
  const lines = p.lines || ['MERIDIAN', 'POWERING TOMORROW'];
  const t = textTex('bb-' + lines.join('|'), lines, { w: 1024, h: 512, bg: p.bg || '#14243a', fg: p.fg || '#9fe0ff', font: '800 120px "Inter", Arial, sans-serif' });
  g.add(cyl(0.08, 0.08, 3.4, '#4a4d50', { x: -1.4 }));
  g.add(cyl(0.08, 0.08, 3.4, '#4a4d50', { x: 1.4 }));
  g.add(card(4.2, 2.1, t, { y: 4.2, z: 0.06, glow: 0.35 }));
  g.add(box(4.4, 2.3, 0.1, '#2a2c30', { y: 3.15 }));
  return g;
}
