// Soft crystal chimes for the hero name, synthesised with Web Audio (no sound files), like a music box.
// Each note is a glassy bell: bright when struck, melting into a pure tone. Pressed letters ring clearly;
// hovered letters ring softly. Each sits at its letter's place across the stereo field. Some notes also
// bring in the tune's bass: a warm, rolling low chord. The bass is boosted and kept out of the reverb, so
// it's full and the melody stays clear. Which notes play comes from melody.ts.

/** Overall loudness (0..1). */
const VOLUME = 0.3;
/** How long a pressed note rings (s); hovered notes ring a little shorter. */
const RING = 3.2;
/** Loudness of a pressed note and of a hovered one. */
const PRESS_VELOCITY = 0.8;
const HOVER_VELOCITY = 0.42;
/** Bass loudness, relative to the melody. */
const BASS_LEVEL = 1.1;
/** Extra low end on everything (dB, below ~180 Hz). */
const BASS_BOOST_DB = 6;
/** How much reverb (0..1). Lower is clearer. */
const REVERB = 0.26;
/** Hovered notes closer together than this (s) are skipped, so a fast sweep doesn't turn into a blur. */
const HOVER_GAP = 0.11;
/** Phones and tablets (a touch screen as the main pointer): their audio has less headroom, so the engine is lighter
 *  there. Taps on the name made the chimes crackle and break up while the page was also animating. */
const PHONE = typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
/** At most this many notes ring at once. */
const MAX_VOICES = PHONE ? 8 : 14;
/** Reverb length (s): shorter on phones, where a long reverb is a big part of the audio's work. */
const REVERB_SECONDS = PHONE ? 1.8 : 3.2;

/** The reverb's impulse (stereo noise fading away), made ahead of time when the page is idle, so building the engine
 *  on the first tap doesn't stall the page (it took ~0.1 s on a laptop, several times that on a phone). */
let irCache: { rate: number; data: Float32Array[] } | null = null;
function impulse(rate: number) {
  if (irCache && irCache.rate === rate) return irCache.data;
  const len = Math.round(rate * REVERB_SECONDS);
  const data = [0, 1].map(() => {
    const d = new Float32Array(len);
    let y = 0;
    for (let i = 0; i < len; i++) {
      y = y * 0.55 + (Math.random() * 2 - 1) * 0.45; // a gentle low-pass, so the tail isn't hissy
      d[i] = y * (1 - i / len) ** 4;
    }
    return d;
  });
  irCache = { rate, data };
  return data;
}

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
/** The bass goes here: like `out` (and muted with it), but skips the reverb so it stays tight. */
let bassOut: GainNode | null = null;
let lastHover = -Infinity;
let voices = 0;
let muted = false;
const unlockListeners = new Set<() => void>();

const hasBeenActive = () =>
  (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true;

function engine() {
  if (ctx && out) return { ctx, out };
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  // Phones: a roomier audio buffer ("playback"), so a busy moment on the page doesn't make the sound crackle. A
  // few milliseconds more delay before a note isn't noticeable on a tap.
  try {
    ctx = new AC({ latencyHint: PHONE ? "playback" : "interactive" });
  } catch {
    ctx = new AC();
  }
  out = ctx.createGain();
  out.gain.value = muted ? 0 : VOLUME;
  bassOut = ctx.createGain();
  bassOut.gain.value = muted ? 0 : VOLUME;
  // Tell the sound button once sound is allowed (after the first click / tap / key press).
  ctx.addEventListener("statechange", () => {
    if (ctx?.state === "running") unlockListeners.forEach((cb) => cb());
  });

  // Long, soft, darkened reverb (stereo, so it feels spacious), with a short pre-delay.
  const reverb = ctx.createConvolver();
  const irData = impulse(ctx.sampleRate);
  const ir = ctx.createBuffer(2, irData[0].length, ctx.sampleRate);
  irData.forEach((d, c) => ir.getChannelData(c).set(d));
  reverb.buffer = ir;
  const pre = ctx.createDelay(0.1);
  pre.delayTime.value = 0.025;
  const wet = ctx.createGain();
  wet.gain.value = REVERB;
  // Only the upper part goes into the reverb, so the low end doesn't turn into a boomy wash.
  const reverbCut = ctx.createBiquadFilter();
  reverbCut.type = "highpass";
  reverbCut.frequency.value = 280;
  // Warm low-end lift on the whole mix.
  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = "lowshelf";
  lowShelf.frequency.value = 180;
  lowShelf.gain.value = BASS_BOOST_DB;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 12;
  comp.ratio.value = 2.5;

  out.connect(lowShelf);
  bassOut.connect(lowShelf);
  out.connect(reverbCut);
  reverbCut.connect(pre);
  pre.connect(reverb);
  reverb.connect(wet);
  wet.connect(lowShelf);
  lowShelf.connect(comp);
  comp.connect(ctx.destination);
  return { ctx, out };
}

function sine(ac: AudioContext, freq: number, detune = 0) {
  const o = ac.createOscillator();
  o.type = "sine";
  o.frequency.value = freq;
  o.detune.value = detune;
  return o;
}

/** One chime at `f` Hz, placed at `pan` (-1 left .. 1 right), starting `at` seconds from now. */
function chime(ac: AudioContext, bus: GainNode, f: number, pan: number, velocity: number, ring: number, at = 0) {
  const t = ac.currentTime + 0.005 + at;
  const end = t + ring;

  const amp = ac.createGain();
  if (ac.createStereoPanner) {
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    amp.connect(p);
    p.connect(bus);
  } else {
    amp.connect(bus);
  }
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(velocity * 0.5, t + 0.004);
  amp.gain.exponentialRampToValueAtTime(velocity * 0.18, t + 0.5);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);

  // Bell body: a sine frequency-modulated at an inharmonic ratio. The shimmer of overtones fades fast,
  // leaving a pure, glassy tone. Softer notes are less bright.
  const body = sine(ac, f);
  const mod = sine(ac, f * 3.5);
  const depth = ac.createGain();
  depth.gain.setValueAtTime(f * 2.4 * velocity, t);
  depth.gain.exponentialRampToValueAtTime(f * 0.04, t + 1.1);
  mod.connect(depth);
  depth.connect(body.frequency);
  body.connect(amp);

  // Octave sparkle, fading sooner.
  const sparkle = sine(ac, f * 2, 3);
  const sg = ac.createGain();
  sg.gain.setValueAtTime(0.22, t);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  sparkle.connect(sg);
  sg.connect(amp);

  // A tiny glassy "ting" right at the strike.
  const ting = sine(ac, f * 5.43);
  const tg = ac.createGain();
  tg.gain.setValueAtTime(0.08 * velocity, t);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  ting.connect(tg);
  tg.connect(amp);

  voices++;
  body.onended = () => (voices = Math.max(0, voices - 1));
  for (const o of [body, mod, sparkle, ting]) {
    o.start(t);
    o.stop(end + 0.05);
  }
}

/**
 * One warm bass note at `f` Hz: a round sine with a little of its 2nd and 3rd harmonics, so it's still
 * heard on laptop and phone speakers that can't play deep notes, softened by a low-pass.
 */
function bassNote(ac: AudioContext, bus: GainNode, f: number, velocity: number, at: number) {
  const t = ac.currentTime + 0.005 + at;
  const end = t + 2.8;
  const tone = ac.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 900;
  tone.Q.value = 0.5;
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(velocity, t + 0.012);
  amp.gain.exponentialRampToValueAtTime(velocity * 0.35, t + 0.45);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  tone.connect(amp);
  amp.connect(bus);
  for (const [ratio, level] of [
    [1, 1],
    [2, 0.38],
    [3, 0.12],
  ] as const) {
    const o = sine(ac, f * ratio);
    const g = ac.createGain();
    g.gain.value = level;
    o.connect(g);
    g.connect(tone);
    o.start(t);
    o.stop(end + 0.05);
  }
}

/** A bass chord rolled upward like a left hand: root first, then the rest a beat apart. */
function bassChord(ac: AudioContext, bus: GainNode, freqs: number[], velocity: number) {
  freqs.forEach((f, k) => bassNote(ac, bus, f, velocity * BASS_LEVEL * (k === 0 ? 0.6 : 0.42), k * 0.2));
}

/** A note of the tune: the melody pitch, and optionally a bass chord that comes in with it (Hz). */
export type TuneNote = { freq: number; bass?: number[] };

/**
 * Browsers only allow sound after the visitor has clicked, tapped or pressed a key on the page. This
 * starts the audio engine on that first interaction, so hovered notes can play from then on.
 */
export function primeAudio() {
  // Make the reverb ahead of time, while nothing else is happening (most phones and laptops run audio at 48 kHz).
  if (!irCache) {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const make = () => void impulse(48000);
    if (idle) idle(make, { timeout: 4000 });
    else window.setTimeout(make, 1500);
  }
  const unlock = () => {
    const e = engine();
    if (e && e.ctx.state === "suspended") void e.ctx.resume();
  };
  for (const type of ["pointerdown", "keydown", "touchend"] as const) {
    window.addEventListener(type, unlock, { once: true, capture: true, passive: true });
  }
}

/**
 * Rings a chime (and its bass, if it has one): clear for a press, soft for a hover. `note` is asked for
 * only if the note actually plays (a hover can be skipped), so a tune never loses a note. Returns whether
 * it played.
 */
export function playNote(note: () => TuneNote, pan = 0, soft = false) {
  if (muted) return false;
  // Before the first click/tap/key press the browser would block it (and warn), so skip quietly.
  if (soft && !ctx && !hasBeenActive()) return false;
  const e = engine();
  if (!e) return false;
  const { ctx: ac, out: bus } = e;
  if (ac.state === "suspended") {
    void ac.resume();
    if (soft) return false;
  }
  if (voices >= MAX_VOICES) return false;
  if (soft) {
    if (ac.currentTime - lastHover < HOVER_GAP) return false;
    lastHover = ac.currentTime;
  }
  const n = note();
  const velocity = soft ? HOVER_VELOCITY : PRESS_VELOCITY;
  chime(ac, bus, n.freq, pan, velocity, soft ? RING * 0.75 : RING);
  if (n.bass && bassOut) bassChord(ac, bassOut, n.bass, velocity);
  return true;
}

// ---- Sound switch ----

/** Whether the browser is letting the page play sound yet. */
export const audioAllowed = () => ctx?.state === "running";
export const isMuted = () => muted;

export function setMuted(m: boolean) {
  muted = m;
  if (out) out.gain.value = m ? 0 : VOLUME;
  if (bassOut) bassOut.gain.value = m ? 0 : VOLUME;
}

/** Calls `cb` when sound becomes allowed. Returns a function that stops listening. */
export function onAudioUnlocked(cb: () => void) {
  unlockListeners.add(cb);
  return () => {
    unlockListeners.delete(cb);
  };
}

/** Turns sound on from a click or tap. Resolves to whether it worked. */
export async function unlockAudio() {
  const e = engine();
  if (!e) return false;
  if (e.ctx.state === "suspended") await e.ctx.resume().catch(() => {});
  return e.ctx.state === "running";
}

// ---- Stickers landing ----

/** A bright major arpeggio (C E G C E G), climbing as the stickers land one after another. */
const PASTE_NOTES = [72, 76, 79, 84, 88, 91].map((m) => 440 * 2 ** ((m - 69) / 12));
/** A sticker landing this long (ms) after the last one carries on the arpeggio; later ones start it again. */
const PASTE_CHAIN = 2500;
let pasteStep = 0;
let lastPaste = -Infinity;

/** The soft slap of a sticker hitting the surface, `at` seconds from now. */
function slap(ac: AudioContext, bus: GainNode, pan: number, at: number) {
  const t = ac.currentTime + 0.005 + at;
  const n = Math.round(ac.sampleRate * 0.05);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400;
  const g = ac.createGain();
  g.gain.value = 0.35;
  src.connect(lp);
  lp.connect(g);
  if (ac.createStereoPanner) {
    const p = ac.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    p.connect(bus);
  } else {
    g.connect(bus);
  }
  src.start(t);
}

/**
 * A sticker landing: a soft slap and a chime, each one a step higher than the last, so a row of stickers
 * plays a little "ta-da". Silent (and returns false) until sound is allowed.
 */
export function playStickerLand(pan = 0) {
  if (muted || !hasBeenActive()) return false;
  const e = engine();
  if (!e || e.ctx.state !== "running") return false;
  const now = performance.now();
  if (now - lastPaste > PASTE_CHAIN) pasteStep = 0;
  lastPaste = now;
  const f = PASTE_NOTES[Math.min(pasteStep++, PASTE_NOTES.length - 1)];
  slap(e.ctx, e.out, pan, 0);
  chime(e.ctx, e.out, f, pan, 0.45, RING * 0.8, 0.01);
  return true;
}

/** Replays all the stickers landing (used when someone turns sound on, so they hear it straight away). */
export function playStickerArpeggio() {
  const e = engine();
  if (!e || muted) return;
  PASTE_NOTES.forEach((f, k) => {
    const at = k * 0.13;
    const pan = -0.6 + (k / (PASTE_NOTES.length - 1)) * 1.2;
    slap(e.ctx, e.out, pan, at);
    chime(e.ctx, e.out, f, pan, 0.45, RING * 0.8, at + 0.01);
  });
}
