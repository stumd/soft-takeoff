import * as THREE from 'three';

// Lighting / sky presets. Each scene picks one; transitions blend between them.
//
// Compass: the camera looks north across the street, so east (the Spindle,
// the launches, the morning) is on the right and west on the left. glowX is
// the sun's glow across the screen (0 left, 1 right); sunAz is the sun's
// bearing, 0 from the camera's side (south), +PI/2 east, -PI/2 west. Evening
// suns set on the left, morning ones rise on the right.
const C = (h) => new THREE.Color(h);

const base = {
  skyMidPos: 0.5,
  glowX: 0.8, glowY: 0.5, glowSize: 0.25, glowStrength: 0,
  fill: 0.25,
  exposure: 1,
  night: 0,
  interior: 0,
};

function preset(p) {
  const out = { ...base, ...p };
  for (const k of ['skyTop', 'skyMid', 'skyBottom', 'glowColor', 'fog', 'mist', 'sunColor', 'hemiSky', 'hemiGround']) {
    out[k] = C(out[k] || '#ffffff');
  }
  return out;
}

export const ENV = {
  dusk: preset({
    skyTop: '#272f5c', skyMid: '#9a5f7c', skyBottom: '#f09a66', skyMidPos: 0.55,
    glowColor: '#ffae6a', glowX: 0.14, glowY: 0.5, glowSize: 0.28, glowStrength: 0.55,
    fog: '#b8787c', mist: '#d08a76',
    sunColor: '#ff9a5a', sunIntensity: 2.1, sunAz: -1.29, sunEl: 0.2,
    hemiSky: '#8f9ad0', hemiGround: '#5a4038', hemiIntensity: 1.0,
    fill: 0.35, exposure: 1.0, night: 0.6, interior: 1,
  }),
  haze: preset({
    skyTop: '#5f97cc', skyMid: '#b4cfdf', skyBottom: '#f0e3c4', skyMidPos: 0.5,
    glowColor: '#fff4c8', glowX: 0.72, glowY: 0.85, glowSize: 0.35, glowStrength: 0.3,
    fog: '#d3d6d0', mist: '#ece2c9',
    sunColor: '#fff0d0', sunIntensity: 3.2, sunAz: 1.15, sunEl: 0.8,
    hemiSky: '#d8e6f4', hemiGround: '#8a7a60', hemiIntensity: 1.25,
    fill: 0.25, exposure: 1.0, night: 0, interior: 0,
  }),
  snow: preset({
    skyTop: '#6f9fd2', skyMid: '#c0d6ea', skyBottom: '#eef3f6',
    glowColor: '#ffffff', glowX: 0.78, glowY: 0.72, glowSize: 0.3, glowStrength: 0.22,
    fog: '#d2deea', mist: '#e8eef4',
    sunColor: '#fff3e2', sunIntensity: 2.3, sunAz: 0.55, sunEl: 0.38,
    hemiSky: '#e0eaf6', hemiGround: '#b6bfca', hemiIntensity: 1.45,
    fill: 0.25, exposure: 1.0, night: 0, interior: 0.25,
  }),
  summerDusk: preset({
    skyTop: '#2b3d74', skyMid: '#cf7b86', skyBottom: '#ffc489', skyMidPos: 0.52,
    glowColor: '#ffd08a', glowX: 0.12, glowY: 0.45, glowSize: 0.3, glowStrength: 0.65,
    fog: '#d09088', mist: '#e8ac8e',
    sunColor: '#ffb673', sunIntensity: 2.0, sunAz: 0.05, sunEl: 0.16,
    hemiSky: '#a6aedc', hemiGround: '#6a4a44', hemiIntensity: 1.0,
    fill: 0.3, exposure: 1.0, night: 0.4, interior: 0.85,
  }),
  lateSummer: preset({
    skyTop: '#7fa6c9', skyMid: '#d3d1bd', skyBottom: '#f3deae',
    glowColor: '#fff0c0', glowX: 0.6, glowY: 0.88, glowSize: 0.4, glowStrength: 0.3,
    fog: '#d8d0b8', mist: '#ecdcb4',
    sunColor: '#ffe6b4', sunIntensity: 3.0, sunAz: 0.95, sunEl: 0.9,
    hemiSky: '#e6e4d0', hemiGround: '#8c7a58', hemiIntensity: 1.2,
    fill: 0.25, exposure: 1.0, night: 0, interior: 0,
  }),
  storm: preset({
    skyTop: '#383f4c', skyMid: '#73767f', skyBottom: '#d3a670', skyMidPos: 0.42,
    glowColor: '#ffbf72', glowX: 0.12, glowY: 0.32, glowSize: 0.2, glowStrength: 0.55,
    fog: '#7f7e80', mist: '#9c9286',
    sunColor: '#ffc68c', sunIntensity: 1.5, sunAz: -1.39, sunEl: 0.12,
    hemiSky: '#9aa2ae', hemiGround: '#4e463e', hemiIntensity: 1.05,
    fill: 0.35, exposure: 1.05, night: 0.45, interior: 1,
  }),
  night: preset({
    skyTop: '#03050c', skyMid: '#0c1630', skyBottom: '#1b2a4c',
    // (the moon keeps this glow behind itself while it is up: see sky.js)
    glowColor: '#9ab4ff', glowX: 0.53, glowY: 0.86, glowSize: 0.12, glowStrength: 0.22,
    fog: '#121d36', mist: '#1a2846',
    sunColor: '#9cb4ff', sunIntensity: 0.7, sunAz: 0.4, sunEl: 0.85,
    hemiSky: '#3a4a7a', hemiGround: '#101420', hemiIntensity: 0.75,
    fill: 0.2, exposure: 1.12, night: 1, interior: 0.75,
  }),
  morning: preset({
    skyTop: '#5a8fca', skyMid: '#efc8a2', skyBottom: '#ffe1ae', skyMidPos: 0.48,
    glowColor: '#fff0c4', glowX: 0.84, glowY: 0.42, glowSize: 0.3, glowStrength: 0.6,
    fog: '#e3c4a4', mist: '#f2d6b2',
    sunColor: '#ffd79c', sunIntensity: 2.7, sunAz: 1.6, sunEl: 0.27,
    hemiSky: '#d9e2ef', hemiGround: '#8a6a50', hemiIntensity: 1.1,
    fill: 0.3, exposure: 1.0, night: 0.05, interior: 0.3,
  }),
  // The kettle scene ends in a brighter, stranger light.
  newMorning: preset({
    skyTop: '#6aa0dc', skyMid: '#f6d8b6', skyBottom: '#fff0d0', skyMidPos: 0.5,
    glowColor: '#fff6dc', glowX: 0.7, glowY: 0.62, glowSize: 0.42, glowStrength: 0.75,
    fog: '#ead7bf', mist: '#f8e6c8',
    sunColor: '#ffe8bf', sunIntensity: 3.0, sunAz: 1.4, sunEl: 0.4,
    hemiSky: '#e4ecf6', hemiGround: '#8a7458', hemiIntensity: 1.2,
    fill: 0.3, exposure: 1.02, night: 0, interior: 0.2,
  }),
  spring: preset({
    skyTop: '#6eaee6', skyMid: '#c4e2f0', skyBottom: '#f5f2e2',
    glowColor: '#ffffff', glowX: 0.72, glowY: 0.82, glowSize: 0.35, glowStrength: 0.25,
    fog: '#d2e4e8', mist: '#e9f2e8',
    sunColor: '#fff4dc', sunIntensity: 2.9, sunAz: 1.0, sunEl: 0.78,
    hemiSky: '#e2f0fa', hemiGround: '#8aa070', hemiIntensity: 1.3,
    fill: 0.25, exposure: 1.0, night: 0, interior: 0,
  }),
  // Used briefly while time rushes past.
  void: preset({
    skyTop: '#0b0d16', skyMid: '#141826', skyBottom: '#1f2333',
    glowColor: '#000000', glowStrength: 0,
    fog: '#151a28', mist: '#1a1f2e',
    sunColor: '#8090c0', sunIntensity: 0.5, sunAz: 1, sunEl: 0.8,
    hemiSky: '#4a5070', hemiGround: '#181a22', hemiIntensity: 0.7,
    fill: 0.2, exposure: 1, night: 0.8, interior: 0.6,
  }),
};

const COLOR_KEYS = ['skyTop', 'skyMid', 'skyBottom', 'glowColor', 'fog', 'mist', 'sunColor', 'hemiSky', 'hemiGround'];

export function cloneEnv(e) {
  const o = { ...e };
  for (const k of COLOR_KEYS) o[k] = e[k].clone();
  return o;
}

export function lerpEnv(out, a, b, t) {
  for (const k in b) {
    if (COLOR_KEYS.includes(k)) out[k].copy(a[k]).lerp(b[k], t);
    else if (typeof b[k] === 'number') out[k] = a[k] + (b[k] - a[k]) * t;
  }
  return out;
}
