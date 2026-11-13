// Sounds for the 3D TVs, synthesised with Web Audio (no sound files): the clunk of the power switch, the
// tube powering up (a low degauss hum) and down (a falling "pew" as the picture shrinks to a dot), the
// channel knob's chunky detent, the push buttons and metal keys, a burst of static, the volume knob's small
// ticks, and the soft rubber keys of the remote cursor. They're muted along with the rest of the site's sound (chimes.ts).
import { isMuted } from '../hero/chimes';

/** Overall loudness (0..1). */
const VOLUME = 0.5;

export type ClickKind = 'button' | 'key' | 'knob' | 'tick' | 'remote';

type Engine = { ac: AudioContext; bus: GainNode; noise: AudioBuffer };
let engineState: Engine | null = null;

function engine(): Engine | null {
  if (isMuted()) return null;
  if (!engineState) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ac = new AC();
    const bus = ac.createGain();
    bus.gain.value = VOLUME;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 3;
    bus.connect(comp);
    comp.connect(ac.destination);
    // One second of white noise, reused by every click and burst of static.
    const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    engineState = { ac, bus, noise };
  }
  // These only play from a click or tap, so the browser lets the audio start here.
  if (engineState.ac.state === 'suspended') void engineState.ac.resume();
  return engineState;
}

/** Filtered noise with a quick attack, an optional hold, and a fast fade: clicks, clacks and static. */
function hiss(e: Engine, at: number, dur: number, type: BiquadFilterType, freq: number, q: number, level: number, attack = 0.002, hold = 0) {
  const { ac, bus, noise } = e;
  const t = ac.currentTime + 0.005 + at;
  const src = ac.createBufferSource();
  src.buffer = noise;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + attack);
  if (hold > 0) g.gain.setValueAtTime(level, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(bus);
  src.start(t, Math.random() * Math.max(0, noise.duration - dur - 0.05));
  src.stop(t + dur + 0.02);
}

/** A tone gliding from f0 to f1 Hz while it fades: thumps, hums and the switch-off "pew". */
function sweep(e: Engine, at: number, type: OscillatorType, f0: number, f1: number, dur: number, level: number, attack = 0.003) {
  const { ac, bus } = e;
  const t = ac.currentTime + 0.005 + at;
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** The click of a control: a plastic button, a metal key, the channel knob, or the volume knob. */
export function tvClick(kind: ClickKind) {
  const e = engine();
  if (!e) return;
  switch (kind) {
    case 'button': // pressed, then let go
      hiss(e, 0, 0.03, 'bandpass', 3200, 1.4, 0.7);
      sweep(e, 0, 'sine', 220, 110, 0.05, 0.25);
      hiss(e, 0.06, 0.025, 'bandpass', 2400, 1.4, 0.35);
      break;
    case 'key': // a brighter metal clack
      hiss(e, 0, 0.035, 'bandpass', 4200, 2, 0.6);
      sweep(e, 0, 'triangle', 900, 500, 0.04, 0.12);
      hiss(e, 0.07, 0.03, 'bandpass', 3000, 2, 0.3);
      break;
    case 'knob': // the tuner's heavy "ka-chunk" detent
      hiss(e, 0, 0.03, 'bandpass', 1800, 1.8, 0.8);
      sweep(e, 0, 'sine', 140, 60, 0.09, 0.45);
      hiss(e, 0.035, 0.04, 'bandpass', 1300, 1.6, 0.6);
      break;
    case 'tick': // a few small detents as the volume turns
      for (let i = 0; i < 3; i++) hiss(e, i * 0.045, 0.014, 'bandpass', 5000, 3, 0.35 * (1 - i * 0.25));
      break;
    case 'remote': // a soft rubber key on the remote
      hiss(e, 0, 0.022, 'bandpass', 1500, 1.2, 0.35);
      sweep(e, 0, 'sine', 300, 150, 0.03, 0.12);
      break;
  }
}

/** A burst of static: a hiss with some crackle on top, lasting `seconds`. */
export function tvStatic(seconds: number, level = 0.2, at = 0) {
  const e = engine();
  if (!e) return;
  hiss(e, at, seconds, 'highpass', 700, 0.5, level, 0.01, seconds * 0.6);
  for (let i = 0; i < 6; i++) hiss(e, at + Math.random() * seconds * 0.8, 0.012, 'highpass', 2500, 0.7, 0.1 + Math.random() * 0.25);
}

const hasBeenActive = () =>
  (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true;
let lastRemoteOn = -Infinity;

/**
 * A TV turned on by the remote: no switch clunk, just the tube's hum and static. It plays once for a row of
 * TVs coming on together, and only once the visitor has clicked or tapped the page (browsers block sound before).
 */
export function tvRemoteOn() {
  if (!hasBeenActive()) return;
  const now = performance.now();
  if (now - lastRemoteOn < 1200) return;
  lastRemoteOn = now;
  const e = engine();
  if (!e) return;
  sweep(e, 0, 'sine', 62, 55, 0.6, 0.3, 0.03);
  sweep(e, 0, 'triangle', 120, 110, 0.4, 0.07, 0.03);
  tvStatic(0.4, 0.12, 0.03);
}

/** The power switch, then the tube waking up (hum and static) or shutting down (a falling "pew"). */
export function tvPower(on: boolean) {
  const e = engine();
  if (!e) return;
  // The switch: a heavy clunk.
  hiss(e, 0, 0.025, 'highpass', 1500, 0.7, 0.7);
  sweep(e, 0, 'sine', 110, 45, 0.14, 0.5);
  hiss(e, 0.05, 0.03, 'bandpass', 2200, 1.5, 0.35);
  if (on) {
    // A low degauss "thoom" with a little buzz, then static as the picture comes in.
    sweep(e, 0.06, 'sine', 62, 55, 0.7, 0.4, 0.03);
    sweep(e, 0.06, 'triangle', 120, 110, 0.5, 0.1, 0.03);
    tvStatic(0.42, 0.18, 0.08);
  } else {
    // The picture collapsing to a dot.
    sweep(e, 0.03, 'sine', 1800, 140, 0.32, 0.1, 0.01);
  }
}
