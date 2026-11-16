// Lumen Moth — tuning constants.
// The whole game is tuned from this one table so a single read tells you how it plays:
// ten nights, three ordinary enemy kinds plus the Hollow King, and an upgrade pool
// the player drafts from between nights.

export const VIEW = { w: 1280, h: 800 };

export const COLORS = {
  nightTop: '#070a1e',
  nightBottom: '#131038',
  ground: '#0d0b26',
  lantern: '#ffca7a',
  lanternCore: '#fff3d6',
  moth: '#bfefff',
  mothWing: 'rgba(160, 225, 255, 0.55)',
  spark: '#ffe9a8',
  firefly: '#a8ffb0',
  ember: '#ff9d6b',
  shade: '#8f7bff',
  beetle: '#ff6b81',
  wisp: '#4be3c3',
  boss: '#c65bff',
  text: '#f4ead2',
  dim: '#9a92c4',
  danger: '#ff5470',
};

export const MOTH = {
  radius: 14,
  baseSpeed: 265,
  baseHp: 100,
  baseDamage: 12,
  baseFireRate: 5.2, // sparks per second
  sparkSpeed: 640,
  magnet: 92,
};

export const LANTERN = { x: VIEW.w / 2, y: VIEW.h / 2, radius: 26, baseHp: 220 };

// Enemy archetypes. speed/hp/damage are per-night scaled in world.js.
export const ENEMIES = {
  shade: { radius: 15, speed: 62, hp: 22, damage: 9, score: 40, lumen: 1, color: COLORS.shade },
  beetle: { radius: 21, speed: 36, hp: 78, damage: 16, score: 90, lumen: 2, color: COLORS.beetle },
  wisp: { radius: 11, speed: 118, hp: 13, damage: 6, score: 60, lumen: 1, color: COLORS.wisp },
  boss: { radius: 46, speed: 30, hp: 1450, damage: 26, score: 2500, lumen: 24, color: COLORS.boss },
};

// Night compositions: [kind, count] groups, spawned in staggered streams.
export const NIGHTS = [
  [['shade', 7]],
  [['shade', 10], ['wisp', 3]],
  [['shade', 12], ['beetle', 2], ['wisp', 4]],
  [['shade', 14], ['beetle', 4], ['wisp', 6]],
  [['shade', 16], ['beetle', 5], ['wisp', 9]],
  [['shade', 19], ['beetle', 7], ['wisp', 11]],
  [['shade', 22], ['beetle', 8], ['wisp', 14]],
  [['shade', 25], ['beetle', 10], ['wisp', 17]],
  [['shade', 28], ['beetle', 12], ['wisp', 20]],
  [['shade', 16], ['beetle', 6], ['wisp', 12], ['boss', 1]],
];

export const FINAL_NIGHT = NIGHTS.length;

// The draft pool between nights. apply() mutates the moth/lantern stat block.
export const UPGRADES = [
  { id: 'damage', name: 'Brighter Sparks', blurb: '+30% spark damage', apply: (s) => { s.damage *= 1.3; } },
  { id: 'rate', name: 'Quick Wings', blurb: '+22% fire rate', apply: (s) => { s.fireRate *= 1.22; } },
  { id: 'speed', name: 'Tailwind', blurb: '+14% flight speed', apply: (s) => { s.speed *= 1.14; } },
  { id: 'multishot', name: 'Twin Glow', blurb: '+1 spark per shot', apply: (s) => { s.shots += 1; } },
  { id: 'pierce', name: 'Lancing Light', blurb: 'Sparks pierce +1 enemy', apply: (s) => { s.pierce += 1; } },
  { id: 'vitality', name: 'Mothheart', blurb: '+30 max health, heal 30', apply: (s) => { s.maxHp += 30; s.hp = Math.min(s.maxHp, s.hp + 30); } },
  { id: 'lantern', name: 'Lantern Ward', blurb: 'Repair the lantern 70 and +40 max', apply: (s) => { s.lanternMax += 40; s.lanternHp = Math.min(s.lanternMax, s.lanternHp + 70); } },
  { id: 'magnet', name: 'Calling Light', blurb: '+70% firefly pull range', apply: (s) => { s.magnet *= 1.7; } },
  { id: 'regen', name: 'Dawn Sap', blurb: 'Regenerate 0.8 health / s', apply: (s) => { s.regen += 0.8; } },
];
