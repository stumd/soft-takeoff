import { THREE, box, cyl, sphere, ico, cone, group, mat, card, textTex, windowTex, emissiveWindowTex, tiledBoxGeo, addMist, markCached } from './kit.js';
import { G } from '../engine/stage.js';
import { QUALITY } from '../engine/quality.js';
import { rng } from '../engine/tween.js';

// The world beyond the garden fence. In an orthographic view, distance turns into
// height on screen, so the city is laid out in (u, v) "screen" coordinates:
// u = left/right on screen, v = depth behind the diorama.

const S2 = Math.SQRT2;
export function uvToXZ(u, v) {
  return [(u - v) / S2, -(u + v) / S2];
}
// The diorama's back edges, in (u, v): anything with v > edge(u) sits behind it.
export const edgeV = (u) => Math.min(u + 12.1, 9.4 - u);

const BASE_Y = -7; // the city sits in the valley below the house
const nightMats = [];

export function updateCityNight() {
  const v = Math.min(1.6, G.night + (G.pulse || 0));
  for (const m of nightMats) m.emissiveIntensity = v * (m.userData.nightK ?? 1.25);
}

function buildingMat(color, variant = 0) {
  const key = color + variant;
  if (buildingMat.cache[key]) return buildingMat.cache[key];
  const map = windowTex(variant);
  const em = emissiveWindowTex(variant);
  const m = new THREE.MeshLambertMaterial({ color, map, emissive: '#ffc87a', emissiveMap: em, emissiveIntensity: 0 });
  addMist(m);
  markCached(m);
  nightMats.push(m);
  buildingMat.cache[key] = m;
  return m;
}
buildingMat.cache = {};

function plainMist(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (plainMist.cache[key]) return plainMist.cache[key];
  const m = new THREE.MeshLambertMaterial({ color, ...extra });
  addMist(m);
  if (extra.emissive) {
    m.userData.nightK = extra.nightK ?? 1;
  }
  markCached(m);
  plainMist.cache[key] = m;
  return m;
}
plainMist.cache = {};

function glowMist(color, intensity = 1) {
  const key = 'g' + color + intensity;
  if (plainMist.cache[key]) return plainMist.cache[key];
  const m = new THREE.MeshLambertMaterial({ color: '#111', emissive: color, emissiveIntensity: intensity });
  addMist(m);
  markCached(m);
  plainMist.cache[key] = m;
  return m;
}

function mb(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  return m;
}

function placeUV(obj, u, v, y = BASE_Y) {
  const [x, z] = uvToXZ(u, v);
  obj.position.set(x, y, z);
  return obj;
}

const MERIDIAN_UV = [7, 16];
const OLD_PALETTE = ['#9aa5b1', '#b4a99a', '#8d98a6', '#a89482', '#c2b8a8', '#7f8b99', '#b8aea0', '#958a80'];

// Each building is its own child so transitions can raise/lower them one by one.
function building(w, h, d, color, variant) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(tiledBoxGeo(w, h, d, 0.9), buildingMat(color, variant));
  g.add(m);
  const roof = mb(w + 0.1, 0.12, d + 0.1, plainMist('#6a6f78'), 0, h, 0);
  g.add(roof);
  g.userData.h = h + 0.2;
  return g;
}

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
  const r = rng(77);
  const n = p.n ?? 80;
  const variant = p.variant || 'old';
  for (let i = 0; i < n; i++) {
    const u = -32 + r() * 68;
    const e = Math.max(edgeV(u), 1);
    const v = Math.min(e + 6 + Math.pow(r(), 0.8) * 8, 21.5);
    const tall = r() < 0.07;
    const h = tall ? 8 + r() * 2.5 : 4 + r() * r() * 4;
    const w = 1.0 + r() * 1.8, d = 1.0 + r() * 1.8;
    const col = OLD_PALETTE[Math.floor(r() * OLD_PALETTE.length)];
    const skip = r();
    if (variant === 'thin' && skip < 0.45) continue;
    if (variant === 'green' && skip < 0.35) continue;
    // Keep the Meridian site and a few landmarks clear.
    if (Math.abs(u - 7) < 7.5 && Math.abs(v - MERIDIAN_UV[1]) < 7) continue;
    const b = building(w, h, d, col, i % 4);
    if (variant === 'snow') b.add(mb(w + 0.12, 0.1, d + 0.12, plainMist('#f4f7fa'), 0, h + 0.12, 0));
    if (variant === 'green') {
      b.add(mb(w * 0.9, 0.25, d * 0.9, plainMist('#6fa25a'), 0, h + 0.12, 0));
      for (let k = 0; k < 3; k++) b.add(placeIco(0.3 + r() * 0.3, '#5f9a4a', (r() - 0.5) * w * 0.6, h + 0.4, (r() - 0.5) * d * 0.6));
      // ivy climbing the walls
      b.add(mb(w + 0.02, h * (0.3 + r() * 0.5), 0.05, plainMist('#5e8f48'), 0, 0, d / 2));
    }
    if (variant !== 'green' && r() < 0.25) b.add(mb(0.6, 0.4, 0.6, plainMist('#80858c'), (r() - 0.5) * w * 0.5, h + 0.12, (r() - 0.5) * d * 0.5));
    placeUV(b, u, v);
    g.add(b);
  }
  // A church spire and a clock tower: old landmarks that survive every version.
  const spire = group(
    mb(1.6, 6, 1.6, plainMist('#b8ab98'), 0, 0, 0),
    placeCone(0.95, 5, '#7b8790', 0, 6, 0),
  );
  spire.userData.h = 11;
  placeUV(spire, -9, edgeV(-9) + 8);
  g.add(spire);
  return g;
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

// A river running across the valley, mostly hidden by mist.
export function river(p = {}) {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: p.clean ? '#6fb0c8' : '#7c94a0' });
  addMist(m);
  for (let u = -34; u < 36; u += 2) {
    const v = Math.max(edgeV(u), 1) + 6 + Math.sin(u * 0.15) * 0.8;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 2.4), m);
    placeUV(seg, u, v, BASE_Y - 0.05);
    seg.rotation.y = Math.PI / 4;
    g.add(seg);
  }
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
  arm.rotation.y = Math.random() * 6;
  g.add(arm);
  const sp = 0.03 + Math.random() * 0.05;
  g.userData.tick = (dt, t) => {
    arm.rotation.y += dt * sp * Math.sin(t * 0.1);
    light.visible = G.night > 0.3 && Math.sin(t * 2.5) > 0;
  };
  g.userData.h = h + 1;
  return g;
}

export function cranes(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  for (const [u, dv, h, jib] of p.at || [[3, 9, 10, 7], [16, 10, 9.5, 6], [-14, 10, 10, 7]]) {
    const c = crane(h, jib, p.color);
    placeUV(c, u, Math.max(edgeV(u), 1) + dv);
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
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const gr = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 64, 64);
    t = markCached(new THREE.CanvasTexture(c));
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


export function meridian(p = {}) {
  const g = new THREE.Group();
  const stage = p.stage || 'complete';
  const [u, v] = MERIDIAN_UV;
  placeUV(g, u, v);
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
    const c1 = crane(9.5, 7);
    c1.position.set(-2, 0, -4);
    g.add(c1);
    const hoard = billboardTex(['MERIDIAN COMPUTE', 'POWERING TOMORROW'], '#14243a', '#9fe0ff', true);
    const bb = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.4), new THREE.MeshLambertMaterial({ map: hoard, emissive: '#ffffff', emissiveMap: hoard, emissiveIntensity: 0.4 }));
    bb.material.userData.nightK = 0.9;
    bb.position.set(1.0, 7.0, D / 2 + 0.8);
    bb.rotation.y = 0.3;
    g.add(group(bb, mb(0.16, 6.3, 0.16, plainMist('#444'), -0.9, 0, D / 2 + 1.3), mb(0.16, 6.3, 0.16, plainMist('#444'), 2.9, 0, D / 2 + 0.2)));
    return g;
  }
  if (stage === 'lake') {
    const water = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.2, 28), new THREE.MeshLambertMaterial({ color: '#7cc4d4' }));
    addMist(water.material);
    water.scale.set(1, 1, 0.75);
    water.position.y = 0.1;
    g.add(water);
    const r = rng(8);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      g.add(placeIco(0.6 + r() * 0.5, ['#5f9a4a', '#7fae4a'][i % 2], Math.cos(a) * 7.3, 0.3, Math.sin(a) * 5.4));
    }
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

// More data centres, each with its own plume.
export function datacentres(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  const spots = [[17, 14, 7, 4], [-5, 12, 8, 5], [23, 17, 6, 4], [-19, 15, 7, 4]];
  const n = p.n ?? 3;
  for (let i = 0; i < n; i++) {
    const [u, dv, w, d] = spots[i];
    const dc = new THREE.Group();
    const building = i === 0 && p.building;
    if (building) {
      dc.add(mb(w, 0.3, d, plainMist('#9c9890'), 0, 0, 0));
      for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 4) dc.add(mb(0.15, 2.5, 0.15, plainMist('#6d7a86'), x, 0.3, 0));
      const c = crane(9, 7);
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
    placeUV(dc, u, Math.max(edgeV(u), 1) + dv);
    g.add(dc);
  }
  return g;
}

export function reactor(p = {}) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), plainMist('#d8d6d0'));
  dome.position.y = 2;
  g.add(mb(5.2, 2, 5.2, plainMist('#b8b6b0'), 0, 0, 0));
  g.add(dome);
  g.add(mb(1.2, 4.5, 1.2, plainMist('#c8c4bc'), 3.2, 0, -1));
  g.add(mb(1.24, 0.3, 1.24, plainMist('#d04030'), 3.2, 3.6, -1));
  g.userData.h = 4.5;
  placeUV(g, 21, Math.max(edgeV(21), 1) + 9);
  return g;
}

export function solarField(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  const pm = plainMist('#2a3d62', {});
  const rows = p.rows ?? 8;
  for (let i = 0; i < rows; i++) {
    const row = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const pn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.9), pm);
      pn.rotation.x = -0.5;
      pn.position.set(k * 1.75, 0.6, 0);
      row.add(pn);
    }
    row.userData.h = 1;
    placeUV(row, 26 + (i % 2) * 2, 9 + i * 1.2, BASE_Y + 0.4);
    g.add(row);
  }
  return g;
}

// Slender glass towers that went up in weeks.
export function newTowers(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  // [u, depth behind the edge, height]
  const spots = [
    [-12, 9, 11], [-4, 8, 12.5], [1.5, 9.5, 10], [-18, 7, 10], [13, 8, 12], [-7.5, 11, 13], [18, 9, 10.5], [-23, 6, 9], [24, 8, 9.5], [9, 11, 11],
  ];
  const glass = plainMist('#9fc0d8', {});
  const glass2 = plainMist('#c4d8e4', {});
  const band = plainMist('#eef3f6');
  const n = p.n ?? 3;
  for (let i = 0; i < n; i++) {
    const [u, dv, h] = spots[i];
    const t = new THREE.Group();
    const partial = p.building && i >= n - 2;
    const hh = partial ? h * 0.55 : h;
    const w = 1.25;
    // a slight setback halfway up
    t.add(mb(w, hh * 0.6, w, i % 2 ? glass : glass2, 0, 0, 0));
    t.add(mb(w * 0.8, hh * 0.4, w * 0.8, i % 2 ? glass2 : glass, 0, hh * 0.6, 0));
    for (let y = 1.1; y < hh; y += 1.1) {
      const k = y < hh * 0.6 ? 1 : 0.8;
      t.add(mb(w * k + 0.05, 0.05, w * k + 0.05, band, 0, y, 0));
    }
    if (!partial) {
      t.add(placeCone(0.45, 2.2, '#e4ecf2', 0, hh, 0));
      t.add(mb(0.02, 1.2, 0.02, band, 0, hh + 2.2, 0));
    } else {
      // the printer gantry
      t.add(mb(0.12, hh + 2, 0.12, plainMist('#e8b923'), -0.95, 0, -0.95));
      t.add(mb(0.12, hh + 2, 0.12, plainMist('#e8b923'), 0.95, 0, 0.95));
      t.add(mb(2.1, 0.16, 2.1, plainMist('#e8b923'), 0, hh + 1.0, 0));
      t.add(mb(0.35, 0.35, 0.35, glowMist('#ff9a3d', 1.4), 0, hh + 0.5, 0));
    }
    t.add(mb(0.18, 0.18, 0.18, glowMist('#ff5a4a', 0.8), 0, hh + (partial ? 0 : 3.3), 0));
    t.userData.h = hh + 4;
    placeUV(t, u, Math.max(edgeV(u), 1) + dv);
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
  placeUV(g, -16, Math.max(edgeV(-16), 1) + 12);
  return g;
}

// "The Lattice": what replaced Meridian. Nobody quite knew what it did.
export function lattice(p = {}) {
  const g = new THREE.Group();
  const [u, v] = MERIDIAN_UV;
  placeUV(g, u + 1, v + 1);
  g.userData.stagger = true;
  const levels = p.levels ?? 7;
  const edgeMat = new THREE.LineBasicMaterial({ color: '#8ff0ff', transparent: true, opacity: 0.85, fog: true });
  const darkM = plainMist('#1f2630');
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

// The Spindle: a thread of white going up past the top of the sky.
export function spindle(p = {}) {
  const g = new THREE.Group();
  const h = p.h ?? 46;
  const m = new THREE.MeshLambertMaterial({ color: '#f6f2ea', emissive: '#fff2d0', emissiveIntensity: 0.15 });
  addMist(m);
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
  placeUV(g, -6, edgeV(-6) + 20);
  return g;
}

// Epilogue architecture: towers that are mostly garden.
export function gardenCity(p = {}) {
  const g = new THREE.Group();
  g.userData.stagger = true;
  const r = rng(303);
  const spots = [[-13, 9, 11], [-4.5, 9, 12.5], [3, 10, 9.5], [14, 8, 11.5], [21, 9, 9], [-20, 7, 9], [-8.5, 12, 10]];
  const white = plainMist('#f4f1e8');
  const glassy = plainMist('#cfe2e6');
  for (const [u, dv, h] of spots) {
    const t = new THREE.Group();
    const levels = Math.round(h / 1.9);
    for (let i = 0; i < levels; i++) {
      const rr = 1.15 - (i / levels) * 0.45 + Math.sin(i * 1.7 + u) * 0.12;
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
    placeUV(t, u, Math.max(edgeV(u), 1) + dv);
    g.add(t);
  }
  // Floating gardens: islands of trees hanging in the air, tethered by a thread.
  for (const [u, dv, y] of [[-10, 10, 8], [17, 9, 8.5], [6, 8, 9.5]]) {
    const isl = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.7, 7), plainMist('#a8977f', { flatShading: true }));
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
    placeUV(base, u, Math.max(edgeV(u), 1) + dv);
    g.add(base);
  }
  return g;
}
