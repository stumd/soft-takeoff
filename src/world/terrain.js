import { VIEW_DEFAULT } from '../engine/stage.js';

// The lie of the land beyond the river. Our bank, the river and the far bank
// are flat (y = 0); behind the riverside the city climbs a long, gentle hill
// whose crown is the old town centre, behind our garden. The mist shader
// (kit.js) uses the same shape, so the haze lies on the ground wherever it is.
//
// Things beyond the plot are placed by "screen-x" (sx: left/right as the
// default camera sees it, in world units) and world z; xAt() turns that into
// world x.

const SA = Math.sin(VIEW_DEFAULT.az), CA = Math.cos(VIEW_DEFAULT.az);
export const xAt = (sx, z) => (sx + z * SA) / CA;
export const sxOf = (x, z) => x * CA - z * SA;

// The hill rises from z0 to z1, highest (by ck) around screen-x cx; past the
// crest the land falls gently away (by `fall` per unit) to the far district
// at z = -95, where it is about as low as the district's foot. From a
// landscape screen that slope hides behind the crest; from higher up (tall
// screens, the story's pull-backs) it shows as a long hazy rise between the
// crest and the far district, with the Spindle standing on it.
export const HILL = { z0: -27.5, z1: -41, h: 0.85, cx: 6, cw: 15, ck: 0.55, crest: -41.6, fall: 0.42 };

const smooth = (t) => t * t * (3 - 2 * t);

export function groundY(sx, z) {
  const t = smooth(Math.min(1, Math.max(0, (HILL.z0 - z) / (HILL.z0 - HILL.z1))));
  return HILL.h * t * (1 + HILL.ck * Math.exp(-(((sx - HILL.cx) / HILL.cw) ** 2))) - HILL.fall * Math.max(0, HILL.crest - z);
}

// Place an object on the ground at (sx, z).
export function place(obj, sx, z, dy = 0) {
  obj.position.set(xAt(sx, z), groundY(sx, z) + dy, z);
  return obj;
}

export const GROUND_GLSL = /* glsl */ `
float groundY(vec3 p) {
  float sx = p.x * ${CA.toFixed(6)} - p.z * ${SA.toFixed(6)};
  float t = clamp((${HILL.z0.toFixed(3)} - p.z) / ${(HILL.z0 - HILL.z1).toFixed(3)}, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  float c = (sx - ${HILL.cx.toFixed(3)}) / ${HILL.cw.toFixed(3)};
  return ${HILL.h.toFixed(3)} * t * (1.0 + ${HILL.ck.toFixed(3)} * exp(-c * c)) - ${HILL.fall.toFixed(3)} * max(0.0, ${HILL.crest.toFixed(3)} - p.z);
}`;
