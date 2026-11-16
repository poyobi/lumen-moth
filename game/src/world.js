// Lumen Moth — simulation. One world object owns every entity and the phase
// machine: title -> playing -> upgrade (draft between nights) -> playing ... ->
// victory | over, with paused layered over playing. Rendering and input live
// elsewhere; this file is pure state and rules, stepped with a fixed dt.

import { VIEW, MOTH, LANTERN, ENEMIES, NIGHTS, FINAL_NIGHT, UPGRADES } from './config.js';

const TAU = Math.PI * 2;

export function createWorld(rng, audio) {
  const s = {
    phase: 'title',
    time: 0,
    night: 1,
    score: 0,
    lumen: 0,
    kills: 0,
    stats: null,
    moth: { x: LANTERN.x - 190, y: LANTERN.y + 40, vx: 0, vy: 0, face: 1, wing: 0, hurtT: 0 },
    lanternHp: LANTERN.baseHp,
    enemies: [],
    sparks: [],
    motes: [],
    pickups: [],
    particles: [],
    floaters: [],
    queue: [],
    spawnT: 0,
    fireT: 0,
    offers: [],
    boss: null,
    shake: 0,
    flash: 0,
    endReason: '',
    muted: false,
  };

  const resetStats = () => {
    s.stats = {
      damage: MOTH.baseDamage, fireRate: MOTH.baseFireRate, speed: MOTH.baseSpeed,
      shots: 1, pierce: 0, maxHp: MOTH.baseHp, hp: MOTH.baseHp,
      lanternMax: LANTERN.baseHp, magnet: MOTH.magnet, regen: 0,
    };
    s.lanternHp = LANTERN.baseHp;
  };
  resetStats();

  const burst = (x, y, color, n, speed, life = 0.55, size = 3) => {
    for (let i = 0; i < n; i++) {
      const a = rng.angle(); const v = rng.range(speed * 0.25, speed);
      s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rng.range(life * 0.5, life), maxLife: life, color, size: rng.range(1.2, size) });
    }
  };

  const floater = (x, y, text, color = '#ffe9a8') => s.floaters.push({ x, y, text, color, life: 0.9 });

  const buildQueue = (night) => {
    const q = [];
    for (const [kind, count] of NIGHTS[night - 1]) for (let i = 0; i < count; i++) q.push(kind);
    // Shuffle so kinds interleave instead of arriving in blocks.
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
    // The boss always enters last on the final night.
    const bi = q.indexOf('boss');
    if (bi >= 0) { q.splice(bi, 1); q.push('boss'); }
    s.queue = q;
    s.spawnT = 1.2;
  };

  const spawnPoint = () => {
    const edge = rng.int(0, 3);
    const m = 30;
    if (edge === 0) return { x: rng.range(m, VIEW.w - m), y: -m };
    if (edge === 1) return { x: rng.range(m, VIEW.w - m), y: VIEW.h + m };
    if (edge === 2) return { x: -m, y: rng.range(m, VIEW.h - m) };
    return { x: VIEW.w + m, y: rng.range(m, VIEW.h - m) };
  };

  const spawn = (kind) => {
    const base = ENEMIES[kind];
    const p = spawnPoint();
    const scale = 1 + 0.16 * (s.night - 1);
    const e = {
      kind, x: p.x, y: p.y, vx: 0, vy: 0,
      hp: base.hp * scale, maxHp: base.hp * scale,
      radius: base.radius, speed: base.speed * (1 + 0.02 * (s.night - 1)),
      damage: base.damage, score: base.score, lumen: base.lumen, color: base.color,
      biteT: 0, wob: rng.range(0, TAU), burstT: rng.range(3, 4.5), summonT: 6,
    };
    s.enemies.push(e);
    if (kind === 'boss') { s.boss = e; audio.boss(); floater(LANTERN.x, LANTERN.y - 90, 'THE HOLLOW KING', '#e3a6ff'); }
    burst(p.x, p.y, base.color, 10, 120, 0.4, 2.5);
  };

  const start = () => {
    resetStats();
    s.phase = 'playing'; s.time = 0; s.night = 1; s.score = 0; s.lumen = 0; s.kills = 0;
    s.enemies = []; s.sparks = []; s.motes = []; s.pickups = []; s.particles = []; s.floaters = [];
    s.moth.x = LANTERN.x - 190; s.moth.y = LANTERN.y + 40;
    s.boss = null;
    buildQueue(1);
    audio.wave();
  };

  const endGame = (won, reason) => {
    s.phase = won ? 'victory' : 'over';
    s.endReason = reason;
    if (won) { s.score += Math.round(s.stats.hp + s.lanternHp); audio.win(); }
    else audio.over();
  };

  const draftOffers = () => {
    const pool = [...UPGRADES];
    s.offers = [];
    for (let i = 0; i < 3 && pool.length; i++) s.offers.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
    s.phase = 'upgrade';
  };

  const chooseUpgrade = (i) => {
    if (s.phase !== 'upgrade' || !s.offers[i]) return;
    s.offers[i].apply(s.stats);
    audio.upgrade();
    nextNight();
  };

  const rekindle = () => {
    if (s.phase !== 'upgrade' || s.lumen < 20) return;
    s.lumen -= 20;
    s.lanternHp = Math.min(s.stats.lanternMax, s.lanternHp + 40);
    audio.ember();
    nextNight();
  };

  const nextNight = () => {
    s.night += 1;
    s.offers = [];
    s.phase = 'playing';
    buildQueue(s.night);
    audio.wave();
  };

  const damageEnemy = (e, dmg, kx, ky) => {
    e.hp -= dmg;
    e.x += kx; e.y += ky;
    burst(e.x, e.y, e.color, 3, 90, 0.3, 2);
    if (e.hp <= 0) kill(e);
  };

  const kill = (e) => {
    e.dead = true;
    s.kills += 1;
    s.score += e.score;
    floater(e.x, e.y - 10, `+${e.score}`);
    burst(e.x, e.y, e.color, e.kind === 'boss' ? 90 : 16, e.kind === 'boss' ? 320 : 190, 0.7, 3.4);
    audio.kill();
    for (let i = 0; i < e.lumen; i++) {
      const a = rng.angle();
      s.pickups.push({ kind: 'firefly', x: e.x + Math.cos(a) * 8, y: e.y + Math.sin(a) * 8, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, t: rng.range(0, TAU) });
    }
    if (rng.chance(0.09)) s.pickups.push({ kind: 'ember', x: e.x, y: e.y, vx: 0, vy: -14, t: 0 });
    if (e.kind === 'boss') { s.boss = null; s.flash = 0.7; s.shake = 14; }
  };

  const hurtMoth = (dmg) => {
    if (s.moth.hurtT > 0) return;
    s.stats.hp -= dmg;
    s.moth.hurtT = 0.55;
    s.shake = Math.max(s.shake, 6);
    audio.hurt();
    burst(s.moth.x, s.moth.y, '#bfefff', 12, 170, 0.45, 2.6);
    if (s.stats.hp <= 0) { s.stats.hp = 0; endGame(false, 'The moth\'s light went out.'); }
  };

  const hurtLantern = (dmg) => {
    s.lanternHp -= dmg;
    s.shake = Math.max(s.shake, 4);
    audio.lanternHurt();
    burst(LANTERN.x, LANTERN.y, '#ffca7a', 8, 150, 0.4, 2.6);
    if (s.lanternHp <= 0) { s.lanternHp = 0; endGame(false, 'The World Lantern went dark.'); }
  };

  const stepPlaying = (dt, ctl) => {
    const st = s.stats; const m = s.moth;
    // Moth movement with a little banking inertia.
    const ax = ctl.moveX * st.speed; const ay = ctl.moveY * st.speed;
    m.vx += (ax - m.vx) * Math.min(1, dt * 10);
    m.vy += (ay - m.vy) * Math.min(1, dt * 10);
    m.x = Math.max(18, Math.min(VIEW.w - 18, m.x + m.vx * dt));
    m.y = Math.max(18, Math.min(VIEW.h - 18, m.y + m.vy * dt));
    if (Math.abs(m.vx) > 12) m.face = m.vx > 0 ? 1 : -1;
    m.wing += dt * (14 + Math.hypot(m.vx, m.vy) * 0.05);
    if (m.hurtT > 0) m.hurtT -= dt;
    if (st.regen > 0) st.hp = Math.min(st.maxHp, st.hp + st.regen * dt);
    if (rng.chance(dt * 22)) s.particles.push({ x: m.x - m.face * 8, y: m.y + 6, vx: -m.vx * 0.14, vy: rng.range(8, 30), life: 0.5, maxLife: 0.5, color: '#7fd4ff', size: 2 });

    // Firing.
    s.fireT -= dt;
    if (ctl.firing && s.fireT <= 0) {
      s.fireT = 1 / st.fireRate;
      const baseA = Math.atan2(ctl.aimY - m.y, ctl.aimX - m.x);
      for (let i = 0; i < st.shots; i++) {
        const off = (i - (st.shots - 1) / 2) * 0.09;
        s.sparks.push({ x: m.x, y: m.y, vx: Math.cos(baseA + off) * MOTH.sparkSpeed, vy: Math.sin(baseA + off) * MOTH.sparkSpeed, life: 0.85, pierce: st.pierce, dmg: st.damage });
      }
      audio.shoot();
    }

    // Spawning.
    if (s.queue.length) {
      s.spawnT -= dt;
      if (s.spawnT <= 0) { s.spawnT = Math.max(0.24, 0.85 - s.night * 0.045); spawn(s.queue.shift()); }
    }

    // Enemies.
    for (const e of s.enemies) {
      e.wob += dt * 3;
      let tx = LANTERN.x, ty = LANTERN.y;
      if (e.kind === 'wisp') { tx = m.x; ty = m.y; }
      const dx = tx - e.x, dy = ty - e.y; const d = Math.hypot(dx, dy) || 1;
      let px = 0, py = 0;
      if (e.kind === 'wisp') { px = Math.cos(e.wob * 1.7) * 44; py = Math.sin(e.wob * 2.3) * 44; }
      const enraged = e.kind === 'boss' && e.hp < e.maxHp * 0.3;
      const sp = e.speed * (enraged ? 1.45 : 1);
      e.vx = (dx / d) * sp + px; e.vy = (dy / d) * sp + py;
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.biteT -= dt;
      const targetR = e.kind === 'wisp' ? MOTH.radius + e.radius : LANTERN.radius + e.radius;
      if (d < targetR + 2 && e.biteT <= 0) {
        e.biteT = 0.8;
        if (e.kind === 'wisp') hurtMoth(e.damage); else hurtLantern(e.damage);
        if (s.phase !== 'playing') return;
      }
      if (e.kind === 'boss') {
        e.burstT -= dt; e.summonT -= dt;
        if (e.burstT <= 0) {
          e.burstT = enraged ? 2.6 : 4;
          for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + e.wob; s.motes.push({ x: e.x, y: e.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 3.4, dmg: 10 }); }
          audio.hit();
        }
        if (e.summonT <= 0) { e.summonT = 7; for (let i = 0; i < 2; i++) { spawn('wisp'); const w = s.enemies[s.enemies.length - 1]; w.x = e.x + rng.range(-40, 40); w.y = e.y + rng.range(-40, 40); } }
      }
    }
    s.enemies = s.enemies.filter((e) => !e.dead);

    // Boss motes.
    for (const mo of s.motes) {
      mo.x += mo.vx * dt; mo.y += mo.vy * dt; mo.life -= dt;
      if (Math.hypot(mo.x - m.x, mo.y - m.y) < MOTH.radius + 7) { mo.life = 0; hurtMoth(mo.dmg); if (s.phase !== 'playing') return; }
      else if (Math.hypot(mo.x - LANTERN.x, mo.y - LANTERN.y) < LANTERN.radius + 7) { mo.life = 0; hurtLantern(mo.dmg); if (s.phase !== 'playing') return; }
    }
    s.motes = s.motes.filter((mo) => mo.life > 0);

    // Sparks.
    for (const sp of s.sparks) {
      sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.life -= dt;
      for (const e of s.enemies) {
        if (e.dead || sp.life <= 0) continue;
        if (Math.hypot(e.x - sp.x, e.y - sp.y) < e.radius + 5) {
          damageEnemy(e, sp.dmg, sp.vx * 0.012, sp.vy * 0.012);
          audio.hit();
          if (sp.pierce > 0) { sp.pierce -= 1; } else { sp.life = 0; }
          if (s.enemies.some((x) => x.dead)) s.enemies = s.enemies.filter((x) => !x.dead);
        }
      }
    }
    s.sparks = s.sparks.filter((sp) => sp.life > 0 && sp.x > -30 && sp.x < VIEW.w + 30 && sp.y > -30 && sp.y < VIEW.h + 30);

    // Pickups.
    for (const p of s.pickups) {
      p.t += dt * 4;
      const dx = m.x - p.x, dy = m.y - p.y; const d = Math.hypot(dx, dy) || 1;
      if (d < st.magnet) { const pull = (1 - d / st.magnet) * 560; p.vx += (dx / d) * pull * dt * 4; p.vy += (dy / d) * pull * dt * 4; }
      p.vx *= 0.92; p.vy *= 0.92;
      p.x += p.vx * dt + Math.cos(p.t) * 6 * dt; p.y += p.vy * dt + Math.sin(p.t * 1.3) * 6 * dt;
      if (d < MOTH.radius + 10) {
        p.got = true;
        if (p.kind === 'firefly') { s.lumen += 1; s.score += 5; audio.pickup(); }
        else { st.hp = Math.min(st.maxHp, st.hp + 12); floater(m.x, m.y - 18, '+12', '#a8ffb0'); audio.ember(); }
        burst(p.x, p.y, p.kind === 'firefly' ? '#a8ffb0' : '#ff9d6b', 5, 80, 0.35, 2);
      }
    }
    s.pickups = s.pickups.filter((p) => !p.got);

    // Night cleared?
    if (!s.queue.length && !s.enemies.length && s.phase === 'playing') {
      s.score += 100 + s.night * 25;
      if (s.night >= FINAL_NIGHT) endGame(true, 'Dawn breaks over the garden.');
      else draftOffers();
    }
  };

  const stepAmbient = (dt) => {
    // Title-screen drift: fireflies wander, the moth bobs beside the lantern.
    s.moth.wing += dt * 9;
    s.moth.x = LANTERN.x - 190 + Math.cos(s.time * 0.4) * 16;
    s.moth.y = LANTERN.y + 46 + Math.sin(s.time * 0.9) * 12;
    if (s.pickups.length < 14 && rng.chance(dt * 2)) {
      s.pickups.push({ kind: 'firefly', x: rng.range(60, VIEW.w - 60), y: rng.range(60, VIEW.h - 60), vx: rng.range(-16, 16), vy: rng.range(-10, 10), t: rng.range(0, TAU) });
    }
    for (const p of s.pickups) { p.t += dt * 3; p.x += p.vx * dt + Math.cos(p.t) * 9 * dt; p.y += p.vy * dt + Math.sin(p.t * 1.4) * 9 * dt; }
  };

  const update = (dt, ctl) => {
    s.time += dt;
    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 26);
    if (s.flash > 0) s.flash -= dt;
    for (const pt of s.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.96; pt.vy *= 0.96; pt.life -= dt; }
    s.particles = s.particles.filter((pt) => pt.life > 0);
    for (const f of s.floaters) { f.y -= dt * 34; f.life -= dt; }
    s.floaters = s.floaters.filter((f) => f.life > 0);
    // Lantern embers rise in every phase.
    if (rng.chance(dt * 9)) s.particles.push({ x: LANTERN.x + rng.range(-16, 16), y: LANTERN.y + 8, vx: rng.range(-8, 8), vy: rng.range(-46, -22), life: rng.range(0.7, 1.4), maxLife: 1.4, color: '#ffca7a', size: rng.range(1.4, 2.6) });

    if (s.phase === 'playing') stepPlaying(dt, ctl);
    else if (s.phase === 'title') stepAmbient(dt);
  };

  return { state: s, start, update, chooseUpgrade, rekindle, burst, floater };
}
