import { QUALITY, takeResume } from './engine/quality.js';
import { Stage } from './engine/stage.js';
import { NullStage, NullWorld } from './engine/nullstage.js';
import { World } from './world/world.js';
import { Game } from './game.js';
import { SCENES, sceneEntities } from './story/scenes.js';

const canvas = document.getElementById('gl');
document.body.classList.add('tier-' + QUALITY.tier);

// Build the 3D stage; if that fails outright, tell the story without it.
let stage;
let world;
if (!QUALITY.text) {
  try {
    stage = new Stage(canvas);
    world = new World(stage);
  } catch (e) {
    console.warn('WebGL unavailable, using text mode:', e && e.message);
    QUALITY.tier = 'text';
    QUALITY.reason = 'webgl-failed';
    document.body.classList.remove('tier-full', 'tier-lite');
    document.body.classList.add('tier-text');
  }
}
if (QUALITY.text) {
  stage = new NullStage(canvas);
  world = new NullWorld(stage);
}

const game = new Game(stage, world);
const resume = takeResume();
if (resume && resume.note) game.showNote(resume.note);

const params = new URLSearchParams(location.search);
const debugScene = params.get('scene');

if (debugScene != null) {
  // Dev shortcut: ?scene=N jumps straight into a visit (no audio until a click).
  const i = Math.max(0, Math.min(SCENES.length - 1, Number(debugScene) || 0));
  document.getElementById('title').classList.add('hidden');
  world.setState(sceneEntities(i), { animate: false });
  stage.setEnv(SCENES[i].env, 0);
  game.state = 'scene';
  game.furthest = Math.max(game.furthest, i);
  game._applyScene(i);
  if (params.has('clean')) {
    for (const id of ['hud', 'bottom', 'tools', 'markers']) document.getElementById(id).classList.add('hidden');
  }
} else {
  game.showTitleWorld();
}

stage.start();
window.__game = game;
window.__stage = stage;
window.__world = world;
window.__quality = QUALITY;
