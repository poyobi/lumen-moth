// Keyboard and mouse state. The world reads held keys and the pointer each tick;
// one-shot presses (pause, mute, confirm) are queued as events so a fast tap is
// never lost between frames.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = [];
  const mouse = { x: 0, y: 0, down: false };

  const toGame = (e) => {
    const r = canvas.getBoundingClientRect();
    const sx = (e.clientX - r.left) / r.width;
    const sy = (e.clientY - r.top) / r.height;
    return { x: sx, y: sy }; // normalised; main.js maps to view coordinates
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!e.repeat) pressed.push(e.key.toLowerCase());
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });

  canvas.addEventListener('mousemove', (e) => { const p = toGame(e); mouse.x = p.x; mouse.y = p.y; });
  canvas.addEventListener('mousedown', (e) => { mouse.down = true; const p = toGame(e); mouse.x = p.x; mouse.y = p.y; pressed.push('mouse'); });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('touchstart', (e) => { const t = e.touches[0]; const p = toGame(t); mouse.x = p.x; mouse.y = p.y; mouse.down = true; pressed.push('mouse'); }, { passive: true });
  canvas.addEventListener('touchmove', (e) => { const t = e.touches[0]; const p = toGame(t); mouse.x = p.x; mouse.y = p.y; }, { passive: true });
  canvas.addEventListener('touchend', () => { mouse.down = false; });

  return {
    keys,
    mouse,
    // Drain the one-shot press queue, returning keys pressed since the last call.
    takePressed: () => pressed.splice(0, pressed.length),
    held: (...names) => names.some((n) => keys.has(n)),
  };
}
