// Lumen Moth — every pixel. Canvas 2D with additive glow for light sources.
// The renderer only reads world state; it never mutates it. It also owns the
// upgrade-card layout so main.js can hit-test clicks against what was drawn.

import { VIEW, COLORS, LANTERN, FINAL_NIGHT } from './config.js';

const TAU = Math.PI * 2;

// Stars are fixed so the sky does not shimmer between frames.
const STARS = Array.from({ length: 130 }, (_, i) => ({
  x: ((i * 977) % 1280), y: ((i * 613) % 560), r: 0.6 + ((i * 37) % 10) / 7, tw: (i % 9) / 9 * TAU,
}));

export const upgradeLayout = () => {
  const w = 252, h = 176, gap = 28;
  const total = w * 3 + gap * 2;
  const x0 = (VIEW.w - total) / 2, y = 300;
  return {
    cards: [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y, w, h })),
    rekindle: { x: VIEW.w / 2 - 210, y: y + h + 30, w: 420, h: 52 },
  };
};

export function upgradeHit(x, y, canRekindle) {
  const L = upgradeLayout();
  for (let i = 0; i < 3; i++) { const c = L.cards[i]; if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return i; }
  const r = L.rekindle;
  if (canRekindle && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return 3;
  return -1;
}

export function createRenderer(ctx) {
  const bar = (x, y, w, h, frac, color, label) => {
    ctx.fillStyle = 'rgba(10, 8, 30, 0.72)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
    ctx.fillStyle = COLORS.text;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 7);
  };

  const drawBackground = (t) => {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    g.addColorStop(0, COLORS.nightTop); g.addColorStop(1, COLORS.nightBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    for (const st of STARS) {
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 0.7 + st.tw);
      ctx.fillStyle = '#dfe8ff';
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Rolling garden silhouettes.
    ctx.fillStyle = '#0a0820';
    ctx.beginPath();
    ctx.moveTo(0, VIEW.h);
    for (let x = 0; x <= VIEW.w; x += 40) ctx.lineTo(x, VIEW.h - 66 - Math.sin(x * 0.006 + 2) * 22 - Math.sin(x * 0.017) * 8);
    ctx.lineTo(VIEW.w, VIEW.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = COLORS.ground;
    ctx.beginPath();
    ctx.moveTo(0, VIEW.h);
    for (let x = 0; x <= VIEW.w; x += 40) ctx.lineTo(x, VIEW.h - 26 - Math.sin(x * 0.009) * 10);
    ctx.lineTo(VIEW.w, VIEW.h); ctx.closePath(); ctx.fill();
  };

  const drawLantern = (s) => {
    const frac = s.lanternHp / s.stats.lanternMax;
    const pulse = 1 + Math.sin(s.time * 2.2) * 0.03;
    const R = (150 + 130 * frac) * pulse;
    const g = ctx.createRadialGradient(LANTERN.x, LANTERN.y, 8, LANTERN.x, LANTERN.y, R);
    g.addColorStop(0, 'rgba(255, 202, 122, 0.5)');
    g.addColorStop(0.4, 'rgba(255, 170, 90, 0.16)');
    g.addColorStop(1, 'rgba(255, 170, 90, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(LANTERN.x, LANTERN.y, R, 0, TAU); ctx.fill();
    // Post and frame.
    ctx.strokeStyle = '#2c2140'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(LANTERN.x, LANTERN.y + 16); ctx.lineTo(LANTERN.x, LANTERN.y + 58); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(LANTERN.x - 20, LANTERN.y + 58); ctx.lineTo(LANTERN.x + 20, LANTERN.y + 58); ctx.stroke();
    ctx.fillStyle = '#241a38';
    ctx.beginPath(); ctx.arc(LANTERN.x, LANTERN.y, LANTERN.radius + 5, 0, TAU); ctx.fill();
    const core = ctx.createRadialGradient(LANTERN.x, LANTERN.y, 2, LANTERN.x, LANTERN.y, LANTERN.radius);
    core.addColorStop(0, COLORS.lanternCore); core.addColorStop(1, frac > 0.25 ? COLORS.lantern : COLORS.danger);
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(LANTERN.x, LANTERN.y, LANTERN.radius * (0.8 + 0.2 * frac) * pulse, 0, TAU); ctx.fill();
  };

  const drawMoth = (s) => {
    const m = s.moth;
    if (m.hurtT > 0 && Math.floor(s.time * 18) % 2 === 0) return; // hurt blink
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.scale(m.face, 1);
    const flap = Math.sin(m.wing) * 0.55;
    ctx.fillStyle = COLORS.mothWing;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * (0.5 + flap * side * 0.4));
      ctx.beginPath(); ctx.ellipse(side * 13, -6, 15, 7.5, side * 0.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 17);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, COLORS.moth); g.addColorStop(1, 'rgba(127, 212, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0b1026';
    ctx.beginPath(); ctx.arc(5, -2, 2.1, 0, TAU); ctx.fill();
    ctx.restore();
  };

  const drawEnemy = (e, t) => {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.shadowColor = e.color; ctx.shadowBlur = 16;
    ctx.fillStyle = e.color;
    if (e.kind === 'shade' || e.kind === 'boss') {
      const spikes = e.kind === 'boss' ? 12 : 8;
      ctx.beginPath();
      for (let i = 0; i < spikes; i++) {
        const a = (i / spikes) * TAU + Math.sin(t * 2 + e.wob) * 0.14;
        const r = e.radius * (i % 2 ? 0.82 : 1.12);
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0b0620';
      ctx.beginPath(); ctx.arc(-e.radius * 0.32, -2, e.radius * 0.13, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(e.radius * 0.32, -2, e.radius * 0.13, 0, TAU); ctx.fill();
      if (e.kind === 'boss') {
        ctx.strokeStyle = '#ffd76b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-16, -e.radius - 2); ctx.lineTo(-8, -e.radius - 13); ctx.lineTo(0, -e.radius - 3); ctx.lineTo(8, -e.radius - 13); ctx.lineTo(16, -e.radius - 2); ctx.stroke();
      }
    } else if (e.kind === 'beetle') {
      ctx.beginPath(); ctx.ellipse(0, 0, e.radius, e.radius * 0.8, 0, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = e.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(6, -8); ctx.quadraticCurveTo(20, -20, 26, -24); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 8); ctx.quadraticCurveTo(20, 20, 26, 24); ctx.stroke();
      ctx.fillStyle = '#2b0a14';
      ctx.beginPath(); ctx.ellipse(6, 0, e.radius * 0.45, e.radius * 0.5, 0, 0, TAU); ctx.fill();
    } else { // wisp
      const wob = Math.sin(t * 9 + e.wob) * 3;
      ctx.beginPath();
      ctx.moveTo(0, -e.radius - 3);
      ctx.quadraticCurveTo(e.radius, 0, wob, e.radius + 5);
      ctx.quadraticCurveTo(-e.radius, 0, 0, -e.radius - 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#06302a';
      ctx.beginPath(); ctx.arc(0, -2, 2.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (e.hp < e.maxHp && e.kind !== 'boss') {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2, 3.4);
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2 * (e.hp / e.maxHp), 3.4);
    }
  };

  const drawPickup = (p, t) => {
    ctx.save();
    ctx.translate(p.x, p.y + Math.sin(p.t * 1.6) * 2.4);
    if (p.kind === 'firefly') {
      ctx.shadowColor = COLORS.firefly; ctx.shadowBlur = 13;
      ctx.fillStyle = COLORS.firefly;
      ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(220, 255, 224, 0.5)';
      ctx.beginPath(); ctx.ellipse(-4.6, -3.4, 3.6, 1.7, -0.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4.6, -3.4, 3.6, 1.7, 0.6, 0, TAU); ctx.fill();
    } else {
      ctx.shadowColor = COLORS.ember; ctx.shadowBlur = 15;
      ctx.fillStyle = COLORS.ember;
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.quadraticCurveTo(6, 0, 0, 8); ctx.quadraticCurveTo(-6, 0, 0, -8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffe1b0';
      ctx.beginPath(); ctx.arc(0, 1.6, 2.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  const drawHud = (s) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.text;
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillText(`Night ${s.night} of ${FINAL_NIGHT}`, 22, 34);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = COLORS.dim;
    const left = s.queue.length + s.enemies.length;
    ctx.fillText(left > 0 ? `${left} hollow ones remain` : 'the garden is quiet', 22, 56);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.text;
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillText(`Score ${s.score}`, VIEW.w - 22, 34);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = COLORS.firefly;
    ctx.fillText(`✦ ${s.lumen} lumen`, VIEW.w - 22, 56);
    bar(22, VIEW.h - 30, 230, 13, s.stats.hp / s.stats.maxHp, '#7fd4ff', 'Moth');
    bar(VIEW.w - 252, VIEW.h - 30, 230, 13, s.lanternHp / s.stats.lanternMax, COLORS.lantern, 'World Lantern');
    if (s.boss) {
      const w = 460;
      bar((VIEW.w - w) / 2, 30, w, 13, s.boss.hp / s.boss.maxHp, COLORS.boss, 'The Hollow King');
    }
    if (s.night === 1 && s.phase === 'playing') {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(244, 234, 210, 0.66)';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('WASD or arrows to fly · mouse to aim · hold click or Space to fire · P pauses · M mutes', VIEW.w / 2, VIEW.h - 52);
    }
  };

  const panel = (alpha = 0.62) => { ctx.fillStyle = `rgba(5, 4, 18, ${alpha})`; ctx.fillRect(0, 0, VIEW.w, VIEW.h); };
  const centerText = (text, y, font, color = COLORS.text) => {
    ctx.font = font; ctx.textAlign = 'center'; ctx.fillStyle = color;
    ctx.fillText(text, VIEW.w / 2, y);
  };

  const drawTitle = (s) => {
    centerText('L U M E N   M O T H', 208, '64px Georgia, serif', '#ffe9b8');
    centerText('The Hollow swarm comes for the World Lantern.', 262, '20px Georgia, serif', COLORS.text);
    centerText('You are its last guardian. Ten nights stand between the garden and the dark.', 292, '17px system-ui, sans-serif', COLORS.dim);
    const blink = Math.floor(s.time * 1.6) % 2 === 0;
    if (blink) centerText('Click or press Enter to take flight', 668, '600 19px system-ui, sans-serif', COLORS.firefly);
    centerText('WASD / arrows — fly      Mouse — aim      Hold click / Space — sparks      P — pause      M — sound', 706, '14px system-ui, sans-serif', COLORS.dim);
    centerText('Gather lumen from the fallen. Draft a blessing after each night. Do not let the light go out.', 732, '14px system-ui, sans-serif', COLORS.dim);
  };

  const drawUpgrade = (s) => {
    panel(0.66);
    centerText(`Night ${s.night} held`, 196, '40px Georgia, serif', '#ffe9b8');
    centerText('Choose a blessing for the nights ahead', 234, '17px system-ui, sans-serif', COLORS.dim);
    const L = upgradeLayout();
    s.offers.forEach((u, i) => {
      const c = L.cards[i];
      ctx.fillStyle = 'rgba(24, 18, 52, 0.95)';
      ctx.strokeStyle = 'rgba(255, 202, 122, 0.5)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 12); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe9b8'; ctx.font = '600 21px Georgia, serif';
      ctx.fillText(u.name, c.x + c.w / 2, c.y + 52);
      ctx.fillStyle = COLORS.text; ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(u.blurb, c.x + c.w / 2, c.y + 88);
      ctx.fillStyle = COLORS.dim; ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(`press ${i + 1}`, c.x + c.w / 2, c.y + c.h - 20);
    });
    const r = L.rekindle;
    const can = s.lumen >= 20;
    ctx.fillStyle = can ? 'rgba(52, 30, 16, 0.95)' : 'rgba(20, 16, 40, 0.8)';
    ctx.strokeStyle = can ? 'rgba(255, 157, 107, 0.7)' : 'rgba(120, 110, 170, 0.3)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fill(); ctx.stroke();
    centerText(`Rekindle the Lantern — 20 lumen for +40 health${can ? '  (press 4)' : `  (you hold ${s.lumen})`}`, r.y + 33, '15px system-ui, sans-serif', can ? '#ffc9a3' : COLORS.dim);
  };

  const drawEnd = (s) => {
    panel(0.6);
    if (s.phase === 'victory') {
      centerText('DAWN BREAKS', 250, '56px Georgia, serif', '#ffe9b8');
      centerText('The garden blooms again in the lantern light.', 302, '19px Georgia, serif', COLORS.text);
    } else {
      centerText('THE LIGHT GOES OUT', 250, '52px Georgia, serif', COLORS.danger);
      centerText(s.endReason, 302, '19px Georgia, serif', COLORS.text);
    }
    centerText(`Score ${s.score}`, 386, '600 30px system-ui, sans-serif');
    centerText(`${s.kills} hollow ones scattered · reached night ${s.night} of ${FINAL_NIGHT}`, 424, '16px system-ui, sans-serif', COLORS.dim);
    const blink = Math.floor(s.time * 1.6) % 2 === 0;
    if (blink) centerText('Press R or click to fly again', 500, '600 18px system-ui, sans-serif', COLORS.firefly);
  };

  const draw = (s, aim) => {
    ctx.save();
    if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
    drawBackground(s.time);
    for (const p of s.pickups) drawPickup(p, s.time);
    drawLantern(s);
    // Aim guide: a faint thread from moth to cursor while playing.
    if (s.phase === 'playing') {
      ctx.strokeStyle = 'rgba(191, 239, 255, 0.13)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 9]);
      ctx.beginPath(); ctx.moveTo(s.moth.x, s.moth.y); ctx.lineTo(aim.x, aim.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const sp of s.sparks) {
      ctx.strokeStyle = 'rgba(255, 233, 168, 0.75)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sp.x - sp.vx * 0.02, sp.y - sp.vy * 0.02); ctx.lineTo(sp.x, sp.y); ctx.stroke();
      ctx.fillStyle = '#fff6da';
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 3, 0, TAU); ctx.fill();
    }
    for (const mo of s.motes) {
      ctx.fillStyle = 'rgba(198, 91, 255, 0.9)';
      ctx.beginPath(); ctx.arc(mo.x, mo.y, 6.5, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const e of s.enemies) drawEnemy(e, s.time);
    drawMoth(s);
    ctx.globalCompositeOperation = 'lighter';
    for (const pt of s.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (const f of s.floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.font = '600 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    if (s.flash > 0) { ctx.fillStyle = `rgba(255, 240, 200, ${s.flash * 0.5})`; ctx.fillRect(0, 0, VIEW.w, VIEW.h); }
    ctx.restore();

    if (s.phase !== 'title') drawHud(s);
    if (s.phase === 'title') drawTitle(s);
    else if (s.phase === 'upgrade') drawUpgrade(s);
    else if (s.phase === 'paused') { panel(0.55); centerText('PAUSED', 380, '44px Georgia, serif', '#ffe9b8'); centerText('Press P to resume', 424, '16px system-ui, sans-serif', COLORS.dim); }
    else if (s.phase === 'over' || s.phase === 'victory') drawEnd(s);
  };

  return { draw };
}
