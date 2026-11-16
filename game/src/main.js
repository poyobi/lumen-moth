// Lumen Moth — boot and frame loop. Owns the canvas, the fixed-timestep
// stepper and the translation of raw input into the world's control struct
// plus the phase machine's one-shot actions (start, pause, draft picks).

import { VIEW } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import { createRenderer, upgradeHit } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.w;
canvas.height = VIEW.h;

const fit = () => {
  const scale = Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h);
  canvas.style.width = `${Math.floor(VIEW.w * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.h * scale)}px`;
};
window.addEventListener('resize', fit);
fit();

const params = new URLSearchParams(location.search);
const seedParam = Number(params.get('seed'));
const rng = makeRng(seedParam || (Date.now() % 2147483647));
const audio = createAudio();
const input = createInput(canvas);
const world = createWorld(rng, audio);
const renderer = createRenderer(ctx);
const shotCtl = applyShot(world, params);

const aimView = () => ({ x: input.mouse.x * VIEW.w, y: input.mouse.y * VIEW.h });

const handlePresses = () => {
  const s = world.state;
  for (const key of input.takePressed()) {
    if (key === 'm') { audio.toggleMute(); continue; }
    if (s.phase === 'title' && (key === 'enter' || key === 'mouse')) {
      audio.unlock(); audio.startPad(); world.start();
    } else if (s.phase === 'playing' && (key === 'p' || key === 'escape')) {
      s.phase = 'paused';
    } else if (s.phase === 'paused' && (key === 'p' || key === 'escape' || key === 'mouse')) {
      s.phase = 'playing';
    } else if (s.phase === 'upgrade') {
      if (key === '1' || key === '2' || key === '3') world.chooseUpgrade(Number(key) - 1);
      else if (key === '4') world.rekindle();
      else if (key === 'mouse') {
        const a = aimView();
        const hit = upgradeHit(a.x, a.y, s.lumen >= 20);
        if (hit >= 0 && hit < 3) world.chooseUpgrade(hit);
        else if (hit === 3) world.rekindle();
      }
    } else if ((s.phase === 'over' || s.phase === 'victory') && (key === 'r' || key === 'mouse' || key === 'enter')) {
      world.start();
    }
  }
};

const control = () => {
  if (shotCtl) return { moveX: 0, moveY: 0, aimX: shotCtl.aimX ?? 900, aimY: shotCtl.aimY ?? 350, firing: !!shotCtl.firing };
  const k = input.keys;
  const moveX = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
  const moveY = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
  const len = Math.hypot(moveX, moveY) || 1;
  const aim = aimView();
  return { moveX: moveX / len, moveY: moveY / len, aimX: aim.x, aimY: aim.y, firing: input.mouse.down || k.has(' ') };
};

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;

const frame = (now) => {
  acc += Math.min(0.12, (now - last) / 1000);
  last = now;
  handlePresses();
  const ctl = control();
  while (acc >= STEP) {
    if (world.state.phase !== 'paused') world.update(STEP, ctl);
    acc -= STEP;
  }
  const aim = shotCtl ? { x: shotCtl.aimX ?? 900, y: shotCtl.aimY ?? 350 } : aimView();
  renderer.draw(world.state, aim);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

// For the maker's own debugging and screenshot posing.
window.__lumen = { world, audio };
