import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mistUniforms, SKY_GLSL } from '../engine/stage.js';

// A tiny modelling kit: everything in the diorama is built out of these.
// Positions passed to box()/cyl() are the *base* of the shape (y = bottom).

const geoCache = new Map();
const matCache = new Map();

function cachedGeo(key, make) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  let m = matCache.get(key);
  if (!m) {
    const { emissive, emissiveIntensity, rough = 0.85, metal = 0, flat = false, transparent, opacity, side, map, mist, lambert } = opts;
    const Ctor = lambert ? THREE.MeshLambertMaterial : THREE.MeshStandardMaterial;
    const params = { color, flatShading: flat };
    if (!lambert) {
      params.roughness = rough;
      params.metalness = metal;
    }
    m = new Ctor(params);
    if (emissive) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = emissiveIntensity ?? 1;
    }
    if (transparent) {
      m.transparent = true;
      m.opacity = opacity ?? 0.5;
      m.depthWrite = false;
    }
    if (side) m.side = side;
    if (map) m.map = map;
    if (mist) addMist(m);
    matCache.set(key, m);
  }
  return m;
}

// Fade far-away things (by depth, and towards their bottoms) into exactly the
// colour of the sky behind them, like a city rising out of mist.
export function addMist(m) {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, mistUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vMistY;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec4 mwp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            mwp = instanceMatrix * mwp;
          #endif
          vMistY = (modelMatrix * mwp).y;
        }`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vMistY;
        uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom; uniform float uMidPos;
        uniform vec3 uGlowColor; uniform vec2 uGlowPos; uniform float uGlowSize; uniform float uGlowStrength; uniform float uAspect;
        uniform vec2 uRes; uniform float uMistLow; uniform float uMistHigh; uniform float uFogNear; uniform float uFogFar; uniform float uFogFloor;
        ${SKY_GLSL}`
      )
      .replace(
        '#include <fog_fragment>',
        `float fogF = 0.0;
        #ifdef USE_FOG
          fogF = mix(uFogFloor, 0.94, smoothstep(uFogNear, uFogFar, vFogDepth));
        #endif
        vec3 skyc = skyAt(gl_FragCoord.xy / uRes);
        #ifdef TONE_MAPPING
          skyc = toneMapping(skyc);
        #endif
        skyc = linearToOutputTexel(vec4(skyc, 1.0)).rgb;
        float mistF = 1.0 - smoothstep(uMistLow, uMistHigh, vMistY);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, skyc, clamp(max(fogF, mistF), 0.0, 1.0));`
      );
  };
  m.customProgramCacheKey = () => 'mist2';
  return m;
}

function shadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function box(w, h, d, color, o = {}) {
  const r = o.r ?? 0;
  const geo = r > 0
    ? cachedGeo(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)))
    : cachedGeo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
  const m = new THREE.Mesh(geo, o.mat || mat(color, o.m));
  m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  return shadow(m, o.cast ?? true, o.receive ?? true);
}

export function cyl(rt, rb, h, color, o = {}) {
  const seg = o.seg ?? 16;
  const geo = cachedGeo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
  const m = new THREE.Mesh(geo, o.mat || mat(color, o.m));
  m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  return shadow(m, o.cast ?? true, o.receive ?? true);
}

export function sphere(r, color, o = {}) {
  const ws = o.ws ?? 16, hs = o.hs ?? 12;
  const geo = cachedGeo(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
  const m = new THREE.Mesh(geo, o.mat || mat(color, o.m));
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.sx || o.sy || o.sz) m.scale.set(o.sx || 1, o.sy || 1, o.sz || 1);
  return shadow(m, o.cast ?? true, o.receive ?? true);
}

export function ico(r, color, o = {}) {
  const geo = cachedGeo(`i${r},${o.detail ?? 0}`, () => new THREE.IcosahedronGeometry(r, o.detail ?? 0));
  const m = new THREE.Mesh(geo, o.mat || mat(color, { flat: true, ...(o.m || {}) }));
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.sx || o.sy || o.sz) m.scale.set(o.sx || 1, o.sy || 1, o.sz || 1);
  if (o.ry) m.rotation.y = o.ry;
  return shadow(m, o.cast ?? true, o.receive ?? true);
}

export function capsule(r, len, color, o = {}) {
  const geo = cachedGeo(`cap${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 10));
  const m = new THREE.Mesh(geo, o.mat || mat(color, o.m));
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  return shadow(m, o.cast ?? true, o.receive ?? false);
}

export function cone(r, h, color, o = {}) {
  const seg = o.seg ?? 8;
  const geo = cachedGeo(`co${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
  const m = new THREE.Mesh(geo, o.mat || mat(color, { flat: true, ...(o.m || {}) }));
  m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0);
  if (o.ry) m.rotation.y = o.ry;
  return shadow(m, o.cast ?? true, o.receive ?? true);
}

export function plane(w, d, color, o = {}) {
  const geo = cachedGeo(`p${w},${d}`, () => new THREE.PlaneGeometry(w, d));
  const m = new THREE.Mesh(geo, o.mat || mat(color, o.m));
  m.rotation.x = -Math.PI / 2;
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  m.receiveShadow = o.receive ?? true;
  return m;
}

// An upright textured quad (for posters, notes, signs). Faces +z unless rotated.
export function card(w, h, texOrColor, o = {}) {
  const geo = cachedGeo(`q${w},${h}`, () => new THREE.PlaneGeometry(w, h));
  const material = o.mat || (texOrColor instanceof THREE.Texture
    ? new THREE.MeshStandardMaterial({ map: texOrColor, roughness: 0.9, transparent: !!o.transparent, emissive: o.glow ? 0xffffff : 0x000000, emissiveMap: o.glow ? texOrColor : null, emissiveIntensity: o.glow ?? 0 })
    : mat(texOrColor, o.m));
  const m = new THREE.Mesh(geo, material);
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  m.receiveShadow = true;
  return m;
}

export function group(...children) {
  const g = new THREE.Group();
  for (const c of children.flat()) if (c) g.add(c);
  return g;
}

export function at(obj, x = 0, y = 0, z = 0, ry = 0) {
  obj.position.set(x, y, z);
  obj.rotation.y = ry;
  return obj;
}

// ---------------------------------------------------------------------------
// Canvas textures

const texCache = new Map();

export function canvasTex(key, w, h, draw, opts = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  if (opts.nearest) {
    t.magFilter = THREE.NearestFilter;
  }
  texCache.set(key, t);
  return t;
}

// Text on a sign/poster.
export function textTex(key, lines, { w = 512, h = 256, bg = '#fff', fg = '#222', font = '600 64px "Fraunces", Georgia, serif', align = 'center', pad = 20, lineH = 1.1, border } = {}) {
  return canvasTex('txt:' + key, w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, w - 10, h - 10);
    }
    ctx.fillStyle = fg;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    const size = parseInt(font.match(/(\d+)px/)[1], 10);
    const total = lines.length * size * lineH;
    lines.forEach((ln, i) => {
      const y = h / 2 - total / 2 + size * lineH * (i + 0.5);
      ctx.fillText(ln, align === 'center' ? w / 2 : pad, y);
    });
  });
}

// Lit-window pattern for city buildings. Used as both map and emissive map.
export function windowTex(variant = 0) {
  return canvasTex('win' + variant, 64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    let s = 1234 + variant * 99;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const lit = r() < 0.45;
        ctx.fillStyle = lit ? '#ffd9a0' : '#3a4050';
        ctx.fillRect(x * 16 + 4, y * 16 + 4, 8, 9);
      }
    }
  }, { repeat: [1, 1] });
}

export function emissiveWindowTex(variant = 0) {
  return canvasTex('ewin' + variant, 64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    let s = 1234 + variant * 99;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const lit = r() < 0.45;
        ctx.fillStyle = lit ? '#ffcf8a' : '#000';
        ctx.fillRect(x * 16 + 4, y * 16 + 4, 8, 9);
      }
    }
  }, { repeat: [1, 1] });
}

// Box geometry whose UVs repeat with world size so a window texture tiles evenly.
export function tiledBoxGeo(w, h, d, unit = 1.6) {
  return cachedGeo(`tb${w},${h},${d},${unit}`, () => {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
      let su = 1, sv = 1;
      if (nx > 0.5) { su = d / unit; sv = h / unit; }
      else if (ny > 0.5) { su = 0; sv = 0; }
      else { su = w / unit; sv = h / unit; }
      uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    }
    g.translate(0, h / 2, 0);
    return g;
  });
}

export { THREE };
