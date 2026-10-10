import { CAST } from '../world/people.js';

// Helpers for describing what's in the diorama at each point in time.
// Every scene is a full list of entities; the World works out what changed.

export const E = (id, m, p, at, ry, extra) => ({ id, m, p, at, ry, ...(extra || {}) });

const PI = Math.PI;

// Fixed spots in the house and garden.
export const SPOT = {
  kettle: [-6.2, 0.905, -5.62],
  pip: [-6.64, 0.905, -5.6],
  radio: [-1.25, 0.905, -5.66],
  table: [-3.6, 0, -2.6],
  chairs: [
    [-4.1, 0, -3.35, 0],
    [-3.1, 0, -3.35, 0],
    [-4.1, 0, -1.85, PI],
    [-3.1, 0, -1.85, PI],
  ],
  armchair: [-6.85, 0, -0.95],
  tree: [5.2, 0, -1.6],
  shed: [7.65, 0, -5.25],
  veg: [3.3, 0, -5.75],
  bed: [-6.3, 0, -1.05],
};

// People helpers ------------------------------------------------------------

export function seated(id, who, era, chairIdx, extra = {}) {
  const [x, , z, ry] = SPOT.chairs[chairIdx];
  const back = ry === 0 ? -0.06 : 0.06;
  return E(id, 'person', CAST[who](era, { pose: 'sit', seat: 0.47, ...extra }), [x, 0, z + back], ry);
}

export function standing(id, who, era, at, ry = 0, extra = {}) {
  return E(id, 'person', CAST[who](era, { pose: 'stand', ...extra }), at, ry);
}

export function inArmchair(id, who, era, extra = {}) {
  const [x, , z] = SPOT.armchair;
  return E(id, 'person', CAST[who](era, { pose: 'sit', seat: 0.6, ...extra }), [x + 0.04, 0, z + 0.04], PI / 4);
}

export function chairs(skip = []) {
  return SPOT.chairs
    .map(([x, y, z, ry], i) => (skip.includes(i) ? null : E('chair' + i, 'chair', {}, [x, y, z], ry)))
    .filter(Boolean);
}

// The parts of the house that never change.
export function house({ tone = 'sage', unit } = {}) {
  return [
    E('slab', 'slab'),
    E('floor', 'floor'),
    E('walls', 'walls', { tone }),
    E('kitchen', 'kitchen', unit ? { unit } : {}),
    E('table', 'table', {}, SPOT.table),
    E('pendant', 'pendant', {}, SPOT.table),
    E('shelf', 'bookshelf', {}, [-7.83, 0, -2.2]),
    E('photo', 'photo', {}, [-7.97, 2.3, -2.2]),
  ];
}
