import * as THREE from 'three';
import { SCENES, sceneEntities, KETTLE_SCRIPT, KETTLE_DURATION, PIP_QUESTION, THE_QUESTION, KEEP_RESPONSES, CLOSING } from './story/scenes.js';
import { KETTLE_STEPS } from './story/states.js';
import { SPOT, E } from './story/layout.js';
import { renderBlocks, inline } from './ui/panel.js';
import { audio } from './audio/audio.js';
import { tweens, tween, wait, Ease, clamp } from './engine/tween.js';
import { G } from './engine/stage.js';
import { cloneEnv } from './engine/env.js';
import { QUALITY, switchTier, rememberTier, noteLoss, TIER_LABELS, shadowsLost, chooseShadows, logLoss, readLossLog, markLossRestored } from './engine/quality.js';
import { repaintAllTextures } from './world/kit.js';
import { NullStage, NullWorld } from './engine/nullstage.js';

const $ = (id) => document.getElementById(id);
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function parseDate(s) {
  const [d, t] = s.split('T');
  const [y, m, dd] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  return new Date(y, m - 1, dd, hh, mm);
}
const pad = (n) => String(n).padStart(2, '0');
const fmtDay = (d) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const fmtTime = (d, secs) => `${pad(d.getHours())}:${pad(d.getMinutes())}${secs ? ':' + pad(d.getSeconds()) : ''}`;

const SAVE_KEY = 'soft-takeoff-save';
function load() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || null; } catch (e) { return null; }
}
function save(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* private mode etc. */ }
}

// Timeline: linear calendar time, so the visits visibly bunch up.
const TL_START = new Date(2026, 8, 1).getTime();
const TL_END = new Date(2031, 0, 1).getTime();

export class Game {
  constructor(stage, world) {
    this.stage = stage;
    this.world = world;
    this.index = -1;
    this.busy = false;
    this.state = 'title';
    const s = load();
    this.seen = {};
    this.furthest = 0;
    this.finished = false;
    if (s) {
      this.seen = s.seen || {};
      this.furthest = s.furthest || 0;
      this.finished = !!s.finished;
      this.saved = s;
    }
    this.markers = new Map();
    this._v = new THREE.Vector3();
    this._p = { x: 0, y: 0, visible: true };
    this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    G.reducedMotion = this.reduced;
    this._bind();
    this._buildTimeline();
    stage.onTick.push((dt, t) => this._frame(dt, t));
    // Markers go where the camera is this frame, after it has moved.
    if (stage.onPost) stage.onPost.push(() => this._placeMarkers());
    stage.onContextLost = () => this._contextLost();
    stage.onContextRestored = () => this._contextRestored();
    // The browser refused to give the context back: no point waiting.
    stage.onContextBlocked = () => { if (this.stage.contextLost) this.switchToText('blocked'); };
    // When the page was last hidden or shown: a loss handled just after an app
    // switch belongs to the switch, not to a failing GPU.
    this._awayAt = -1e9;
    const away = () => { this._awayAt = performance.now(); };
    document.addEventListener('visibilitychange', away);
    window.addEventListener('pagehide', away);
    document.addEventListener('freeze', away);
    stage.onSlow = () => {
      if (!QUALITY.text) this.toast(`Running slowly? Try ${QUALITY.full ? 'Lite or ' : ''}Text only under ? → Graphics.`, 7000);
    };
    this._buildGraphicsSettings();
  }

  // ------------------------------------------------------------------ setup
  _bind() {
    const canvas = this.stage.renderer.domElement;
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      this._hoverAt(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointerleave', () => this._setHover(null));
    canvas.addEventListener('click', (e) => {
      if (this.stage.dragging) return;
      const h = this._pickable() ? this.world.pick(e.clientX, e.clientY) : null;
      if (h) this.activate(h);
      else if (this.panelOpen && this.state !== 'choose') this.closePanel();
    });
    $('panel-close').onclick = () => this.closePanel();
    $('btn-advance').onclick = () => this.onAdvance();
    $('btn-sound').onclick = () => this.toggleSound();
    $('btn-help').onclick = () => this.toggleHelp(true);
    $('help-close').onclick = () => this.toggleHelp(false);
    $('btn-begin').onclick = () => this.begin(false);
    $('btn-continue').onclick = () => this.begin(true);
    $('btn-restart').onclick = () => this.restart();
    $('btn-wander').onclick = () => this.wander();
    $('btn-sound').classList.toggle('off', audio.muted);
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') {
        if (!$('help').classList.contains('hidden')) this.toggleHelp(false);
        else if (this.panelOpen && this.state !== 'choose') this.closePanel();
      } else if (e.key === 'm' || e.key === 'M') this.toggleSound();
      else if (e.key === 'h' || e.key === 'H' || e.key === '?') this.toggleHelp($('help').classList.contains('hidden'));
      else if (e.key === ' ' && this.state === 'scene' && !this.busy && !this.panelOpen && document.activeElement === document.body) {
        e.preventDefault();
        this.onAdvance();
      }
    });
    // A new screen size (or a phone turned round): measure the bars again,
    // every frame for a moment while the layout settles. (An open panel is
    // reframed from _frame, which notices the new size.)
    const resized = () => {
      this._insetFresh = 30;
      this._kettleInsetPx = 0;
    };
    window.addEventListener('resize', resized);
    window.addEventListener('orientationchange', resized);
    if (this.saved && this.saved.index > 0) {
      const b = $('btn-continue');
      b.classList.remove('hidden');
      const sc = SCENES[this.saved.index];
      b.textContent = `Continue — ${sc.title}`;
    }
  }

  _buildTimeline() {
    const ticks = $('tl-ticks');
    for (let y = 2027; y <= 2030; y++) {
      const x = (new Date(y, 0, 1).getTime() - TL_START) / (TL_END - TL_START);
      const t = document.createElement('div');
      t.className = 'tl-tick';
      t.style.left = (x * 100) + '%';
      t.innerHTML = `<span>${y}</span>`;
      ticks.appendChild(t);
    }
    const dots = $('tl-dots');
    this.dots = [];
    SCENES.forEach((sc, i) => {
      let d;
      if (i === SCENES.length - 1) {
        d = $('tl-end-dot');
      } else {
        d = document.createElement('button');
        d.className = 'tl-dot future';
        dots.appendChild(d);
      }
      d.setAttribute('aria-label', `${sc.title}, ${fmtDay(parseDate(sc.date))}`);
      d.title = `${sc.title} · ${fmtDay(parseDate(sc.date))}`;
      d.onclick = () => this.jumpTo(i);
      this.dots.push(d);
    });
    this._layoutTimeline();
    const track = document.querySelector('.tl-track');
    if (window.ResizeObserver) new ResizeObserver(() => this._layoutTimeline()).observe(track);
    window.addEventListener('resize', () => this._layoutTimeline());
  }

  _layoutTimeline() {
    const track = document.querySelector('.tl-track');
    const w = track.clientWidth;
    if (!w) return; // hidden; laid out again when shown (ResizeObserver)
    const n = SCENES.length - 1;
    const gap = Math.min(9, w / (n * 1.5));
    const px = SCENES.slice(0, n).map((sc) => ((parseDate(sc.date).getTime() - TL_START) / (TL_END - TL_START)) * w);
    // The last visits are days apart: push them apart just enough to stay
    // clickable, without letting any run off the end of the track.
    for (let i = 1; i < n; i++) px[i] = Math.max(px[i], px[i - 1] + gap);
    px[n - 1] = Math.min(px[n - 1], w - 7.5);
    for (let i = n - 2; i >= 0; i--) px[i] = Math.min(px[i], px[i + 1] - gap);
    for (let i = 0; i < n; i++) this.dots[i].style.left = Math.max(0, px[i]) + 'px';
  }

  _updateTimeline() {
    this.dots.forEach((d, i) => {
      d.classList.toggle('future', i > this.furthest);
      d.classList.toggle('current', i === this.index);
      d.tabIndex = i > this.furthest ? -1 : 0;
      if (i > this.furthest) d.setAttribute('aria-hidden', 'true');
      else d.removeAttribute('aria-hidden');
    });
    document.querySelector('.tl-end').classList.toggle('unseen', this.furthest < SCENES.length - 1);
  }

  _persist() {
    // On the title screen there is no current visit; keep the saved one.
    const index = this.index >= 0 ? this.index : (this.saved && this.saved.index) || 0;
    save({ index, furthest: this.furthest, seen: this.seen, finished: this.finished });
  }

  toggleSound() {
    audio.setMuted(!audio.muted);
    $('btn-sound').classList.toggle('off', audio.muted);
  }

  toggleHelp(on) {
    if (on) this._buildGraphicsSettings();
    $('help').classList.toggle('hidden', !on);
    if (on) $('help-close').focus();
  }

  // ------------------------------------------------------------------ start
  // ------------------------------------------------------------------ graphics
  _buildGraphicsSettings() {
    const row = $('gfx-options');
    if (!row) return;
    row.innerHTML = '';
    const no3D = !QUALITY.probe.ok;
    for (const t of ['full', 'lite', 'text']) {
      const b = document.createElement('button');
      b.textContent = TIER_LABELS[t];
      b.className = 'gfx' + (QUALITY.tier === t ? ' on' : '');
      b.setAttribute('aria-pressed', QUALITY.tier === t ? 'true' : 'false');
      if (no3D && t !== 'text') {
        b.disabled = true;
        b.title = '3D isn’t available in this browser right now';
      }
      b.onclick = () => {
        if (QUALITY.tier === t || b.disabled) return;
        this._persist();
        switchTier(t, { note: `Graphics set to ${TIER_LABELS[t]}.` });
      };
      row.appendChild(b);
    }
    // Shadows: their own switch, since they are what some phone GPUs choke on.
    const srow = $('gfx-shadows');
    if (srow) {
      srow.innerHTML = '';
      const label = document.createElement('span');
      label.className = 'gfx-label';
      label.textContent = 'Shadows';
      srow.appendChild(label);
      for (const on of [true, false]) {
        const b = document.createElement('button');
        const now = QUALITY.shadows === on;
        b.textContent = on ? 'On' : 'Off';
        b.className = 'gfx small' + (now ? ' on' : '');
        b.setAttribute('aria-pressed', now ? 'true' : 'false');
        b.onclick = () => {
          if (QUALITY.shadows === on) return;
          this._persist();
          chooseShadows(on, { note: `Shadows turned ${on ? 'on' : 'off'}.` });
        };
        srow.appendChild(b);
      }
    }
    const why = {
      auto: 'chosen automatically for this device',
      chosen: 'your choice',
      url: 'set by the link',
      'no-webgl2': '3D isn’t available in this browser right now',
      'webgl-failed': '3D could not start here',
      'not-restored': 'the graphics stopped and didn’t come back',
      'lost-twice': 'the graphics stopped twice',
      blocked: 'the browser paused 3D after the graphics stopped',
      'after-loss': 'lighter, after the graphics stopped last time',
    }[QUALITY.reason] || '';
    const shWhy = {
      gpu: 'this graphics chip has a known fault with shadows',
      lost: 'since the graphics stopped',
      chosen: 'your choice',
      url: 'set by the link',
    }[QUALITY.shadowWhy];
    const bits = [`Now: ${TIER_LABELS[QUALITY.tier]}${why ? ` (${why})` : ''}.`];
    if (!QUALITY.text) bits.push(`Shadows ${QUALITY.shadows ? 'on' : 'off'}${shWhy ? ` (${shWhy})` : ''}.`);
    if (QUALITY.gpu) bits.push(`GPU: ${QUALITY.gpu}.`);
    const r = this.stage && this.stage.renderer;
    if (r && r.getDrawingBufferSize && !QUALITY.text) {
      const v = r.getDrawingBufferSize(new THREE.Vector2());
      bits.push(`Canvas ${v.x}×${v.y}.`);
    }
    if (QUALITY.tabLosses) bits.push(`Graphics losses in this tab: ${QUALITY.tabLosses}.`);
    $('gfx-info').textContent = bits.join(' ');
    const copy = $('gfx-copy');
    if (copy) copy.onclick = () => this._copyDiagnostics();
  }

  // Everything useful for a report about the graphics, as plain text.
  async _diagnostics() {
    const lines = [`Soft Takeoff ${typeof __BUILD__ !== 'undefined' ? __BUILD__ : ''}`];
    lines.push(`Tier: ${QUALITY.tier} (${QUALITY.reason}); shadows ${QUALITY.shadows ? 'on' : 'off'} (${QUALITY.shadowWhy})`);
    lines.push(`GPU: ${QUALITY.gpu || 'unknown'}`);
    const r = this.stage && this.stage.renderer;
    if (r && r.getDrawingBufferSize && !QUALITY.text) {
      const v = r.getDrawingBufferSize(new THREE.Vector2());
      const ext = r.extensions && r.extensions.has && r.extensions.has('KHR_parallel_shader_compile');
      lines.push(`Canvas ${v.x}x${v.y} @${r.getPixelRatio()}, parallel compile: ${ext ? 'yes' : 'no'}`);
    }
    const ua = navigator.userAgent || '';
    lines.push(`UA: ${ua}${/; wv\)/.test(ua) ? ' [WebView]' : ''}`);
    try {
      const hi = navigator.userAgentData && await navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion', 'fullVersionList']);
      if (hi) lines.push(`Device: ${hi.model || '?'}; ${hi.platform || ''} ${hi.platformVersion || ''}; ${(hi.fullVersionList || []).map((b) => `${b.brand} ${b.version}`).join(', ')}`);
    } catch (e) { /* not available */ }
    lines.push(`Storage: ${QUALITY.storage ? 'yes' : 'blocked'}; losses this page ${QUALITY.losses}, this tab ${QUALITY.tabLosses}`);
    for (const l of readLossLog()) {
      const ago = Math.round((Date.now() - l.at) / 60000);
      lines.push(`Loss ${ago} min ago: ${l.where}, ${l.frames} frames / ${l.ms} ms after start, shadows ${l.shadows ? 'on' : 'off'}, ${l.tier}${l.away ? ', app in background' : ''}${l.restored != null ? `, back after ${l.restored} ms` : ''}`);
    }
    return lines.join('\n');
  }

  async _copyDiagnostics() {
    const text = await this._diagnostics();
    const out = $('gfx-log');
    out.value = text;
    out.classList.remove('hidden');
    try {
      await navigator.clipboard.writeText(text);
      this.toast('Copied graphics details.', 2500);
    } catch (e) {
      out.focus();
      out.select();
    }
  }

  toast(text, ms = 4000) {
    const t = $('toast');
    clearTimeout(this._toastTimer);
    if (!text) {
      t.classList.remove('show');
      return;
    }
    t.textContent = text;
    t.classList.add('show');
    if (ms) this._toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  showNote(text) {
    const n = $('title-gfx-note');
    if (n) {
      n.textContent = text;
      n.classList.remove('hidden');
    }
  }

  // The GPU dropped our context. On phones (Android WebView especially) a real
  // loss is often permanent, and two losses get 3D blocked for the page, so we
  // never simply carry on at the same settings:
  //   - first loss: shadows off for good (the known trigger on some phone
  //     GPUs), then wait for the browser to give the context back;
  //   - not restored, blocked, or lost again: continue the story in text mode,
  //     in place, with no reload (reloading can loop if storage is blocked).
  _contextLost() {
    if (QUALITY.text) return;
    document.body.classList.add('gl-lost');
    clearTimeout(this._lossTimer);
    // Phones drop GPU contexts when you switch apps; that's not a failure of
    // ours. Give those their restore window once the page is visible again,
    // and don't count them against this device. The event can arrive a
    // moment after the page comes back, so a recent switch counts too.
    const away = document.hidden || performance.now() - this._awayAt < 2000;
    const st = this.stage;
    this._lossAt = performance.now();
    logLoss({
      at: Date.now(),
      where: this.busy ? `visit ${this.index + 1}, changing` : this.state === 'title' ? 'title' : `visit ${this.index + 1}, ${this.state}`,
      frames: st.ctxFrames,
      ms: Math.round(performance.now() - st.ctxStart),
      shadows: !!(st.sun && st.sun.castShadow),
      tier: QUALITY.tier,
      away,
    });
    this._lossWhileHidden = away;
    this._watchVisibility();
    if (away) {
      if (!document.hidden) this._startRestoreDeadline();
      return;
    }
    const n = noteLoss();
    // Shadow maps are the known trigger on some phone GPUs. Dropping them
    // while the context is gone means it comes back without them.
    if (st.sun && st.sun.castShadow) {
      st.disableShadows();
      shadowsLost();
    }
    if (n >= 2) return this.switchToText('lost-twice');
    if (this.state !== 'title') this.toast('The graphics stopped. Restarting them…', 0);
    this._startRestoreDeadline();
  }

  // While a lost context waits for its restore, only count down when the page
  // is visible: browsers don't restore a hidden page's context.
  _watchVisibility() {
    if (this._onVisible) return;
    this._onVisible = () => {
      if (document.hidden) clearTimeout(this._lossTimer);
      else if (this.stage.contextLost) this._startRestoreDeadline();
    };
    document.addEventListener('visibilitychange', this._onVisible);
  }

  _stopWatchingVisibility() {
    if (!this._onVisible) return;
    document.removeEventListener('visibilitychange', this._onVisible);
    this._onVisible = null;
  }

  // Chrome retries a restore every second, and restarting its GPU process
  // can take a few; WebView may never manage it.
  _startRestoreDeadline() {
    clearTimeout(this._lossTimer);
    this._lossTimer = setTimeout(() => this.switchToText('not-restored'), 8000);
  }

  _contextRestored() {
    if (QUALITY.text) return;
    clearTimeout(this._lossTimer);
    this._lossTimer = null;
    this._stopWatchingVisibility();
    if (this._lossAt) markLossRestored(Math.round(performance.now() - this._lossAt));
    // A GPU crash can also wipe 2D canvases: repaint every texture.
    repaintAllTextures();
    if (this._lossWhileHidden) {
      // Just an app switch: carry on as before.
      this._lossWhileHidden = false;
      document.body.classList.remove('gl-lost');
      this.stage.warmup && this.stage.warmup(3000);
      return;
    }
    // A real failure: ask much less of the GPU from now on, and next time.
    this.stage.lighten();
    if (QUALITY.full) rememberTier('lite');
    document.body.classList.remove('gl-lost');
    // Recompile behind a fade instead of in one blocking frame.
    this.stage.warmup && this.stage.warmup(3000);
    if (this.state !== 'title') this.toast('Graphics restored, without shadows.', 3000);
  }

  // Swap the 3D stage for the text-only one without leaving the current moment.
  switchToText(why) {
    if (QUALITY.text) return;
    const prev = QUALITY.tier;
    clearTimeout(this._lossTimer);
    this._stopWatchingVisibility();
    const old = this.stage;
    const oldWorld = this.world;
    old.stop && old.stop();
    // Share the tick list so anything mid-flight (the kettle, a transition) keeps running.
    const ticks = old.onTick;
    const i = ticks.indexOf(oldWorld.tickFn);
    if (i >= 0) ticks.splice(i, 1);
    const ns = new NullStage(old.renderer.domElement);
    ns.onTick = ticks;
    // Take over the current lighting, and finish any change that was under way.
    const changing = old._envTween && !old._envTween.dead;
    if (old._envTween) tweens.kill(old._envTween);
    ns.env = cloneEnv(old.env);
    ns.applyEnv();
    if (changing && old.envTarget) ns.setEnv(old.envTarget, 1.5);
    ns.cam = old.cam;
    const nw = new NullWorld(ns);
    this.stage = ns;
    this.world = nw;
    QUALITY.tier = 'text';
    QUALITY.reason = why || 'lost';
    document.body.classList.remove('tier-full', 'tier-lite', 'gl-lost');
    document.body.classList.add('tier-text');
    $('markers').innerHTML = '';
    this._setHover(null);
    if (this.scene && this.state !== 'title') {
      nw.setHotspots(this.scene.hotspots);
      this._buildMarkers();
      // Keep the player's place in the answer step, including an open panel.
      if (this.state === 'choose') this._decorateChoose();
    }
    ns.start();
    try { old.renderer.dispose(); } catch (e) { /* already gone */ }
    // Next visit: one step lighter than whatever just failed.
    rememberTier(prev === 'full' ? 'lite' : 'text');
    this._buildGraphicsSettings();
    this.showNote('Your device’s graphics stopped, so the story is now told without the 3D diorama. You can try 3D again under ? → Graphics.');
    if (this.state !== 'title') this.toast('3D stopped, so the story carries on in text.', 5000);
  }

  showTitleWorld() {
    this.world.setState(sceneEntities(0), { animate: false });
    this.stage.setEnv(SCENES[0].env, 0);
    this.index = -1;
    // Behind the title, nudge the world right so the hoarding across the
    // river shows beside the wordmark rather than behind it.
    if (window.innerWidth > 720) this.stage.cam.shift = this.stage.cam.shiftT = -0.05;
  }

  async begin(resume) {
    await audio.init();
    if (audio._pendingMood != null) audio.setMood(audio._pendingMood);
    $('title').classList.add('fade');
    setTimeout(() => $('title').classList.add('hidden'), 1300);
    this.stage.cam.shiftT = 0;
    let target = 0;
    if (resume && this.saved) target = this.saved.index || 0;
    else {
      this.seen = {};
      this.furthest = 0;
    }
    this.state = 'scene';
    await this.transitionTo(target, { first: !resume || target === 0 });
  }

  restart() {
    this.seen = {};
    this.furthest = 0;
    this.finished = false;
    this._persist();
    location.reload();
  }

  // ------------------------------------------------------------------ scene
  _seenSet(i = this.index) {
    const id = SCENES[i].id;
    if (!this.seen[id]) this.seen[id] = [];
    return this.seen[id];
  }

  _applyScene(i) {
    const sc = SCENES[i];
    this.index = i;
    this.furthest = Math.max(this.furthest, i);
    this.scene = sc;
    this.world.setHotspots(sc.hotspots);
    // A scene whose hotspots are things in the sky (the moon, the lights)
    // keeps a strip of sky in view on short screens.
    if (!QUALITY.text && this.stage.setSkyScene) {
      const w = this.world;
      const inSky = (h) => {
        const e = w.get(Array.isArray(h.target) ? h.target[0] : h.target);
        return !!(e && w.sky && e.obj.parent === w.sky);
      };
      this.stage.setSkyScene(sc.hotspots.some(inSky));
    }
    if (import.meta.env && import.meta.env.DEV && !QUALITY.text) {
      for (const h of sc.hotspots) {
        const ids = Array.isArray(h.target) ? h.target : [h.target];
        for (const id of ids) if (!this.world.get(id)) console.warn('Missing target', sc.id, h.id, id);
      }
    }
    this._buildMarkers();
    this._updateHud();
    this._updateTimeline();
    this._updateAdvance();
    this._persist();
  }

  _updateHud(date) {
    const sc = this.scene;
    const d = date || parseDate(sc.date);
    $('hud-day').textContent = fmtDay(d);
    $('hud-time').textContent = fmtTime(d, this.state === 'kettle');
    $('hud-title').textContent = sc.title;
  }

  _updateAdvance() {
    const sc = this.scene;
    const seen = this._seenSet();
    const n = sc.hotspots.filter((h) => !h.special).length;
    const k = sc.hotspots.filter((h) => !h.special && seen.includes(h.id)).length;
    const btn = $('btn-advance');
    $('noticed').textContent = `${k} of ${n} noticed`;
    btn.classList.toggle('ready', k >= Math.ceil(n * 0.5));
    if (sc.kettleScene) {
      btn.innerHTML = 'Put the kettle on';
      btn.classList.add('ready');
    } else if (sc.epilogue) {
      const pipSeen = seen.includes('pip');
      btn.innerHTML = pipSeen ? 'Answer the question' : 'Pip has something to say';
      btn.classList.toggle('ready', pipSeen || k >= 4);
    } else {
      btn.innerHTML = 'Let time pass <span aria-hidden="true">→</span>';
    }
    $('bottom').classList.remove('hidden');
    $('hud').classList.remove('hidden');
    $('tools').classList.remove('hidden');
  }

  _buildMarkers() {
    if (QUALITY.text) return this._buildRoomList();
    const host = $('markers');
    host.innerHTML = '';
    this.markers.clear();
    const seen = this._seenSet();
    for (const h of this.scene.hotspots) {
      const b = document.createElement('button');
      b.className = 'marker' + (h.isNew ? ' new' : '') + (h.special ? ' special' : '') + (seen.includes(h.id) ? ' seen' : '');
      b.setAttribute('aria-label', h.label || h.title);
      b.onclick = () => this.activate(h);
      b.onmouseenter = () => this._setHover(h, b);
      b.onmouseleave = () => this._setHover(null);
      b.onfocus = () => this._setHover(h, b);
      b.onblur = () => this._setHover(null);
      host.appendChild(b);
      this.markers.set(h.id, b);
    }
  }

  // Without the diorama, the things to look at become a list.
  _buildRoomList() {
    const host = $('roomlist');
    host.classList.remove('hidden');
    $('rl-title').textContent = this.scene.title;
    const list = $('rl-items');
    list.innerHTML = '';
    this.markers.clear();
    const seen = this._seenSet();
    for (const h of this.scene.hotspots) {
      const b = document.createElement('button');
      b.className = 'rl-item' + (h.isNew ? ' new' : '') + (h.special ? ' special' : '') + (seen.includes(h.id) ? ' seen' : '');
      b.textContent = h.label || h.title;
      b.onclick = () => this.activate(h);
      list.appendChild(b);
      this.markers.set(h.id, b);
    }
  }

  _pickable() {
    return (this.state === 'scene' || this.state === 'choose') && !this.busy;
  }

  _hoverAt(x, y) {
    if (!this._pickable()) return this._setHover(null);
    const h = this.world.pick(x, y);
    this._setHover(h, null, x, y);
  }

  _setHover(h, markerEl, x, y) {
    this.world.highlight(h);
    this.stage.renderer.domElement.classList.toggle('hovering', !!h);
    const tip = $('tooltip');
    if (!h) {
      tip.classList.remove('show');
      return;
    }
    tip.textContent = this.state === 'choose' ? `Keep: ${h.title.replace(/^The /, 'the ')}` : (h.label || h.title);
    if (markerEl) {
      const r = markerEl.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top;
    }
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
    tip.classList.add('show');
  }

  activate(h) {
    if (this.busy) return;
    if (this.state === 'choose') return this.chooseKeep(h);
    if (h.special === 'kettle') return this.kettleSequence();
    this.openHotspot(h);
  }

  openHotspot(h) {
    const sc = this.scene;
    audio.tick();
    $('panel-kicker').textContent = `${fmtDay(parseDate(sc.date))} · ${fmtTime(parseDate(sc.date))}`;
    $('panel-title').textContent = h.title;
    const body = $('panel-body');
    body.innerHTML = '';
    body.appendChild(renderBlocks(h.body, sc));
    const foot = $('panel-foot');
    foot.innerHTML = '';
    if (sc.epilogue && h.reveal) {
      const b = document.createElement('button');
      b.textContent = 'What would you keep?';
      b.onclick = () => this.enterChoose();
      foot.appendChild(b);
    }
    this._openPanel(h);
    const seen = this._seenSet();
    if (!seen.includes(h.id)) seen.push(h.id);
    const m = this.markers.get(h.id);
    if (m) m.classList.add('seen');
    this._updateAdvance();
    this._persist();
  }

  _openPanel(h) {
    const p = $('panel');
    p.classList.add('open');
    p.setAttribute('aria-hidden', 'false');
    p.inert = false;
    p.scrollTop = 0;
    document.body.classList.add('panel-open');
    this.panelOpen = true;
    this._panelFor = h || null;
    this._layoutPanelShift();
    setTimeout(() => $('panel-close').focus({ preventScroll: true }), 50);
  }

  // Slide the view so that what the open panel is about stays in sight: beside
  // the side panel, or in the strip between the date card and a phone's
  // bottom sheet. Again whenever the screen changes size or turns round (a
  // phone's sheet becomes a side panel and back).
  _layoutPanelShift() {
    const cam = this.stage.cam;
    if (!this.panelOpen) return;
    this._panelKey = window.innerWidth + 'x' + window.innerHeight;
    this._panelInset = this.stage.inset ? this.stage.inset.bottomT : 0;
    if (!this.stage.panelShift) {
      cam.shiftT = cam.shiftYT = 0;
      return;
    }
    const p = $('panel');
    const W = window.innerWidth, H = window.innerHeight;
    const hud = $('hud');
    const card = hud.classList.contains('hidden') ? null : hud.getBoundingClientRect();
    const top = (card ? card.bottom : 0) + 8;
    const free = W <= 720
      ? { sheet: true, left: 16, right: W - 16, top, bottom: H - p.offsetHeight - 6 }
      : { left: 16, right: W - p.offsetWidth - 16, top, bottom: H - 8 };
    if (!free.sheet) {
      // Along the top: the date card (stepped aside beside the panel up to
      // 1100px wide, see style.css) and the sound and help buttons, where they
      // come to rest beside the panel (they glide there).
      const tools = $('tools');
      const cardOn = card && !window.matchMedia('(max-width: 1100px)').matches;
      free.band = {
        bottom: Math.max(cardOn ? card.bottom : 0, tools.getBoundingClientRect().bottom) + 8,
        left: cardOn ? card.right + 8 : 16,
        right: W - p.offsetWidth - 18 - tools.offsetWidth - 8,
      };
    }
    const focus = this._focusOf(this._panelFor);
    // Something in the sky that stays put on screen (the lights): a sheet
    // leaves the view where it is. Lifting the room into the strip above the
    // sheet would raise the city up over the sky it is about.
    if (focus.sky && !focus.boxes.length && free.sheet) {
      cam.shiftT = cam.shiftYT = 0;
      return;
    }
    const s = this.stage.panelShift(focus, free);
    cam.shiftT = s.x;
    cam.shiftYT = s.y;
  }

  // What an open panel is about, for the camera to frame: the world boxes of
  // the hotspot's objects and its marker. Things in the sky layer are left
  // out (it stays put on screen whatever the camera does: `sky` notes them),
  // unless they keep to a place in the world and name the part of them to
  // frame (userData.focus: the night moon, in a gap in the city); with
  // nothing left, the stage frames the room.
  _focusOf(h) {
    const w = this.world;
    const out = { boxes: [], points: [], sky: false };
    if (!h || !w._targets) return out;
    for (const e of w._targets(h)) {
      if (!e.obj.visible) continue;
      let o = e.obj;
      if (w.sky && o.parent === w.sky) {
        o = o.userData.focus;
        if (!o) {
          out.sky = true;
          continue;
        }
      }
      const b = new THREE.Box3().setFromObject(o);
      if (!b.isEmpty()) out.boxes.push(b);
    }
    if (out.boxes.length) {
      const m = w.markerPos(h, new THREE.Vector3());
      if (m) out.points.push(m);
    }
    return out;
  }

  closePanel() {
    const p = $('panel');
    if (p.contains(document.activeElement)) document.activeElement.blur();
    p.classList.remove('open');
    p.setAttribute('aria-hidden', 'true');
    p.inert = true;
    document.body.classList.remove('panel-open');
    this.panelOpen = false;
    this._panelFor = null;
    this.stage.cam.shiftT = 0;
    this.stage.cam.shiftYT = 0;
  }

  onAdvance() {
    if (this.busy || this.state !== 'scene') return;
    const sc = this.scene;
    if (sc.kettleScene) return this.kettleSequence();
    if (sc.epilogue) {
      if (!this._seenSet().includes('pip')) {
        const pip = sc.hotspots.find((h) => h.id === 'pip');
        return this.openHotspot(pip);
      }
      return this.enterChoose();
    }
    if (this.index < SCENES.length - 1) this.transitionTo(this.index + 1);
  }

  jumpTo(i) {
    if (this.busy || i === this.index || i > this.furthest) return;
    if (this.state !== 'scene' && this.state !== 'wander') return;
    this.transitionTo(i);
  }

  // ------------------------------------------------------------------ time passing
  async transitionTo(i, opts = {}) {
    this.busy = true;
    document.body.classList.add('busy');
    this.closePanel();
    this._setHover(null);
    const from = this.index >= 0 ? SCENES[this.index] : null;
    const to = SCENES[i];
    const back = from && i < this.index;
    const ov = $('overlay');
    const gapEl = $('ov-gap'), dateEl = $('ov-date'), epiEl = $('ov-epigraph'), hintEl = $('ov-hint');
    [gapEl, dateEl, epiEl, hintEl].forEach((e) => e.classList.remove('on'));
    gapEl.textContent = opts.first ? '' : back ? 'Remembering.' : to.gap || '';
    ov.classList.toggle('solid', !!opts.first);
    ov.classList.add('show');
    $('bottom').classList.add('hidden');
    $('hud').classList.add('hidden');
    audio.setMood(to.mood);
    if (!opts.first) audio.whoosh(3.2);
    await wait(0.4);
    gapEl.classList.add('on');
    dateEl.classList.add('on');

    // Roll the date from then to now.
    const d0 = from ? parseDate(from.date).getTime() : parseDate(to.date).getTime();
    const d1 = parseDate(to.date).getTime();
    const span = Math.abs(d1 - d0);
    const fmt = (t) => {
      const d = new Date(t);
      if (span > 1000 * 3600 * 24 * 60) return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (span > 1000 * 3600 * 36) return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      return `${DAYS[d.getDay()]} · ${fmtTime(d)}`;
    };
    dateEl.textContent = fmt(d0);
    tweens.add({ dur: opts.first ? 0.01 : 2.8, ease: Ease.inOut, update: (k) => (dateEl.textContent = fmt(d0 + (d1 - d0) * k)), done: () => (dateEl.textContent = opts.first ? fmtDay(parseDate(to.date)) : fmt(d1)) });

    // The diorama rebuilds itself behind the veil.
    this.stage.setEnv(to.env, opts.first ? 0.01 : 3.4);
    this.world.setState(sceneEntities(i), { dur: 1.3, spread: 2.2, delay: 0.3 });
    await wait(opts.first ? 0.6 : 1.6);
    epiEl.textContent = to.epigraph;
    epiEl.classList.add('on');
    this.state = 'scene';
    this._applyScene(i);
    $('bottom').classList.add('hidden');
    $('hud').classList.add('hidden');
    await wait(1.4);
    hintEl.classList.add('on');
    await this._waitClick(ov);
    ov.classList.remove('show');
    [gapEl, dateEl, epiEl, hintEl].forEach((e) => e.classList.remove('on'));
    this._updateAdvance();
    await wait(0.4);
    this.busy = false;
    document.body.classList.remove('busy');
    this.stage.renderer.domElement.focus?.();
  }

  _waitClick(elm, auto = 0) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        elm.removeEventListener('click', finish);
        window.removeEventListener('keydown', onKey);
        resolve();
      };
      const onKey = (e) => {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          finish();
        }
      };
      elm.addEventListener('click', finish);
      window.addEventListener('keydown', onKey);
      if (auto) setTimeout(finish, auto * 1000);
    });
  }

  // ------------------------------------------------------------------ the kettle
  async kettleSequence() {
    if (this.busy) return;
    this.busy = true;
    this.state = 'kettle';
    document.body.classList.add('busy');
    this.closePanel();
    this._setHover(null);
    $('bottom').classList.add('hidden');
    const stage = this.stage, world = this.world;
    const DUR = this.reduced ? KETTLE_DURATION : KETTLE_DURATION;
    const kettle = world.get('kettle');
    kettle?.obj.userData.setBoiling?.(true);
    const [kx, ky, kz] = SPOT.kettle;
    world.patch([E('ksteam', 'steam', { n: 12, size: 0.16, rise: 0.9, strength: 0.15 }, [kx + 0.14, ky + 0.3, kz])], [], { animate: false });
    const steam = world.get('ksteam');
    const kSound = audio.kettle(DUR);
    audio.setArpRate(3);
    const start = parseDate(this.scene.date).getTime();
    const sub = $('subtitle');
    sub.className = 'subtitle';
    sub.innerHTML = '';

    // Camera slowly pulls back to take in the world.
    const cam = stage.cam;
    tweens.add({ dur: DUR, ease: Ease.inOut, update: (k) => { cam.extraZoom = 1 - 0.36 * k; cam.extraPanY = 0.3 * k; } });
    cam.zoomT = 1; cam.panXT = 0; cam.panYT = 0;

    let t = 0;
    let step = 0, line = 0;
    let song = null;
    let envShifted = false;
    await new Promise((resolve) => {
      const tick = (dt) => {
        t += dt;
        const k = Math.min(1, t / DUR);
        const fiction = new Date(start + k * 190 * 1000);
        this._updateHud(fiction);
        steam?.obj.userData.setStrength?.(0.15 + k * 0.95);
        if (!song) audio.setArpRate(3 + Math.pow(Math.min(1, t / 78), 1.6) * 13);
        while (step < KETTLE_STEPS.length && t >= KETTLE_STEPS[step].at) {
          const s = KETTLE_STEPS[step++];
          this.world.patch(s.set || [], s.remove || [], { dur: 2.6, spread: 3.2, delay: 0 });
        }
        while (line < KETTLE_SCRIPT.length && t >= KETTLE_SCRIPT[line].t) {
          const l = KETTLE_SCRIPT[line++];
          sub.innerHTML = `<span class="src">Riverside · Nadia Okoye</span><span class="s">${inline(l.text)}</span>`;
        }
        if (!envShifted && t > 46) {
          envShifted = true;
          this.stage.setEnv('newMorning', 24);
        }
        if (!song && t > 80) {
          song = audio.song();
          audio.setArpRate(0);
          audio.duck(0.25, 3);
          sub.innerHTML = '<span class="src">Riverside</span><span class="s">♪</span>';
        }
        if (song && !song.stopping && t > 91) {
          song.stopping = true;
          song.stop(3);
          sub.innerHTML = '';
        }
        if (t >= DUR) {
          stage.onTick.splice(stage.onTick.indexOf(tick), 1);
          resolve();
        }
      };
      stage.onTick.push(tick);
    });

    // Click.
    kSound.stop();
    kettle?.obj.userData.setBoiling?.(false);
    tween({ dur: 3, update: (k) => steam?.obj.userData.setStrength?.(1.1 * (1 - k)) });
    audio.silence(0.3);
    sub.innerHTML = '';
    await wait(2.2);

    // Every light in the city, once.
    tween({ dur: 2.6, ease: Ease.sine, update: (k) => (G.pulse = Math.sin(k * Math.PI) * 1.4) }).then(() => (G.pulse = 0));
    const pip = world.get('pip');
    sub.className = 'subtitle pip';
    for (const l of PIP_QUESTION) {
      pip?.obj.userData.speak?.(1);
      audio.pipChime();
      sub.innerHTML = `<span class="src">Pip</span><span class="s">${inline(l)}</span>`;
      await wait(Math.max(3.2, l.length * 0.06));
      pip?.obj.userData.speak?.(0.2);
      await wait(0.5);
    }
    sub.innerHTML = '';
    pip?.obj.userData.speak?.(0);
    await this.askQuestion();
  }

  async askQuestion() {
    const q = $('question');
    q.classList.remove('hidden');
    $('q-lines').innerHTML = '';
    const qt = $('q-text');
    qt.textContent = '';
    qt.classList.remove('on');
    await wait(0.05);
    q.classList.add('dark');
    $('hud').classList.add('hidden');
    audio.setMood(9);
    audio.resume();
    audio.duck(0.6, 4);
    await wait(1.6);
    qt.textContent = THE_QUESTION;
    qt.classList.add('on');
    await wait(3.2);
    const next = $('q-next');
    next.classList.remove('hidden');
    next.textContent = 'Take as long as you like';
    next.focus({ preventScroll: true });
    await this._waitClick(next);
    next.classList.add('hidden');
    q.classList.remove('dark');
    qt.classList.remove('on');
    qt.textContent = '';
    await wait(0.6);
    q.classList.add('hidden');
    this.state = 'scene';
    this.busy = false;
    const cam = this.stage.cam;
    const z0 = cam.extraZoom, p0 = cam.extraPanY;
    tweens.add({ dur: 2.2, delay: 0.6, ease: Ease.inOut, update: (k) => { cam.extraZoom = z0 + (1 - z0) * k; cam.extraPanY = p0 * (1 - k); } });
    await this.transitionTo(SCENES.length - 1);
    audio.unduck(4);
  }

  // ------------------------------------------------------------------ the answer
  enterChoose() {
    if (this.state === 'choose') return;
    this.closePanel();
    this.state = 'choose';
    this._decorateChoose();
  }

  _decorateChoose() {
    const banner = $('banner');
    banner.textContent = 'What would you like to keep? Choose anything.';
    banner.classList.remove('hidden');
    $('bottom').classList.add('hidden');
    for (const m of this.markers.values()) {
      m.classList.add('keep');
      m.classList.add('show-seen');
    }
    if (QUALITY.text) $('rl-title').textContent = 'What would you keep?';
  }

  chooseKeep(h) {
    const key = h.keep || 'default';
    $('panel-kicker').textContent = 'Your answer';
    $('panel-title').textContent = h.title;
    const body = $('panel-body');
    body.innerHTML = '';
    body.appendChild(renderBlocks([{ reveal: KEEP_RESPONSES[key] || KEEP_RESPONSES.default }], this.scene));
    const foot = $('panel-foot');
    foot.innerHTML = '';
    const yes = document.createElement('button');
    yes.textContent = 'That’s my answer';
    yes.onclick = () => this.ending(h);
    const no = document.createElement('button');
    no.className = 'ghost';
    no.textContent = 'Let me think';
    no.onclick = () => this.closePanel();
    foot.append(yes, no);
    audio.pipChime();
    this._openPanel(h);
  }

  async ending() {
    this.closePanel();
    this.busy = true;
    this.state = 'ending';
    this.finished = true;
    this._persist();
    document.body.classList.add('busy');
    $('banner').classList.add('hidden');
    $('hud').classList.add('hidden');
    $('bottom').classList.add('hidden');
    $('tools').classList.add('hidden');
    const cam = this.stage.cam;
    cam.zoomT = 1; cam.panXT = 0; cam.panYT = 0;
    tweens.add({ dur: 26, ease: Ease.inOut, update: (k) => { cam.extraZoom = 1 - 0.5 * k; cam.extraPanY = 0.8 * k; } });
    const end = $('ending');
    end.classList.remove('hidden');
    const lines = $('end-lines');
    lines.innerHTML = '';
    await wait(0.1);
    end.classList.add('dark');
    await wait(2);
    for (let i = 0; i < CLOSING.length; i++) {
      const p = document.createElement('p');
      p.innerHTML = inline(CLOSING[i]);
      if (i >= CLOSING.length - 2) p.className = 'amber';
      lines.appendChild(p);
      await wait(i === CLOSING.length - 2 ? 3.4 : 3.8);
    }
    await wait(2.5);
    lines.innerHTML = '';
    $('end-final').classList.remove('hidden');
  }

  wander() {
    $('ending').classList.add('hidden');
    $('ending').classList.remove('dark');
    $('end-final').classList.add('hidden');
    $('tools').classList.remove('hidden');
    this.stage.cam.extraZoom = 1;
    this.stage.cam.extraPanY = 0;
    this.state = 'scene';
    this.busy = false;
    document.body.classList.remove('busy');
    this.furthest = SCENES.length - 1;
    for (const m of this.markers.values()) m.classList.remove('keep', 'show-seen');
    if (QUALITY.text) $('rl-title').textContent = this.scene.title;
    this._updateTimeline();
    this._updateAdvance();
    $('btn-advance').classList.add('hidden');
    $('noticed').textContent = 'Click the timeline to wander';
  }

  // ------------------------------------------------------------------ per frame
  // The street sits just above the bar along the bottom; with no bar (title,
  // ending) it drops to the bottom of the screen and the world opens up
  // above. During the kettle it stays above the subtitles.
  _syncInset() {
    if (!this.stage.setBottomInset) return;
    const bar = $('bottom');
    if (this.state === 'kettle') {
      this.stage.setBottomInset(this._kettleInset(), false);
      return;
    }
    const none = this.state === 'title' || this.state === 'ending';
    const fresh = this._insetFresh > 0;
    if (fresh) this._insetFresh--;
    if (!none && !bar.classList.contains('hidden') && ((this._insetN = (this._insetN || 0) + 1) % 20 === 1 || fresh)) {
      // (the timeline's top: on wide screens the button column beside it is
      // taller, but it stands where the street has already dropped away)
      this._barH = Math.max(0, window.innerHeight - $('timeline').getBoundingClientRect().top);
    }
    const est = window.innerWidth <= 720 ? 128 : window.innerHeight <= 480 ? 62 : 80;
    this.stage.setBottomInset(none ? 0 : this._barH || est);
  }

  // The street's inset during the kettle: just above the subtitles. Measured
  // once per screen size from the tallest line the sequence will show (so the
  // camera doesn't bob as one- and two-line subtitles come and go), using a
  // hidden copy of the subtitle box.
  _kettleInset() {
    if (this._kettleInsetPx) return this._kettleInsetPx;
    const sub = $('subtitle');
    const probe = document.createElement('div');
    probe.className = 'subtitle';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.visibility = 'hidden';
    sub.parentNode.appendChild(probe);
    let top = window.innerHeight;
    const lines = [
      ...KETTLE_SCRIPT.map((l) => ['Riverside · Nadia Okoye', l.text]),
      ...PIP_QUESTION.map((l) => ['Pip', l]),
    ];
    for (const [src, text] of lines) {
      probe.innerHTML = `<span class="src">${src}</span><span class="s">${inline(text)}</span>`;
      top = Math.min(top, probe.getBoundingClientRect().top);
    }
    probe.remove();
    // the street goes 12px above the inset (stage._streetShare)
    this._kettleInsetPx = Math.max(window.innerWidth <= 720 ? 132 : 150, window.innerHeight - top + 4);
    return this._kettleInsetPx;
  }

  _frame() {
    if (QUALITY.text) return;
    this._syncInset();
    // An open panel whose screen changed size (or turned round, so a phone's
    // sheet became a side panel), or whose bottom bar was measured anew (the
    // street's height on screen depends on it): reframe.
    if (this.panelOpen) {
      const key = window.innerWidth + 'x' + window.innerHeight;
      const ins = this.stage.inset ? this.stage.inset.bottomT : 0;
      if (key !== this._panelKey || Math.abs(ins - this._panelInset) > 3) this._layoutPanelShift();
    }
  }

  // Each frame, after the camera has moved: put the markers on their things.
  _placeMarkers() {
    if (!this.scene || this.state === 'title' || QUALITY.text) return;
    const hideAll = this.busy || this.state === 'kettle' || this.state === 'ending';
    const W = window.innerWidth, H = window.innerHeight;
    const panelLeft = this.panelOpen && W > 720 ? W - $('panel').offsetWidth : Infinity;
    const shown = (this._shown ||= []);
    shown.length = 0;
    for (const h of this.scene.hotspots) {
      const m = this.markers.get(h.id);
      if (!m) continue;
      const pos = this.world.markerPos(h, this._v);
      if (!pos || hideAll) {
        m.classList.add('offscreen');
        continue;
      }
      const p = this.stage.toScreen(pos, this._p);
      // A marker that floats just above the top of the screen (tall things
      // on short screens) comes down onto what it marks instead.
      if (p.y < 16 && p.y > -60) p.y = 16;
      const off = !p.visible || p.x < 8 || p.y < 8 || p.x > W - 8 || p.y > H - 8 || p.x > panelLeft - 10;
      m.classList.toggle('offscreen', off);
      // (seen markers are hidden, so they don't take up room)
      if (!off) shown.push({ m, x: p.x, y: p.y, x0: p.x, y0: p.y, live: !m.classList.contains('seen') || m.classList.contains('show-seen') });
      else m.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
    this._spreadMarkers(shown);
    for (const s of shown) {
      const x = clamp(s.x, 14, W - 14), y = clamp(s.y, 14, H - 14);
      s.m.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }

  // Markers closer than a fingertip (28px) are pushed apart along the line
  // between them, each by at most 14px from its own spot, so that each can
  // still be tapped (people round the kitchen table, the kettle by Pip).
  _spreadMarkers(list) {
    const MIN = 28, CAP = 14;
    const live = list.filter((s) => s.live);
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          const a = live[i], b = live[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d = Math.hypot(dx, dy);
          if (d >= MIN) continue;
          // the same spot: split them sideways, in list order
          if (d < 0.01) { dx = 1; dy = 0; d = 1; }
          const k = (MIN - d) / 2 / d;
          a.x -= dx * k; a.y -= dy * k;
          b.x += dx * k; b.y += dy * k;
          moved = true;
        }
      }
      for (const s of live) {
        const ox = s.x - s.x0, oy = s.y - s.y0, o = Math.hypot(ox, oy);
        if (o > CAP) { s.x = s.x0 + (ox * CAP) / o; s.y = s.y0 + (oy * CAP) / o; }
      }
      if (!moved) break;
    }
  }
}
