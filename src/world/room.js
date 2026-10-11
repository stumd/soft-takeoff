import { THREE, box, cyl, sphere, card, group, mat, canvasTex, textTex, cone, ico, stdMat } from './kit.js';
import { floorTex, wallpaperTex, tileTex, rugTex, calendarTex } from './textures.js';
import { G } from '../engine/stage.js';
import { QUALITY } from '../engine/quality.js';

// The kitchen-diner. Interior spans x[-8,0], z[-6,0]; the two walls nearest the
// camera are cut away so we can see in, like a doll's house.

export const ROOM = { x0: -8, x1: 0, z0: -6, z1: 0, h: 3.0, t: 0.2 };
const WALL = '#e9e1d2';
const CAP = '#5b4a3f';

function uvPlane(w, h, tile, ox = 0, oy = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, ox / tile + uv.getX(i) * (w / tile), oy / tile + uv.getY(i) * (h / tile));
  return g;
}

function wallpaper(tone) {
  const t = wallpaperTex(tone);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return stdMat({ map: t, roughness: 0.95 });
}

export function walls(p = {}) {
  const g = new THREE.Group();
  const wp = wallpaper(p.tone || 'sage');
  const H = ROOM.h, T = ROOM.t;
  const tile = 1.4;

  // Back-right wall (runs along x at z = -6), with the kitchen window.
  const zb = ROOM.z0 - T / 2;
  const segX = [
    [-8.2, -5.0, 0, H],
    [-3.4, 0.0, 0, H],
    [-5.0, -3.4, 0, 1.2],
    [-5.0, -3.4, 2.45, H],
  ];
  for (const [a, b, y0, y1] of segX) {
    g.add(box(b - a, y1 - y0, T, WALL, { x: (a + b) / 2, y: y0, z: zb }));
    const pl = new THREE.Mesh(uvPlane(b - a, y1 - y0, tile, a, y0), wp);
    pl.position.set((a + b) / 2, (y0 + y1) / 2, ROOM.z0 + 0.002);
    pl.receiveShadow = true;
    g.add(pl);
  }
  // Back-left wall (runs along z at x = -8), with the hall door.
  const xb = ROOM.x0 - T / 2;
  const segZ = [
    [-6.2, -4.75, 0, H],
    [-3.85, 0.0, 0, H],
    [-4.75, -3.85, 2.15, H],
  ];
  for (const [a, b, y0, y1] of segZ) {
    g.add(box(T, y1 - y0, b - a, WALL, { x: xb, y: y0, z: (a + b) / 2 }));
    const pl = new THREE.Mesh(uvPlane(b - a, y1 - y0, tile, a, y0), wp);
    pl.rotation.y = Math.PI / 2;
    pl.position.set(ROOM.x0 + 0.002, (y0 + y1) / 2, (a + b) / 2);
    pl.receiveShadow = true;
    g.add(pl);
  }
  // Cut-section caps on top of the walls.
  g.add(box(8.4, 0.06, T + 0.02, CAP, { x: -4.0, y: H, z: zb }));
  g.add(box(T + 0.02, 0.06, 6.4, CAP, { x: xb, y: H, z: -3.0 }));
  // Skirting.
  g.add(box(8, 0.12, 0.03, '#f3eee4', { x: -4, z: ROOM.z0 + 0.015 }));
  g.add(box(0.03, 0.12, 1.25, '#f3eee4', { x: ROOM.x0 + 0.015, z: -5.375 }));
  g.add(box(0.03, 0.12, 3.85, '#f3eee4', { x: ROOM.x0 + 0.015, z: -1.925 }));
  // Front stubs (the cut-away walls), with a gap for the garden door.
  g.add(box(8.4, 0.24, T, WALL, { x: -4.0, z: ROOM.z1 + T / 2 }));
  g.add(box(8.4, 0.03, T + 0.02, CAP, { x: -4.0, y: 0.24, z: ROOM.z1 + T / 2 }));
  for (const [a, b] of [[-6.2, -3.6], [-1.7, 0.2]]) {
    g.add(box(T, 0.24, b - a, WALL, { x: ROOM.x1 + T / 2, z: (a + b) / 2 }));
    g.add(box(T + 0.02, 0.03, b - a, CAP, { x: ROOM.x1 + T / 2, y: 0.24, z: (a + b) / 2 }));
  }
  // Threshold of the garden door.
  g.add(box(T + 0.1, 0.05, 1.9, '#c9c0b0', { x: ROOM.x1 + T / 2, z: -2.65 }));

  // Window: frame, mullion, glass, sill.
  const fr = '#f6f3ee';
  g.add(box(1.7, 0.08, 0.26, fr, { x: -4.2, y: 1.14, z: -5.92 }));
  g.add(box(1.6, 0.06, 0.12, fr, { x: -4.2, y: 2.42, z: -6.0 }));
  g.add(box(0.06, 1.25, 0.12, fr, { x: -5.0, y: 1.2, z: -6.0 }));
  g.add(box(0.06, 1.25, 0.12, fr, { x: -3.4, y: 1.2, z: -6.0 }));
  g.add(box(0.05, 1.25, 0.08, fr, { x: -4.2, y: 1.2, z: -6.0 }));
  const glassMat = stdMat({ color: '#cfe2ec', transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.2, depthWrite: false });
  const glass = card(1.6, 1.25, null, { mat: glassMat, x: -4.2, y: 1.825, z: -6.02 });
  glass.material = glassMat;
  g.add(glass);
  g.userData.tick = () => {
    glassMat.opacity = 0.22 + G.night * 0.3;
    glassMat.color.setRGB(0.8 - G.night * 0.65, 0.88 - G.night * 0.65, 0.93 - G.night * 0.55);
  };

  // Hall door: a dark doorway with an open door leaf.
  g.add(card(0.9, 2.15, '#2b241f', { x: ROOM.x0 - 0.21, y: 1.075, z: -4.3, ry: Math.PI / 2 }));
  g.add(box(0.12, 2.2, 0.06, fr, { x: ROOM.x0 + 0.02, z: -4.78 }));
  g.add(box(0.12, 2.2, 0.06, fr, { x: ROOM.x0 + 0.02, z: -3.82 }));
  g.add(box(0.12, 0.06, 1.0, fr, { x: ROOM.x0 + 0.02, y: 2.15, z: -4.3 }));
  const leaf = box(0.04, 2.08, 0.86, '#efe8dc', { x: 0, y: 0, z: 0.43 });
  const hinge = new THREE.Group();
  hinge.position.set(ROOM.x0 + 0.02, 0, -3.88);
  hinge.rotation.y = -1.2;
  hinge.add(leaf);
  hinge.add(sphere(0.035, '#b8a070', { x: 0.05, y: 1.0, z: 0.78 }));
  g.add(hinge);
  return g;
}

export function floor() {
  const t = floorTex();
  const m = stdMat({ map: t, roughness: 0.75 });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), m);
  f.rotation.x = -Math.PI / 2;
  f.position.set(-4, 0.02, -3);
  f.receiveShadow = true;
  return group(f, box(8.4, 0.3, 6.4, '#6b5444', { x: -4, y: -0.29, z: -3 }));
}

export function kitchen(p = {}) {
  const g = new THREE.Group();
  const unit = p.unit || '#e7dfcc';
  const top = '#b98d5e';
  const z = -5.67; // centre of base units (depth 0.62 from wall)
  // Base cabinets from x -6.85 to -0.9.
  g.add(box(5.95, 0.08, 0.56, '#3d342d', { x: -3.875, y: 0, z: z + 0.02 }));
  g.add(box(5.95, 0.8, 0.62, unit, { x: -3.875, y: 0.08, z }));
  // Door seams and handles.
  for (let i = 0; i < 9; i++) {
    const x = -6.85 + 0.66 * (i + 0.5);
    if (x > -2.5 && x < -1.4) continue; // oven
    g.add(box(0.012, 0.74, 0.01, '#c9bfaa', { x: x + 0.33, y: 0.11, z: z + 0.315 }));
    g.add(box(0.16, 0.025, 0.03, '#8a8070', { x, y: 0.75, z: z + 0.33 }));
  }
  // Oven.
  g.add(box(0.62, 0.62, 0.02, '#2c2c30', { x: -1.95, y: 0.14, z: z + 0.315 }));
  g.add(box(0.44, 0.3, 0.01, '#4a3a2e', { x: -1.95, y: 0.24, z: z + 0.33, m: { emissive: '#ff8a3a', emissiveIntensity: p.ovenOn ? 0.7 : 0 } }));
  g.add(box(0.5, 0.03, 0.04, '#bbb', { x: -1.95, y: 0.66, z: z + 0.34 }));
  // Worktop.
  g.add(box(6.05, 0.05, 0.68, top, { x: -3.875, y: 0.88, z: z + 0.03 }));
  // Splashback tiles.
  const tt = tileTex();
  tt.wrapS = tt.wrapT = THREE.RepeatWrapping;
  const tileMat = stdMat({ map: tt, roughness: 0.5 });
  for (const [a, b] of [[-6.85, -5.0], [-3.4, -0.9]]) {
    const pl = new THREE.Mesh(uvPlane(b - a, 0.7, 0.5, a, 0), tileMat);
    pl.position.set((a + b) / 2, 0.93 + 0.35, -5.995);
    pl.receiveShadow = true;
    g.add(pl);
  }
  // Sink + tap under the window.
  g.add(box(0.7, 0.02, 0.45, '#9aa3a8', { x: -4.2, y: 0.925, z: -5.66, m: { metal: 0.6, rough: 0.35 } }));
  g.add(box(0.6, 0.012, 0.36, '#4d555a', { x: -4.2, y: 0.94, z: -5.66 }));
  g.add(cyl(0.025, 0.025, 0.28, '#c8cdd0', { x: -4.2, y: 0.93, z: -5.92, m: { metal: 0.8, rough: 0.3 } }));
  g.add(box(0.04, 0.04, 0.2, '#c8cdd0', { x: -4.2, y: 1.18, z: -5.84, m: { metal: 0.8, rough: 0.3 } }));
  // Hob.
  g.add(box(0.62, 0.012, 0.5, '#1d1d20', { x: -1.95, y: 0.93, z: -5.66, m: { rough: 0.2 } }));
  for (const [dx, dz] of [[-0.15, -0.12], [0.15, -0.12], [-0.15, 0.12], [0.15, 0.12]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 4, 20), mat('#55555a'));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-1.95 + dx, 0.945, -5.66 + dz);
    g.add(ring);
  }
  // Upper cabinets, either side of the window.
  for (const [a, b] of [[-6.85, -5.15], [-3.25, -0.9]]) {
    g.add(box(b - a, 0.78, 0.36, unit, { x: (a + b) / 2, y: 1.62, z: -5.82 }));
    const n = Math.round((b - a) / 0.6);
    for (let i = 0; i < n; i++) {
      const x = a + ((b - a) / n) * (i + 0.5);
      g.add(box(0.012, 0.72, 0.01, '#c9bfaa', { x: a + ((b - a) / n) * (i + 1), y: 1.65, z: -5.635 }));
      g.add(box(0.03, 0.14, 0.03, '#8a8070', { x: x + 0.2, y: 1.68, z: -5.62 }));
    }
  }
  // Extractor hood above the hob.
  g.add(box(0.7, 0.18, 0.46, '#b8bcc0', { x: -1.95, y: 1.44, z: -5.78, m: { metal: 0.5, rough: 0.4 } }));
  // Herbs on the windowsill.
  if (p.herbs !== false) {
    for (const [i, c] of [['#c66a3c', '#4f8a4a'], ['#d9cbb2', '#6aa35a'], ['#c66a3c', '#3f7a45']].entries()) {
      const x = -4.75 + i * 0.25;
      g.add(cyl(0.07, 0.055, 0.12, c[0], { x, y: 1.18, z: -5.88 }));
      g.add(ico(0.09, c[1], { x, y: 1.36, z: -5.88, sy: 0.9 }));
    }
  }
  return g;
}

const NOTE_COLORS = { y: '#f7e27a', p: '#f4a9c0', b: '#9fd0f0', g: '#b7e0a0', w: '#fbfaf5', o: '#f6b56b' };

function scribbleTex(seed, colors) {
  return canvasTex('scrib' + seed, 64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#fffdf6';
    ctx.fillRect(0, 0, w, h);
    let s = seed * 97 + 3;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(r() * w, r() * h);
      ctx.quadraticCurveTo(r() * w, r() * h, r() * w, r() * h);
      ctx.stroke();
    }
    ctx.fillStyle = colors[0];
    ctx.beginPath();
    ctx.arc(14 + r() * 36, 14 + r() * 20, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function fridge(p = {}) {
  const g = new THREE.Group();
  const col = p.color || '#eeebe3';
  const fx = -7.45, fz = -5.6;
  g.add(box(1.0, 2.05, 0.7, col, { x: fx, z: fz, r: 0.06, m: { rough: 0.4 } }));
  g.add(box(0.96, 0.012, 0.01, '#c9c4b8', { x: fx, y: 0.72, z: fz + 0.352 }));
  g.add(box(0.04, 0.5, 0.05, '#bdb7aa', { x: fx + 0.4, y: 1.0, z: fz + 0.37, r: 0.015 }));
  g.add(box(0.04, 0.3, 0.05, '#bdb7aa', { x: fx + 0.4, y: 0.32, z: fz + 0.37, r: 0.015 }));
  // Notes, drawings, photos, letters: the household's short-term memory.
  const notes = p.notes || [];
  const slots = [
    [-0.28, 1.72], [0.02, 1.78], [-0.12, 1.45], [0.2, 1.5], [-0.3, 1.18],
    [0.05, 1.2], [-0.15, 0.92], [0.22, 0.95], [-0.3, 0.5], [0.0, 0.42], [0.25, 1.85], [-0.33, 1.98],
  ];
  notes.forEach((n, i) => {
    const [sx, sy] = slots[i % slots.length];
    const kind = typeof n === 'string' ? n : n.k;
    let w = 0.18, h = 0.18, material;
    if (kind === 'draw' || kind === 'draw2') {
      w = 0.26; h = 0.2;
      material = stdMat({ map: scribbleTex(i + (kind === 'draw2' ? 50 : 0) + (p.seed || 0), ['#e0483a', '#2f6fd0', '#f2b822', '#3aa65a']), roughness: 0.9 });
    } else if (kind === 'photo') {
      w = 0.17; h = 0.2;
      material = mat('#f5f3ee');
      const inner = card(0.14, 0.14, n.c || '#7a8a6a', { x: fx + sx, y: sy + 0.02, z: fz + 0.358 });
      inner.rotation.z = (i % 2 ? 1 : -1) * 0.06;
      g.add(inner);
    } else if (kind === 'letter') {
      w = 0.24; h = 0.32;
      material = mat('#fbfaf6');
    } else if (kind === 'menu') {
      w = 0.16; h = 0.3;
      material = mat('#c8372d');
    } else if (kind === 'card') {
      w = 0.2; h = 0.14;
      material = mat(n.c || '#2f3a5a');
    } else {
      material = mat(NOTE_COLORS[kind] || '#f7e27a');
    }
    const q = card(w, h, null, { mat: material, x: fx + sx, y: sy, z: fz + 0.354 });
    q.material = material;
    q.rotation.z = ((i * 37) % 11 - 5) * 0.03;
    g.add(q);
    // magnet
    g.add(sphere(0.022, ['#d33', '#36c', '#2a2', '#fb2'][i % 4], { x: fx + sx, y: sy + h / 2 - 0.02, z: fz + 0.37 }));
  });
  return g;
}

export function kettle(p = {}) {
  const g = new THREE.Group();
  const c = '#f4f1ea';
  g.add(cyl(0.12, 0.12, 0.025, '#2b2b2e', { y: 0 }));
  g.add(cyl(0.095, 0.115, 0.24, c, { y: 0.025, m: { rough: 0.35 } }));
  g.add(cyl(0.06, 0.095, 0.04, c, { y: 0.265, m: { rough: 0.35 } }));
  g.add(box(0.03, 0.03, 0.06, '#2b2b2e', { y: 0.3 }));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 6, 14, Math.PI), mat(c, { rough: 0.35 }));
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(-0.12, 0.15, 0);
  handle.castShadow = true;
  g.add(handle);
  const spout = cone(0.035, 0.12, c, { x: 0.12, y: 0.17, m: { rough: 0.35 } });
  spout.rotation.z = -0.9;
  g.add(spout);
  const light = sphere(0.014, '#555', { x: -0.08, y: 0.07, z: 0.08, m: { emissive: '#4fb0ff', emissiveIntensity: 0 } });
  g.add(light);
  g.userData.setBoiling = (on) => { light.material = mat('#555', { emissive: '#4fb0ff', emissiveIntensity: on ? 2 : 0 }); };
  return g;
}

// Pip: a speaker the size of a scone, with a ring of light.
export function pip(p = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.1, 0.11, 0.09, '#d6d0c6', { y: 0, m: { rough: 1 } }));
  g.add(cyl(0.085, 0.1, 0.012, '#bdb6aa', { y: 0.09 }));
  // (off: switched off, as in the Pause: a dark ring, no glow)
  const ringCol = p.off ? '#45474c' : p.color || '#ffd59a';
  const ringMat = stdMat({ color: ringCol, emissive: p.off ? '#000000' : ringCol, emissiveIntensity: p.off ? 0 : 1 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 28), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  g.add(ring);
  // No point light here: the emissive ring is enough, and a constant number of
  // lights across visits keeps shaders from recompiling.
  const light = null;
  let speak = 0;
  g.userData.speak = (v) => { speak = v; };
  if (p.off) return g;
  g.userData.tick = (dt, t) => {
    const k = 0.7 + Math.sin(t * (p.fast ? 3 : 1.2)) * 0.3 + speak * (0.5 + Math.sin(t * 17) * 0.5);
    ringMat.emissiveIntensity = (p.dim ? 0.4 : 1) * k * 1.4;
    if (light) light.intensity = k * 0.25 + speak * 0.8;
  };
  return g;
}

export function radio(p = {}) {
  const g = new THREE.Group();
  const c = p.color || '#c2553d';
  g.add(box(0.46, 0.26, 0.17, c, { r: 0.04 }));
  g.add(box(0.2, 0.18, 0.01, '#e8dcc6', { x: -0.1, y: 0.04, z: 0.086 }));
  for (let i = 0; i < 5; i++) g.add(box(0.18, 0.008, 0.005, '#9b8a70', { x: -0.1, y: 0.06 + i * 0.03, z: 0.092 }));
  g.add(box(0.14, 0.06, 0.01, '#f2e7cf', { x: 0.11, y: 0.15, z: 0.086, m: { emissive: '#ffcc80', emissiveIntensity: p.on ? 0.6 : 0 } }));
  g.add(cyl(0.03, 0.03, 0.03, '#e8dcc6', { x: 0.08, y: 0.06, z: 0.09, rx: Math.PI / 2 }));
  g.add(cyl(0.03, 0.03, 0.03, '#e8dcc6', { x: 0.16, y: 0.06, z: 0.09, rx: Math.PI / 2 }));
  g.add(box(0.26, 0.03, 0.03, '#3a3430', { y: 0.27 }));
  const ant = cyl(0.006, 0.006, 0.45, '#ccc', { x: 0.17, y: 0.26, rz: -0.5 });
  g.add(ant);
  return g;
}

export function table(p = {}) {
  const g = new THREE.Group();
  const c = '#a87b52';
  g.add(box(1.9, 0.06, 1.05, c, { y: 0.72, r: 0.02 }));
  for (const [x, z] of [[-0.85, -0.42], [0.85, -0.42], [-0.85, 0.42], [0.85, 0.42]]) g.add(box(0.07, 0.72, 0.07, '#8d6442', { x, z }));
  return g;
}

export function chair(p = {}) {
  const g = new THREE.Group();
  const c = p.color || '#7a5a3e';
  g.add(box(0.44, 0.05, 0.42, c, { y: 0.42 }));
  for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) g.add(box(0.04, 0.42, 0.04, c, { x, z }));
  g.add(box(0.44, 0.5, 0.04, c, { y: 0.47, z: -0.2 }));
  for (const x of [-0.12, 0, 0.12]) g.add(box(0.03, 0.4, 0.03, '#e7dfcc', { x, y: 0.5, z: -0.2 }));
  return g;
}

export function armchair(p = {}) {
  const g = new THREE.Group();
  const c = p.color || '#8f4f3a';
  g.add(box(0.95, 0.42, 0.85, c, { y: 0.08, r: 0.08 }));
  g.add(box(0.95, 0.75, 0.22, c, { y: 0.35, z: -0.33, r: 0.08 }));
  g.add(box(0.18, 0.32, 0.8, c, { x: -0.43, y: 0.45, r: 0.07 }));
  g.add(box(0.18, 0.32, 0.8, c, { x: 0.43, y: 0.45, r: 0.07 }));
  g.add(box(0.62, 0.1, 0.6, '#a96048', { y: 0.5, z: 0.06, r: 0.04 }));
  for (const [x, z] of [[-0.4, -0.35], [0.4, -0.35], [-0.4, 0.35], [0.4, 0.35]]) g.add(cyl(0.03, 0.025, 0.08, '#3a2a20', { x, z }));
  if (p.blanket) g.add(box(0.5, 0.04, 0.7, p.blanket, { x: 0.25, y: 0.78, z: -0.1, rz: -0.4, r: 0.02 }));
  return g;
}

export function rug(p = {}) {
  const t = rugTex(p.variant || 0);
  const m = stdMat({ map: t, roughness: 1 });
  const r = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.9), m);
  r.rotation.x = -Math.PI / 2;
  r.position.y = 0.035;
  r.receiveShadow = true;
  return group(r);
}

function lampLight(color, base, dist) {
  const l = new THREE.PointLight(color, 0, dist, 1.6);
  l.userData.base = base;
  return l;
}

export function floorLamp(p = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.16, 0.18, 0.03, '#2d2a27'));
  g.add(cyl(0.015, 0.015, 1.45, '#2d2a27', { y: 0.03 }));
  const shadeMat = mat('#f3dfb6', { emissive: '#ffcf8a', emissiveIntensity: 0 });
  const shade = cyl(0.14, 0.24, 0.28, '#f3dfb6', { y: 1.42, mat: shadeMat });
  shade.castShadow = false;
  g.add(shade);
  const l = lampLight('#ffbf78', 7, 7);
  l.position.y = 1.3;
  g.add(l);
  g.userData.tick = () => {
    const k = p.off ? 0 : G.interior;
    l.intensity = l.userData.base * k;
    shadeMat.emissiveIntensity = 0.9 * k;
  };
  return g;
}

export function pendant(p = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.006, 0.006, 0.7, '#222', { y: 2.3 }));
  const shadeMat = mat(p.color || '#2f5a5a', { rough: 0.6, side: THREE.DoubleSide });
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.24, 18, 1, true), shadeMat);
  shade.position.y = 2.2;
  g.add(shade);
  const bulbMat = mat('#fff3d8', { emissive: '#ffe2b0', emissiveIntensity: 0 });
  const bulb = sphere(0.06, '#fff3d8', { y: 2.1, mat: bulbMat, cast: false });
  g.add(bulb);
  const l = lampLight('#ffcf90', 9, 8);
  l.position.y = 1.95;
  g.add(l);
  g.userData.tick = () => {
    const k = p.off ? 0 : G.interior;
    l.intensity = l.userData.base * k;
    bulbMat.emissiveIntensity = 2.2 * k;
  };
  return g;
}

const BOOK_COLORS = ['#7a2e2e', '#2e4a7a', '#c9a24a', '#3f6b4a', '#e8e0cc', '#5a3f6b', '#c4613a', '#1f2f3f', '#9a8a6a'];

export function bookshelf(p = {}) {
  const g = new THREE.Group();
  const c = '#6e4e36';
  const W = 1.4, H = 1.9, D = 0.34;
  g.add(box(0.03, H, D, c, { x: 0, z: -W / 2 }));
  g.add(box(0.03, H, D, c, { x: 0, z: W / 2 }));
  g.add(box(D, 0.03, W, c, { x: 0, y: H - 0.03 }));
  for (let i = 0; i < 4; i++) g.add(box(D, 0.03, W, c, { x: 0, y: 0.1 + i * 0.45 }));
  g.add(box(0.02, H, W, '#5a3e2b', { x: -D / 2 + 0.01 }));
  const pattern = p.books || 'full';
  let s = p.seed || 3;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let shelf = 0; shelf < 4; shelf++) {
    let z = -W / 2 + 0.05;
    const fill = pattern === 'sparse' ? 0.45 : pattern === 'half' ? 0.7 : 0.95;
    while (z < -W / 2 + W * fill) {
      const bw = 0.04 + r() * 0.05, bh = 0.26 + r() * 0.14;
      const col = (p.palette || BOOK_COLORS)[Math.floor(r() * (p.palette || BOOK_COLORS).length)];
      // Big dictionaries on the bottom shelf.
      const isDict = shelf === 0 && p.dictionaries;
      g.add(box(0.24, isDict ? 0.36 : bh, isDict ? bw * 2.2 : bw, isDict ? '#2a3a5a' : col, { x: 0.01, y: 0.13 + shelf * 0.45, z: z + bw / 2 }));
      z += (isDict ? bw * 2.2 : bw) + 0.006;
    }
    if (p.objects && shelf === 3) {
      g.add(ico(0.08, '#4f8a4a', { x: 0.02, y: 1.6, z: 0.45 }));
      g.add(cyl(0.06, 0.05, 0.1, '#c66a3c', { x: 0.02, y: 1.48, z: 0.45 }));
    }
  }
  return g;
}

export function calendar(p = {}) {
  const t = calendarTex(p.key || 'x', p.month || 'OCTOBER', p.color || '#4a6a8a', p.motif || 'lighthouse');
  const g = new THREE.Group();
  const c = card(0.4, 0.5, t, {});
  c.rotation.y = Math.PI / 2;
  g.add(c);
  g.add(sphere(0.015, '#555', { y: 0.27, x: 0.01 }));
  return g;
}

export function clock(p = {}) {
  const g = new THREE.Group();
  const face = cyl(0.22, 0.22, 0.04, '#f8f5ee', { rz: Math.PI / 2 });
  face.position.set(0, 0, 0);
  g.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 24), mat('#3a3430'));
  rim.rotation.y = Math.PI / 2;
  g.add(rim);
  const [hh, mm] = (p.time || '19:40').split(':').map(Number);
  const hourA = ((hh % 12) + mm / 60) / 12 * Math.PI * 2;
  const minA = mm / 60 * Math.PI * 2;
  const hand = (len, w, a) => {
    const pivot = new THREE.Group();
    pivot.position.x = 0.03;
    const h = box(0.01, len, w, '#222', {});
    pivot.add(h);
    pivot.rotation.x = -a;
    return pivot;
  };
  g.add(hand(0.12, 0.02, hourA));
  g.add(hand(0.18, 0.012, minA));
  return g;
}

export function photoFrame(p = {}) {
  const g = new THREE.Group();
  g.add(box(0.04, 0.42, 0.56, '#3a2c22', {}));
  const pic = canvasTex('photo-' + (p.variant || 'family'), 128, 96, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#9cc4e4');
    sky.addColorStop(1, '#e8d8b0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#6a9a5a';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    const fig = (x, hh, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x - 5, h * 0.72 - hh, 10, hh);
      ctx.beginPath();
      ctx.arc(x, h * 0.72 - hh - 6, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#d9a888';
      ctx.fill();
    };
    fig(34, 30, '#8a7550');
    fig(52, 34, '#c4613a');
    fig(70, 32, '#4f7f8f');
    fig(86, 16, '#f2c230');
  });
  const c = card(0.36, 0.3, pic, { x: 0.025 });
  c.rotation.y = Math.PI / 2;
  g.add(c);
  return g;
}

export function dogBed(p = {}) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.12, 8, 20), mat(p.color || '#6a7f9a'));
  t.rotation.x = Math.PI / 2;
  t.position.y = 0.12;
  t.castShadow = true;
  g.add(t);
  g.add(cyl(0.34, 0.34, 0.08, '#c9b9a0', { y: 0.02 }));
  if (p.bowl) {
    g.add(cyl(0.11, 0.09, 0.07, '#b33a2a', { x: 0.6, z: -0.3 }));
    g.add(cyl(0.09, 0.09, 0.01, '#8fc0e0', { x: 0.6, y: 0.06, z: -0.3 }));
  }
  if (p.ball) g.add(sphere(0.06, '#d9e04a', { x: 0.2, y: 0.1, z: 0.1 }));
  return g;
}

export function laptop(p = {}) {
  const g = new THREE.Group();
  g.add(box(0.36, 0.015, 0.25, '#b8bcc2', { m: { metal: 0.5, rough: 0.4 } }));
  const lid = new THREE.Group();
  lid.position.set(0, 0.015, -0.12);
  lid.rotation.x = p.closed ? -Math.PI / 2 + 0.02 : 0.25;
  lid.add(box(0.36, 0.24, 0.012, '#b8bcc2', { m: { metal: 0.5, rough: 0.4 } }));
  const screen = card(0.33, 0.21, p.screen || '#dfe9f2', { y: 0.12, z: 0.007, m: { emissive: p.screen || '#dfe9f2', emissiveIntensity: p.closed ? 0 : 0.7 } });
  lid.add(screen);
  g.add(lid);
  return g;
}

export function tablet(p = {}) {
  const g = new THREE.Group();
  g.add(box(0.2, 0.012, 0.28, '#222', { r: 0.005 }));
  g.add(card(0.18, 0.26, p.screen || '#f2a14a', { y: 0.014, m: { emissive: p.screen || '#f2a14a', emissiveIntensity: 0.6 } }));
  g.children[1].rotation.x = -Math.PI / 2;
  if (p.stand) {
    g.rotation.x = -1.1;
    g.position.y = 0.12;
  }
  return g;
}

export function mug(p = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.045, 0.04, 0.1, p.color || '#e9e4d8'));
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 5, 10), mat(p.color || '#e9e4d8'));
  h.position.set(0.05, 0.05, 0);
  g.add(h);
  if (p.full) g.add(cyl(0.04, 0.04, 0.005, '#7a4a2a', { y: 0.088 }));
  return g;
}

export function paper(p = {}) {
  const g = new THREE.Group();
  const c = card(p.w || 0.21, p.h || 0.3, p.color || '#fbfaf5', {});
  c.rotation.x = -Math.PI / 2;
  c.position.y = 0.005;
  g.add(c);
  if (p.drawing) {
    const d = card(0.15, 0.12, scribbleTex(p.seed || 9, ['#e0483a', '#2f6fd0', '#f2b822']), {});
    d.rotation.x = -Math.PI / 2;
    d.position.y = 0.007;
    g.add(d);
  }
  if (p.crayons) {
    ['#e0483a', '#2f6fd0', '#f2b822', '#3aa65a'].forEach((c2, i) => {
      const cr = cyl(0.008, 0.008, 0.09, c2, { x: 0.16 + i * 0.03, y: 0.01, z: 0.05, rz: Math.PI / 2 });
      cr.rotation.y = 0.3 * i;
      g.add(cr);
    });
  }
  return g;
}

export function fan(p = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.14, 0.16, 0.04, '#e8e8e6'));
  g.add(cyl(0.02, 0.02, 0.9, '#e8e8e6', { y: 0.04 }));
  const head = new THREE.Group();
  head.position.y = 1.0;
  const cage = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 24), mat('#e8e8e6'));
  head.add(cage);
  const blades = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const b = box(0.06, 0.17, 0.01, '#9fd0f0', { y: -0.0 });
    b.position.set(0, 0.08, 0);
    const piv = new THREE.Group();
    piv.rotation.z = (i * Math.PI * 2) / 3;
    piv.add(b);
    blades.add(piv);
  }
  head.add(blades);
  head.add(sphere(0.04, '#e8e8e6', {}));
  g.add(head);
  g.userData.tick = (dt, t) => {
    blades.rotation.z += dt * 18;
    head.rotation.y = Math.sin(t * 0.4) * 0.6;
  };
  return g;
}

export function oxygen(p = {}) {
  const g = new THREE.Group();
  g.add(box(0.36, 0.58, 0.28, '#e4e6e8', { y: 0.06, r: 0.05 }));
  for (const [x, z] of [[-0.13, -0.1], [0.13, -0.1], [-0.13, 0.1], [0.13, 0.1]]) g.add(sphere(0.035, '#333', { x, y: 0.035, z }));
  g.add(box(0.2, 0.08, 0.01, '#6fd0a0', { y: 0.48, z: 0.141, m: { emissive: '#6fd0a0', emissiveIntensity: 0.8 } }));
  const tube = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.01, 4, 20, Math.PI), mat('#cfe6ee'));
  tube.position.set(0.3, 0.64, 0);
  tube.rotation.y = Math.PI / 2;
  g.add(tube);
  return g;
}

export function toolbag(p = {}) {
  const g = new THREE.Group();
  g.add(box(0.5, 0.26, 0.26, '#2f3640', { r: 0.05 }));
  g.add(box(0.5, 0.04, 0.27, '#e85a2a', { y: 0.12 }));
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 4, 12, Math.PI), mat('#222'));
  h.position.y = 0.26;
  g.add(h);
  g.add(box(0.08, 0.2, 0.04, '#e8b923', { x: 0.15, y: 0.25, z: 0.05, rz: 0.3 }));
  if (p.hivis) g.add(box(0.5, 0.05, 0.4, '#d8f03a', { x: -0.1, y: 0.0, z: 0.4, r: 0.02, m: { emissive: '#7a8a10', emissiveIntensity: 0.2 } }));
  if (p.dusty) g.add(box(0.52, 0.005, 0.28, '#b9b2a6', { y: 0.265, m: { transparent: true, opacity: 0.5 } }));
  return g;
}

export function hospitalBed(p = {}) {
  const g = new THREE.Group();
  g.add(box(0.95, 0.06, 2.0, '#c8ccd0', { y: 0.4, m: { metal: 0.4, rough: 0.5 } }));
  for (const [x, z] of [[-0.42, -0.92], [0.42, -0.92], [-0.42, 0.92], [0.42, 0.92]]) {
    g.add(box(0.05, 0.4, 0.05, '#9aa0a6', { x, z }));
    g.add(sphere(0.05, '#333', { x, y: 0.04, z }));
  }
  g.add(box(0.9, 0.16, 1.95, '#f3f3f0', { y: 0.46, r: 0.05 }));
  g.add(box(0.95, 0.55, 0.05, '#c8ccd0', { y: 0.45, z: -1.0 }));
  g.add(box(0.95, 0.3, 0.05, '#c8ccd0', { y: 0.45, z: 1.0 }));
  // pillow, raised back
  g.add(box(0.6, 0.12, 0.35, '#ffffff', { y: 0.66, z: -0.75, rx: -0.4, r: 0.05 }));
  g.add(box(0.3, 0.2, 0.02, '#cfd8e0', { x: 0.52, y: 0.6, z: 0.2 }));
  return g;
}

export function sideTable(p = {}) {
  const g = new THREE.Group();
  g.add(box(0.45, 0.04, 0.45, '#8d6442', { y: 0.55 }));
  for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) g.add(box(0.035, 0.55, 0.035, '#8d6442', { x, z }));
  if (p.cards) {
    ['#f4a9c0', '#9fd0f0', '#f7e27a', '#fbfaf5'].forEach((c, i) => {
      const cd = box(0.12, 0.16, 0.01, c, { x: -0.13 + i * 0.09, y: 0.59, z: -0.05 + (i % 2) * 0.08, ry: 0.3 * (i - 1.5) });
      cd.rotation.x = -0.1;
      g.add(cd);
    });
  }
  if (p.flowers) {
    g.add(cyl(0.05, 0.06, 0.16, '#9fc8d8', { x: 0.12, y: 0.59, z: 0.12, m: { transparent: true, opacity: 0.7 } }));
    for (const [dx, dz, c] of [[0, 0, '#f2c230'], [0.05, 0.03, '#e0483a'], [-0.04, 0.04, '#f4f1ea']]) g.add(sphere(0.045, c, { x: 0.12 + dx, y: 0.82, z: 0.12 + dz }));
  }
  if (p.pills) for (let i = 0; i < 3; i++) g.add(cyl(0.025, 0.025, 0.08, ['#f4f1ea', '#e85a2a', '#f4f1ea'][i], { x: -0.12 + i * 0.06, y: 0.59, z: 0.14 }));
  if (p.glass) g.add(cyl(0.035, 0.03, 0.11, '#cfe6ee', { x: 0.0, y: 0.59, z: 0.14, m: { transparent: true, opacity: 0.6 } }));
  return g;
}

export function telescope(p = {}) {
  const g = new THREE.Group();
  for (const a of [0, 2.1, 4.2]) {
    const leg = cyl(0.015, 0.015, 1.0, '#333', { x: Math.sin(a) * 0.18, z: Math.cos(a) * 0.18 });
    leg.rotation.set(Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2);
    g.add(leg);
  }
  const tube = cyl(0.06, 0.07, 0.8, '#f2f2f0', { y: -0.4 });
  const piv = new THREE.Group();
  piv.position.y = 1.0;
  // Tilt first, then turn: `dir` is the compass bearing of the tilted tube.
  piv.rotation.order = 'YXZ';
  piv.rotation.x = -0.9;
  piv.rotation.y = p.dir ?? 0.8;
  piv.add(tube);
  g.add(piv);
  return g;
}

export function boxes(p = {}) {
  const g = new THREE.Group();
  const n = p.n || 4;
  for (let i = 0; i < n; i++) {
    g.add(box(0.5, 0.36, 0.4, '#c8a272', { x: (i % 2) * 0.55, y: Math.floor(i / 2) * 0.37, z: 0, r: 0.01 }));
    g.add(box(0.5, 0.005, 0.06, '#b08a5a', { x: (i % 2) * 0.55, y: Math.floor(i / 2) * 0.37 + 0.36, z: 0 }));
  }
  return g;
}

export function bench(p = {}) {
  const g = new THREE.Group();
  g.add(box(1.4, 0.06, 0.45, '#8d6442', { y: 0.42 }));
  g.add(box(1.4, 0.4, 0.05, '#8d6442', { y: 0.5, z: -0.2 }));
  for (const x of [-0.62, 0.62]) for (const z of [-0.18, 0.18]) g.add(box(0.05, 0.42, 0.05, '#5a4030', { x, z }));
  if (p.blanket) g.add(box(1.0, 0.06, 0.5, p.blanket, { y: 0.47, z: 0.03, r: 0.03 }));
  return g;
}
