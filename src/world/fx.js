import { THREE, box, mat, drawnTexture } from './kit.js';
import { G } from '../engine/stage.js';
import { rng } from '../engine/tween.js';
import { puffTex } from './city.js';
import { QUALITY } from '../engine/quality.js';

const LITE = QUALITY.lite ? 0.45 : 1;

// Weather and small living details.

// Weather falls over the whole view, not just the plot: the street runs on
// past both edges and the allotments behind.
const AREA = { x0: -22, x1: 30, z0: -12, z1: 10 };
const SPREAD = 1.7; // how much more ground that is than the plot alone

export function rain(p = {}) {
  const n = Math.round((p.n ?? 900) * LITE * SPREAD);
  const pos = new Float32Array(n * 6);
  const r = rng(5);
  const drops = [];
  for (let i = 0; i < n; i++) {
    drops.push({ x: AREA.x0 + r() * (AREA.x1 - AREA.x0), y: r() * 14, z: AREA.z0 + r() * (AREA.z1 - AREA.z0), s: 16 + r() * 6 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineBasicMaterial({ color: '#c8d4e0', transparent: true, opacity: 0.45 });
  const lines = new THREE.LineSegments(geo, m);
  lines.frustumCulled = false;
  const g = new THREE.Group();
  g.add(lines);
  g.userData.tick = (dt) => {
    for (let i = 0; i < n; i++) {
      const d = drops[i];
      d.y -= d.s * dt;
      d.x += dt * 2;
      if (d.y < 0) { d.y = 12 + r() * 3; d.x = AREA.x0 + r() * (AREA.x1 - AREA.x0); }
      if (d.x > AREA.x1) d.x = AREA.x0;
      pos.set([d.x, d.y, d.z, d.x - 0.06, d.y + 0.45, d.z], i * 6);
    }
    geo.attributes.position.needsUpdate = true;
  };
  return g;
}

function flakes(p, opts) {
  const n = Math.round((p.n ?? opts.n) * LITE * (opts.spread ?? SPREAD));
  const r = rng(opts.seed);
  const pos = new Float32Array(n * 3);
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({ x: AREA.x0 + r() * (AREA.x1 - AREA.x0), y: r() * (opts.top ?? 12), z: AREA.z0 + r() * (AREA.z1 - AREA.z0), s: opts.speed * (0.6 + r() * 0.8), ph: r() * 6 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = drawnTexture(16, 16, (ctx) => {
    const gr = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 16, 16);
  });
  const m = new THREE.PointsMaterial({ size: opts.size, map: tex, color: opts.color, transparent: true, depthWrite: false, sizeAttenuation: false, blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(geo, m);
  pts.frustumCulled = false;
  const g = new THREE.Group();
  g.add(pts);
  g.userData.tick = (dt, t) => {
    for (let i = 0; i < n; i++) {
      const f = items[i];
      f.y -= f.s * dt;
      f.x += Math.sin(t * 0.8 + f.ph) * dt * opts.sway + G.wind * dt * 2;
      f.z += Math.cos(t * 0.6 + f.ph) * dt * opts.sway * 0.5;
      if (opts.float) {
        f.y += Math.sin(t * 0.7 + f.ph) * dt * 0.4 + f.s * dt;
        if (f.y > 4 || f.y < 0.2) f.s = -f.s;
      }
      if (f.y < 0) { f.y = opts.top ?? 11; f.x = AREA.x0 + r() * (AREA.x1 - AREA.x0); }
      if (f.x > AREA.x1) f.x = AREA.x0;
      pos[i * 3] = f.x; pos[i * 3 + 1] = f.y; pos[i * 3 + 2] = f.z;
    }
    geo.attributes.position.needsUpdate = true;
    if (opts.blink) m.opacity = 0.6 + Math.sin(t * 3) * 0.3;
  };
  return g;
}

export const snowfall = (p = {}) => flakes(p, { n: 500, seed: 6, speed: 1.1, size: 4, color: '#ffffff', sway: 0.6, top: 16 });
export const motes = (p = {}) => flakes(p, { n: 70, seed: 7, speed: 0.15, size: 3.5, color: p.color || '#ffe6a0', sway: 0.4, float: true, additive: true, blink: true, spread: 1.3 });

// Falling leaves (autumn) or petals (spring), as tiny tumbling cards.
export function leaves(p = {}) {
  const g = new THREE.Group();
  const r = rng(p.seed || 8);
  const n = Math.round((p.n ?? 40) * LITE);
  const cols = p.colors || ['#d9822b', '#e6a53a', '#c4562c', '#e0b24a'];
  const items = [];
  for (let i = 0; i < n; i++) {
    const m = box(0.12, 0.01, 0.08, cols[i % cols.length], { cast: false, receive: false });
    const it = { m, x: 0, y: 0, z: 0, s: 0.4 + r() * 0.5, ph: r() * 6 };
    const reset = (first) => {
      const fromTree = r() < (p.tree ?? 0.7);
      it.x = fromTree ? 5.2 + (r() - 0.5) * 2.4 : AREA.x0 + r() * (AREA.x1 - AREA.x0);
      it.z = fromTree ? -1.6 + (r() - 0.5) * 2.4 : AREA.z0 + r() * (AREA.z1 - AREA.z0);
      it.y = first ? r() * 4 : 3 + r() * 1.5;
    };
    it.reset = reset;
    reset(true);
    g.add(m);
    items.push(it);
  }
  g.userData.tick = (dt, t) => {
    for (const it of items) {
      it.y -= it.s * dt;
      it.x += (Math.sin(t + it.ph) * 0.5 + G.wind * 2.5) * dt;
      if (it.y < 0.02) it.reset(false);
      it.m.position.set(it.x, it.y, it.z);
      it.m.rotation.set(t * 2 + it.ph, t * 1.3, t + it.ph);
    }
  };
  return g;
}

export const petals = (p = {}) => leaves({ ...p, colors: ['#f6d8e2', '#fbe9ef', '#ffffff'], n: p.n ?? 30, seed: 9 });

// Birds: little flapping Vs looping over the garden.
export function birds(p = {}) {
  const g = new THREE.Group();
  const r = rng(p.seed || 10);
  const n = p.n ?? 6;
  const flock = [];
  const bm = mat(p.color || '#3a3a40');
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    const wl = new THREE.Group(), wr = new THREE.Group();
    const wingGeo = new THREE.BoxGeometry(0.28, 0.015, 0.1);
    wingGeo.translate(0.14, 0, 0);
    const a = new THREE.Mesh(wingGeo, bm), c = new THREE.Mesh(wingGeo, bm);
    wl.add(a);
    c.rotation.y = Math.PI;
    wr.add(c);
    b.add(wl, wr, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.2), bm));
    g.add(b);
    flock.push({ b, wl, wr, ph: r() * 6, rad: 1.5 + r() * 3, h: 2.6 + r() * 1.8, sp: 0.2 + r() * 0.2, cx: p.cx ?? 6.5, cz: p.cz ?? 1.5 });
  }
  g.userData.tick = (dt, t) => {
    for (const f of flock) {
      const a = t * f.sp + f.ph;
      f.b.position.set(f.cx + Math.cos(a) * f.rad, f.h + Math.sin(t * 0.5 + f.ph) * 0.6, f.cz + Math.sin(a) * f.rad * 0.6);
      f.b.rotation.y = -a + Math.PI;
      const flap = Math.sin(t * 9 + f.ph) * 0.6;
      f.wl.rotation.z = flap;
      f.wr.rotation.z = -flap;
    }
  };
  return g;
}

// Steam from a kettle or mug: a few soft puffs.
export function steam(p = {}) {
  const g = new THREE.Group();
  const n = p.n ?? 10;
  const puffs = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    s.userData.ph = i / n;
    g.add(s);
    puffs.push(s);
  }
  let strength = p.strength ?? 1;
  g.userData.setStrength = (v) => { strength = v; };
  g.userData.tick = (dt, t) => {
    for (const s of puffs) {
      const k = (t * (p.speed ?? 0.5) + s.userData.ph) % 1;
      s.position.set(Math.sin(k * 5 + s.userData.ph * 7) * 0.05 + k * 0.15, k * (p.rise ?? 0.8), 0);
      const sc = (p.size ?? 0.18) * (0.5 + k * 2);
      s.scale.set(sc, sc, 1);
      s.material.opacity = Math.sin(k * Math.PI) * 0.6 * strength;
    }
  };
  return g;
}
