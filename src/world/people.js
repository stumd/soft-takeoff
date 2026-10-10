import { THREE, box, capsule, sphere, cyl, group, mat, cone } from './kit.js';
import { G } from '../engine/stage.js';

// Low-poly "pawn" people. Simple shapes, readable at a distance:
// colour, height and hair do most of the characterisation.

const SKIN = {
  maya: '#d9a27e',
  june: '#c98f6a',
  arthur: '#e3b49a',
  tomasz: '#e6b295',
  nurse: '#8a5a3c',
};

function hair(style, color, hr) {
  const parts = [];
  const m = mat(color, { rough: 0.95 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.08, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), m);
  cap.castShadow = true;
  cap.rotation.x = -0.25;
  cap.position.y = 0.01;
  if (style !== 'bald') parts.push(cap);
  if (style === 'long') {
    parts.push(box(hr * 1.9, hr * 1.9, hr * 0.7, color, { y: -hr * 1.3, z: -hr * 0.55, r: hr * 0.3 }));
  }
  if (style === 'bun') {
    parts.push(sphere(hr * 0.45, color, { y: hr * 0.55, z: -hr * 0.85 }));
  }
  if (style === 'bunches') {
    parts.push(sphere(hr * 0.38, color, { x: -hr * 1.05, y: -hr * 0.1, z: -hr * 0.2 }));
    parts.push(sphere(hr * 0.38, color, { x: hr * 1.05, y: -hr * 0.1, z: -hr * 0.2 }));
  }
  if (style === 'pony') {
    parts.push(capsule(hr * 0.22, hr * 0.9, color, { y: -hr * 0.3, z: -hr * 1.1 }));
  }
  if (style === 'grey') {
    // receding: just a band round the back and sides
    cap.scale.set(1, 0.75, 1);
    cap.position.set(0, -hr * 0.12, -hr * 0.08);
  }
  return parts;
}

/**
 * person({ who, h, top, bottom, hairStyle, hairColor, pose, extra })
 * pose: 'stand' | 'sit' | 'lie' | 'kneel'
 * Faces +z by default.
 */
export function person(o = {}) {
  const s = (o.h || 1.7) / 1.7;
  const skin = o.skin || SKIN[o.who] || '#d8a888';
  const top = o.top || '#4a7a8c';
  const bottom = o.bottom || '#3a3f4a';
  const pose = o.pose || 'stand';
  const g = new THREE.Group();
  const body = new THREE.Group(); // breathing pivot
  g.add(body);

  const legR = 0.075 * s, legL = 0.62 * s;
  const torsoW = 0.42 * s, torsoH = 0.58 * s, torsoD = 0.24 * s;
  const headR = 0.135 * s * (o.child ? 1.12 : 1);
  const armR = 0.055 * s, armL = 0.5 * s;

  let hipY;
  if (pose === 'stand') {
    hipY = legL + legR;
    for (const sx of [-1, 1]) {
      const leg = capsule(legR, legL, bottom, { x: sx * 0.1 * s, y: hipY / 2 + 0.02 });
      g.add(leg);
      g.add(box(0.12 * s, 0.07 * s, 0.22 * s, o.shoes || '#2a2622', { x: sx * 0.1 * s, y: 0, z: 0.04 * s, r: 0.03 }));
    }
  } else if (pose === 'sit') {
    hipY = o.seat ?? 0.47;
    for (const sx of [-1, 1]) {
      const thigh = capsule(legR * 1.1, 0.34 * s, bottom, { x: sx * 0.1 * s, y: hipY + 0.04, z: 0.18 * s });
      thigh.rotation.x = Math.PI / 2;
      g.add(thigh);
      const shin = capsule(legR, Math.max(0.05, hipY - 0.12), bottom, { x: sx * 0.1 * s, y: hipY / 2, z: 0.38 * s });
      g.add(shin);
      g.add(box(0.12 * s, 0.07 * s, 0.22 * s, o.shoes || '#2a2622', { x: sx * 0.1 * s, y: 0, z: 0.42 * s, r: 0.03 }));
    }
  } else if (pose === 'kneel') {
    hipY = 0.42 * s;
    for (const sx of [-1, 1]) {
      const shin = capsule(legR, 0.32 * s, bottom, { x: sx * 0.1 * s, y: 0.08, z: -0.12 * s });
      shin.rotation.x = Math.PI / 2;
      g.add(shin);
      const thigh = capsule(legR * 1.1, 0.3 * s, bottom, { x: sx * 0.1 * s, y: 0.26 * s, z: 0.05 });
      g.add(thigh);
    }
  } else if (pose === 'lie') {
    hipY = 0;
  }

  if (pose !== 'lie') {
    const torso = box(torsoW, torsoH, torsoD, top, { y: hipY - 0.04, r: 0.09 * s });
    body.add(torso);
    if (o.vest) body.add(box(torsoW * 1.04, torsoH * 0.62, torsoD * 1.06, o.vest, { y: hipY + torsoH * 0.28, r: 0.06 * s }));
    if (o.apron) body.add(box(torsoW * 0.8, torsoH * 0.75, 0.02, o.apron, { y: hipY - 0.1, z: torsoD / 2 + 0.01 }));
    const shoulderY = hipY + torsoH - 0.12 * s;
    const armPose = o.arms || (pose === 'sit' ? 'forward' : 'down');
    for (const sx of [-1, 1]) {
      const arm = capsule(armR, armL - armR * 2, o.sleeve || top, {});
      const pivot = new THREE.Group();
      pivot.position.set(sx * (torsoW / 2 + armR * 0.7), shoulderY, 0);
      arm.position.y = -armL / 2 + armR;
      pivot.add(arm);
      const hand = sphere(armR * 1.15, skin, { y: -armL + armR * 0.5 });
      pivot.add(hand);
      if (armPose === 'forward') pivot.rotation.x = -1.1;
      if (armPose === 'up' && sx > 0) pivot.rotation.x = -2.6;
      if (armPose === 'up' && sx < 0) pivot.rotation.x = -0.2;
      if (armPose === 'hold') pivot.rotation.x = -0.7;
      if (armPose === 'window') pivot.rotation.x = -2.0;
      if (armPose === 'down') pivot.rotation.z = sx * 0.08;
      if (armPose === 'hips') { pivot.rotation.z = sx * 0.6; pivot.rotation.x = 0.2; }
      body.add(pivot);
    }
    const neckY = hipY + torsoH - 0.04;
    const head = new THREE.Group();
    head.position.y = neckY + headR * 0.95;
    head.add(sphere(headR, skin, { ws: 18, hs: 14 }));
    for (const part of hair(o.hairStyle || 'short', o.hairColor || '#3a2a20', headR)) head.add(part);
    if (o.glasses) {
      const gm = mat('#222', { rough: 0.4 });
      for (const sx of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.26, headR * 0.05, 6, 14), gm);
        ring.position.set(sx * headR * 0.36, 0.0, headR * 0.92);
        head.add(ring);
      }
    }
    if (o.cannula) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.95, 0.008, 4, 20, Math.PI * 1.2), mat('#cfe6ee'));
      t.rotation.x = Math.PI / 2;
      t.rotation.z = -Math.PI * 0.1;
      t.position.y = -headR * 0.25;
      head.add(t);
    }
    if (o.headset) {
      head.add(box(headR * 2.3, headR * 0.3, headR * 0.5, '#e9eef2', { y: headR * 0.55, r: 0.02 }));
      head.add(box(headR * 1.8, headR * 0.28, 0.03, '#7fd7ff', { y: -headR * 0.05, z: headR * 0.95, m: { emissive: '#7fd7ff', emissiveIntensity: 0.8 } }));
    }
    if (o.cap) head.add(cyl(headR * 1.02, headR * 1.05, headR * 0.45, o.cap, { y: headR * 0.25 }));
    if (o.headTurn) head.rotation.y = o.headTurn;
    if (o.headTilt) head.rotation.x = o.headTilt;
    body.add(head);
    g.userData.head = head;
  } else {
    // Lying down: a simple long shape under a blanket, head on a pillow.
    body.add(box(0.5 * s, 0.22, 1.5 * s, o.blanket || '#b9c4cf', { y: 0, z: 0.1, r: 0.1 }));
    const head = sphere(headR, skin, { y: 0.18, z: -0.82 * s });
    body.add(head);
    for (const part of hair(o.hairStyle || 'short', o.hairColor || '#3a2a20', headR)) {
      part.position.add(head.position);
      body.add(part);
    }
    if (o.cannula) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.95, 0.008, 4, 20, Math.PI * 1.2), mat('#cfe6ee'));
      t.position.copy(head.position).add(new THREE.Vector3(0, 0.02, 0));
      t.rotation.x = Math.PI / 2;
      body.add(t);
    }
  }

  if (o.prop) g.add(o.prop);

  // Idle: gentle breathing, occasional head turn.
  const phase = Math.random() * 10;
  const rate = o.breath ?? 1;
  g.userData.tick = (dt, t) => {
    const b = Math.sin((t + phase) * 1.6 * rate) * 0.012 * (o.labored ? 2.2 : 1);
    body.scale.y = 1 + b;
    const head = g.userData.head;
    if (head && !G.reducedMotion && pose !== 'lie') {
      head.rotation.y = (o.headTurn || 0) + Math.sin((t + phase) * 0.23) * 0.18;
    }
  };
  return g;
}

export function dog(o = {}) {
  const c = o.color || '#3b2f2a';
  const w = o.white || '#efe9e1';
  const s = o.scale || 1;
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  if (o.pose === 'stand') {
    body.add(box(0.26 * s, 0.24 * s, 0.6 * s, c, { y: 0.24 * s, r: 0.1 * s }));
    for (const [x, z] of [[-0.08, 0.2], [0.08, 0.2], [-0.08, -0.2], [0.08, -0.2]]) {
      body.add(cyl(0.035 * s, 0.035 * s, 0.26 * s, w, { x: x * s, z: z * s }));
    }
    const head = group(
      sphere(0.13 * s, c, { y: 0 }),
      sphere(0.07 * s, w, { z: 0.12 * s, y: -0.03 * s, sz: 1.3 }),
      cone(0.05 * s, 0.1 * s, c, { x: -0.08 * s, y: 0.08 * s }),
      cone(0.05 * s, 0.1 * s, c, { x: 0.08 * s, y: 0.08 * s }),
    );
    head.position.set(0, 0.55 * s, 0.34 * s);
    body.add(head);
    const tail = cyl(0.025 * s, 0.04 * s, 0.25 * s, c, { y: 0.4 * s, z: -0.32 * s, rx: -0.9 });
    body.add(tail);
    g.userData.tick = (dt, t) => { tail.rotation.z = Math.sin(t * 9) * 0.5; };
  } else {
    // curled up asleep
    body.add(box(0.5 * s, 0.2 * s, 0.38 * s, c, { y: 0.02, r: 0.09 * s }));
    body.add(box(0.2 * s, 0.12 * s, 0.24 * s, w, { x: 0.12 * s, y: 0.02, z: 0.1 * s, r: 0.05 }));
    const head = group(
      sphere(0.11 * s, c, {}),
      sphere(0.06 * s, w, { z: 0.09 * s, y: -0.03 * s, sz: 1.3 }),
      cone(0.045 * s, 0.08 * s, c, { x: -0.06 * s, y: 0.06 * s }),
      cone(0.045 * s, 0.08 * s, c, { x: 0.06 * s, y: 0.06 * s }),
    );
    head.position.set(0.24 * s, 0.13 * s, 0.14 * s);
    head.rotation.y = 0.6;
    body.add(head);
    g.userData.tick = (dt, t) => { body.scale.y = 1 + Math.sin(t * 1.4) * 0.03; };
  }
  return g;
}

// Robots. 'care' is Big Pip (soft, white, a little like a bollard with a face);
// 'worker' is the yellow construction model; 'courier' a six-wheeled box.
export function robot(o = {}) {
  const kind = o.kind || 'care';
  const g = new THREE.Group();
  if (kind === 'courier') {
    g.add(box(0.5, 0.42, 0.7, '#e9ecef', { y: 0.12, r: 0.08 }));
    g.add(box(0.46, 0.06, 0.66, '#3b4a5a', { y: 0.53, r: 0.03 }));
    for (const z of [-0.25, 0, 0.25]) for (const x of [-0.27, 0.27]) g.add(cyl(0.08, 0.08, 0.06, '#222', { x, y: 0.0, z, rz: Math.PI / 2 }));
    const flag = cyl(0.008, 0.008, 0.6, '#ddd', { x: -0.2, y: 0.5, z: -0.3 });
    g.add(flag);
    g.add(box(0.14, 0.09, 0.01, '#ff7a3d', { x: -0.14, y: 1.0, z: -0.3 }));
    g.add(box(0.2, 0.05, 0.01, '#7fd7ff', { y: 0.38, z: 0.351, m: { emissive: '#7fd7ff', emissiveIntensity: 1.2 } }));
    return g;
  }
  const isWorker = kind === 'worker';
  const shell = isWorker ? '#e8b923' : '#f2f0ec';
  const joint = isWorker ? '#3a3a3a' : '#cfd6dc';
  const h = o.h || (isWorker ? 1.75 : 1.85);
  const s = h / 1.8;
  const body = new THREE.Group();
  g.add(body);
  if (kind === 'care') {
    // Rounded body on a hidden base; reads as gentle rather than humanoid-scary.
    body.add(capsule(0.28 * s, 0.75 * s, shell, { y: 0.66 * s }));
    body.add(cyl(0.3 * s, 0.34 * s, 0.12 * s, joint, { y: 0 }));
    for (const sx of [-1, 1]) {
      const arm = capsule(0.06 * s, 0.5 * s, shell, { x: sx * 0.34 * s, y: 0.92 * s });
      arm.rotation.z = sx * 0.12;
      body.add(arm);
    }
    const head = group(
      sphere(0.2 * s, shell, { sy: 0.9 }),
      box(0.3 * s, 0.1 * s, 0.05, '#20262e', { y: -0.04 * s, z: 0.17 * s, r: 0.02 }),
    );
    const eyes = box(0.18 * s, 0.025 * s, 0.02, '#9fe6ff', { y: 0, z: 0.2 * s, m: { emissive: '#9fe6ff', emissiveIntensity: 1.5 } });
    head.add(eyes);
    head.position.y = 1.55 * s;
    body.add(head);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.29 * s, 0.015, 6, 28), mat('#ffd59a', { emissive: '#ffd59a', emissiveIntensity: 1.2 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.1 * s;
    body.add(ring);
    const phase = Math.random() * 6;
    g.userData.tick = (dt, t) => {
      head.rotation.y = Math.sin(t * 0.4 + phase) * 0.35;
      eyes.scale.y = (Math.sin(t * 0.7 + phase) > 0.985) ? 0.15 : 1;
      body.position.y = Math.sin(t * 1.2 + phase) * 0.01;
    };
  } else {
    // worker: chunkier humanoid
    for (const sx of [-1, 1]) {
      body.add(capsule(0.08 * s, 0.55 * s, joint, { x: sx * 0.12 * s, y: 0.38 * s }));
      body.add(box(0.16 * s, 0.08 * s, 0.26 * s, '#2a2a2a', { x: sx * 0.12 * s, y: 0, z: 0.04, r: 0.03 }));
    }
    body.add(box(0.46 * s, 0.55 * s, 0.3 * s, shell, { y: 0.78 * s, r: 0.08 }));
    const arms = [];
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.3 * s, 1.22 * s, 0);
      const a = capsule(0.065 * s, 0.45 * s, joint, { y: -0.3 * s });
      pivot.add(a);
      body.add(pivot);
      arms.push(pivot);
    }
    const head = group(
      box(0.28 * s, 0.24 * s, 0.26 * s, shell, { r: 0.06 }),
      box(0.24 * s, 0.07 * s, 0.02, '#ff9a3d', { y: 0.1 * s, z: 0.135 * s, m: { emissive: '#ff9a3d', emissiveIntensity: 1.4 } }),
    );
    head.position.y = 1.36 * s;
    body.add(head);
    const phase = Math.random() * 6;
    const busy = o.busy ?? true;
    g.userData.tick = (dt, t) => {
      if (!busy) return;
      arms[0].rotation.x = -0.6 + Math.sin(t * 3 + phase) * 0.6;
      arms[1].rotation.x = -0.6 + Math.sin(t * 3 + phase + Math.PI) * 0.6;
      body.rotation.x = 0.15 + Math.sin(t * 3 + phase) * 0.05;
    };
  }
  return g;
}

export function snowman() {
  const g = new THREE.Group();
  g.add(sphere(0.32, '#fbfcfd', { y: 0.28 }));
  g.add(sphere(0.23, '#fbfcfd', { y: 0.72 }));
  g.add(sphere(0.16, '#fbfcfd', { y: 1.05 }));
  g.add(cone(0.035, 0.16, '#f08a2a', { y: 1.0, z: 0.2 }).rotateX(Math.PI / 2));
  for (const sx of [-1, 1]) g.add(sphere(0.022, '#222', { x: sx * 0.06, y: 1.1, z: 0.14 }));
  g.add(cyl(0.12, 0.13, 0.16, '#2a2a2e', { y: 1.16 }));
  g.add(cyl(0.18, 0.18, 0.02, '#2a2a2e', { y: 1.16 }));
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.04, 6, 16), mat('#c8372d'));
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.92;
  g.add(scarf);
  for (const sx of [-1, 1]) {
    const arm = cyl(0.015, 0.02, 0.4, '#6b4a34', { x: sx * 0.32, y: 0.72 });
    arm.rotation.z = sx * -1.0;
    g.add(arm);
  }
  return g;
}

export const CAST = {
  // Outfits / looks per era, reused by the scene data.
  maya: (era, extra = {}) => ({
    who: 'maya', h: 1.66, hairStyle: era >= 9 ? 'bun' : 'long', hairColor: era >= 9 ? '#7a6a62' : '#3b2418',
    top: ['#4f7f8f', '#6f9fb0', '#5b6b7a', '#d65f3e', '#7d8f5a', '#8a6f8f', '#3f5a73', '#4f7f8f', '#6d8fa0', '#c27a4a'][era] || '#4f7f8f',
    bottom: '#33384a',
    ...extra,
  }),
  june: (era, extra = {}) => {
    const ages = [7, 9, 10, 11, 11, 11, 11, 11, 11, 32];
    const age = ages[era] ?? 11;
    const h = age >= 30 ? 1.7 : 0.9 + age * 0.06;
    return {
      who: 'june', h, child: age < 16, hairStyle: age >= 30 ? 'pony' : age < 10 ? 'bunches' : 'pony', hairColor: '#2a1a12',
      top: age >= 30 ? '#e8c547' : '#f2c230', bottom: age >= 30 ? '#2f4a5f' : '#3d5a80',
      ...extra,
    };
  },
  arthur: (era, extra = {}) => ({
    who: 'arthur', h: era >= 9 ? 1.68 : 1.72, hairStyle: 'grey', hairColor: era >= 9 ? '#f2f0ec' : '#d8d4cc', glasses: true,
    top: era >= 9 ? '#6f8a5a' : '#8a7550', bottom: '#4a4740', breath: 0.8,
    ...extra,
  }),
  tomasz: (era, extra = {}) => ({
    who: 'tomasz', h: 1.84, hairStyle: 'short', hairColor: '#8a6a40',
    top: '#b03a3a', bottom: '#2f3a4a',
    ...extra,
  }),
};
