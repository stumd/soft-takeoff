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
  skyHalfW: 21.6, // half the width of the sky layer currently in view (sky.js units)
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
  // Screen height (0..1) of the foot of the city: the sky's gradient starts
  // there, so its warm bottom colour sits on the skyline, not under the street.
  uHorizon: { value: 0 },
};

// Shared uniforms for the "mist" that hides the bottoms of distant buildings.
export const mistUniforms = {
  ...skyUniforms,
  uMist: { value: new THREE.Color('#c9b8a8') },
  uMistLow: { value: 0.0 }, // ground level
  uMistHigh: { value: 3.2 }, // how high the ground mist reaches at the back
  uRes: { value: new THREE.Vector2(1, 1) },
  // World z where the haze begins (just past the back gardens) and where it is total.
  uFogNear: { value: -14 },
  uFogFar: { value: -40 },
  uFogFloor: { value: 0.4 },
};

export const SKY_GLSL = /* glsl */ `
vec3 skyAt(vec2 uv) {
  uv.y = clamp((uv.y - uHorizon) / (1.0 - uHorizon), 0.0, 1.0);
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
uniform float uHorizon;
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

// The default camera. Dev builds take ?az=&el= (degrees) and ?fr= (frustum
// height, in world units; an orthographic camera has no field of view) to
// try other angles quickly. The city is laid out for the defaults.
const DEG = Math.PI / 180;
// Tall (portrait) screens look from a little higher: the house is small
// there, and the city rows spread up the extra height.
export const VIEW_DEFAULT = { az: 16 * DEG, el: 17 * DEG, elTall: 24 * DEG, frustum: 25, fitW: 24.5 };
export const VIEW = { ...VIEW_DEFAULT };
{
  const q = new URLSearchParams(location.search);
  const dev = !!(import.meta.env && import.meta.env.DEV) || q.has('debug');
  const num = (k) => (q.has(k) && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : null);
  if (dev) {
    if (num('az') != null) VIEW.az = num('az') * DEG;
    if (num('el') != null) VIEW.el = VIEW.elTall = num('el') * DEG;
    if (num('fr') != null) VIEW.frustum = num('fr');
    if (num('fov') != null) VIEW.frustum = num('fov');
  }
}

export class Stage {
  constructor(canvas) {
    const lite = QUALITY.lite;
    // Phones get no MSAA, a lower pixel ratio and simpler shadows: drawing-buffer
    // memory and shader cost are what make mobile GPUs drop the context.
    const r = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: lite ? 'default' : 'high-performance' });
    this.maxRatio = lite ? 1.25 : 2;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxRatio));
    // Off on GPUs whose drivers reset the context when shaders sample a shadow
    // map (see quality.js). Decided before any material compiles.
    this.renderer = r;
    this._applyShadowSettings(QUALITY.shadows);
    // Shader error checks are synchronous GPU round-trips on every compile.
    r.debug.checkShaderErrors = !!(import.meta.env && import.meta.env.DEV) || new URLSearchParams(location.search).has('debug');
    this._frame = 0;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xffffff, 130, 220);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
    // A near-frontal view across the street, like a paper theatre: the camera
    // stands a little to the right (so the room's left wall still reads) and
    // only a little above, so the city rises in layers behind the house.
    this.view = {
      az: VIEW.az,
      el: VIEW.el,
      elWide: VIEW.el,
      elTall: VIEW.elTall,
      dist: 300, // far enough back that the ground in front of the street (tall frames, pull-backs) is never clipped
      target: new THREE.Vector3(3.3, 2.0, -1.0),
      frustum: VIEW.frustum,
      fitW: VIEW.fitW, // world units that must fit across on narrow screens
      street: new THREE.Vector3(3.6, 0, 8.6), // front edge of the street, kept near the bottom of the frame
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
    // For the loss log: frames drawn since this context began (or came back).
    this.ctxFrames = 0;
    this.ctxStart = performance.now();
    canvas.addEventListener('webglcontextlost', () => {
      this.contextLost = true;
      this.onContextLost && this.onContextLost();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      // three.js replaces its shadow-map object on restore; set it up again.
      this._applyShadowSettings(this.sun.castShadow);
      this.ctxFrames = 0;
      this.ctxStart = performance.now();
      this.onContextRestored && this.onContextRestored();
    });
    // Fired when the browser refuses a new context, e.g. after repeated GPU losses.
    canvas.addEventListener('webglcontextcreationerror', () => {
      this.onContextBlocked && this.onContextBlocked();
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
    sun.castShadow = QUALITY.shadows;
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
    // Lite folds the fill into the hemisphere light: one less light in every shader.
    if (!QUALITY.lite) this.scene.add(this.fill);
  }

  setEnv(name, dur = 2.5) {
    this.envTarget = name;
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
    (this._sunDir ||= new THREE.Vector3()).set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    this.hemi.color.copy(e.hemiSky);
    this.hemi.groundColor.copy(e.hemiGround);
    this.hemi.intensity = e.hemiIntensity + (QUALITY.lite ? e.fill * 0.8 : 0);
    this.fill.intensity = e.fill;
    this.fill.color.copy(e.hemiSky);
    this.renderer.toneMappingExposure = e.exposure;

    mistUniforms.uFogFloor.value = e.haze ?? (0.42 - e.night * 0.2);
    // Pale skies need darker glass behind overlay text.
    const m = e.skyMid;
    document.body.classList.toggle('sky-light', 0.2126 * m.r + 0.7152 * m.g + 0.0722 * m.b > 0.42);
    G.night = e.night;
    G.interior = e.interior;
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.width = w;
    this.height = h;
    const v = this.view;
    v.el = v.elWide + (v.elTall - v.elWide) * clamp((1.0 - w / h) / 0.5, 0, 1);
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

  // Frame height before any zoom: on narrow screens the house, garden and
  // next door still fit across, and the extra height goes to the sky.
  frustumBase() {
    const aspect = this.width / this.height;
    return Math.max(this.view.frustum, this.view.fitW / aspect);
  }

  frustumH() {
    return this.frustumBase() / (this.cam.zoom * this.cam.extraZoom);
  }

  // Where the middle of the frame sits above the target: the front of the
  // street stays near the bottom (higher on phones, where the controls take
  // more room) and the rest of the frame is city and sky. Story pull-backs
  // (extraZoom) keep the street where it is and open up more sky; the
  // player's own zoom pivots on the middle of the view.
  frameOffsetY() {
    const fb = this.frustumBase() / this.cam.extraZoom;
    const v = this.view;
    const up = (this._camUp ||= new THREE.Vector3());
    const drop = (this._tmpV ||= new THREE.Vector3()).copy(v.target).sub(v.street).dot(up);
    const aspect = this.width / this.height;
    // (the timeline bar along the bottom is ~80px tall, which is a lot of a short screen)
    const f = Math.max(0.075 + 0.13 * clamp((1.2 - aspect) / 0.6, 0, 1), Math.min(0.24, 80 / this.height));
    return fb / 2 - drop - f * fb;
  }

  // The vertical shift (as a share of the frame) that brings the target to
  // `frac` of the way down the screen: used to lift the house above the
  // phone's bottom sheet.
  sheetShift(frac) {
    const fb = this.frustumBase();
    const atNow = 0.5 + this.frameOffsetY() / fb;
    return frac - atNow;
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
    const dir = (this._camDir ||= new THREE.Vector3()).set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    const cam = this.camera;
    cam.position.copy(v.target).addScaledVector(dir, v.dist);
    cam.lookAt(v.target);
    cam.updateMatrixWorld();
    (this._camUp ||= new THREE.Vector3()).set(0, 1, 0).applyQuaternion(cam.quaternion);

    const aspect = this.width / this.height;
    const fh = this.frustumH();
    const fw = fh * aspect;
    const sx = c.panX + c.shift * fw;
    const sy = c.panY + c.extraPanY + c.shiftY * fh + this.frameOffsetY();
    cam.left = -fw / 2 + sx;
    cam.right = fw / 2 + sx;
    cam.top = fh / 2 + sy;
    cam.bottom = -fh / 2 + sy;
    cam.near = v.dist - 220;
    cam.far = v.dist + 260;
    cam.updateProjectionMatrix();

    // The sky's gradient starts at the foot of the city.
    const hz = (this._hz ||= new THREE.Vector3()).set(v.target.x, 0, -30).project(cam);
    this.skyUniforms.uHorizon.value = clamp(hz.y * 0.5 + 0.5 - 0.04, 0, 0.75);

    // Ordinary fog (sprites, lines) roughly follows the mist on the city.
    const back = v.dist + (v.target.z + 6.6) * Math.cos(el);
    this.scene.fog.near = back + 14;
    this.scene.fog.far = back + 70;

    // Keep the sun's shadow frustum centred on the diorama.
    const sd = this._sunDir;
    this.sunTarget.position.set(3.5, 0, -0.5);
    this.sun.position.copy(this.sunTarget.position).addScaledVector(sd, 60);
  }

  // Drop the resolution a little on devices that can't keep up.
  _adapt(raw) {
    const a = (this._adaptState ||= { t: 0, frames: 0, settled: false });
    if (a.settled || document.hidden || this.hold) return;
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
    } else if (fps < 24 && this.sun.castShadow && this.sun.shadow.mapSize.x > 512) {
      const n = this.sun.shadow.mapSize.x / 2;
      this.sun.shadow.mapSize.set(n, n);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      // Redraw the (new, smaller) shadow map on the very next frame.
      this.renderer.shadowMap.needsUpdate = true;
    } else {
      a.settled = fps >= 42 || r <= 1;
      if (a.settled && fps < 14 && this.onSlow) this.onSlow(fps);
    }
  }

  // Compile every shader the first scene needs before showing anything, using
  // the parallel-compile extension where available, so the first frames don't
  // stall the GPU (a classic trigger for mobile context loss).
  async warmup(timeoutMs = 4000) {
    const canvas = this.renderer.domElement;
    const r = this.renderer;
    const id = (this._warmId = (this._warmId || 0) + 1);
    this.hold = true;
    canvas.classList.add('warming');
    // compileAsync polls the materials compile() returned; entities leaving the
    // scene can dispose some of them mid-poll, which makes three throw. Drop
    // those from the set as they go.
    const compile = r.compile;
    r.compile = (...args) => {
      const set = compile.apply(r, args);
      for (const m of set) {
        const drop = () => { set.delete(m); m.removeEventListener('dispose', drop); };
        m.addEventListener('dispose', drop);
      }
      return set;
    };
    try {
      this._updateCamera(0);
      await Promise.race([
        r.compileAsync(this.scene, this.camera).catch(() => {}),
        new Promise((res) => setTimeout(res, timeoutMs)),
      ]);
    } catch (e) {
      /* fall through: render compiles synchronously */
    } finally {
      r.compile = compile;
    }
    // A newer warm-up (e.g. after a context restore) owns the hold now.
    if (id !== this._warmId) return;
    this.hold = false;
    requestAnimationFrame(() => { if (id === this._warmId) canvas.classList.remove('warming'); });
  }

  _applyShadowSettings(on) {
    const sm = this.renderer.shadowMap;
    sm.enabled = on;
    sm.type = QUALITY.lite ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    // On lite the shadow pass (a second draw of most of the scene) runs every third frame.
    sm.autoUpdate = on && !QUALITY.lite;
    sm.needsUpdate = on;
  }

  // Stop drawing and sampling shadow maps. Called while the context is lost,
  // so every program is rebuilt without the shadow code when it comes back.
  disableShadows() {
    this._applyShadowSettings(false);
    this.sun.castShadow = false;
    // The old target belonged to the lost context; just let it go.
    this.sun.shadow.map = null;
    this.onShadowsOff && this.onShadowsOff();
  }

  // After a restored context, ask less of the GPU than before.
  lighten() {
    this.maxRatio = 1;
    this.renderer.setPixelRatio(1);
    this._resize();
    if (this._adaptState) this._adaptState.settled = true;
    if (this.sun.castShadow) this.disableShadows();
  }

  stop() {
    this._stopped = true;
  }

  start() {
    const loop = () => {
      if (this._stopped) return;
      requestAnimationFrame(loop);
      const raw = this.clock.getDelta();
      if (this.maxDt < 1) this._adapt(raw);
      const dt = Math.min(this.maxDt, raw);
      G.time += dt;
      tweens.tick(dt);
      for (const f of this.onTick) f(dt, G.time);
      this._updateCamera(dt);
      if (this.onLate) this.onLate(dt);
      const r = this.renderer;
      if (r.shadowMap.enabled && !r.shadowMap.autoUpdate && this._frame++ % 3 === 0) r.shadowMap.needsUpdate = true;
      if (!this.hold && !this.contextLost) {
        // The context can be gone a frame before the event arrives.
        if (r.getContext().isContextLost()) {
          this.contextLost = true;
          document.body.classList.add('gl-lost');
        } else {
          r.render(this.scene, this.camera);
          this.ctxFrames++;
        }
      }
    };
    loop();
  }

  // Project a world position to CSS pixels.
  toScreen(v3, out = { x: 0, y: 0, visible: true }) {
    const p = (this._proj ||= new THREE.Vector3()).copy(v3).project(this.camera);
    out.x = (p.x * 0.5 + 0.5) * this.width;
    out.y = (-p.y * 0.5 + 0.5) * this.height;
    out.visible = p.z > -1 && p.z < 1;
    return out;
  }
}
