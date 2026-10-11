import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Builds many small coloured shapes into one geometry with a colour per
// vertex, so a whole row of buildings (or a whole neighbourhood) is a single
// draw call. Shapes stand on their (x, y, z) like kit.js boxes do.
//
// `unit` tiles a window texture over the sides of a box with its world size;
// without it, every UV points at the texture's blank margin.

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

const BLANK_UV = 0.02;

export class Batch {
  constructor() {
    this.geos = [];
  }

  get size() {
    return this.geos.length;
  }

  add(geo, color, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, keepUV = false } = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    if (!keepUV) g.attributes.uv.array.fill(BLANK_UV);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    _c.set(color);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([_c.r, _c.g, _c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.morphAttributes = {};
    this.geos.push(g);
    return this;
  }

  box(w, h, d, color, x = 0, y = 0, z = 0, o = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    if (o.unit) {
      const uv = g.attributes.uv, nrm = g.attributes.normal;
      for (let i = 0; i < uv.count; i++) {
        const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
        if (ny > 0.5) uv.setXY(i, BLANK_UV, BLANK_UV);
        else if (nx > 0.5) uv.setXY(i, uv.getX(i) * (d / o.unit), uv.getY(i) * (h / o.unit));
        else uv.setXY(i, uv.getX(i) * (w / o.unit), uv.getY(i) * (h / o.unit));
      }
    }
    return this.add(g, color, { ...o, x, y, z, keepUV: !!o.unit });
  }

  // A pitched roof: a triangular prism along x, eaves at y, ridge `h` higher.
  roof(w, h, d, color, x, y, z, o = {}) {
    const s = new THREE.Shape();
    s.moveTo(-d / 2, 0);
    s.lineTo(d / 2, 0);
    s.lineTo(0, h);
    s.lineTo(-d / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
    g.rotateY(Math.PI / 2);
    g.translate(-w / 2, 0, 0);
    return this.add(g, color, { ...o, x, y, z });
  }

  ico(r, color, x, y, z, o = {}) {
    return this.add(new THREE.IcosahedronGeometry(r, 0), color, { ...o, x, y, z });
  }

  cone(r, h, color, x, y, z, o = {}) {
    const g = new THREE.ConeGeometry(r, h, o.seg ?? 6);
    g.translate(0, h / 2, 0);
    return this.add(g, color, { ...o, x, y, z });
  }

  cyl(rt, rb, h, color, x, y, z, o = {}) {
    const g = new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 8);
    g.translate(0, h / 2, 0);
    return this.add(g, color, { ...o, x, y, z });
  }

  // A flat rectangle on the ground (or at height y).
  quad(x0, x1, z0, z1, color, y = 0) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    g.rotateX(-Math.PI / 2);
    return this.add(g, color, { x: (x0 + x1) / 2, y, z: (z0 + z1) / 2 });
  }

  geometry() {
    if (!this.geos.length) return null;
    const merged = mergeGeometries(this.geos, false);
    for (const g of this.geos) g.dispose();
    this.geos = [];
    merged.computeBoundingSphere();
    return merged;
  }

  mesh(material) {
    const g = this.geometry();
    if (!g) return null;
    const m = new THREE.Mesh(g, material);
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  }
}
