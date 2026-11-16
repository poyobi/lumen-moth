// All sound is synthesised with WebAudio — no audio files ship with the game.
// A tiny voice helper plays shaped oscillator blips; a slow two-oscillator pad
// hums under play and swells on the title screen. M toggles mute.

export function createAudio() {
  let ctx = null;
  let master = null;
  let pad = null;
  let muted = false;

  const ensure = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch { return false; }
    return true;
  };

  const blip = (freq, dur, type = 'sine', vol = 0.2, slide = 0, delay = 0) => {
    if (!ensure()) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  };

  const noise = (dur, vol = 0.15, delay = 0) => {
    if (!ensure()) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain(); gain.gain.value = vol;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900;
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(t0);
  };

  const startPad = () => {
    if (!ensure() || pad) return;
    const gain = ctx.createGain(); gain.gain.value = 0.045; gain.connect(master);
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 196;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 294;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain); lfoGain.connect(gain.gain);
    o1.connect(gain); o2.connect(gain);
    o1.start(); o2.start(); lfo.start();
    pad = { gain, o1, o2, lfo };
  };

  return {
    unlock: ensure,
    shoot: () => blip(880 + Math.random() * 160, 0.07, 'triangle', 0.05, -320),
    hit: () => blip(220, 0.05, 'square', 0.04, -60),
    kill: () => { blip(520, 0.16, 'sine', 0.12, -380); noise(0.12, 0.06); },
    pickup: () => blip(1180, 0.09, 'sine', 0.07, 420),
    ember: () => { blip(660, 0.12, 'sine', 0.1, 240); blip(990, 0.14, 'sine', 0.08, 160, 0.05); },
    hurt: () => { blip(140, 0.22, 'sawtooth', 0.14, -60); noise(0.18, 0.1); },
    lanternHurt: () => blip(96, 0.3, 'sawtooth', 0.16, -30),
    wave: () => { blip(392, 0.16, 'triangle', 0.12); blip(523, 0.16, 'triangle', 0.12, 0, 0.1); blip(659, 0.24, 'triangle', 0.12, 0, 0.2); },
    upgrade: () => { blip(523, 0.12, 'sine', 0.12); blip(784, 0.12, 'sine', 0.12, 0, 0.08); blip(1046, 0.2, 'sine', 0.12, 0, 0.16); },
    boss: () => { blip(73, 0.7, 'sawtooth', 0.2, 24); blip(110, 0.7, 'square', 0.08, -20, 0.05); },
    over: () => { blip(330, 0.4, 'triangle', 0.14, -120); blip(262, 0.5, 'triangle', 0.14, -90, 0.25); blip(196, 0.9, 'triangle', 0.14, -60, 0.5); },
    win: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => blip(f, 0.3, 'triangle', 0.12, 0, i * 0.11)); },
    startPad,
    toggleMute: () => { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    isMuted: () => muted,
  };
}
