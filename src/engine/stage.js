import * as THREE from 'three';
import { tweens, lerp, clamp } from './tween.js';
import { ENV, cloneEnv, lerpEnv } from './env.js';
import { QUALITY } from './quality.js';

// Values that models read every frame (how dark it is, whether lamps are on, wind...).
export const G = {
  time: 0,
  night: 0,
  interior: 0,
  wind: 0,
  weather: 'none',
  reducedMotion: false,
};

// The sky gradient. Shared with the city's materials so that distant things can
// fade into exactly the colour of the sky behind them.
export const skyUniforms = {
  uTop: { value: new THREE.Color() },
  uMid: { value: new THREE.Color() },
  uBottom: { value: new THREE.Color() },
  uMidPos: { value: 0.45 },
  uGlowColor: { value: new THREE.Color() },
  uGlowPos: { value: new THREE.Vector2(0.8, 0.5) },
  uGlowSize: { value: 0.2 },
  uGlowStrength: { value: 0 },
  uAspect: { value: 1 },
};

// Shared uniforms for the "mist" that hides the bottoms of distant buildings.
export const mistUniforms = {
  ...skyUniforms,
  uMist: { value: new THREE.Color('#c9b8a8') },
  uMistLow: { value: -7.0 },
  uMistHigh: { value: -3.0 },
  uRes: { value: new THREE.Vector2(1, 1) },
  uFogNear: { value: 160 },
  uFogFar: { value: 200 },
  uFogFloor: { value: 0.4 },
};

export const SKY_GLSL = /* glsl */ `
vec3 skyAt(vec2 uv) {
  float y = uv.y;
  vec3 c = y < uMidPos
    ? mix(uBottom, uMid, smoothstep(0.0, uMidPos, y))
    : mix(uMid, uTop, smoothstep(uMidPos, 1.0, y));
  vec2 d = (uv - uGlowPos) * vec2(uAspect, 1.0);
  float g = exp(-dot(d, d) / max(0.0001, uGlowSize * uGlowSize));
  return c + uGlowColor * g * uGlowStrength;
}`;

const SKY_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBottom;
uniform float uMidPos;
uniform vec3 uGlowColor;
uniform vec2 uGlowPos;
uniform float uGlowSize;
uniform float uGlowStrength;
uniform float uAspect;
varying vec2 vUv;
${SKY_GLSL}
void main() {
  vec3 c = skyAt(vUv);
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) / 160.0;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Stage {
  constructor(canvas) {
    const lite = QUALITY.lite;
    // Phones get no MSAA, a lower pixel ratio and simpler shadows: drawing-buffer
    // memory and shader cost are what make mobile GPUs drop the context.
    const r = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: lite ? 'default' : 'high-performance' });
    this.maxRatio = lite ? 1.5 : 2;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxRatio));
    r.shadowMap.enabled = true;
    r.shadowMap.type = lite ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xffffff, 130, 220);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
    this.view = {
      az: Math.PI / 4,
      el: 0.6,
      dist: 160,
      target: new THREE.Vector3(0.6, 2.2, -2.0),
      frustum: 22,
    };
    // Things the player (or the story) can nudge.
    this.cam = {
      zoom: 1, zoomT: 1,
      panX: 0, panY: 0, panXT: 0, panYT: 0,
      sway: 0, swayT: 0,
      shift: 0, shiftT: 0, // horizontal screen shift when the side panel is open
      shiftY: 0, shiftYT: 0, // vertical shift when the bottom sheet is open (phones)
      extraZoom: 1, // story-driven zoom (kettle sequence, ending)
      extraPanY: 0,
    };

    this._makeSky();
    this._makeLights();

    this.env = cloneEnv(ENV.dusk);
    this.applyEnv();

    this.onTick = [];
    this.clock = new THREE.Clock();
    // ?fast lets slow (headless) renderers keep real time, for testing.
    this.maxDt = new URLSearchParams(location.search).has('fast') ? 1 : 0.05;
    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    // three.js listens first and calls preventDefault, which allows a restore.
    this.contextLost = false;
    canvas.addEventListener('webglcontextlost', () => {
      this.contextLost = true;
      this.onContextLost && this.onContextLost();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      this.onContextRestored && this.onContextRestored();
    });
    this._resize();
    this._bindControls(canvas);
  }

  _makeSky() {
    this.skyUniforms = skyUniforms;
    const mat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    quad.renderOrder = -1000;
    this.scene.add(quad);
  }

  _makeLights() {
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.castShadow = true;
    const sm = QUALITY.lite ? 1024 : 2048;
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -19; sc.right = 19; sc.top = 15; sc.bottom = -15;
    sc.near = 1; sc.far = 120;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    this.sun = sun;
    this.sunTarget = new THREE.Object3D();
    this.sunTarget.position.set(3, 0, 0);
    sun.target = this.sunTarget;
    this.scene.add(sun, this.sunTarget);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.scene.add(this.hemi);

    // A soft, shadowless fill from the camera side keeps the cutaway readable at night.
    this.fill = new THREE.DirectionalLight(0xffffff, 0.3);
    this.fill.position.set(30, 25, 40);
    this.scene.add(this.fill);
  }

  setEnv(name, dur = 2.5) {
    const to = typeof name === 'string' ? ENV[name] : name;
    if (!to) throw new Error('unknown env ' + name);
    if (this._envTween) tweens.kill(this._envTween);
    if (dur <= 0) {
      this.env = cloneEnv(to);
      this.applyEnv();
      return;
    }
    const from = cloneEnv(this.env);
    this._envTween = tweens.add({
      dur,
      update: (k) => {
        lerpEnv(this.env, from, to, k);
        this.applyEnv();
      },
    });
  }

  applyEnv() {
    const e = this.env;
    const su = this.skyUniforms;
    su.uTop.value.copy(e.skyTop);
    su.uMid.value.copy(e.skyMid);
    su.uBottom.value.copy(e.skyBottom);
    su.uMidPos.value = e.skyMidPos;
    su.uGlowColor.value.copy(e.glowColor);
    su.uGlowPos.value.set(e.glowX, e.glowY);
    su.uGlowSize.value = e.glowSize;
    su.uGlowStrength.value = e.glowStrength;

    this.scene.fog.color.copy(e.fog);
    mistUniforms.uMist.value.copy(e.mist);

    this.sun.color.copy(e.sunColor);
    this.sun.intensity = e.sunIntensity;
    const az = e.sunAz, el = e.sunEl;
    this._sunDir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    this.hemi.color.copy(e.hemiSky);
    this.hemi.groundColor.copy(e.hemiGround);
    this.hemi.intensity = e.hemiIntensity;
    this.fill.intensity = e.fill;
    this.fill.color.copy(e.hemiSky);
    this.renderer.toneMappingExposure = e.exposure;

    mistUniforms.uFogFloor.value = e.haze ?? (0.42 - e.night * 0.2);
    G.night = e.night;
    G.interior = e.interior;
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.width = w;
    this.height = h;
    this.skyUniforms.uAspect.value = w / h;
    this.renderer.getDrawingBufferSize(mistUniforms.uRes.value);
  }

  _bindControls(el) {
    let drag = null;
    const pointers = new Map();
    let pinch0 = 0, zoom0 = 1;
    el.addEventListener('pointerdown', (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        drag = { x: e.clientX, y: e.clientY, px: this.cam.panXT, py: this.cam.panYT, moved: 0 };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
        zoom0 = this.cam.zoomT;
        drag = null;
      }
    });
    window.addEventListener('pointermove', (e) => {
      this.mouse = { x: e.clientX / this.width, y: e.clientY / this.height };
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0 > 0) this.cam.zoomT = clamp(zoom0 * (d / pinch0), 0.75, 2.6);
        return;
      }
      if (!drag || this.locked) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved < 4) return;
      const unitsPerPx = this.frustumH() / this.height;
      this.cam.panXT = clamp(drag.px - dx * unitsPerPx, -16, 16);
      this.cam.panYT = clamp(drag.py + dy * unitsPerPx, -10, 12);
      this.dragging = true;
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch0 = 0;
      if (pointers.size === 0) {
        drag = null;
        setTimeout(() => (this.dragging = false), 0);
      }
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => {
      if (this.locked) return;
      e.preventDefault();
      this.cam.zoomT = clamp(this.cam.zoomT * Math.exp(-e.deltaY * 0.0012), 0.75, 2.6);
    }, { passive: false });
    el.addEventListener('dblclick', () => this.resetView());
  }

  resetView() {
    this.cam.zoomT = 1;
    this.cam.panXT = 0;
    this.cam.panYT = 0;
  }

  frustumH() {
    const aspect = this.width / this.height;
    // On narrow screens make sure the whole diorama still fits horizontally.
    const base = Math.max(this.view.frustum, 27 / aspect);
    return base / (this.cam.zoom * this.cam.extraZoom);
  }

  _updateCamera(dt) {
    const c = this.cam;
    const k = 1 - Math.exp(-dt * 6);
    c.zoom = lerp(c.zoom, c.zoomT, k);
    c.panX = lerp(c.panX, c.panXT, k);
    c.panY = lerp(c.panY, c.panYT, k);
    c.shift = lerp(c.shift, c.shiftT, 1 - Math.exp(-dt * 4));
    c.shiftY = lerp(c.shiftY, c.shiftYT, 1 - Math.exp(-dt * 4));
    // A little parallax sway with the mouse makes the diorama feel physical.
    if (this.mouse && !G.reducedMotion) c.swayT = (this.mouse.x - 0.5) * 0.06;
    c.sway = lerp(c.sway, c.swayT, 1 - Math.exp(-dt * 2));

    const v = this.view;
    const az = v.az + c.sway;
    const el = v.el;
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    const cam = this.camera;
    cam.position.copy(v.target).addScaledVector(dir, v.dist);
    cam.lookAt(v.target);
    cam.updateMatrixWorld();

    const aspect = this.width / this.height;
    const fh = this.frustumH();
    const fw = fh * aspect;
    const sx = c.panX + c.shift * fw;
    const sy = c.panY + c.extraPanY + c.shiftY * fh;
    cam.left = -fw / 2 + sx;
    cam.right = fw / 2 + sx;
    cam.top = fh / 2 + sy;
    cam.bottom = -fh / 2 + sy;
    cam.near = v.dist - 80;
    cam.far = v.dist + 260;
    cam.updateProjectionMatrix();

    this.scene.fog.near = v.dist + 25;
    this.scene.fog.far = v.dist + 140;
    mistUniforms.uFogNear.value = v.dist + 6;
    mistUniforms.uFogFar.value = v.dist + 46;

    // Keep the sun's shadow frustum centred on the diorama.
    const sd = this._sunDir || new THREE.Vector3(1, 1, 1).normalize();
    this.sunTarget.position.set(3.5, 0, -0.5);
    this.sun.position.copy(this.sunTarget.position).addScaledVector(sd, 60);
  }

  // Drop the resolution a little on devices that can't keep up.
  _adapt(raw) {
    const a = (this._adaptState ||= { t: 0, frames: 0, settled: false });
    if (a.settled || document.hidden) return;
    a.t += raw;
    a.frames++;
    if (a.t < 2.5) return;
    const fps = a.frames / a.t;
    a.t = 0;
    a.frames = 0;
    const r = this.renderer.getPixelRatio();
    if (fps < 42 && r > 1) {
      this.renderer.setPixelRatio(Math.max(1, r - 0.35));
      this._resize();
    } else if (fps < 24 && this.sun.shadow.mapSize.x > 512) {
      const n = this.sun.shadow.mapSize.x / 2;
      this.sun.shadow.mapSize.set(n, n);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    } else {
      a.settled = fps >= 42 || r <= 1;
    }
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      const raw = this.clock.getDelta();
      if (this.maxDt < 1) this._adapt(raw);
      const dt = Math.min(this.maxDt, raw);
      G.time += dt;
      tweens.tick(dt);
      for (const f of this.onTick) f(dt, G.time);
      this._updateCamera(dt);
      if (this.onLate) this.onLate(dt);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  // Project a world position to CSS pixels.
  toScreen(v3, out = { x: 0, y: 0, visible: true }) {
    const p = v3.clone().project(this.camera);
    out.x = (p.x * 0.5 + 0.5) * this.width;
    out.y = (-p.y * 0.5 + 0.5) * this.height;
    out.visible = p.z > -1 && p.z < 1;
    return out;
  }
}
