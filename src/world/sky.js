import { THREE, mat, drawnTexture } from './kit.js';
import { G } from '../engine/stage.js';
import { QUALITY } from '../engine/quality.js';
import { rng } from '../engine/tween.js';
import { puffTex } from './city.js';

// Things in the sky live on a layer glued to the back of the camera, in
// screen-ish units: y in [-13.5, 13.5], x in [-13.5 * aspect, 13.5 * aspect].

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
  g.position.set(p.x ?? -14, p.y ?? 9, 0);
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

// The swarm: thousands of small lights in orbit, building something.
export function swarm(p = {}) {
  const g = new THREE.Group();
  const r = rng(1234);
  const n = p.n ?? 320;
  const pos = new Float32Array(n * 3);
  const orbits = [];
  for (let i = 0; i < n; i++) {
    orbits.push({ a: r() * Math.PI * 2, sp: (0.02 + r() * 0.05) * (r() < 0.5 ? 1 : -1), band: r() < 0.7 ? 0 : 1, off: (r() - 0.5) * 1.6 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size: 4.2, map: dotTex(), transparent: true, depthWrite: false, fog: false, color: p.color || '#ffe6b0', sizeAttenuation: false, blending: THREE.AdditiveBlending });
  g.add(new THREE.Points(geo, m));
  // An invisible band so the lights can be clicked.
  const hit = new THREE.Mesh(new THREE.PlaneGeometry(70, 5), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 10.8;
  g.add(hit);
  g.userData.tick = (dt, t) => {
    for (let i = 0; i < n; i++) {
      const o = orbits[i];
      o.a += dt * o.sp;
      // Two orbital bands seen edge-on: flattened ellipses across the sky.
      const R = o.band ? 30 : 38;
      const x = Math.cos(o.a) * R;
      const y = (o.band ? 12 : 9.6) + Math.sin(o.a) * (o.band ? 0.8 : 1.4) + o.off * 0.6;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
    }
    geo.attributes.position.needsUpdate = true;
    m.opacity = (p.day ? 0.35 : 0.9) * (p.fade ?? 1);
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
      L.x = p.x != null ? p.x + (r() - 0.5) * 6 : 6 + r() * 18;
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
  };
  return g;
}
