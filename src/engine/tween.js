// Small tween + timing helpers. Everything time-based in the game runs through here
// so the whole thing can be driven from the single render loop.

export const Ease = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t) => {
    const c1 = 1.4;
    return (c1 + 1) * t * t * t - c1 * t * t;
  },
};

class Tweens {
  constructor() {
    this.list = [];
  }

  add({ dur = 1, delay = 0, ease = Ease.inOut, update, done }) {
    const tw = { dur: Math.max(0.0001, dur), delay, ease, update, done, t: 0, dead: false };
    this.list.push(tw);
    return tw;
  }

  kill(tw) {
    if (tw) tw.dead = true;
  }

  tick(dt) {
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const tw = list[i];
      if (tw.dead) continue;
      if (tw.delay > 0) {
        tw.delay -= dt;
        if (tw.delay > 0) continue;
        dt = -tw.delay; // carry the leftover into this frame
        tw.delay = 0;
      }
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      if (tw.update) tw.update(tw.ease(k), k);
      if (k >= 1) {
        tw.dead = true;
        if (tw.done) tw.done();
      }
    }
    if (list.length > 64) this.list = list.filter((t) => !t.dead);
  }
}

export const tweens = new Tweens();

export function tween(opts) {
  return new Promise((resolve) => {
    const done = opts.done;
    tweens.add({ ...opts, done: () => { done && done(); resolve(); } });
  });
}

export function wait(sec) {
  return new Promise((resolve) => tweens.add({ dur: sec, done: resolve }));
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Deterministic PRNG so the generated city is the same every visit.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
