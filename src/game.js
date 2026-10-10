import * as THREE from 'three';
import { SCENES, sceneEntities, KETTLE_SCRIPT, KETTLE_DURATION, PIP_QUESTION, THE_QUESTION, KEEP_RESPONSES, CLOSING } from './story/scenes.js';
import { KETTLE_STEPS } from './story/states.js';
import { SPOT, E } from './story/layout.js';
import { renderBlocks, inline } from './ui/panel.js';
import { audio } from './audio/audio.js';
import { tweens, tween, wait, Ease, clamp } from './engine/tween.js';
import { G } from './engine/stage.js';
import { cloneEnv } from './engine/env.js';
import { QUALITY, switchTier, rememberTier, noteLoss, TIER_LABELS } from './engine/quality.js';
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
    stage.onContextLost = () => this._contextLost();
    stage.onContextRestored = () => this._contextRestored();
    stage.onContextBlocked = () => this.switchToText('blocked');
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
    window.addEventListener('resize', () => this._layoutTimeline());
  }

  _layoutTimeline() {
    const track = document.querySelector('.tl-track');
    const w = track.clientWidth || 600;
    let lastPx = -100;
    SCENES.forEach((sc, i) => {
      if (i === SCENES.length - 1) return;
      const x = (parseDate(sc.date).getTime() - TL_START) / (TL_END - TL_START);
      let px = x * w;
      // The last visits are days apart; nudge them just enough to stay clickable.
      if (px < lastPx + 9) px = lastPx + 9;
      lastPx = px;
      this.dots[i].style.left = px + 'px';
    });
  }

  _updateTimeline() {
    this.dots.forEach((d, i) => {
      d.classList.toggle('future', i > this.furthest);
      d.classList.toggle('current', i === this.index);
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
    for (const t of ['full', 'lite', 'text']) {
      const b = document.createElement('button');
      b.textContent = TIER_LABELS[t];
      b.className = 'gfx' + (QUALITY.tier === t ? ' on' : '');
      b.setAttribute('aria-pressed', QUALITY.tier === t ? 'true' : 'false');
      b.onclick = () => {
        if (QUALITY.tier === t) return;
        switchTier(t, { note: `Graphics set to ${TIER_LABELS[t]}.` });
      };
      row.appendChild(b);
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
    }[QUALITY.reason] || '';
    const bits = [`Now: ${TIER_LABELS[QUALITY.tier]}${why ? ` (${why})` : ''}.`];
    if (QUALITY.gpu) bits.push(`GPU: ${QUALITY.gpu}.`);
    const r = this.stage && this.stage.renderer;
    if (r && r.getDrawingBufferSize && !QUALITY.text) {
      const v = r.getDrawingBufferSize(new THREE.Vector2());
      bits.push(`Canvas ${v.x}×${v.y}.`);
    }
    if (QUALITY.losses) bits.push(`Graphics losses this session: ${QUALITY.losses}.`);
    $('gfx-info').textContent = bits.join(' ');
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
  //   - restored within a few seconds: keep going, but ask much less of the GPU;
  //   - not restored, blocked, or lost again: continue the story in text mode,
  //     in place, with no reload (reloading can loop if storage is blocked).
  _contextLost() {
    if (QUALITY.text) return;
    document.body.classList.add('gl-lost');
    const n = noteLoss();
    // Whatever happens next, start lighter next time.
    if (QUALITY.full) rememberTier('lite');
    clearTimeout(this._lossTimer);
    if (n >= 2) return this.switchToText('lost-twice');
    this.toast('The graphics stopped. Restarting them…', 0);
    this._lossTimer = setTimeout(() => this.switchToText('not-restored'), 3500);
  }

  _contextRestored() {
    if (QUALITY.text) return;
    clearTimeout(this._lossTimer);
    this._lossTimer = null;
    this.stage.lighten();
    document.body.classList.remove('gl-lost');
    this.toast('Graphics restored, with lighter settings.', 3000);
  }

  // Swap the 3D stage for the text-only one without leaving the current moment.
  switchToText(why) {
    if (QUALITY.text) return;
    const prev = QUALITY.tier;
    clearTimeout(this._lossTimer);
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
      if (this.state === 'choose') this.enterChoose(true);
    }
    ns.start();
    try { old.renderer.dispose(); } catch (e) { /* already gone */ }
    // Next visit: one step lighter than whatever just failed.
    rememberTier(prev === 'full' ? 'lite' : 'text');
    this._buildGraphicsSettings();
    const note = 'Your device’s graphics stopped, so the story carries on without the 3D diorama. You can try 3D again under ? → Graphics.';
    this.toast(note, 9000);
    this.showNote(note);
  }

  showTitleWorld() {
    this.world.setState(sceneEntities(0), { animate: false });
    this.stage.setEnv(SCENES[0].env, 0);
    this.index = -1;
  }

  async begin(resume) {
    await audio.init();
    if (audio._pendingMood != null) audio.setMood(audio._pendingMood);
    $('title').classList.add('fade');
    setTimeout(() => $('title').classList.add('hidden'), 1300);
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
    this._openPanel();
    const seen = this._seenSet();
    if (!seen.includes(h.id)) seen.push(h.id);
    const m = this.markers.get(h.id);
    if (m) m.classList.add('seen');
    this._updateAdvance();
    this._persist();
  }

  _openPanel() {
    const p = $('panel');
    p.classList.add('open');
    p.setAttribute('aria-hidden', 'false');
    p.scrollTop = 0;
    document.body.classList.add('panel-open');
    this.panelOpen = true;
    const mobile = window.innerWidth <= 720;
    this.stage.cam.shiftT = mobile ? 0 : p.offsetWidth / (2 * window.innerWidth);
    this.stage.cam.shiftYT = mobile ? -0.28 : 0;
    setTimeout(() => $('panel-close').focus({ preventScroll: true }), 50);
  }

  closePanel() {
    const p = $('panel');
    if (p.contains(document.activeElement)) document.activeElement.blur();
    p.classList.remove('open');
    p.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('panel-open');
    this.panelOpen = false;
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
    sub.className = '';
    sub.innerHTML = '';

    // Camera slowly pulls back to take in the world.
    const cam = stage.cam;
    tweens.add({ dur: DUR, ease: Ease.inOut, update: (k) => { cam.extraZoom = 1 - 0.36 * k; cam.extraPanY = 3.2 * k; } });
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
    sub.className = 'pip';
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
  enterChoose(force) {
    if (this.state === 'choose' && !force) return;
    this.closePanel();
    this.state = 'choose';
    const banner = $('banner');
    banner.textContent = 'What would you like to keep? Choose anything.';
    banner.classList.remove('hidden');
    $('bottom').classList.add('hidden');
    for (const [id, m] of this.markers) {
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
    this._openPanel();
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
    tweens.add({ dur: 26, ease: Ease.inOut, update: (k) => { cam.extraZoom = 1 - 0.5 * k; cam.extraPanY = 5 * k; } });
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
  _frame() {
    if (!this.scene || this.state === 'title' || QUALITY.text) return;
    const hideAll = this.busy || this.state === 'kettle' || this.state === 'ending';
    const panelLeft = this.panelOpen && window.innerWidth > 720 ? window.innerWidth - $('panel').offsetWidth : Infinity;
    for (const h of this.scene.hotspots) {
      const m = this.markers.get(h.id);
      if (!m) continue;
      const pos = this.world.markerPos(h, this._v);
      if (!pos || hideAll) {
        m.classList.add('offscreen');
        continue;
      }
      const p = this.stage.toScreen(pos, this._p);
      const off = !p.visible || p.x < 8 || p.y < 8 || p.x > window.innerWidth - 8 || p.y > window.innerHeight - 8 || p.x > panelLeft - 10;
      m.classList.toggle('offscreen', off);
      m.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
  }
}
