import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Collapse an entity's many small static meshes into one mesh per material.
// Cuts draw calls by an order of magnitude for things like fences and kitchens.
// Only used on models whose per-frame ticks (if any) touch materials, not meshes.

export const MERGEABLE = new Set([
  'slab', 'floor', 'walls', 'kitchen', 'table', 'chair', 'bookshelf', 'lawn', 'hedge', 'fence', 'shed',
  'vegBed', 'street', 'streetTrees', 'tomaszHouse', 'tomaszVeg', 'gardenChairs', 'greenhouse', 'grave',
  'car', 'lorry', 'van', 'boxes', 'bench', 'sideTable', 'hospitalBed', 'dogBed', 'armchair', 'basket', 'ladder',
  'oxygen', 'toolbag', 'telescope', 'paper', 'gnome', 'soldBoard', 'workers_static', 'lampPosts',
]);

function normalise(geo, matrix) {
  let g = geo.clone();
  g.applyMatrix4(matrix);
  if (g.index) g = g.toNonIndexed();
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.morphAttributes = {};
  return g;
}

export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o === root || Array.isArray(o.material)) return;
    // Leave anything inside an animated sub-group alone.
    let p = o;
    while (p && p !== root) {
      if (p.userData.tick) return;
      p = p.parent;
    }
    const key = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '') + (o.renderOrder || 0);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  const m = new THREE.Matrix4();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const geos = list.map((mesh) => normalise(mesh.geometry, m.multiplyMatrices(inv, mesh.matrixWorld)));
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, list[0].material);
    mesh.castShadow = list[0].castShadow;
    mesh.receiveShadow = list[0].receiveShadow;
    mesh.renderOrder = list[0].renderOrder;
    root.add(mesh);
    for (const old of list) old.parent.remove(old);
    for (const g of geos) g.dispose();
  }
  return root;
}
