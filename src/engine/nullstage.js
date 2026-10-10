import { tweens } from './tween.js';
import { ENV, cloneEnv, lerpEnv } from './env.js';
import { G } from './stage.js';

// Stand-ins used when the device can't (or won't) run WebGL. They keep the
// same interface as Stage and World so the story, timeline, panel, kettle
// sequence and ending all work; the diorama is replaced by the sky's colours.

export class NullStage {
  constructor(canvas) {
    canvas.style.display = 'none';
    this.renderer = { domElement: canvas, getPixelRatio: () => 1, info: { render: {}, memory: {} } };
    this.cam = {
      zoom: 1, zoomT: 1, panX: 0, panY: 0, panXT: 0, panYT: 0,
      sway: 0, swayT: 0, shift: 0, shiftT: 0, shiftY: 0, shiftYT: 0, extraZoom: 1, extraPanY: 0,
    };
    this.view = { frustum: 22, dist: 160 };
    this.onTick = [];
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.contextLost = false;
    this.bg = document.getElementById('app');
    this.env = cloneEnv(ENV.dusk);
    this.applyEnv();
    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    });
  }

  setEnv(name, dur = 2.5) {
    this.envTarget = name;
    const to = typeof name === 'string' ? ENV[name] : name;
    if (this._envTween) tweens.kill(this._envTween);
    if (dur <= 0.02) {
      this.env = cloneEnv(to);
      this.applyEnv();
      return;
    }
    const from = cloneEnv(this.env);
    this._envTween = tweens.add({ dur, update: (k) => { lerpEnv(this.env, from, to, k); this.applyEnv(); } });
  }

  applyEnv() {
    const e = this.env;
    const c = (col) => '#' + col.getHexString();
    const glow = `radial-gradient(ellipse at ${e.glowX * 100}% ${(1 - e.glowY) * 100}%, ${c(e.glowColor)} 0%, transparent ${e.glowSize * 160}%)`;
    this.bg.style.background = `${e.glowStrength > 0.05 ? glow + ',' : ''} linear-gradient(0deg, ${c(e.skyBottom)} 0%, ${c(e.skyMid)} ${e.skyMidPos * 100}%, ${c(e.skyTop)} 100%)`;
    // Pale skies need dark lettering.
    const m = e.skyMid;
    const lum = 0.2126 * m.r + 0.7152 * m.g + 0.0722 * m.b;
    document.body.classList.toggle('sky-light', lum > 0.42);
    G.night = e.night;
    G.interior = e.interior;
  }

  frustumH() {
    return 22;
  }

  resetView() {}

  toScreen(v, out = { x: 0, y: 0, visible: false }) {
    out.visible = false;
    return out;
  }

  start() {
    let last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      G.time += dt;
      tweens.tick(dt);
      for (const f of this.onTick) f(dt, G.time);
    };
    requestAnimationFrame(loop);
  }
}

export class NullWorld {
  constructor(stage) {
    this.stage = stage;
    this.hotspots = [];
  }
  setState() { return { outs: 0, ins: 0 }; }
  patch() {}
  get() { return null; }
  setHotspots(list) { this.hotspots = list; }
  pick() { return null; }
  highlight() {}
  markerPos() { return null; }
  clearAll() {}
}
