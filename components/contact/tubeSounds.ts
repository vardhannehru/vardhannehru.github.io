// Sounds for the contact section's tube light and its wall switch, synthesised with Web Audio (no sound files).
//   - the switch: a short plastic clack (a bright click with a little body), then the rocker settling
//   - the tube: silent while it's steady. Only while it flickers (or struggles to start) it makes the sound a failing
//     tube makes: a gritty electrical buzz from the ballast that swells as the light drops, crackles on each drop,
//     and the starter's tick each time it strikes again.
// Follows the site's sound switch (chimes.ts: isMuted). Browsers only allow sound after the visitor has clicked,
// tapped or pressed a key, so nothing plays before that; the switch itself counts as that first click.

import { isMuted } from '../hero/chimes';

/** Overall loudness (0..1). */
const VOLUME = 0.55;
/** The flicker buzz's loudness at its worst. */
const BUZZ = 0.16;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let buzz: { gain: GainNode; stop: () => void } | null = null;
let buzzOffTimer = 0;
/** Whether the tube may make sound right now (switched on, on screen, page visible). */
let active = false;
let level = 1;

function engine(create: boolean) {
  if (ctx) return ctx;
  if (!create) return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = VOLUME;
  master.connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

const ready = () => !!ctx && ctx.state === 'running' && !!master && !isMuted();

/** A burst of filtered noise. */
function burst(at: number, type: BiquadFilterType, freq: number, q: number, peak: number, decay: number) {
  if (!ctx || !master || !noise) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  src.connect(f).connect(g).connect(master);
  src.start(at, Math.random() * 0.5);
  src.stop(at + decay + 0.02);
}

/** A short pitched thump (the switch's body). */
function thump(at: number, from: number, to: number, peak: number, decay: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(from, at);
  o.frequency.exponentialRampToValueAtTime(to, at + decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  o.connect(g).connect(master);
  o.start(at);
  o.stop(at + decay + 0.02);
}

/** The wall switch being flipped. Call from the click itself (it also unlocks sound). */
export function playSwitchClick(turningOn: boolean) {
  const ac = engine(true);
  if (!ac || isMuted()) return;
  if (ac.state === 'suspended') void ac.resume();
  const t = ac.currentTime + 0.005;
  // The snap, a touch brighter going on; then the rocker settling a moment later.
  burst(t, 'bandpass', turningOn ? 3400 : 2700, 1.3, 0.9, 0.035);
  thump(t, turningOn ? 170 : 150, 80, 0.45, 0.06);
  burst(t + 0.022, 'bandpass', 1900, 1.6, 0.28, 0.025);
}

/** A soft-clipping curve, for the ballast's rough, gritty buzz. */
function grit(amount: number) {
  const n = 1024;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return c;
}

/**
 * The buzz of an unstable tube: 100 Hz (twice the 50 Hz mains) and its overtones, driven hard so it's gritty, with
 * a crackle of noise riding on it, all wobbling a little. Runs only while the tube is flickering.
 */
function startBuzz() {
  if (buzz || !ctx || !master || !noise) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.0001;

  const saw = ctx.createOscillator();
  saw.type = 'sawtooth';
  saw.frequency.value = 100;
  const sq = ctx.createOscillator();
  sq.type = 'square';
  sq.frequency.value = 100.6; // a hair off, so it beats and wavers
  const sqGain = ctx.createGain();
  sqGain.gain.value = 0.5;
  const drive = ctx.createWaveShaper();
  drive.curve = grit(5);
  const tone = ctx.createBiquadFilter();
  tone.type = 'bandpass';
  tone.frequency.value = 1300;
  tone.Q.value = 0.6;
  const top = ctx.createBiquadFilter();
  top.type = 'lowpass';
  top.frequency.value = 4200;
  saw.connect(drive);
  sq.connect(sqGain).connect(drive);
  drive.connect(tone).connect(top).connect(out);

  // Crackle: noise, gated by a fast random wobble.
  const hiss = ctx.createBufferSource();
  hiss.buffer = noise;
  hiss.loop = true;
  const hissF = ctx.createBiquadFilter();
  hissF.type = 'bandpass';
  hissF.frequency.value = 2600;
  hissF.Q.value = 0.9;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.35;
  const wobble = ctx.createOscillator();
  wobble.type = 'square';
  wobble.frequency.value = 23;
  const wobbleDepth = ctx.createGain();
  wobbleDepth.gain.value = 0.3;
  wobble.connect(wobbleDepth).connect(hissGain.gain);
  hiss.connect(hissF).connect(hissGain).connect(out);

  out.connect(master);
  const nodes = [saw, sq, hiss, wobble];
  nodes.forEach((n) => n.start(t));
  buzz = {
    gain: out,
    stop: () => {
      const now = ctx!.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setTargetAtTime(0.0001, now, 0.015);
      nodes.forEach((n) => n.stop(now + 0.15));
    },
  };
}

function stopBuzz() {
  window.clearTimeout(buzzOffTimer);
  buzzOffTimer = 0;
  if (buzz) {
    buzz.stop();
    buzz = null;
  }
}

/** Whether the tube may make sound (it's switched on, on screen, and the page is visible). */
export function tubeSoundActive(on: boolean) {
  active = on;
  if (!on) stopBuzz();
}

/** The tube's brightness changed (0..1). Steady at 1 is silent; anything below it is the tube struggling. */
export function tubeSoundLevel(v: number) {
  const prev = level;
  level = v;
  if (!active || !ready()) {
    stopBuzz();
    return;
  }
  const ac = ctx!;
  const t = ac.currentTime + 0.002;

  // Switched fully off: no sound from the tube.
  if (v <= 0.005) {
    stopBuzz();
    return;
  }

  // Each jump: the starter's tick when it catches again, a crackle when it drops.
  if (v - prev > 0.3) burst(t, 'highpass', 4200, 0.7, 0.25, 0.016);
  else if (prev - v > 0.15) burst(t, 'bandpass', 1700, 0.9, 0.18, 0.02);

  if (v < 0.93) {
    // Struggling: buzz, louder the further the light has dropped (quieter in the near-dark warm-up, when only the
    // tube's ends glow), wobbling a little each time.
    window.clearTimeout(buzzOffTimer);
    buzzOffTimer = 0;
    startBuzz();
    const amount = v < 0.1 ? 0.3 : 0.45 + 0.55 * (1 - v);
    buzz!.gain.gain.setTargetAtTime(BUZZ * amount * (0.85 + Math.random() * 0.3), t, 0.006);
  } else if (buzz && !buzzOffTimer) {
    // Back to steady: the buzz dies away almost at once (a short tail, in case it flickers again straight away).
    buzz.gain.gain.setTargetAtTime(0.0001, t, 0.03);
    buzzOffTimer = window.setTimeout(stopBuzz, 220);
  }
}

/** Starts the audio engine on the visitor's first click, tap or key press, so the tube can be heard after that. */
export function primeTubeAudio() {
  const unlock = () => {
    const ac = engine(true);
    if (ac && ac.state === 'suspended') void ac.resume();
  };
  for (const type of ['pointerdown', 'keydown', 'touchend'] as const) {
    window.addEventListener(type, unlock, { once: true, capture: true, passive: true });
  }
  return () => {
    for (const type of ['pointerdown', 'keydown', 'touchend'] as const) window.removeEventListener(type, unlock, { capture: true });
  };
}
