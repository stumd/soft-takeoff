import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mistUniforms, SKY_GLSL } from '../engine/stage.js';
import { QUALITY } from '../engine/quality.js';
import { GROUND_GLSL } from './terrain.js';

// On the lite tier every lit surface uses the much cheaper Lambert shader.
export function stdMat(params = {}) {
  if (QUALITY.lite) {
    const { roughness, metalness, ...rest } = params;
    return new THREE.MeshLambertMaterial(rest);
  }
  return new THREE.MeshStandardMaterial(params);
}

// Shared resources are flagged so that despawning an entity never disposes them.
export function markCached(res) {
  if (res) res.userData.cached = true;
  return res;
}

// A tiny modelling kit: everything in the diorama is built out of these.
// Positions passed to box()/cyl() are the *base* of the shape (y = bottom).

const geoCache = new Map();
const matCache = new Map();

function cachedGeo(key, make) {
  let g = geoCache.get(key);
  if (!g) {
    g = markCached(make());
    geoCache.set(key, g);
  }
  return g;
}

export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  let m = matCache.get(key);
  if (!m) {
    const { emissive, emissiveIntensity, rough = 0.85, metal = 0, flat = false, transparent, opacity, side, map, mist, lambert } = opts;
    const useLambert = lambert || QUALITY.lite;
    const Ctor = useLambert ? THREE.MeshLambertMaterial : THREE.MeshStandardMaterial;
    const params = { color, flatShading: flat };
    if (!useLambert) {
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
    markCached(m);
    matCache.set(key, m);
  }
  return m;
}

// Everything misted is outdoors and at least a garden away from the kitchen's
// lamps, whose short-range point lights can't reach it: leave them out of
// these shaders altogether, which makes the city and the neighbourhood (most
// of the screen) cheaper to draw.
const LIGHTS_NO_POINT = THREE.ShaderChunk.lights_fragment_begin.replace('#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )', '#if 0');

// Fade far-away things towards the colour of the air near the horizon, more
// with each row back (by world z, so a row fades as a whole), and let a thin,
// uneven ground mist lie on the land: it pools in places and thins in others,
// drifts slowly, and takes the colour of the sky right behind, so it reads as
// air rather than as a wall of fog. `k` scales the haze for one material;
// `sil` instead makes it a silhouette against the sky right behind it (for
// the furthest flats).
export function addMist(m, k = 1, sil = 0) {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, mistUniforms);
    shader.uniforms.uMistK = { value: k };
    shader.uniforms.uSil = { value: sil };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMistW;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec4 mwp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            mwp = instanceMatrix * mwp;
          #endif
          vMistW = (modelMatrix * mwp).xyz;
        }`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_fragment_begin>', LIGHTS_NO_POINT)
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // lit windows dim with distance too
        totalEmissiveRadiance *= 1.0 - 0.5 * uMistK * clamp((uFogNear - vMistW.z) / (uFogNear - uFogFar), 0.0, 1.0);`
      )
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vMistW;
        uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom; uniform float uMidPos;
        uniform vec3 uGlowColor; uniform vec2 uGlowPos; uniform float uGlowSize; uniform float uGlowStrength; uniform float uAspect; uniform float uHorizon;
        uniform vec2 uRes; uniform float uMistLow; uniform float uMistHigh; uniform float uFogNear; uniform float uFogFar; uniform float uFogFloor;
        uniform float uMistK; uniform float uMistTime; uniform float uSil;
        ${SKY_GLSL}
        ${GROUND_GLSL}
        float mistHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float mistNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mistHash(i), mistHash(i + vec2(1.0, 0.0)), f.x), mix(mistHash(i + vec2(0.0, 1.0)), mistHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }`
      )
      .replace(
        '#include <fog_fragment>',
        `float dk = clamp((uFogNear - vMistW.z) / (uFogNear - uFogFar), 0.0, 1.0);
        // aerial haze: a whole row turns paler, more with each row back
        float fogF = min(0.9, (uFogFloor * 2.2 + 0.2) * pow(dk, 0.85)) * uMistK;
        // ground mist: patchy along each row, deeper and denser further back
        float n = mistNoise(vec2(vMistW.x * 0.23 + uMistTime * 0.04, vMistW.z * 0.41 - uMistTime * 0.015));
        float g = groundY(vMistW);
        float top = g + (uMistLow + uMistHigh * dk) * (0.4 + n);
        float mistF = (1.0 - smoothstep(g - 0.05, top, vMistW.y)) * smoothstep(0.0, 0.45, dk) * (0.3 + 0.35 * dk + 0.5 * n) * step(-70.0, vMistW.z) * min(1.0, uMistK);
        mistF = max(mistF, uSil);
        fogF *= 1.0 - uSil;
        float w = fogF * (1.0 - mistF) + mistF;
        if (w > 0.003) {
          // The mist takes the colour of the sky right behind (so it reads as
          // air), the haze the colour of the air nearer the horizon (so far
          // rows turn pale). Mixed first, then tone-mapped once.
          vec2 suv = gl_FragCoord.xy / uRes;
          vec3 skyc = skyAt(suv);
          vec3 airc = skyAt(vec2(suv.x, mix(uHorizon, suv.y, 0.35)));
          vec3 c = (airc * fogF * (1.0 - mistF) + skyc * mistF) / w;
          #ifdef TONE_MAPPING
            c = toneMapping(c);
          #endif
          c = linearToOutputTexel(vec4(c, 1.0)).rgb;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, c, clamp(w, 0.0, 1.0));
        }`
      );
  };
  m.customProgramCacheKey = () => 'mist4';
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
    ? cachedGeo(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, QUALITY.lite ? 1 : 2, Math.min(r, w / 2, h / 2, d / 2)))
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
  // Tiny spheres (flowers, knobs, buttons) are a few pixels across: fewer facets.
  const small = r < 0.1;
  const ws = o.ws ?? (small ? 8 : 16), hs = o.hs ?? (small ? 6 : 12);
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
    ? stdMat({ map: texOrColor, roughness: 0.9, transparent: !!o.transparent, emissive: o.glow ? 0xffffff : 0x000000, emissiveMap: o.glow ? texOrColor : null, emissiveIntensity: o.glow ?? 0 })
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
const drawn = new Set();

// Every procedural texture is drawn through here. The canvases ask to stay in
// CPU memory (willReadFrequently), because a GPU-process crash otherwise wipes
// accelerated 2D canvases too, and a "restored" diorama would come back black.
// We also keep each draw function so everything can be repainted after a loss.
export function drawnTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  const entry = { ctx, draw, t, w, h };
  drawn.add(entry);
  t.addEventListener('dispose', () => drawn.delete(entry));
  c.addEventListener('contextrestored', () => repaint(entry));
  return t;
}

function repaint(e) {
  e.ctx.setTransform(1, 0, 0, 1, 0, 0);
  e.ctx.globalAlpha = 1;
  e.ctx.globalCompositeOperation = 'source-over';
  e.ctx.clearRect(0, 0, e.w, e.h);
  e.draw(e.ctx, e.w, e.h);
  e.t.needsUpdate = true;
}

export function repaintAllTextures() {
  for (const e of drawn) {
    try { repaint(e); } catch (err) { /* keep going */ }
  }
}

function repaintTexture(t) {
  for (const e of drawn) if (e.t === t) { try { repaint(e); } catch (err) { /* keep going */ } }
}

export function canvasTex(key, w, h, draw, opts = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const t = markCached(drawnTexture(w, h, draw));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = QUALITY.lite ? 1 : 4;
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
  const has = texCache.has('txt:' + key);
  const t = canvasTex('txt:' + key, w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, w - 10, h - 10);
    }
    ctx.fillStyle = fg;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    // Shrink the type until the longest line fits inside the border, whatever
    // font the browser actually has.
    let size = parseInt(font.match(/(\d+)px/)[1], 10);
    const room = w - 2 * Math.max(pad, border ? 26 : 12);
    for (let i = 0; i < 12; i++) {
      ctx.font = font.replace(/\d+px/, size + 'px');
      const widest = Math.max(...lines.map((ln) => ctx.measureText(ln).width));
      if (widest <= room) break;
      size = Math.floor(size * Math.max(0.6, room / widest));
    }
    const total = lines.length * size * lineH;
    lines.forEach((ln, i) => {
      const y = h / 2 - total / 2 + size * lineH * (i + 0.5);
      ctx.fillText(ln, align === 'center' ? w / 2 : pad, y);
    });
  });
  // Web fonts load lazily; draw the sign again once its font has arrived.
  if (!has && typeof document !== 'undefined' && document.fonts && !document.fonts.check(font)) {
    document.fonts.load(font).then(() => repaintTexture(t)).catch(() => {});
  }
  return t;
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
        const lit = r() < 0.45 - (variant % 4) * 0.06;
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
        const lit = r() < 0.45 - (variant % 4) * 0.06;
        ctx.fillStyle = lit ? '#ffcf8a' : '#000';
        ctx.fillRect(x * 16 + 4, y * 16 + 4, 8, 9);
      }
    }
  }, { repeat: [1, 1] });
}

export { THREE };
