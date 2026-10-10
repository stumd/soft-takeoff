import * as THREE from 'three';
import { drawnTexture, markCached } from './kit.js';

// Soft contact shadows, for when real-time shadows are off (some phone GPUs
// can't sample a shadow map without losing the context): a dark smudge under
// each object, all of one entity's in a single unlit draw.

// Models that stand on something and get one smudge under the whole thing...
const WHOLE = new Set([
  'person', 'dog', 'robot', 'snowman', 'courier',
  'table', 'chair', 'armchair', 'floorLamp', 'bookshelf', 'fridge', 'kitchen', 'hospitalBed', 'sideTable',
  'telescope', 'boxes', 'bench', 'oxygen', 'toolbag', 'dogBed', 'fan', 'kettle', 'radio', 'pip',
  'tree', 'shed', 'greenhouse', 'basket', 'ladder', 'gnome', 'soldBoard', 'grave', 'tomaszHouse',
  'car', 'lorry', 'van', 'robotaxi',
]);
// ...and collections that get one under each member.
const EACH = new Set(['lampPosts', 'streetTrees', 'gardenChairs', 'workers']);

let material = null;
function blobMaterial() {
  if (material) return material;
  const tex = markCached(drawnTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }));
  material = markCached(new THREE.MeshBasicMaterial({
    map: tex, color: '#20180f', transparent: true, opacity: 0.4, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  }));
  return material;
}

const _box = new THREE.Box3();
const _c = new THREE.Vector3();
const _inv = new THREE.Matrix4();

// Footprints [x, y, z, width, depth] in the entity's own space. Measured at
// spawn, before merging folds a collection into one mesh.
export function blobRects(model, obj) {
  const each = EACH.has(model);
  if (!each && !WHOLE.has(model)) return null;
  obj.updateMatrixWorld(true);
  _inv.copy(obj.matrixWorld).invert();
  const rects = [];
  for (const part of each ? obj.children : [obj]) {
    _box.setFromObject(part);
    if (_box.isEmpty()) continue;
    _box.getCenter(_c).applyMatrix4(_inv);
    const base = _box.min.y - obj.matrixWorld.elements[13];
    if (base > 0.3) continue; // hanging or wall-mounted: nothing below it
    const w = _box.max.x - _box.min.x, d = _box.max.z - _box.min.z;
    const grow = Math.max(w, d) > 3 ? 1.12 : 1.35;
    rects.push([_c.x, base + 0.03, _c.z, Math.max(0.45, w * grow), Math.max(0.45, d * grow)]);
  }
  return rects.length ? rects : null;
}

export function blobMesh(rects) {
  const n = rects.length;
  const pos = new Float32Array(n * 12);
  const uv = new Float32Array(n * 8);
  const idx = [];
  rects.forEach(([x, y, z, w, d], i) => {
    const hw = w / 2, hd = d / 2;
    pos.set([x - hw, y, z - hd, x + hw, y, z - hd, x + hw, y, z + hd, x - hw, y, z + hd], i * 12);
    uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8);
    const b = i * 4;
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2); // facing up
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, blobMaterial());
  m.castShadow = false;
  m.receiveShadow = false;
  m.userData.isBlob = true;
  m.raycast = () => {}; // never the thing you clicked
  return m;
}
