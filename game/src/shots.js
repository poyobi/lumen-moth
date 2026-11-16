// Screenshot scenes. The kit takes the game's screenshots from URLs like
// ?shot=play&seed=1; each scene builds a real, live state of the game (never a
// mock-up) and lets the normal loop run, so what is captured is the game itself
// mid-flight. The scenes double as a smoke test: if a scene renders, the state
// machine, the spawner and the renderer all work.

import { LANTERN, ENEMIES } from './config.js';
import { makeRng } from './random.js';

const enemy = (kind, x, y, night) => {
  const base = ENEMIES[kind];
  const scale = 1 + 0.16 * (night - 1);
  return {
    kind, x, y, vx: 0, vy: 0,
    hp: base.hp * scale, maxHp: base.hp * scale,
    radius: base.radius, speed: base.speed, damage: base.damage,
    score: base.score, lumen: base.lumen, color: base.color,
    biteT: 0, wob: (x * 7 + y * 13) % 6.28, burstT: 3.4, summonT: 6,
  };
};

const NEUTRAL = { moveX: 0, moveY: 0, aimX: 900, aimY: 360, firing: false };

export function applyShot(world, params) {
  const shot = params.get('shot');
  if (!shot) return null;
  const seed = Number(params.get('seed') ?? 1) || 1;
  const s = world.state;
  const rng = makeRng(seed * 7919);

  if (shot === 'start') {
    // The title screen as it first appears, lantern lit and fireflies out.
    return { firing: false };
  }

  world.start();

  if (shot === 'play') {
    // Night 4, mid-defence: the moth is strafing a shade pack while a beetle
    // lumbers in and wisps dive at the moth itself.
    s.night = 4;
    s.queue = ['shade', 'shade', 'beetle', 'wisp', 'shade', 'wisp'];
    s.score = 1350; s.lumen = 17; s.kills = 23;
    s.stats.hp = 82; s.lanternHp = Math.round(s.stats.lanternMax * 0.78);
    s.stats.damage = 16; s.stats.shots = 2;
    s.moth.x = 400; s.moth.y = 430;
    s.enemies.push(
      enemy('shade', 880, 300, 4), enemy('shade', 940, 380, 4), enemy('shade', 850, 450, 4),
      enemy('shade', 990, 250, 4), enemy('beetle', 1060, 520, 4),
      enemy('wisp', 620, 180, 4), enemy('wisp', 300, 640, 4),
    );
    s.enemies[0].hp *= 0.5; s.enemies[4].hp *= 0.7;
    for (let i = 0; i < 5; i++) s.pickups.push({ kind: 'firefly', x: 520 + i * 36, y: 470 - i * 14, vx: 0, vy: 0, t: i });
    s.pickups.push({ kind: 'ember', x: 700, y: 560, vx: 0, vy: 0, t: 0 });
    world.burst(880, 380, ENEMIES.shade.color, 14, 170, 0.6, 3);
    // A few warm-up steps so sparks are mid-flight in the capture.
    for (let i = 0; i < 26; i++) world.update(1 / 60, { moveX: 0.4, moveY: -0.2, aimX: 900, aimY: 350, firing: true });
    return { firing: true, aimX: 900, aimY: 350 };
  }

  if (shot === 'upgrade') {
    // The blessing draft after night 3, with enough lumen banked to rekindle.
    s.night = 3; s.score = 2210; s.lumen = 26; s.kills = 31;
    s.queue = []; s.enemies = [];
    world.update(1 / 60, NEUTRAL); // empty field -> the draft opens
    return { firing: false };
  }

  if (shot === 'end') {
    // Victory at dawn: the final night cleared with the lantern still lit.
    s.night = 10; s.score = 12480; s.lumen = 41; s.kills = 187;
    s.stats.hp = 54; s.lanternHp = 96;
    s.queue = []; s.enemies = [];
    world.update(1 / 60, NEUTRAL); // empty final night -> dawn breaks
    for (let i = 0; i < 26; i++) {
      const a = rng.angle();
      s.pickups.push({ kind: 'firefly', x: LANTERN.x + Math.cos(a) * rng.range(60, 300), y: LANTERN.y + Math.sin(a) * rng.range(50, 200), vx: 0, vy: 0, t: rng.range(0, 6) });
    }
    return { firing: false };
  }

  return { firing: false };
}
