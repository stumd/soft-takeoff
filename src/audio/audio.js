// Generative sound. No samples: everything is synthesised in WebAudio.
// The music is a slow pad with an arpeggio on top; the arpeggio gets faster
// with every visit, the way the world does.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const MASTER = 2.0;

// Chords as MIDI notes. Each mood has a progression, a pad brightness,
// an arpeggio rate (notes per second), and an ambience recipe.
const C = {
  Fmaj7: [53, 57, 60, 64], Am7: [57, 60, 64, 67], Dm9: [50, 57, 60, 64], Bbmaj7: [46, 53, 57, 62],
  Gm9: [55, 58, 62, 69], A7sus: [57, 62, 64, 67], Cmaj9: [48, 55, 59, 62], Ebmaj7: [51, 58, 62, 67],
  Cm9: [48, 55, 58, 62], Abmaj7: [44, 51, 55, 60], Bb6: [46, 53, 55, 62], Fm9: [53, 56, 60, 67],
  Dbmaj7: [49, 56, 60, 65], Gsus: [55, 60, 62, 67], Emin9: [52, 59, 62, 66], Dmaj7: [50, 57, 61, 66],
  Bm7: [47, 54, 57, 62], Gmaj7: [43, 50, 54, 59], Asus: [45, 52, 57, 59],
};

const MOODS = [
  { chords: ['Fmaj7', 'Am7', 'Dm9', 'Bbmaj7'], bright: 700, arp: 0, amb: { room: 1, wind: 0.3 } },
  { chords: ['Fmaj7', 'Cmaj9', 'Dm9', 'Bbmaj7'], bright: 1100, arp: 0.6, amb: { room: 0.6, summer: 1, hum: 0.25 } },
  { chords: ['Dm9', 'Bbmaj7', 'Gm9', 'A7sus'], bright: 800, arp: 1.2, amb: { room: 0.8, wind: 0.5, hum: 0.35 } },
  { chords: ['Ebmaj7', 'Cm9', 'Abmaj7', 'Bb6'], bright: 1000, arp: 2.2, amb: { room: 0.5, evening: 1, hum: 0.5 } },
  { chords: ['Abmaj7', 'Fm9', 'Dbmaj7', 'Ebmaj7'], bright: 1300, arp: 3.2, amb: { room: 0.4, summer: 0.6, hum: 0.6 } },
  { chords: ['Cm9', 'Abmaj7', 'Fm9', 'Gsus'], bright: 900, arp: 4.5, amb: { room: 0.4, wind: 1.2, rain: 0.7, hum: 0.5 } },
  { chords: ['Emin9', 'Cmaj9', 'Gmaj7', 'Dmaj7'], bright: 1200, arp: 6, amb: { room: 0.3, night: 1, hum: 0.7 } },
  { chords: ['Fmaj7', 'Am7', 'Dm9', 'Bbmaj7'], bright: 900, arp: 7, amb: { room: 1, wind: 0.3, hum: 0.6 } },
  { chords: ['Dmaj7', 'Bm7', 'Gmaj7', 'Asus'], bright: 1100, arp: 3, amb: { room: 0.7, evening: 0.5, hum: 0.5 } },
  { chords: ['Gmaj7', 'Emin9', 'Cmaj9', 'Dmaj7'], bright: 1500, arp: 0.5, bells: true, amb: { room: 0.3, spring: 1 } },
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('soft-takeoff-muted') === '1'; } catch (e) { /* storage blocked */ }
    this.mood = null;
    this.arpRate = 0;
    this.chordIdx = 0;
    this.nextChord = 0;
    this.nextArp = 0;
    this.nextBell = 0;
    this.amb = {};
    this.voices = [];
  }

  init() {
    if (this.ctx) return this.ctx.resume();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    // Music: voices -> musicIn -> (dry filter + reverb send) -> music bus (duckable).
    const ir = this._impulse(4.2, 2.6);
    this.music = ctx.createGain();
    this.music.gain.value = 0.42;
    this.music.connect(this.master);
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 20000;
    this.musicIn = ctx.createGain();
    this.musicIn.connect(this.musicFilter).connect(this.music);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = ir;
    const revSend = ctx.createGain();
    revSend.gain.value = 0.45;
    this.musicIn.connect(revSend).connect(this.reverb).connect(this.music);

    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = 0.5;
    this.ambBus.connect(this.master);

    // Effects have their own room, so they aren't silenced with the music.
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.7;
    this.sfx.connect(this.master);
    this.sfxVerb = ctx.createConvolver();
    this.sfxVerb.buffer = ir;
    const sfxVerbOut = ctx.createGain();
    sfxVerbOut.gain.value = 0.35;
    this.sfxVerb.connect(sfxVerbOut).connect(this.master);

    // Ping-pong-ish delay for the arpeggio.
    this.delay = ctx.createDelay(1.5);
    this.delay.delayTime.value = 0.36;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const dl = ctx.createBiquadFilter();
    dl.type = 'lowpass';
    dl.frequency.value = 2400;
    this.delay.connect(dl).connect(fb).connect(this.delay);
    const dOut = ctx.createGain();
    dOut.gain.value = 0.35;
    this.delay.connect(dOut).connect(this.musicIn);

    this.noise = this._noiseBuffer(4);
    this._buildAmbience();
    this._timer = setInterval(() => this._schedule(), 60);
    return ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('soft-takeoff-muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(m ? 0 : MASTER, t, 0.15);
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  _noiseBuffer(seconds) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02; // brown-ish
      d[i] = last * 3.5 * 0.6 + w * 0.4 * 0.15;
    }
    return buf;
  }

  _noiseSource() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.loopStart = Math.random();
    s.start(0, Math.random() * 3);
    return s;
  }

  // ---------------------------------------------------------------- ambience
  _buildAmbience() {
    const ctx = this.ctx;
    const layer = (name, build) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.ambBus);
      build(g);
      this.amb[name] = g;
    };
    layer('room', (g) => {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 260;
      this._noiseSource().connect(f).connect(g);
    });
    layer('wind', (g) => {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 500;
      f.Q.value = 0.8;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.09;
      const lg = ctx.createGain();
      lg.gain.value = 260;
      lfo.connect(lg).connect(f.frequency);
      lfo.start();
      const a = ctx.createGain();
      a.gain.value = 0.7;
      const alfo = ctx.createOscillator();
      alfo.frequency.value = 0.13;
      const alg = ctx.createGain();
      alg.gain.value = 0.35;
      alfo.connect(alg).connect(a.gain);
      alfo.start();
      this._noiseSource().connect(f).connect(a).connect(g);
    });
    layer('rain', (g) => {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 7000;
      const w = ctx.createBufferSource();
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.002 ? 1 : 0.25);
      w.buffer = buf;
      w.loop = true;
      w.start();
      w.connect(hp).connect(lp).connect(g);
    });
    layer('hum', (g) => {
      for (const [f, a] of [[55, 0.5], [110, 0.25], [165, 0.08]]) {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        const og = ctx.createGain();
        og.gain.value = a * 0.25;
        o.connect(og).connect(g);
        o.start();
      }
      const f2 = ctx.createBiquadFilter();
      f2.type = 'lowpass';
      f2.frequency.value = 180;
      this._noiseSource().connect(f2).connect(g);
    });
    // Birds, crickets and so on are scheduled as events; these gains scale them.
    for (const name of ['summer', 'evening', 'night', 'spring']) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.ambBus);
      this.amb[name] = g;
    }
  }

  _chirp(dest, t, base = 3200) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    const n = 2 + Math.floor(Math.random() * 4);
    const dur = 0.07 + Math.random() * 0.06;
    g.gain.setValueAtTime(0, t);
    for (let i = 0; i < n; i++) {
      const s = t + i * (dur + 0.03);
      o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.3), s);
      o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.5), s + dur);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.06, s + 0.01);
      g.gain.linearRampToValueAtTime(0, s + dur);
    }
    const p = ctx.createStereoPanner();
    p.pan.value = Math.random() * 1.6 - 0.8;
    o.connect(g).connect(p).connect(dest);
    o.start(t);
    o.stop(t + n * (dur + 0.03) + 0.1);
  }

  _cricket(dest, t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.value = 4300 + Math.random() * 400;
    const g = ctx.createGain();
    g.gain.value = 0;
    for (let i = 0; i < 3; i++) {
      const s = t + i * 0.09;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.025, s + 0.01);
      g.gain.linearRampToValueAtTime(0, s + 0.05);
    }
    const p = ctx.createStereoPanner();
    p.pan.value = Math.random() * 2 - 1;
    o.connect(g).connect(p).connect(dest);
    o.start(t);
    o.stop(t + 0.4);
  }

  // ---------------------------------------------------------------- music
  setMood(i, fade = 3) {
    if (!this.ctx) {
      this._pendingMood = i;
      return;
    }
    const m = MOODS[i] || MOODS[0];
    this.mood = m;
    this.moodIndex = i;
    this.arpRate = m.arp;
    const t = this.ctx.currentTime;
    for (const [name, g] of Object.entries(this.amb)) {
      const target = (m.amb[name] || 0) * (name === 'rain' ? 0.5 : name === 'room' ? 0.18 : name === 'wind' ? 0.35 : name === 'hum' ? 0.4 : 1);
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(target, t, fade / 3);
    }
    this.nextChord = Math.min(this.nextChord, t + 0.5);
  }

  setArpRate(r) {
    this.arpRate = r;
  }

  duck(level = 0.15, time = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setTargetAtTime(0.42 * level, t, time / 3);
  }

  unduck(time = 2) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setTargetAtTime(0.42, t, time / 3);
  }

  silence(time = 0.4) {
    this.duck(0, time);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const g of Object.values(this.amb)) {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0, t, time / 3);
    }
    this.arpRate = 0;
    this.suspendChords = true;
  }

  resume() {
    this.suspendChords = false;
  }

  _pad(notes, t, dur, bright) {
    const ctx = this.ctx;
    for (const n of notes) {
      const f = midi(n);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + dur * 0.35);
      g.gain.setValueAtTime(0.05, t + dur * 0.7);
      g.gain.linearRampToValueAtTime(0, t + dur * 1.25);
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(bright * 0.6, t);
      filt.frequency.linearRampToValueAtTime(bright, t + dur * 0.5);
      filt.Q.value = 0.6;
      const pan = ctx.createStereoPanner();
      pan.pan.value = (Math.random() - 0.5) * 0.8;
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det + (Math.random() - 0.5) * 4;
        o.connect(filt);
        o.start(t);
        o.stop(t + dur * 1.3);
      }
      filt.connect(g).connect(pan);
      pan.connect(this.musicIn);
    }
    // a soft bass under it
    const b = ctx.createOscillator();
    b.type = 'sine';
    b.frequency.value = midi(notes[0] - 12);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0, t);
    bg.gain.linearRampToValueAtTime(0.09, t + dur * 0.3);
    bg.gain.linearRampToValueAtTime(0, t + dur * 1.2);
    b.connect(bg).connect(this.musicIn);
    b.start(t);
    b.stop(t + dur * 1.25);
  }

  _pluck(n, t, vel = 1, dest) {
    const ctx = this.ctx;
    const f = midi(n);
    const car = ctx.createOscillator();
    car.type = 'sine';
    car.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.frequency.value = f * 2;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 1.2, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.4);
    mod.connect(mg).connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07 * vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.9);
    const pan = ctx.createStereoPanner();
    pan.pan.value = dest ? 0 : (Math.random() - 0.5) * 1.2;
    car.connect(g).connect(pan);
    if (dest) {
      pan.connect(dest);
    } else {
      pan.connect(this.musicIn);
      pan.connect(this.delay);
    }
    car.start(t);
    mod.start(t);
    car.stop(t + 1);
    mod.stop(t + 1);
  }

  _bell(n, t, dest) {
    const ctx = this.ctx;
    const f = midi(n);
    for (const [mult, amp, dec] of [[1, 0.05, 3.5], [2.76, 0.018, 1.6], [5.4, 0.008, 0.8]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0005, t + dec);
      o.connect(g);
      g.connect(dest || this.musicIn);
      o.start(t);
      o.stop(t + dec + 0.1);
    }
  }

  _schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.mood) return;
    const now = ctx.currentTime;
    const ahead = now + 0.25;
    const m = this.mood;
    const chordDur = 8;
    while (this.nextChord < ahead && !this.suspendChords) {
      const t = Math.max(this.nextChord, now);
      const ch = C[m.chords[this.chordIdx % m.chords.length]];
      this._pad(ch, t, chordDur, m.bright);
      this.currentChord = ch;
      this.chordIdx++;
      this.nextChord = t + chordDur;
    }
    if (this.arpRate > 0 && this.currentChord) {
      if (this.nextArp < now) this.nextArp = now;
      while (this.nextArp < ahead) {
        const ch = this.currentChord;
        const pool = [...ch.map((n) => n + 12), ...ch.map((n) => n + 24)];
        const n = pool[Math.floor(Math.random() * pool.length)];
        this._pluck(n, this.nextArp, 0.55 + Math.random() * 0.45);
        this.nextArp += 1 / this.arpRate;
      }
    } else {
      this.nextArp = now;
    }
    if (m.bells && this.currentChord && !this.suspendChords) {
      if (this.nextBell < now) this.nextBell = now + 1;
      while (this.nextBell < ahead) {
        const ch = this.currentChord;
        this._bell(ch[Math.floor(Math.random() * ch.length)] + 24, this.nextBell);
        this.nextBell += 2.5 + Math.random() * 4;
      }
    }
    // Ambient events.
    const roll = (p) => Math.random() < p * 0.06;
    const a = this.amb;
    if (a.summer && a.summer.gain.value > 0.05 && roll(0.5)) this._chirp(a.summer, now + 0.1, 2800 + Math.random() * 1600);
    if (a.evening && a.evening.gain.value > 0.05 && roll(0.25)) this._chirp(a.evening, now + 0.1, 2200 + Math.random() * 900);
    if (a.spring && a.spring.gain.value > 0.05 && roll(0.8)) this._chirp(a.spring, now + 0.1, 2600 + Math.random() * 2400);
    if (a.night && a.night.gain.value > 0.05 && roll(0.9)) this._cricket(a.night, now + 0.1);
  }

  // ---------------------------------------------------------------- effects
  tick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(1320, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.08);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.15);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.2);
  }

  whoosh(dur = 3) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const s = this._noiseSource();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(200, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.6);
    f.frequency.exponentialRampToValueAtTime(300, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + dur * 0.5);
    g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f).connect(g).connect(this.sfx);
    g.connect(this.sfxVerb);
    setTimeout(() => s.stop(), dur * 1000 + 200);
    // a rising shimmer of plucks: time rushing
    const ch = this.currentChord || C.Fmaj7;
    for (let i = 0; i < 18; i++) this._pluck(ch[i % ch.length] + 12 + Math.floor(i / 4) * 12 * 0.5, t + i * (dur / 22), 0.4);
  }

  staticBurst() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    const len = ctx.sampleRate * 0.35;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    s.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0.12;
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t);
  }

  // The kettle: a rising hiss and rumble over `dur` seconds, then a click.
  kettle(dur) {
    if (!this.ctx) return { stop() {} };
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const s = this._noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(150, t);
    bp.frequency.linearRampToValueAtTime(900, t + dur * 0.7);
    bp.frequency.linearRampToValueAtTime(2600, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.45, t + dur * 0.92);
    g.gain.linearRampToValueAtTime(0.65, t + dur);
    s.connect(bp).connect(g).connect(this.sfx);
    // bubbles getting busier
    let alive = true;
    const bubble = () => {
      if (!alive) return;
      const now = ctx.currentTime;
      const k = Math.min(1, (now - t) / dur);
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(90 + Math.random() * 140, now);
      o.frequency.exponentialRampToValueAtTime(40, now + 0.05);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.08 * k, now);
      bg.gain.exponentialRampToValueAtTime(0.0005, now + 0.07);
      o.connect(bg).connect(this.sfx);
      o.start(now);
      o.stop(now + 0.08);
      setTimeout(bubble, 600 - 560 * k + Math.random() * 120);
    };
    setTimeout(bubble, dur * 250);
    return {
      stop: () => {
        alive = false;
        const now = ctx.currentTime;
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.0005, now + 1.4);
        setTimeout(() => s.stop(), 1600);
        this.click();
      },
    };
  }

  click() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    s.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1500;
    const g = ctx.createGain();
    g.gain.value = 0.6;
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t);
  }

  // A small song, through the radio's tiny speaker. Returns a stopper.
  song() {
    if (!this.ctx) return { stop() {} };
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.2;
    const radio = ctx.createBiquadFilter();
    radio.type = 'bandpass';
    radio.frequency.value = 1200;
    radio.Q.value = 0.45;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t0);
    out.gain.linearRampToValueAtTime(0.55, t0 + 1.5);
    radio.connect(out).connect(this.sfx);
    out.connect(this.sfxVerb);
    // A simple tune in D major, waltz time.
    const beat = 0.5;
    const tune = [
      [66, 2], [69, 1], [71, 2], [69, 1], [66, 2], [64, 1], [62, 3],
      [64, 2], [66, 1], [69, 2], [71, 1], [69, 3], [69, 3],
      [74, 2], [73, 1], [71, 2], [69, 1], [66, 2], [64, 1], [62, 3],
      [64, 2], [66, 1], [64, 2], [61, 1], [62, 6],
    ];
    const chords = [[50, 54, 57], [50, 54, 57], [55, 59, 62], [57, 61, 64], [50, 54, 57], [55, 59, 62], [57, 61, 64], [50, 54, 57]];
    let t = t0;
    for (const [n, len] of tune) {
      this._pluck(n, t, 1.2, radio);
      t += len * beat;
    }
    let ct = t0;
    for (let bar = 0; bar < 16; bar++) {
      const ch = chords[bar % chords.length];
      this._pluck(ch[0] - 12, ct, 0.9, radio);
      this._pluck(ch[1], ct + beat, 0.5, radio);
      this._pluck(ch[2], ct + beat * 2, 0.5, radio);
      ct += beat * 3;
    }
    return {
      stop: (fade = 2) => {
        const now = ctx.currentTime;
        out.gain.cancelScheduledValues(now);
        out.gain.setValueAtTime(out.gain.value, now);
        out.gain.linearRampToValueAtTime(0, now + fade);
      },
    };
  }

  // Pip speaking: a soft two-note chime per line.
  pipChime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.value = 1.4;
    g.connect(this.sfx);
    g.connect(this.sfxVerb);
    this._bell(81, t, g);
    this._bell(88, t + 0.18, g);
  }
}

export const audio = new AudioEngine();
