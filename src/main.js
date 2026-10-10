import { Stage } from './engine/stage.js';
import { World } from './world/world.js';
import { Game } from './game.js';
import { SCENES, sceneEntities } from './story/scenes.js';

const canvas = document.getElementById('gl');
const stage = new Stage(canvas);
const world = new World(stage);
const game = new Game(stage, world);

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
