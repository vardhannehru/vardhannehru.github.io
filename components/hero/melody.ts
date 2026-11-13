import type { TuneNote } from "./chimes";

// Für Elise (Beethoven, 1810, public domain), played by the hero letters one note at a time, like a music
// box: every letter you press or hover plays the next note. The left hand's rolling chords (A minor and E
// major) come in with the notes they fall on in the score. After a short pause the tune starts again from
// the top, so its famous opening comes back; at the end it loops.

/** Left-hand chords, low to high (MIDI). */
const A_MINOR = [45, 52, 57]; // A2 E3 A3
const E_MAJOR = [40, 52, 56]; // E2 E3 G#3

/** Melody notes (MIDI; 60 = middle C), with the chord that comes in on that note. */
const FUR_ELISE: [number, number[]?][] = [
  [76], [75], [76], [75], [76], [71], [74], [72],
  [69, A_MINOR], [60], [64], [69],
  [71, E_MAJOR], [64], [68], [71],
  [72, A_MINOR], [64], [76], [75], [76], [75], [76], [71], [74], [72],
  [69, A_MINOR], [60], [64], [69],
  [71, E_MAJOR], [64], [72], [71],
  [69, A_MINOR],
];

/** After this long without a note (ms), the tune starts again from the top. */
const RESTART_AFTER = 3500;

const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

let step = 0;
let lastAt = -Infinity;

/** The next note of the tune (melody pitch and any bass chord, in Hz). */
export function nextNote(): TuneNote {
  const now = performance.now();
  if (now - lastAt > RESTART_AFTER || step >= FUR_ELISE.length) step = 0;
  lastAt = now;
  const [note, chord] = FUR_ELISE[step++];
  return { freq: frequency(note), bass: chord?.map(frequency) };
}
