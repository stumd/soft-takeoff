import * as THREE from 'three';
import { MODELS, SKY_MODELS, RISE_MODELS, FADE_MODELS } from './models.js';
import { tweens, Ease } from '../engine/tween.js';
import { G } from '../engine/stage.js';
import { updateCityNight } from './city.js';
import { MERGEABLE, mergeStatic } from './merge.js';
import { blobRects, blobMesh } from './blobs.js';

// Keeps the diorama in sync with a list of entity specs. Entities that are the
// same between two scenes stay put; changed ones are swapped with a little
// animation, so time passing looks like the world rebuilding itself.

function stableKey(spec) {
  return JSON.stringify([spec.m, spec.p || null, spec.at || null, spec.ry || 0, spec.s || 1]);
}

// Free the GPU memory an entity owned. Shared (cached) geometries, materials
// and textures are flagged and left alone; sprites share one internal quad.
function disposeTree(root) {
  const geos = new Set();
  const mats = new Set();
  root.traverse((o) => {
    if (o.userData.isOutline) return;
    if (o.geometry && !o.isSprite && !o.geometry.userData.cached) geos.add(o.geometry);
    const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of list) if (!m.userData.cached) mats.add(m);
  });
  for (const g of geos) g.dispose();
  for (const m of mats) {
    for (const k of ['map', 'emissiveMap', 'alphaMap']) {
      const t = m[k];
      if (t && !t.userData.cached) t.dispose();
    }
    m.dispose();
  }
}

const outlineMat = new THREE.MeshBasicMaterial({ color: '#fff1c8', side: THREE.BackSide, transparent: true, opacity: 0.95, depthWrite: false });
const bboxCache = new WeakMap();

export class World {
  constructor(stage) {
    this.stage = stage;
    this.root = new THREE.Group();
    this.sky = new THREE.Group();
    stage.scene.add(this.root, this.sky);
    this.entities = new Map();
    this.hotspots = [];
    this.byHotspot = new Map();
    this.hovered = null;
    this.raycaster = new THREE.Raycaster();
    this.tickFn = (dt, t) => this.tick(dt, t);
    stage.onTick.push(this.tickFn);
    stage.onLate = (dt) => this.followCamera();
    // Real-time shadows can be dropped mid-game (after a GPU loss).
    stage.onShadowsOff = () => this.addBlobs();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
  }

  get(id) {
    return this.entities.get(id);
  }

  setState(specs, opts = {}) {
    const animate = opts.animate ?? true;
    const next = new Map();
    for (const s of specs) next.set(s.id, s);
    const outs = [];
    const ins = [];
    for (const [id, e] of this.entities) {
      const s = next.get(id);
      if (!s || stableKey(s) !== e.key) outs.push(e);
    }
    for (const s of specs) {
      const e = this.entities.get(s.id);
      if (!e || stableKey(s) !== e.key) ins.push(s);
    }
    for (const e of outs) this.despawn(e, animate, opts);
    for (const s of ins) this.spawn(s, animate, opts);
    return { outs: outs.length, ins: ins.length };
  }

  spawn(spec, animate = true, opts = {}) {
    const make = MODELS[spec.m];
    if (!make) {
      console.warn('No model', spec.m);
      return;
    }
    const obj = make(spec.p || {});
    const rects = blobRects(spec.m, obj);
    if (MERGEABLE.has(spec.m)) mergeStatic(obj);
    else if (RISE_MODELS.has(spec.m)) {
      // Distant structures rise piece by piece, so merge within each piece.
      if (obj.userData.stagger) for (const c of obj.children) { if (!c.userData.tick) mergeStatic(c); }
      else if (!obj.userData.tick) mergeStatic(obj);
    }
    if (spec.at) obj.position.set(spec.at[0], spec.at[1] || 0, spec.at[2] || 0);
    if (spec.ry) obj.rotation.y = spec.ry;
    if (spec.s) obj.scale.setScalar(spec.s);
    const layer = SKY_MODELS.has(spec.m) ? this.sky : this.root;
    layer.add(obj);
    obj.updateMatrixWorld(true);

    // Anchor for the hotspot marker: top-centre of the bounding box, in local space.
    const box = new THREE.Box3().setFromObject(obj, true);
    let anchor = null;
    if (!box.isEmpty()) {
      const top = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
      anchor = obj.worldToLocal(top.clone());
    }

    const ticks = [];
    obj.traverse((o) => {
      if (o.userData.tick) ticks.push(o);
    });
    const ent = { id: spec.id, key: stableKey(spec), spec, obj, ticks, anchor, dead: false, rects, blob: null };
    if (!this.stage.renderer.shadowMap.enabled) this._blob(ent);
    // If an old copy is still animating out, it lives on under a different key.
    this.entities.set(spec.id, ent);

    const kind = RISE_MODELS.has(spec.m) ? 'rise' : FADE_MODELS.has(spec.m) && !SKY_MODELS.has(spec.m) ? 'snap' : SKY_MODELS.has(spec.m) ? 'grow' : 'pop';
    const dur = opts.dur ?? 1.1;
    const spread = opts.spread ?? 1.6;
    const delay0 = opts.delay ?? 0.35;
    if (!animate) return ent;

    if (kind === 'pop') {
      const s = obj.scale.clone();
      obj.scale.setScalar(0.0001);
      tweens.add({ dur: dur * 0.8, delay: delay0 + Math.random() * spread * 0.5, ease: Ease.outBack, update: (k) => obj.scale.copy(s).multiplyScalar(Math.max(0.0001, k)) });
    } else if (kind === 'grow') {
      const s = obj.scale.clone();
      obj.scale.setScalar(0.0001);
      tweens.add({ dur: dur * 2, delay: delay0, ease: Ease.inOut, update: (k) => obj.scale.copy(s).multiplyScalar(Math.max(0.0001, k)) });
    } else if (kind === 'snap') {
      obj.visible = false;
      tweens.add({ dur: 0.01, delay: delay0 + dur * 0.5, update: () => {}, done: () => (obj.visible = true) });
    } else if (kind === 'rise') {
      const kids = obj.userData.stagger ? [...obj.children] : [obj];
      for (const c of kids) {
        const base = c.position.y;
        const h = (c.userData.h || obj.userData.h || 6) + 5;
        c.position.y = base - h;
        c.visible = false;
        tweens.add({
          dur: dur * 1.3,
          delay: delay0 + Math.random() * spread,
          ease: Ease.out,
          update: (k) => {
            c.visible = true;
            c.position.y = base - h * (1 - k);
          },
        });
      }
    }
    return ent;
  }

  despawn(ent, animate = true, opts = {}) {
    if (this.entities.get(ent.id) === ent) this.entities.delete(ent.id);
    ent.dead = true;
    const obj = ent.obj;
    const remove = () => {
      obj.parent && obj.parent.remove(obj);
      ent.ticks = [];
      disposeTree(obj);
    };
    this._unhighlight(ent);
    if (!animate) return remove();
    const spec = ent.spec;
    const kind = RISE_MODELS.has(spec.m) ? 'rise' : FADE_MODELS.has(spec.m) && !SKY_MODELS.has(spec.m) ? 'snap' : SKY_MODELS.has(spec.m) ? 'grow' : 'pop';
    const dur = opts.dur ?? 1.1;
    const spread = opts.spread ?? 1.6;
    // Keep it ticking while it leaves.
    this._leaving = this._leaving || new Set();
    this._leaving.add(ent);
    const finish = () => {
      remove();
      this._leaving.delete(ent);
    };
    if (kind === 'pop' || kind === 'grow') {
      const s = obj.scale.clone();
      tweens.add({ dur: dur * (kind === 'grow' ? 1.6 : 0.6), delay: Math.random() * spread * 0.3, ease: Ease.in, update: (k) => obj.scale.copy(s).multiplyScalar(Math.max(0.0001, 1 - k)), done: finish });
    } else if (kind === 'snap') {
      tweens.add({ dur: 0.01, delay: dur * 0.4, done: finish });
    } else {
      const kids = obj.userData.stagger ? [...obj.children] : [obj];
      let left = kids.length;
      if (!left) return finish();
      for (const c of kids) {
        const base = c.position.y;
        const h = (c.userData.h || obj.userData.h || 6) + 5;
        tweens.add({
          dur: dur * 1.1,
          delay: Math.random() * spread * 0.8,
          ease: Ease.in,
          update: (k) => (c.position.y = base - h * k),
          done: () => {
            c.visible = false;
            if (--left === 0) finish();
          },
        });
      }
    }
  }

  // Soft contact shadows stand in for real ones when those are off.
  _blob(ent) {
    if (!ent.rects || ent.blob) return;
    ent.blob = blobMesh(ent.rects);
    ent.obj.add(ent.blob);
  }

  addBlobs() {
    for (const e of this.entities.values()) this._blob(e);
  }

  // Add/replace a few entities and remove others, leaving everything else alone.
  patch(specs = [], removeIds = [], opts = {}) {
    for (const id of removeIds) {
      const e = this.entities.get(id);
      if (e) this.despawn(e, opts.animate ?? true, opts);
    }
    for (const s of specs) {
      const e = this.entities.get(s.id);
      if (e && stableKey(s) === e.key) continue;
      if (e) this.despawn(e, opts.animate ?? true, opts);
      this.spawn(s, opts.animate ?? true, opts);
    }
  }

  clearAll() {
    for (const e of [...this.entities.values()]) this.despawn(e, false);
  }

  // --- Hotspots -------------------------------------------------------------

  setHotspots(list) {
    this.hovered && this._unhighlight(this.hovered);
    this.hovered = null;
    this.hotspots = list;
    this.byHotspot.clear();
    for (const h of list) this.byHotspot.set(h.id, h);
  }

  _targets(h) {
    const ids = Array.isArray(h.target) ? h.target : [h.target || h.id];
    return ids.map((id) => this.entities.get(id)).filter(Boolean);
  }

  pick(clientX, clientY) {
    const st = this.stage;
    const ndc = new THREE.Vector2((clientX / st.width) * 2 - 1, -(clientY / st.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, st.camera);
    const objs = [];
    const owners = new Map();
    for (const h of this.hotspots) {
      if (h.disabled) continue;
      for (const e of this._targets(h)) {
        objs.push(e.obj);
        owners.set(e.obj, h);
      }
    }
    const hits = this.raycaster.intersectObjects(objs, true);
    for (const hit of hits) {
      if (!hit.object.isMesh || hit.object.userData.isOutline) continue;
      let o = hit.object;
      while (o && !owners.has(o)) o = o.parent;
      if (o && o.visible) return owners.get(o);
    }
    return null;
  }

  highlight(h) {
    if (this.hovered === h) return;
    if (this.hovered) for (const e of this._targets(this.hovered)) this._unhighlight(e);
    this.hovered = h;
    if (h) for (const e of this._targets(h)) this._outline(e);
  }

  _outline(ent) {
    if (ent.outlines) return;
    ent.outlines = [];
    ent.obj.traverse((m) => {
      if (!m.isMesh || m.userData.isOutline || m.geometry.type === 'PlaneGeometry' || m.geometry.type === 'CircleGeometry') return;
      if (m.material && m.material.transparent && m.material.opacity < 0.6) return;
      let bb = bboxCache.get(m.geometry);
      if (!bb) {
        m.geometry.computeBoundingBox();
        bb = m.geometry.boundingBox.clone();
        bboxCache.set(m.geometry, bb);
      }
      const size = bb.getSize(new THREE.Vector3());
      const centre = bb.getCenter(new THREE.Vector3());
      const ws = new THREE.Vector3();
      m.getWorldScale(ws);
      const t = 0.035;
      const sc = new THREE.Vector3(
        1 + (2 * t) / Math.max(0.02, size.x * ws.x),
        1 + (2 * t) / Math.max(0.02, size.y * ws.y),
        1 + (2 * t) / Math.max(0.02, size.z * ws.z),
      );
      const o = new THREE.Mesh(m.geometry, outlineMat);
      o.userData.isOutline = true;
      o.scale.copy(sc);
      o.position.copy(centre).multiply(new THREE.Vector3(1 - sc.x, 1 - sc.y, 1 - sc.z));
      o.renderOrder = -1;
      m.add(o);
      ent.outlines.push(o);
    });
  }

  _unhighlight(ent) {
    if (!ent.outlines) return;
    for (const o of ent.outlines) o.parent && o.parent.remove(o);
    ent.outlines = null;
  }

  // World-space position for a hotspot's floating marker.
  markerPos(h, out = new THREE.Vector3()) {
    const ents = this._targets(h);
    if (!ents.length) return null;
    const e = ents[0];
    if (!e.anchor || !e.obj.visible) return null;
    out.copy(e.anchor);
    if (h.anchor) out.set(h.anchor[0], h.anchor[1], h.anchor[2]);
    e.obj.localToWorld(out);
    if (!h.anchor) out.y += h.lift ?? 0.35;
    return out;
  }

  // --- Frame -------------------------------------------------------------------

  tick(dt, t) {
    for (const e of this.entities.values()) for (const o of e.ticks) o.userData.tick(dt, t);
    if (this._leaving) for (const e of this._leaving) for (const o of e.ticks) o.userData.tick(dt, t);
    updateCityNight();
    if (this.hovered) outlineMat.opacity = 0.7 + Math.sin(t * 5) * 0.25;
  }

  followCamera() {
    const st = this.stage;
    const cam = st.camera;
    const q = cam.quaternion;
    const fwd = this._fwd.set(0, 0, -1).applyQuaternion(q);
    const right = this._right.set(1, 0, 0).applyQuaternion(q);
    const up = this._up.set(0, 1, 0).applyQuaternion(q);
    const cx = (cam.left + cam.right) / 2;
    const cy = (cam.top + cam.bottom) / 2;
    this.sky.quaternion.copy(q);
    this.sky.position.copy(cam.position).addScaledVector(fwd, st.view.dist + 200).addScaledVector(right, cx).addScaledVector(up, cy);
    this.sky.scale.setScalar((cam.top - cam.bottom) / 27);
  }
}
