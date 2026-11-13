import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, motionValue, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { paintHeroScene } from "./heroScene";
import KeychainLayer, { RING_DIR } from "./KeychainLayer";
import HeroStickers from "./HeroStickers";
import GroundCaption from "./GroundCaption";
import ButterflyLayer from "./ButterflyLayer";
import { playNote, primeAudio } from "./chimes";
import { nextNote } from "./melody";
import { NameStageContext } from "./Sticker";
import { useSiteReady } from "../ui/siteReady";
import {
  NameStage,
  NAME_PERSPECTIVE,
  NAME_PERSPECTIVE_ORIGIN_Y,
  NAME_SLAB_DEPTH,
  NAME_TILT_DEG,
  PERCH_SQUASH,
  DIP_ACROSS,
  DIP_DEPTH,
  PRESS_DIP,
  PRESS_SQUASH,
  PUSH_SQUASH,
  RECEDE_SCREENS,
  screenHeight,
  type InkBox,
  type LetterBox,
  type LetterMotion,
  type PerchSpot,
  liveStages,
} from "./nameStage";

// Show a picture inside the letters (off by default: a solid lit face reads more clearly as 3D).
// When on, drop any image at public/hero/fill.jpg to use it instead of the painted scene.
const SCENE_IN_LETTERS = false;
// The keychain hooked through the last letter (off). Set to true to bring it back.
const SHOW_KEYCHAIN = false;
// Small butterflies fluttering around the name, landing on letters and stickers. Set to false to hide them.
const SHOW_BUTTERFLIES = true;
// "Feed ↓ · 2026 · Portfolio" printed on the ground in front of the name (off). Set to true to bring it back.
const SHOW_GROUND_CAPTION = false;
// The letters play Für Elise as crystal chimes with its bass, one note per letter, like a music box: a
// press rings clearly, a hover softly. Set either to false for silence.
const CHIME_LETTERS = true;
const CHIME_HOVER = true;
// Holographic foil on the letters' top faces (the texture was made with Higgsfield), lit by a soft light that
// follows the cursor. Off: the plain lavender faces suit the rest of the site better.
const FOIL_LETTERS = false;
const FOIL_IMAGE = "/hero/foil.webp";
// A faint white light on the plain lavender faces that follows the cursor, and drifts along the name on its own
// while the cursor is still. Set to false for the faces without it.
const MOVING_LIGHT = true;
// Pressing a letter sends rings rippling out across the floor, and a small wave through its neighbours.
const PRESS_RIPPLES = true;
const PRESS_WAVE = true;

// A letter's place along the name, not counting spaces.
const keyOf = (text: string, i: number) => text.slice(0, i).replace(/ /g, "").length;
// Where a letter's sound sits between the left and right speakers, following its place in the name.
const panOf = (text: string, i: number) => {
  const n = text.replace(/ /g, "").length;
  return n > 1 ? (keyOf(text, i) / (n - 1)) * 1.2 - 0.6 : 0;
};
const HERO_FILL_IMAGE = "/hero/fill.jpg";
// The fill is larger than the word so it has room to pan slowly.
const FILL_SCALE_X = 1.25;
const FILL_SCALE_Y = 1.3;

// The name lies flat on a floor, receding in perspective, as thick 3D slabs. Each letter is a stack
// of thin copies lifted off the floor (real CSS 3D), so the thickness shows along the front edge.
// Tilt, thickness and camera live in nameStage.ts so the stickers and keychain stay lined up.
const SLAB_BOTTOM = [26, 17, 66];
const SLAB_TOP = [112, 92, 190];
// Light comes from the upper left: the top face is brightest there, with a soft sheen across it.
// The colours come from CSS variables, so the pastel theme (index.html) can repaint the name without re-rendering;
// the values written here are the dark theme's.
const TOP_FACE =
  "var(--hn-face, radial-gradient(120% 90% at 18% 0%, rgba(255,255,255,0.35), transparent 55%), linear-gradient(165deg, #e6dcff 0%, #c6b5fb 42%, #a891f0 78%, #9479e6 100%))";
const css = (c: number[]) => `rgb(${c.join(",")})`;
const SLAB_TOP_VAR = `var(--hn-slab-top, ${css(SLAB_TOP)})`;
const SLAB_BOTTOM_VAR = `var(--hn-slab-bottom, ${css(SLAB_BOTTOM)})`;
const SLAB_LIP_VAR = `var(--hn-slab-lip, ${css([196, 182, 250])})`;
/** `b` mixed into `a` by `f` (0 = all a, 1 = all b). */
const mixVar = (a: string, b: string, f: number) => `color-mix(in srgb, ${b} ${(Math.min(1, Math.max(0, f)) * 100).toFixed(1)}%, ${a})`;
/** Side colour at height f (0 = floor, 1 = top): dark near the floor (ambient occlusion), a bright bevel lip just under the top. */
function slabShade(f: number) {
  if (f > 0.9) return mixVar(SLAB_TOP_VAR, SLAB_LIP_VAR, (f - 0.9) / 0.1);
  return mixVar(SLAB_BOTTOM_VAR, SLAB_TOP_VAR, Math.pow(f / 0.9, 1.6));
}
// How the slab is built: copies of the letter stacked up from the floor, this far apart (px). Each copy carries
// text-shadows that fill the gap down to the copy below, so the sides still look solid. Every copy is a separate 3D
// layer the browser has to sort and draw on every frame, so fewer copies is what keeps the page at full frame rate:
// at 1.2px apart (about 20 copies a letter, ~300 layers) the hero ran at about 70 fps on a 144 Hz screen even when
// still; at 4px (about 6 a letter) it runs at the full 144. Set SLAB_FILL to false for the old build (1.2px, no fill).
const SLAB_FILL = true;
const SLAB_STEP = SLAB_FILL ? 4 : 1.2;
const SLAB_MIN_LAYERS = SLAB_FILL ? 4 : 12;
/** Text-shadows per copy filling the gap below it (about 1 px apart on screen). */
const FILL_SHADOWS = 6;
/** The upper copies' fill reaches a bit past the copy below (overlapping it harmlessly), so no gaps open up as the
 *  name slides back along the floor while you scroll, which makes the gaps look taller. */
const FILL_REACH = 1.5;

/**
 * Text-shadows that make a slab copy at height `h` also cover the heights down to `h - reach`: each shadow is
 * shifted by exactly where the camera would see the letter at that lower height (the perspective maths of
 * nameStage.ts), worked out for the letter's centre. Offsets scale with the slab's rise and squash, like the copies.
 */
function slabFill(cx: number, W: number, H: number, h: number, reach: number, slab: number) {
  const t = NAME_TILT_DEG * (Math.PI / 180);
  const d = NAME_PERSPECTIVE * H;
  const oy = NAME_PERSPECTIVE_ORIGIN_Y * H;
  // The camera in the plane's own coordinates: its height above the floor, and the floor point under it.
  const camZ = d * Math.cos(t) - (oy - H) * Math.sin(t);
  const camY = H + d * Math.sin(t) + (oy - H) * Math.cos(t);
  const px = cx - W / 2;
  const py = H / 2 - camY;
  const shadows: string[] = [];
  for (let j = 1; j <= FILL_SHADOWS; j++) {
    const g = (j / FILL_SHADOWS) * reach;
    const k = g / (camZ - h + g);
    const color = slabShade(Math.max(0, h - g) / slab);
    shadows.push(`calc(${SLAB_RISE} * ${(-px * k).toFixed(2)}px) calc(${SLAB_RISE} * ${(-py * k).toFixed(2)}px) 0 ${color}`);
  }
  return shadows.join(", ");
}
// The name spans about 70% of the screen width, on one line.
const NAME_CLASSES = "flex select-none leading-[0.85] text-[15vw] md:text-[12.5vw] tracking-tight";

// How much a pressed slab flattens, and how far it tips toward the pressure point (see nameStage.ts).
const SLAB_SQUASH = `(1 - var(--press) * ${PRESS_SQUASH} - var(--push) * ${PUSH_SQUASH} - var(--perch) * ${PERCH_SQUASH})`;
/** How much of its full height the slab has: its rise out of the floor times its squash. */
const SLAB_RISE = `var(--rise) * ${SLAB_SQUASH}`;
// Tips a layer toward the pressure point (the corner under the cursor goes down). `f` is how high the
// layer is in the slab (0 = on the floor, 1 = the top face): lower layers tip less, so the bottom stays flat
// on the floor and the slab squashes like a cushion instead of sinking a corner through the ground.
// Same maths as slabTip() in nameStage.ts, which the stickers and butterflies use.
function slabTilt(f: number, slab: number, halfW: number, halfH: number) {
  const top = `var(--rise) * ${SLAB_SQUASH} * ${slab.toFixed(2)}`;
  const pressed = "min(1, var(--press) + var(--push))";
  const a = `asin(clamp(-0.95, var(--px) * ${(PRESS_DIP * DIP_ACROSS).toFixed(4)} * ${pressed} * ${top} / ${Math.max(1, halfW).toFixed(2)}, 0.95))`;
  const b = `asin(clamp(-0.95, var(--py) * ${(-PRESS_DIP * DIP_DEPTH).toFixed(4)} * ${pressed} * ${top} / ${Math.max(1, halfH).toFixed(2)}, 0.95))`;
  return `rotateX(calc(${f.toFixed(3)} * ${b})) rotateY(calc(${f.toFixed(3)} * ${a}))`;
}

const PRESS_SPRING = { type: "spring", stiffness: 420, damping: 18 } as const;
const PUSH_SPRING = { type: "spring", stiffness: 520, damping: 16 } as const;
const TILT_EASE = { duration: 0.09, ease: "easeOut" } as const;
// How far the name slides away along its floor over the whole hero scroll, in letter heights.
const RECEDE_DISTANCE = 6;
/** The browser can drive animations from the scroll position (see the slide-back in HeroName). */
const SCROLL_TIMELINE = typeof window !== "undefined" && "ScrollTimeline" in window;

type HoleSpot = { i: number; x: number; y: number; r: number; wall: number; edge: number };

// The glyph's baseline in its line box: the font's content box is centred in the line box, like CSS.
function glyphBaseline(g: CanvasRenderingContext2D, ch: string, fontPx: number, boxH: number) {
  const m = g.measureText(ch);
  const ascent = m.fontBoundingBoxAscent ?? fontPx * 0.9;
  const descent = m.fontBoundingBoxDescent ?? fontPx * 0.25;
  return (boxH - (ascent + descent)) / 2 + ascent;
}

// Draws one letter as it sits in its box and returns a test for "is this point inside the glyph".
function glyphSolid(ch: string, fontPx: number, boxW: number, boxH: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(boxW);
  canvas.height = Math.ceil(boxH);
  const g = canvas.getContext("2d");
  if (!g || canvas.width === 0 || canvas.height === 0) return null;
  g.font = `${fontPx}px Anton`;
  g.textBaseline = "alphabetic";
  g.fillText(ch, 0, glyphBaseline(g, ch, fontPx, boxH));
  const { data, width, height } = g.getImageData(0, 0, canvas.width, canvas.height);
  return (x: number, y: number) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    return xi >= 0 && yi >= 0 && xi < width && yi < height && data[(yi * width + xi) * 4 + 3] > 200;
  };
}

// Solid spots on each letter's top face, well inside the glyph, where a butterfly can land.
function findPerchSpots(text: string, fontPx: number, boxes: LetterBox[], boxH: number): PerchSpot[] {
  const margin = Math.max(3, fontPx * 0.045);
  const step = Math.max(4, fontPx * 0.05);
  const spots: PerchSpot[] = [];
  text.split("").forEach((ch, i) => {
    const box = boxes[i];
    if (!box || ch.trim() === "") return;
    const solid = glyphSolid(ch, fontPx, box.w, boxH);
    if (!solid) return;
    const found: PerchSpot[] = [];
    for (let y = margin; y < boxH - margin; y += step) {
      for (let x = margin; x < box.w - margin; x += step) {
        let fits = solid(x, y);
        for (let k = 0; k < 8 && fits; k++) {
          const a = (k / 8) * Math.PI * 2;
          fits = solid(x + Math.cos(a) * margin, y + Math.sin(a) * margin);
        }
        if (fits) found.push({ i, x: box.x + x, y });
      }
    }
    // A shuffled handful per letter.
    for (let k = found.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [found[k], found[j]] = [found[j], found[k]];
    }
    spots.push(...found.slice(0, 8));
  });
  return spots;
}

// Where to drill the keychain hole: a solid spot near the corner the ring leaves toward, with a wall
// all round it. Also returns how far the letter continues past the hole in that direction.
function findHoleSpot(ch: string, fontPx: number, boxW: number, boxH: number, r: number, dir: number) {
  const solid = glyphSolid(ch, fontPx, boxW, boxH);
  if (!solid) return null;
  const wall = r + Math.max(2, r * 0.6);
  const dx = Math.cos(dir);
  const dy = Math.sin(dir);
  let best: { x: number; y: number } | null = null;
  let bestScore = -Infinity;
  for (let y = boxH * 0.3; y < boxH - wall; y += 1) {
    for (let x = boxW * 0.3; x < boxW - wall; x += 1) {
      if (!solid(x, y)) continue;
      let fits = true;
      for (let k = 0; k < 16 && fits; k++) {
        const a = (k / 16) * Math.PI * 2;
        fits = solid(x + Math.cos(a) * wall, y + Math.sin(a) * wall);
      }
      const score = x * dx + y * dy;
      if (fits && score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  if (!best) return null;
  let edge = wall;
  while (edge < boxW + boxH && solid(best.x + dx * edge, best.y + dy * edge)) edge += 0.5;
  return { ...best, wall, edge };
}

// Each letter's inked area on the floor, so the keychain rests on the letters, not their boxes.
function measureInk(text: string, fontPx: number, boxes: LetterBox[], boxH: number): InkBox[] {
  const g = document.createElement("canvas").getContext("2d");
  if (!g) return [];
  g.font = `${fontPx}px Anton`;
  return text.split("").map((ch, i) => {
    const box = boxes[i];
    const m = g.measureText(ch);
    const x0 = (box?.x ?? 0) - m.actualBoundingBoxLeft;
    const x1 = (box?.x ?? 0) + m.actualBoundingBoxRight;
    const base = glyphBaseline(g, ch, fontPx, boxH);
    // Blank (a space): a box nothing can be inside.
    if (ch.trim() === "" || x1 - x0 < 1) return { x0: 1, x1: 0, y0: 1, y1: 0 };
    return { x0, x1, y0: base - m.actualBoundingBoxAscent, y1: base + m.actualBoundingBoxDescent };
  });
}

const mix = (a: number[], b: number[], f: number) => `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`;

/**
 * A letter's top face in holographic foil, lit from the light's spot (--sx, --sy, in the plane's coordinates, set on each face). Both layers are
 * sized to the whole name and shifted by the letter's position, so the light and the foil run on across the
 * letters as one surface; the foil also slides a little with the light (--fx), so its colours shift.
 */
function foilFace(letterX: number, { W, H }: Size): React.CSSProperties {
  const x = -letterX;
  return {
    backgroundImage: `radial-gradient(circle at var(--sx, 50%) var(--sy, 30%), rgba(255,255,255,0.78), rgba(255,255,255,0.16) ${(H * 0.22).toFixed(0)}px, rgba(255,255,255,0) ${(H * 0.55).toFixed(0)}px), url(${FOIL_IMAGE})`,
    backgroundSize: `${W}px ${H}px, ${(W * 1.2).toFixed(0)}px ${(H * 1.8).toFixed(0)}px`,
    backgroundPosition: `${x}px 0px, calc(${(x - W * 0.1).toFixed(0)}px + var(--fx, 0px)) ${(-H * 0.4).toFixed(0)}px`,
    backgroundRepeat: "no-repeat",
  };
}

/** A letter's plain lavender top face with the faint moving light over it (sized to the whole name, like the foil). */
function litFace(letterX: number, { W, H }: Size): React.CSSProperties {
  return {
    backgroundImage: `radial-gradient(circle at var(--sx, 50%) var(--sy, 30%), rgba(255,255,255,0.32), rgba(255,255,255,0) ${(H * 0.5).toFixed(0)}px), ${TOP_FACE}`,
    backgroundSize: `${W}px ${H}px, auto, auto`,
    backgroundPosition: `${-letterX}px 0px, 0 0, 0 0`,
    backgroundRepeat: "no-repeat",
  };
}
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

type Size = { W: number; H: number };

/** `scroll` is the hero's scroll progress (0..1): the name slides away along its floor as it grows. */
export default function HeroName({
  text,
  scroll,
  fontClass = NAME_CLASSES,
  stickerSet = "all",
  butterflies = SHOW_BUTTERFLIES,
  delayOffset = 0,
  totalLetters,
  scaleBoost = 1,
  recedeUnit,
}: {
  text: string;
  scroll?: MotionValue<number>;
  /** Tailwind classes for the name (font size etc.). */
  fontClass?: string;
  /** Which stickers sit on this name: all of them, or the set for its top / bottom row when it is split in two. */
  stickerSet?: "all" | "top" | "bottom";
  butterflies?: boolean;
  /** Letters that come before this row, so the rise-up carries on from the row above. */
  delayOffset?: number;
  totalLetters?: number;
  /** Makes the stickers bigger (small screens). */
  scaleBoost?: number;
  /** Slide distance unit in px; rows of different heights get the same value so they move together. */
  recedeUnit?: number;
}) {
  const total = totalLetters ?? text.length;
  const wrapRef = useRef<HTMLDivElement>(null);
  const perspRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [size, setSize] = useState<Size | null>(null);
  const [letterBoxes, setLetterBoxes] = useState<LetterBox[]>([]);
  const [ink, setInk] = useState<InkBox[]>([]);
  const [hole, setHole] = useState<HoleSpot | null>(null);

  // Live press state of every letter, shared with the stickers and keychain through the stage.
  const [motions] = useState<LetterMotion[]>(() =>
    text.split("").map(() => ({
      rise: motionValue(0),
      press: motionValue(0),
      push: motionValue(0),
      px: motionValue(0),
      py: motionValue(0),
      perch: motionValue(0),
    }))
  );
  const stageRef = useRef<NameStage | null>(null);
  if (!stageRef.current) stageRef.current = new NameStage();
  const stage = stageRef.current;

  const h1Ref = useRef<HTMLHeadingElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleId = useRef(0);
  const waveTimers = useRef<number[]>([]);
  const [fillUrl, setFillUrl] = useState<string | null>(null);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    setSize((prev) => (prev && prev.W === W && prev.H === H ? prev : { W, H }));
    // Layout positions (offsetLeft/offsetWidth ignore the 3D tilt), measured from the name's left edge.
    const originX = letterRefs.current[0]?.offsetParent === wrap ? 0 : (letterRefs.current[0]?.offsetParent as HTMLElement | null)?.offsetLeft ?? 0;
    const boxes = letterRefs.current.map((el) => (el ? { x: originX + el.offsetLeft, w: el.offsetWidth } : { x: 0, w: 0 }));
    setLetterBoxes((prev) =>
      prev.length === boxes.length && prev.every((b, i) => b.x === boxes[i].x && b.w === boxes[i].w) ? prev : boxes
    );
  }, []);

  // Scrolling slides the name (and its floor, stickers and keychain) away from you along the ground.
  const fallbackScroll = useState(() => motionValue(0))[0];
  const progress = scroll ?? fallbackScroll;
  const heightRef = useRef(0);
  heightRef.current = size?.H ?? 0;
  const recede = useTransform(progress, (p) => Math.max(0, p) * RECEDE_DISTANCE * (recedeUnit ?? heightRef.current));
  const planeTransform = useTransform(recede, (d) => `rotateX(${NAME_TILT_DEG}deg) translateY(${(-d).toFixed(2)}px)`);
  useMotionValueEvent(recede, "change", (d) => {
    stage.recede = d;
  });

  // Where the browser can run animations from the scroll position itself (Chrome, Edge, Android Chrome, Safari 26),
  // the slide-back runs on the graphics card in step with the scroll, instead of being set from JavaScript after each
  // scroll event, which on phones (native scrolling, a busy main thread) landed a frame or more late and jittered.
  // Same distance and range as above; `stage.recede` is still kept up to date for the butterflies and stickers.
  useEffect(() => {
    const plane = planeRef.current;
    if (!SCROLL_TIMELINE || !plane || !size || !scroll) return undefined;
    const root = document.documentElement;
    const dist = RECEDE_DISTANCE * (recedeUnit ?? size.H);
    const timeline = new (window as unknown as { ScrollTimeline: new (o: object) => AnimationTimeline }).ScrollTimeline({ source: root, axis: "block" });
    let anim: Animation | null = null;
    const build = () => {
      const max = root.scrollHeight - root.clientHeight;
      if (max <= 0) return;
      // The timeline runs over the whole page; the slide-back takes its first RECEDE_SCREENS screens.
      const k = Math.min(1, (screenHeight() * RECEDE_SCREENS) / max);
      const from = `rotateX(${NAME_TILT_DEG}deg) translateY(0px)`;
      const to = `rotateX(${NAME_TILT_DEG}deg) translateY(${(-dist).toFixed(2)}px)`;
      const frames: Keyframe[] = [
        { offset: 0, transform: from },
        { offset: k, transform: to },
        { offset: 1, transform: to },
      ];
      if (anim) (anim.effect as KeyframeEffect).setKeyframes(frames);
      else anim = plane.animate(frames, { timeline, fill: "both", easing: "linear" } as KeyframeAnimationOptions);
    };
    build();
    // The page grows as sections load in, which changes where the first screens fall on the timeline.
    const ro = new ResizeObserver(build);
    ro.observe(document.body);
    return () => {
      ro.disconnect();
      anim?.cancel();
    };
  }, [size, recedeUnit, scroll]);

  const slab = size ? Math.max(8, size.H * NAME_SLAB_DEPTH) : 24;
  const layerCount = Math.max(SLAB_MIN_LAYERS, Math.round(slab / SLAB_STEP));

  // Keep the shared stage current (it's read every frame by the stickers and keychain).
  stage.letters = motions;
  stage.boxes = letterBoxes;
  stage.ink = ink;
  stage.W = size?.W ?? 0;
  stage.H = size?.H ?? 0;
  stage.slab = slab;
  stage.el = perspRef.current;
  useEffect(() => {
    liveStages.add(stage);
    return () => {
      liveStages.delete(stage);
    };
  }, [stage]);

  // Each letter rises out of the floor in turn: its slab grows from flat to full thickness.
  // (Waits for the loading screen to lift, so the rise is seen.)
  const siteReady = useSiteReady();
  useEffect(() => {
    if (!siteReady) return undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const controls = motions.map((m, i) => {
      if (reduce) {
        m.rise.set(1);
        return null;
      }
      return animate(m.rise, 1, { type: "spring", stiffness: 150, damping: 11, delay: 0.3 + (i + delayOffset) * 0.15 });
    });
    return () => controls.forEach((c) => c?.stop());
  }, [motions, siteReady]);

  // Pressing: the letter under the pointer is pressed down at the spot under the cursor, and
  // clicking presses harder. Worked out from the pointer's spot on the name's plane, so it also
  // works through the stickers lying on the letters.
  const hovered = useRef(-1);
  const releaseLetter = useCallback(
    (i: number) => {
      const m = motions[i];
      if (!m) return;
      animate(m.press, 0, PRESS_SPRING);
      animate(m.push, 0, PUSH_SPRING);
      animate(m.px, 0, { duration: 0.25 });
      animate(m.py, 0, { duration: 0.25 });
    },
    [motions]
  );
  // A press sends rings out across the floor from the spot pressed...
  const ripple = (x: number, y: number) => {
    if (!PRESS_RIPPLES) return;
    const id = ++rippleId.current;
    setRipples((all) => [...all.slice(-5), { id, x, y }]);
  };
  // ...and a little wave through the letters on either side, smaller the further away they are.
  const wave = (i: number) => {
    if (!PRESS_WAVE) return;
    for (let d = 1; d <= 3; d++) {
      for (const j of [i - d, i + d]) {
        const m = motions[j];
        if (!m || text[j] === " ") continue;
        const amp = 0.62 - d * 0.16;
        waveTimers.current.push(
          window.setTimeout(() => {
            if (j === hovered.current) return;
            animate(m.push, amp, PUSH_SPRING);
            waveTimers.current.push(
              window.setTimeout(() => {
                if (j !== hovered.current) animate(m.push, 0, PUSH_SPRING);
              }, 150)
            );
          }, d * 75)
        );
      }
    }
  };
  useEffect(() => () => waveTimers.current.forEach((t) => window.clearTimeout(t)), []);

  const lastType = useRef("mouse");
  const onPointerMove = (e: React.PointerEvent) => {
    // Fingers don't hover, and a drag is a scroll: only a tap (see onClick) presses a letter.
    if (e.pointerType === "touch") return;
    if (stage.busy) {
      if (hovered.current >= 0) releaseLetter(hovered.current);
      hovered.current = -1;
      stage.pointerLetter = -1;
      return;
    }
    const hit = stage.letterAtClient(e.clientX, e.clientY);
    const i = hit?.i ?? -1;
    stage.pointerLetter = i;
    if (i !== hovered.current) {
      if (hovered.current >= 0) releaseLetter(hovered.current);
      if (i >= 0) {
        animate(motions[i].press, 1, PRESS_SPRING);
        // Mouse hover only (a tap is a press, which plays its own note).
        if (CHIME_HOVER && e.type === "pointermove" && e.pointerType === "mouse") playNote(nextNote, panOf(text, i), true);
      }
      hovered.current = i;
    }
    if (hit && size) {
      const box = letterBoxes[hit.i];
      animate(motions[hit.i].px, clamp1(((hit.x - box.x) / box.w) * 2 - 1), TILT_EASE);
      animate(motions[hit.i].py, clamp1((hit.y / size.H) * 2 - 1), TILT_EASE);
    }
  };
  // A tap on a touch screen: press the letter under the finger and play its note. The browser sends a click
  // only for a real tap, never for the start of a scroll, so scrolling stays quiet and smooth.
  const onClick = (e: React.MouseEvent) => {
    if (lastType.current !== "touch" || stage.busy) return;
    const hit = stage.letterAtClient(e.clientX, e.clientY);
    if (!hit || !size) return;
    const i = hit.i;
    const box = letterBoxes[i];
    animate(motions[i].px, clamp1(((hit.x - box.x) / box.w) * 2 - 1), { duration: 0.1 });
    animate(motions[i].py, clamp1((hit.y / size.H) * 2 - 1), { duration: 0.1 });
    animate(motions[i].press, 1, PRESS_SPRING);
    animate(motions[i].push, 1, PUSH_SPRING);
    if (CHIME_LETTERS) playNote(nextNote, panOf(text, i));
    ripple(hit.x, hit.y);
    wave(i);
    window.setTimeout(() => releaseLetter(i), 220);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    lastType.current = e.pointerType;
    if (e.pointerType === "touch") return;
    onPointerMove(e);
    if (hovered.current >= 0 && !stage.busy) {
      animate(motions[hovered.current].push, 1, PUSH_SPRING);
      if (CHIME_LETTERS) playNote(nextNote, panOf(text, hovered.current));
      const hit = stage.letterAtClient(e.clientX, e.clientY);
      if (hit) ripple(hit.x, hit.y);
      wave(hovered.current);
    }
  };
  const onPointerLeave = () => {
    if (hovered.current >= 0) releaseLetter(hovered.current);
    hovered.current = -1;
    stage.pointerLetter = -1;
  };
  // Sound can only start after the first click/tap/key press on the page; get ready for it.
  useEffect(() => {
    if (CHIME_HOVER || CHIME_LETTERS) primeAudio();
  }, []);

  useEffect(() => {
    const up = () => {
      if (hovered.current >= 0) animate(motions[hovered.current].push, 0, PUSH_SPRING);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [motions]);

  // Find each letter's inked area, and where to drill the keychain hole (in the last letter), once
  // fonts and layout are ready.
  useEffect(() => {
    const h1 = h1Ref.current;
    if (!size || !h1 || letterBoxes.length === 0) return;
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (cancelled) return;
      const fontPx = parseFloat(getComputedStyle(h1).fontSize);
      setInk(measureInk(text, fontPx, letterBoxes, size.H));
      stage.text = text;
      stage.fontPx = fontPx;
      stage.spots = findPerchSpots(text, fontPx, letterBoxes, size.H);
      const i = text.length - 1;
      const box = letterBoxes[i];
      if (!box) return;
      const r = Math.max(3, size.H * 0.032);
      const spot = findHoleSpot(text[i], fontPx, box.w, size.H, r, RING_DIR);
      setHole({ i, r, ...(spot ?? { x: box.w * 0.8, y: size.H * 0.75, wall: r * 1.6, edge: r * 2 }) });
    });
    return () => {
      cancelled = true;
    };
  }, [size, letterBoxes, text, stage]);

  // Punches the keychain hole through every layer of that letter's slab.
  const holeMask = (i: number): React.CSSProperties => {
    if (!SHOW_KEYCHAIN || !hole || hole.i !== i) return {};
    const mask = `radial-gradient(circle at ${hole.x}px ${hole.y}px, transparent ${hole.r}px, #000 ${hole.r + 0.75}px)`;
    return { maskImage: mask, WebkitMaskImage: mask };
  };

  // Use the user's image if one exists, otherwise paint the built-in scene.
  useEffect(() => {
    if (!size || !SCENE_IN_LETTERS) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setFillUrl(HERO_FILL_IMAGE);
    };
    img.onerror = () => {
      if (cancelled) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      setFillUrl(paintHeroScene(Math.round(size.W * FILL_SCALE_X * dpr), Math.round(size.H * FILL_SCALE_Y * dpr)));
    };
    img.src = HERO_FILL_IMAGE;
    return () => {
      cancelled = true;
    };
  }, [size]);

  // Off screen, the stickers and butterflies stop doing work.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(([e]) => {
      stage.active = e.isIntersecting;
    });
    io.observe(wrap);
    return () => io.disconnect();
  }, [stage]);

  // The light on the foil: it follows the cursor across the name's plane (wherever the cursor is on the page),
  // and drifts slowly along the name on its own once the cursor has been still for a while.
  useEffect(() => {
    const plane = planeRef.current;
    if (!(FOIL_LETTERS || MOVING_LIGHT) || !size || !plane) return undefined;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const target = { x: size.W * 0.3, y: size.H * 0.3 };
    const cur = { ...target };
    let lastMove = -Infinity;
    let prev = 0;
    let raf = 0;
    // Written straight onto the letters' top faces (and the floor), the only things that use them. Written on the
    // plane, every one of the few hundred slab layers under it inherited the change and was restyled and repainted
    // about 30 times a second, which made scrolling jitter.
    const lit = Array.from(plane.querySelectorAll<HTMLElement>("[data-lit]"));
    const put = () => {
      const sx = `${cur.x.toFixed(1)}px`;
      const sy = `${cur.y.toFixed(1)}px`;
      // The foil slides a little with the light, so its colours shift like a hologram.
      const fx = `${((cur.x / size.W - 0.5) * size.H * 0.7).toFixed(1)}px`;
      for (const el of lit) {
        el.style.setProperty("--sx", sx);
        el.style.setProperty("--sy", sy);
        el.style.setProperty("--fx", fx);
      }
    };
    // While the page is scrolling the light holds still: it repaints every letter's face, which on phones competed
    // with the scroll for the frame. It carries on once the scroll stops.
    let scrolledAt = -Infinity;
    const onScroll = () => {
      scrolledAt = performance.now();
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // About 30 times a second is plenty for a soft light, and nothing at all while the name is off screen.
      if (!stage.active || document.hidden || now - prev < 33 || now - scrolledAt < 180) return;
      prev = now;
      if (now - lastMove > 2500) {
        const t = now / 1000;
        target.x = size.W * (0.5 + 0.46 * Math.sin(t * 0.42));
        target.y = size.H * (0.4 + 0.3 * Math.sin(t * 0.73 + 1));
      }
      cur.x += (target.x - cur.x) * 0.14;
      cur.y += (target.y - cur.y) * 0.14;
      put();
    };
    const onMove = (e: PointerEvent) => {
      const p = stage.fromClient(e.clientX, e.clientY, stage.slab);
      if (!p) return;
      target.x = Math.max(-0.2 * size.W, Math.min(1.2 * size.W, p.x));
      target.y = Math.max(-size.H, Math.min(2 * size.H, p.y));
      lastMove = performance.now();
    };
    put();
    if (!still) raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [size, stage]);

  useLayoutEffect(() => {
    stage.el = perspRef.current;
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure, stage]);

  return (
    <NameStageContext.Provider value={stage}>
      <div ref={wrapRef} className="relative inline-block" onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerLeave={onPointerLeave} onClick={onClick}>
        {SHOW_KEYCHAIN && size && hole && letterBoxes[hole.i] && (
          <KeychainLayer
            W={size.W}
            H={size.H}
            stage={stage}
            letter={hole.i}
            hole={{ x: letterBoxes[hole.i].x + hole.x, y: hole.y, r: hole.r, wall: hole.wall, edge: hole.edge }}
            slab={slab}
          />
        )}
        {butterflies && size && <ButterflyLayer W={size.W} H={size.H} slab={slab} stage={stage} />}
        {/* Filter sits outside the 3D scene: a filter on a 3D element would flatten it. */}
        {/* No filter here: a filter around a scene that moves while you scroll is re-painted every frame. */}
        <div className="relative z-[3]">
          <div
            ref={perspRef}
            style={{
              perspective: size ? `${size.H * NAME_PERSPECTIVE}px` : "1000px",
              perspectiveOrigin: `50% ${NAME_PERSPECTIVE_ORIGIN_Y * 100}%`,
            }}
          >
            <motion.div
              ref={planeRef}
              className="relative"
              style={{
                // With a scroll timeline (above) the browser moves it; JavaScript only sets the resting tilt.
                transform: SCROLL_TIMELINE && scroll ? `rotateX(${NAME_TILT_DEG}deg)` : planeTransform,
                transformOrigin: "50% 100%",
                transformStyle: "preserve-3d",
                willChange: "transform",
              }}
            >
              {/* The floor the letters lie on. With the foil on, a pool of light follows the light on the letters
                  (the floor reaches 40% of the name's width past its left edge and 90% of its height past its far edge). */}
              <div
                aria-hidden="true"
                data-lit={FOIL_LETTERS ? "" : undefined}
                className="pointer-events-none absolute"
                style={{
                  left: "-40%",
                  right: "-40%",
                  top: "-90%",
                  bottom: "-45%",
                  background:
                    (FOIL_LETTERS && size
                      ? `radial-gradient(${(size.H * 1.6).toFixed(0)}px ${(size.H * 1.1).toFixed(0)}px at calc(var(--sx, 50%) + ${(size.W * 0.4).toFixed(0)}px) calc(var(--sy, 50%) + ${(size.H * 0.9).toFixed(0)}px), rgba(200,182,255,0.16), rgba(200,182,255,0) 70%), `
                      : "") +
                    "radial-gradient(ellipse 50% 45% at 50% 55%, var(--hn-floor-glow, rgba(182,157,248,0.06)), rgba(182,157,248,0) 70%), repeating-linear-gradient(90deg, var(--hn-floor-line, rgba(200,182,255,0.07)) 0 1px, transparent 1px 80px), repeating-linear-gradient(0deg, var(--hn-floor-line, rgba(200,182,255,0.07)) 0 1px, transparent 1px 80px)",
                  maskImage: "radial-gradient(ellipse 50% 50% at 50% 55%, black, transparent)",
                  WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 55%, black, transparent)",
                }}
              />
              {/* Rings rippling out across the floor from a pressed letter. */}
              {PRESS_RIPPLES &&
                size &&
                ripples.map((r) => (
                  <React.Fragment key={r.id}>
                    {[0, 1].map((k) => (
                      <motion.span
                        key={k}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full"
                        style={{
                          left: r.x,
                          top: r.y,
                          width: size.H * 0.5,
                          height: size.H * 0.5,
                          marginLeft: -size.H * 0.25,
                          marginTop: -size.H * 0.25,
                          border: `${Math.max(1, size.H * 0.008).toFixed(1)}px solid rgba(200,182,255,${k ? 0.25 : 0.5})`,
                        }}
                        initial={{ scale: 0.15, opacity: 1 }}
                        animate={{ scale: k ? 5.2 : 3.6, opacity: 0 }}
                        transition={{ duration: k ? 1.5 : 1.1, delay: k * 0.12, ease: [0.16, 1, 0.3, 1] }}
                        onAnimationComplete={k ? () => setRipples((all) => all.filter((x) => x.id !== r.id)) : undefined}
                      />
                    ))}
                  </React.Fragment>
                ))}
              <h1
                ref={h1Ref}
                aria-label={text.split(" ").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")}
                className={fontClass}
                style={
                  {
                    fontFamily: "'Anton', sans-serif",
                    transformStyle: "preserve-3d",
                    "--pan": size ? `${size.W * (FILL_SCALE_X - 1)}px` : "0px",
                  } as React.CSSProperties
                }
              >
                {text.split("").map((raw, i) => {
                  const ch = raw === " " ? " " : raw;
                  const m = motions[i];
                  const halfW = (letterBoxes[i]?.w ?? (size?.H ?? 160) * 0.5) / 2;
                  const halfH = (size?.H ?? 160) / 2;
                  return (
                    <motion.span
                      key={i}
                      ref={(el) => {
                        letterRefs.current[i] = el;
                      }}
                      className="relative inline-block"
                      style={{ transformStyle: "preserve-3d", "--rise": m.rise, "--press": m.press, "--push": m.push, "--px": m.px, "--py": m.py, "--perch": m.perch } as never}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: siteReady ? 1 : 0 }}
                      transition={{ duration: 0.25, delay: 0.3 + (i + delayOffset) * 0.15 }}
                    >
                      {/* Contact shadow on the floor. */}
                      <span aria-hidden="true" className="absolute inset-0" style={{ color: "var(--hn-shadow, rgba(4,2,12,0.55))", filter: "blur(12px)", transform: "translate(0.06em, 0.05em)", ...holeMask(i) }}>
                        {ch}
                      </span>
                      <span aria-hidden="true" className="absolute inset-0" style={{ color: "var(--hn-shadow-core, rgba(2,1,8,0.9))", filter: "blur(2px)", ...holeMask(i) }}>
                        {ch}
                      </span>
                      {/* The slab tips toward the pressure point: the edge under the cursor goes down. */}
                      <span className="relative inline-block" style={{ transformStyle: "preserve-3d" }}>
                        {Array.from({ length: layerCount }, (_, l) => {
                          // With the fill, copies sit one step up from the floor to the top face's height (the
                          // lowest fills down to the floor); without it, from the floor up to just under the top.
                          const h = SLAB_FILL ? ((l + 1) * slab) / layerCount : (l * slab) / layerCount;
                          const f = SLAB_FILL ? h / slab : l / (layerCount - 1);
                          const step = slab / layerCount;
                          return (
                            <span
                              key={l}
                              aria-hidden="true"
                              className="absolute inset-0"
                              style={{
                                color: slabShade(f),
                                textShadow:
                                  SLAB_FILL && size && ch.trim()
                                    ? slabFill((letterBoxes[i]?.x ?? 0) + halfW, size.W, size.H, h, step * (l === 0 ? 1 : FILL_REACH), slab)
                                    : undefined,
                                ...holeMask(i),
                                transform: `translateZ(calc(var(--rise) * ${SLAB_SQUASH} * ${h.toFixed(2)}px)) ${slabTilt(SLAB_FILL ? f : l / layerCount, slab, halfW, halfH)}`,
                              }}
                            >
                              {ch}
                            </span>
                          );
                        })}
                        {/* Top face of the slab. */}
                        <span
                          data-lit=""
                          className={`relative inline-block bg-clip-text text-transparent ${fillUrl ? "hero-fill-letter" : ""}`}
                          style={
                            {
                              transform: `translateZ(calc(var(--rise) * ${SLAB_SQUASH} * ${slab.toFixed(2)}px)) ${slabTilt(1, slab, halfW, halfH)}`,
                              WebkitTextStroke: "0.8px var(--hn-stroke, rgba(238,232,255,0.55))",
                              ...(fillUrl
                                ? {}
                                : FOIL_LETTERS && size
                                  ? foilFace(letterBoxes[i]?.x ?? 0, size)
                                  : MOVING_LIGHT && size
                                    ? litFace(letterBoxes[i]?.x ?? 0, size)
                                    : { backgroundImage: TOP_FACE }),
                              filter: "brightness(calc(1 - var(--press) * 0.1 - var(--push) * 0.12))",
                              ...holeMask(i),
                              ...(fillUrl && size
                                ? {
                                    backgroundImage: `url(${fillUrl})`,
                                    backgroundSize: `${size.W * FILL_SCALE_X}px ${size.H * FILL_SCALE_Y}px`,
                                    backgroundRepeat: "no-repeat",
                                    "--bx": `${-(letterBoxes[i]?.x ?? 0)}px`,
                                  }
                                : {}),
                            } as React.CSSProperties
                          }
                        >
                          {ch}
                        </span>
                      </span>
                    </motion.span>
                  );
                })}
              </h1>
              {/* "Feed ↓ · 2026 · Portfolio" printed on the ground in front of the name. */}
              {SHOW_GROUND_CAPTION && size && <GroundCaption H={size.H} delay={0.3 + text.length * 0.15 + 0.3} />}
              {size && siteReady && (
                <HeroStickers
                  variant={stickerSet}
                  scale={Math.min(1.6, Math.max(0.45, size.H / 170)) * scaleBoost}
                  lift={size.H * 0.9}
                  // After the last letter has risen out of the floor.
                  startDelay={0.3 + total * 0.15 + 0.9}
                />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </NameStageContext.Provider>
  );
}
