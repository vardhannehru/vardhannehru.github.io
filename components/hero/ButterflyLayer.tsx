import { useEffect, useRef } from "react";
import * as THREE from "three";
import { animate } from "framer-motion";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { floorMatrix, stageCamera } from "./nameStage3d";
import type { NameStage, StickerPerch } from "./nameStage";
import { navPerches, type ButterflyLook, type NavPerch } from "../layout/navPerch";
import { canvasDpr, isLowPower, onPinchZoom, PHONE_DPR } from "../ui/device";

// Small butterflies fluttering around the hero name. They wander over the letters and now and then land
// on one: a letter dips under them and bounces back up when they leave; a sticker wobbles and flicks its
// corner. Once in a while one flies up to a button on the nav bar and rests there instead (see navPerch.ts).
// They rest slowly fanning their wings, then take off again, or straight away if you point at
// the letter (or button) they're sitting on. Wings are real butterflies made with Higgsfield (public/butterflies/), with
// wings painted in code (veins, scales, margin spots) as the stand-in until they load, lit with a little iridescence. Rendered with the same camera as the CSS letters, so they line up with them.

// Canvas overhang around the name: generous above, since the name (and the butterflies with it) moves
// up the screen as it slides back along the ground while the hero is scrolled.
const PAD_X = 0.25;
const PAD_TOP = 2.6;
const PAD_BOTTOM = 0.6;
/** Half wingspan, as a fraction of the letter height. */
const WING = 0.12;
/** Which species fly, in order (indexes into SPECIES): lilac morpho, tiger swallowtail, monarch,
 *  emerald swallowtail, scarlet longwing, pearl. */
const ROSTER = [0, 3, 5, 4, 6, 2];
/** When the first one arrives (s after mount, once the name has risen) and the gap between arrivals. */
const ARRIVE_AT = 2.6;
const ARRIVE_GAP = 0.9;
/** Wing beats per second in flight (quick and fluttery, like a real one). */
const FLAP_HZ = 5;
/** Cruising speed, in letter heights per second. */
const SPEED = 0.45;
/** How strongly they steer toward where they're heading (lower = wider, lazier curves). */
const STEER = 0.9;
/** The breeze they drift on: how hard it pushes (letter heights / s²). */
const BREEZE = 0.35;
/** Chance of heading for a landing spot each time one reaches where it was going. */
const LAND_CHANCE = 0.85;
/** Of those landings, the chance it picks a nav button (when one is free). */
const NAV_CHANCE = 0.4;
/** One wing's width when resting on a nav button (px), for a butterfly of size 1. */
const NAV_WING_PX = 13;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

type P = [number, number];
type Wing = "fore" | "hind";
/** Wing silhouette: rounded (morpho-like), swallowtail (long hindwing tails) or longwing (narrow forewings). */
type Shape = "round" | "swallowtail" | "longwing";
/** Extra markings, in wing units: stripes and bands, spots, and scattered coloured scales ("dust"). */
type Mark =
  | { kind: "band"; wing: Wing; pts: P[]; width: number; color: string; soft?: boolean }
  | { kind: "spot"; wing: Wing; at: P; r: number; color: string; ring?: string }
  | { kind: "dust"; wing: Wing; color: string; count: number; where: "margin" | "all" };

type Species = {
  shape: Shape;
  /** Size, relative to WING. */
  size: number;
  /** Wing-beat speed and how often it glides, relative to the defaults. */
  flap: number;
  glide: number;
  root: string;
  inner: string;
  mid: string;
  outer: string;
  border: string;
  /** Width of the dark outer margin, in texture px. */
  borderWidth: number;
  vein: string;
  veinWidth?: number;
  /** Spots along the outer margin. */
  dots: string | null;
  /** Dark forewing tip, with pale spots in it. */
  apex?: { color: string; dots: string };
  /** Eyespots near the hindwing margin. */
  eyes?: { ring: string; core: string };
  marks?: Mark[];
  iridescence: number;
  sheen: string;
  /** A real wing (right-hand side) made with Higgsfield, in public/butterflies/. Same layout as the painted texture:
   *  TEX_W x TEX_H with the root at the left edge. Shown once it loads; the painted wing is the stand-in until then. */
  photo?: string;
  /** The photo's own body and antennae (`photo` with -body), as a flat picture that doesn't flap: its size and where
   *  its centre sits from the wing root, in wing units. */
  body?: { w: number; h: number; x: number; y: number };
  /** Where the forewing's back edge meets the wing's outer edge (wing units), for cutting the picture into the forewing
   *  and the hindwing, which beat slightly out of step. */
  split?: P;
};

const INK = "#15110b";
const TAIL: Mark = { kind: "band", wing: "hind", pts: [[0.5, -0.9], [0.5, -1.3]], width: 0.12, color: INK };

const SPECIES: Species[] = [
  // 0. Lilac morpho: iridescent lavender-blue with an ink margin and a row of white dots.
  {
    shape: "round",
    size: 1,
    flap: 1,
    glide: 1,
    root: "#1a1230",
    inner: "#4b3aa6",
    mid: "#9d86ff",
    outer: "#d6caff",
    border: "#0f0a1e",
    borderWidth: 20,
    vein: "rgba(15,8,35,0.45)",
    dots: "rgba(255,255,255,0.9)",
    iridescence: 1,
    sheen: "#c8b6ff",
    photo: "/butterflies/morpho.webp",
    split: [0.833, -0.319],
    body: { w: 0.5701, h: 1.2214, x: -0.0225, y: -0.1093 },
  },
  // 1. Peach: warm terracotta with a dark tip, white apex spots and small blue-eyed spots.
  {
    shape: "round",
    size: 0.95,
    flap: 1.1,
    glide: 0.9,
    root: "#2e160e",
    inner: "#a2462a",
    mid: "#e8865a",
    outer: "#f7b894",
    border: "#1d120d",
    borderWidth: 13,
    vein: "rgba(40,18,10,0.5)",
    dots: "rgba(255,244,230,0.9)",
    apex: { color: "#1a110d", dots: "#fff6ea" },
    eyes: { ring: "#1a110d", core: "#8fb6ff" },
    iridescence: 0,
    sheen: "#ffd9c4",
  },
  // 2. Pearl: creamy white with fine brown veins and a smoky tip, a little pearly sheen.
  {
    shape: "round",
    size: 0.85,
    flap: 1.2,
    glide: 0.8,
    root: "#3d352c",
    inner: "#d9cdb4",
    mid: "#f4ecdc",
    outer: "#fffaf0",
    border: "#2c261f",
    borderWidth: 8,
    vein: "rgba(70,56,38,0.5)",
    dots: null,
    apex: { color: "#2c261f", dots: "#fffaf0" },
    iridescence: 0.35,
    sheen: "#ffffff",
    photo: "/butterflies/pearl.webp",
    split: [0.802, -0.38],
    body: { w: 0.7142, h: 1.6006, x: -0.0227, y: -0.2687 },
  },
  // 3. Tiger swallowtail: lemon yellow with black tiger stripes, long black tails, a broad black margin
  //    with yellow crescents, blue scales and an orange spot by the tail.
  {
    shape: "swallowtail",
    size: 1.3,
    flap: 0.8,
    glide: 1.6,
    root: "#3a2a10",
    inner: "#d9a826",
    mid: "#f6d24a",
    outer: "#fbe488",
    border: INK,
    borderWidth: 26,
    vein: "rgba(25,18,6,0.7)",
    veinWidth: 2.2,
    dots: "rgba(250,220,90,0.95)",
    marks: [
      { kind: "band", wing: "fore", pts: [[0.14, 0.22], [0.1, -0.04]], width: 0.07, color: INK },
      { kind: "band", wing: "fore", pts: [[0.36, 0.42], [0.28, -0.12]], width: 0.08, color: INK },
      { kind: "band", wing: "fore", pts: [[0.58, 0.57], [0.5, 0.2]], width: 0.06, color: INK },
      { kind: "band", wing: "fore", pts: [[0.78, 0.66], [0.74, 0.44]], width: 0.05, color: INK },
      { kind: "band", wing: "fore", pts: [[0.02, -0.03], [0.58, -0.15]], width: 0.06, color: INK },
      { kind: "band", wing: "hind", pts: [[0.06, -0.08], [0.3, -0.8]], width: 0.12, color: INK },
      TAIL,
      { kind: "dust", wing: "hind", color: "rgba(90,140,255,0.9)", count: 110, where: "margin" },
      { kind: "spot", wing: "hind", at: [0.36, -0.8], r: 0.045, color: "#f07a2a", ring: INK },
    ],
    iridescence: 0,
    sheen: "#fff3c0",
    photo: "/butterflies/tiger.webp",
    split: [0.587, -0.37],
    body: { w: 0.5277, h: 1.0855, x: -0.0188, y: -0.1775 },
  },
  // 4. Emerald swallowtail: velvety black-green, dusted with green scales, with glowing emerald bands
  //    across both wings and long tails.
  {
    shape: "swallowtail",
    size: 1.2,
    flap: 0.85,
    glide: 1.4,
    root: "#030605",
    inner: "#0a1a12",
    mid: "#0f2419",
    outer: "#0b1812",
    border: "#030504",
    borderWidth: 14,
    vein: "rgba(0,0,0,0.55)",
    veinWidth: 1.6,
    dots: "rgba(140,210,255,0.55)",
    marks: [
      { kind: "dust", wing: "fore", color: "rgba(60,220,140,0.5)", count: 1400, where: "all" },
      { kind: "dust", wing: "hind", color: "rgba(60,220,140,0.5)", count: 1400, where: "all" },
      { kind: "band", wing: "fore", pts: [[0.28, 0.52], [0.46, 0.2], [0.56, -0.1]], width: 0.17, color: "#35e8a0", soft: true },
      { kind: "band", wing: "hind", pts: [[0.26, -0.02], [0.38, -0.3], [0.46, -0.62]], width: 0.2, color: "#35e8a0", soft: true },
      { ...TAIL, color: "#030504" },
    ],
    iridescence: 0.9,
    sheen: "#7dffc8",
    photo: "/butterflies/emerald.webp",
    split: [0.617, -0.375],
    body: { w: 0.4719, h: 1.1694, x: -0.0187, y: -0.1623 },
  },
  // 5. Monarch: bright orange with thick black veins, a black margin with white dots, and a black tip
  //    with white and orange spots. A famous glider.
  {
    shape: "round",
    size: 1.1,
    flap: 0.85,
    glide: 1.8,
    root: "#2a1206",
    inner: "#c4520e",
    mid: "#ee7d1c",
    outer: "#f7a23a",
    border: "#120a06",
    borderWidth: 24,
    vein: "rgba(18,10,6,0.95)",
    veinWidth: 5.5,
    dots: "rgba(255,255,255,0.95)",
    apex: { color: "#120a06", dots: "#ffffff" },
    marks: [
      { kind: "band", wing: "fore", pts: [[0.02, -0.02], [0.58, -0.15]], width: 0.05, color: "#120a06" },
      { kind: "spot", wing: "fore", at: [0.84, 0.3], r: 0.024, color: "#f39c3a" },
      { kind: "spot", wing: "fore", at: [0.78, 0.36], r: 0.02, color: "#f39c3a" },
    ],
    iridescence: 0,
    sheen: "#ffd2a0",
    photo: "/butterflies/monarch.webp",
    split: [0.767, -0.467],
    body: { w: 0.7835, h: 1.5739, x: -0.0226, y: -0.3048 },
  },
  // 6. Scarlet longwing: long, narrow velvet-black wings with a scarlet forewing band and a yellow
  //    hindwing bar. Slow, floaty wing beats.
  {
    shape: "longwing",
    size: 1,
    flap: 0.9,
    glide: 0.6,
    root: "#0b090b",
    inner: "#121012",
    mid: "#151215",
    outer: "#191519",
    border: "#0b090b",
    borderWidth: 6,
    vein: "rgba(0,0,0,0.35)",
    veinWidth: 1.4,
    dots: null,
    marks: [
      { kind: "band", wing: "fore", pts: [[0.34, 0.26], [0.62, 0.2], [0.88, 0.14]], width: 0.2, color: "#e3263a", soft: true },
      { kind: "band", wing: "hind", pts: [[0.1, -0.12], [0.34, -0.2], [0.54, -0.28]], width: 0.06, color: "#f6d33c", soft: true },
    ],
    iridescence: 0.3,
    sheen: "#7d8cff",
    photo: "/butterflies/longwing.webp",
    split: [0.8, -0.32],
    body: { w: 1.0839, h: 1.5932, x: -0.0225, y: -0.1555 },
  },
];

// ---- Wing outlines, in wing units: x out from the body, y toward the head; the root is at (0, 0). ----
const WX = 1.3;
const WY_TOP = 0.8;
const WY_BOTTOM = -1.36;
const TEX_W = 512;
const TEX_H = Math.round((TEX_W * (WY_TOP - WY_BOTTOM)) / WX);

type WingOutline = { pts: P[]; margin: P[]; spots: P[] };

/**
 * A wing from cubic segments. `margin` is the segments that get the dark outer border (with `lead` points
 * before them), `spots` the ones that get the row of spots; `scallop` notches the edge along some segments.
 */
function wing(
  start: P,
  segs: [P, P, P][],
  margin: [from: number, to: number, lead: number],
  spots: [from: number, to: number],
  scallop?: { segs: [number, number]; depth: number; count: number }
): WingOutline {
  const n = 28;
  const pts: P[] = [start];
  const ranges: [number, number][] = [];
  let cur = start;
  for (const [b, c, d] of segs) {
    const from = pts.length;
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const u = 1 - t;
      pts.push([
        u * u * u * cur[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
        u * u * u * cur[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
      ]);
    }
    ranges.push([from, pts.length]);
    cur = d;
  }
  if (scallop) {
    // Small notches pulled in toward the root.
    const [from, to] = [ranges[scallop.segs[0]][0], ranges[scallop.segs[1]][1]];
    for (let k = from; k < to; k++) {
      const f = (k - from) / (to - from);
      const s = 1 - scallop.depth * (1 - Math.abs(Math.sin(f * Math.PI * scallop.count)));
      pts[k] = [pts[k][0] * s, pts[k][1] * s];
    }
  }
  return {
    pts,
    margin: pts.slice(Math.max(0, ranges[margin[0]][0] - margin[2]), ranges[margin[1]][1]),
    spots: pts.slice(ranges[spots[0]][0], ranges[spots[1]][1]),
  };
}

const SHAPES: Record<Shape, { fore: WingOutline; hind: WingOutline }> = {
  round: {
    fore: wing(
      [0.02, 0.07],
      [
        [[0.25, 0.32], [0.62, 0.64], [0.98, 0.68]],
        [[1.06, 0.6], [1.03, 0.3], [0.87, 0.06]],
        [[0.79, -0.06], [0.7, -0.12], [0.6, -0.16]],
        [[0.4, -0.14], [0.18, -0.06], [0.02, -0.02]],
      ],
      [1, 2, 6],
      [1, 2]
    ),
    hind: wing(
      [0.02, -0.01],
      [
        [[0.3, 0.03], [0.66, -0.04], [0.8, -0.24]],
        [[0.92, -0.42], [0.8, -0.68], [0.58, -0.8]],
        [[0.44, -0.88], [0.26, -0.86], [0.15, -0.72]],
        [[0.05, -0.58], [0.02, -0.3], [0.02, -0.01]],
      ],
      [1, 2, 8],
      [1, 2],
      { segs: [1, 2], depth: 0.035, count: 7 }
    ),
  },
  swallowtail: {
    // Pointed forewing; scalloped hindwing drawn out into a long tail.
    fore: wing(
      [0.02, 0.07],
      [
        [[0.28, 0.34], [0.7, 0.66], [1.08, 0.7]],
        [[1.1, 0.6], [1.0, 0.3], [0.86, 0.02]],
        [[0.78, -0.08], [0.68, -0.13], [0.58, -0.15]],
        [[0.4, -0.13], [0.18, -0.06], [0.02, -0.02]],
      ],
      [1, 2, 6],
      [1, 2]
    ),
    hind: wing(
      [0.02, -0.01],
      [
        [[0.3, 0.02], [0.62, -0.02], [0.74, -0.2]],
        [[0.84, -0.36], [0.78, -0.58], [0.64, -0.72]],
        [[0.6, -0.78], [0.58, -0.84], [0.56, -0.9]],
        [[0.55, -1.05], [0.56, -1.2], [0.52, -1.3]],
        [[0.48, -1.33], [0.45, -1.25], [0.46, -1.1]],
        [[0.46, -0.98], [0.44, -0.9], [0.4, -0.86]],
        [[0.3, -0.82], [0.18, -0.76], [0.1, -0.62]],
        [[0.04, -0.48], [0.02, -0.28], [0.02, -0.01]],
      ],
      [1, 5, 6],
      [1, 1],
      { segs: [1, 2], depth: 0.06, count: 5 }
    ),
  },
  longwing: {
    // Long, narrow forewing; small rounded hindwing.
    fore: wing(
      [0.02, 0.06],
      [
        [[0.3, 0.26], [0.75, 0.42], [1.18, 0.42]],
        [[1.24, 0.36], [1.18, 0.2], [1.0, 0.1]],
        [[0.8, 0.0], [0.62, -0.08], [0.5, -0.1]],
        [[0.34, -0.1], [0.16, -0.05], [0.02, -0.02]],
      ],
      [1, 1, 6],
      [1, 1]
    ),
    hind: wing(
      [0.02, -0.01],
      [
        [[0.28, 0.02], [0.6, -0.04], [0.66, -0.2]],
        [[0.72, -0.36], [0.6, -0.52], [0.44, -0.56]],
        [[0.3, -0.6], [0.16, -0.54], [0.08, -0.42]],
        [[0.03, -0.3], [0.02, -0.15], [0.02, -0.01]],
      ],
      [1, 2, 6],
      [1, 2]
    ),
  },
};

const toTex = ([x, y]: P): P => [(x / WX) * TEX_W, ((WY_TOP - y) / (WY_TOP - WY_BOTTOM)) * TEX_H];
const PX = TEX_W / WX;

/** Used when a species has no measured `split`. */
const DEFAULT_SPLIT: P = [0.8, -0.35];
/**
 * Draws one part of a whole wing picture (TEX_W x TEX_H) into `out`: the forewing, or the hindwing. The cut runs from
 * the body out to `split` along the forewing's back edge. The hindwing reaches well up under the forewing (which is
 * drawn over it), so no gap opens between them when they beat out of step.
 */
function drawWingPart(out: HTMLCanvasElement, src: CanvasImageSource, split: P, part: Wing) {
  const g = out.getContext("2d")!;
  g.clearRect(0, 0, TEX_W, TEX_H);
  const [nx, ny] = split;
  const y0 = ny * 0.55;
  const slope = (ny - y0) / nx;
  const lift = part === "fore" ? -0.03 : 0.14;
  const [ax, ay] = toTex([-0.1, y0 - 0.1 * slope + lift]);
  const [bx, by] = toTex([WX + 0.2, y0 + (WX + 0.2) * slope + lift]);
  const edge = part === "fore" ? -10 : TEX_H + 10;
  const cut = new Path2D();
  cut.moveTo(ax, ay);
  cut.lineTo(bx, by);
  cut.lineTo(bx, edge);
  cut.lineTo(ax, edge);
  cut.closePath();
  g.save();
  g.clip(cut);
  g.drawImage(src, 0, 0, TEX_W, TEX_H);
  g.restore();
}

function pathOf(pts: P[], close: boolean) {
  const p = new Path2D();
  pts.forEach((pt, k) => {
    const [x, y] = toTex(pt);
    if (k) p.lineTo(x, y);
    else p.moveTo(x, y);
  });
  if (close) p.closePath();
  return p;
}

// A point on the margin pulled `inset` texture px in toward the root.
const inset = ([x, y]: P, px: number): P => {
  const len = Math.hypot(x, y);
  const k = Math.max(0, 1 - px / PX / len);
  return [x * k, y * k];
};

function dot(g: CanvasRenderingContext2D, [x, y]: P, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function paintMarks(g: CanvasRenderingContext2D, w: WingOutline, sp: Species, which: Wing, kinds: Mark["kind"][]) {
  for (const m of sp.marks ?? []) {
    if (m.wing !== which || !kinds.includes(m.kind)) continue;
    if (m.kind === "band") {
      g.save();
      g.strokeStyle = m.color;
      g.lineWidth = m.width * PX;
      g.lineCap = "round";
      g.lineJoin = "round";
      if (m.soft) {
        g.shadowColor = m.color;
        g.shadowBlur = m.width * PX * 0.6;
      }
      g.stroke(pathOf(m.pts, false));
      g.restore();
    } else if (m.kind === "spot") {
      const c = toTex(m.at);
      if (m.ring) dot(g, c, m.r * PX * 1.45, m.ring);
      dot(g, c, m.r * PX, m.color);
    } else {
      for (let k = 0; k < m.count; k++) {
        const at: P =
          m.where === "all"
            ? [Math.random() * TEX_W, Math.random() * TEX_H]
            : toTex(inset(w.spots[Math.floor(Math.random() * w.spots.length)], rand(sp.borderWidth * 0.3, sp.borderWidth * 1.6)));
        dot(g, at, rand(1, m.where === "all" ? 2 : 2.8), m.color);
      }
    }
  }
}

function paintWing(g: CanvasRenderingContext2D, w: WingOutline, sp: Species, which: Wing) {
  const fore = which === "fore";
  const shape = pathOf(w.pts, true);
  g.save();
  g.clip(shape);

  // Colour grows out from the body.
  const [rx, ry] = toTex([0, 0]);
  const reach = Math.max(...w.pts.map(([x, y]) => Math.hypot(x, y)));
  const base = g.createRadialGradient(rx, ry, 0, rx, ry, PX * reach);
  base.addColorStop(0, sp.root);
  base.addColorStop(0.22, sp.inner);
  base.addColorStop(0.62, sp.mid);
  base.addColorStop(1, sp.outer);
  g.fillStyle = base;
  g.fillRect(0, 0, TEX_W, TEX_H);

  // Stripes and bands sit under the veins and scales.
  paintMarks(g, w, sp, which, ["band"]);

  // Scales: a fine speckle, so it isn't a flat colour.
  for (let k = 0; k < 2200; k++) {
    g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
    g.fillRect(Math.random() * TEX_W, Math.random() * TEX_H, 1.6, 1.6);
  }

  // Veins fanning out from the root to the margin.
  g.strokeStyle = sp.vein;
  g.lineWidth = sp.veinWidth ?? 1.8;
  g.lineCap = "round";
  const [bx, by] = toTex([0.04, -0.01]);
  const every = Math.max(1, Math.floor(w.margin.length / (fore ? 8 : 7)));
  for (let k = every >> 1; k < w.margin.length; k += every) {
    const [mx, my] = toTex(w.margin[k]);
    g.beginPath();
    g.moveTo(bx, by);
    g.quadraticCurveTo((bx + mx) / 2 + (my - by) * 0.07, (by + my) / 2 - (mx - bx) * 0.07, mx, my);
    g.stroke();
  }

  // Dark forewing tip with pale spots.
  if (fore && sp.apex) {
    const tipAt = w.spots[0];
    const [ax, ay] = toTex(tipAt);
    const tip = g.createRadialGradient(ax, ay, 0, ax, ay, PX * 0.46);
    tip.addColorStop(0, sp.apex.color);
    tip.addColorStop(0.72, sp.apex.color);
    tip.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = tip;
    g.fillRect(0, 0, TEX_W, TEX_H);
    for (const [dx, dy, r] of [
      [-0.2, -0.14, 0.03],
      [-0.1, -0.2, 0.025],
      [-0.28, -0.22, 0.022],
      [-0.12, -0.32, 0.02],
    ] as const) {
      dot(g, toTex([tipAt[0] + dx, tipAt[1] + dy]), r * PX, sp.apex.dots);
    }
  }

  // Eyespots near the hindwing edge.
  if (!fore && sp.eyes) {
    for (const f of [0.3, 0.5, 0.7]) {
      const c = toTex(inset(w.spots[Math.floor(f * (w.spots.length - 1))], sp.borderWidth * 2.2));
      dot(g, c, 0.045 * PX, sp.eyes.ring);
      dot(g, c, 0.026 * PX, sp.eyes.core);
      dot(g, [c[0] - 0.008 * PX, c[1] - 0.008 * PX], 0.008 * PX, "rgba(255,255,255,0.9)");
    }
  }

  // Dark outer margin, with a row of spots in it.
  g.strokeStyle = sp.border;
  g.lineWidth = sp.borderWidth * 2;
  g.lineJoin = "round";
  g.stroke(pathOf(w.margin, false));
  if (sp.dots) {
    for (let k = 3; k < w.spots.length - 3; k += 6) {
      dot(g, toTex(inset(w.spots[k], sp.borderWidth * 0.55)), sp.borderWidth * 0.2, sp.dots);
    }
  }

  // Spots and coloured scales on top.
  paintMarks(g, w, sp, which, ["spot", "dust"]);
  g.restore();

  // Crisp edge.
  g.strokeStyle = sp.border;
  g.lineWidth = 2;
  g.stroke(shape);
}

/** One side of a butterfly (hindwing under forewing), with a furry dark base. */
function paintHalf(sp: Species) {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext("2d")!;
  const shape = SHAPES[sp.shape];
  paintWing(g, shape.hind, sp, "hind");
  paintWing(g, shape.fore, sp, "fore");
  // Fur near the body, only over the wings.
  g.globalCompositeOperation = "source-atop";
  const [rx, ry] = toTex([0, -0.05]);
  const fur = g.createRadialGradient(rx, ry, 0, rx, ry, PX * 0.3);
  fur.addColorStop(0, "rgba(20,14,24,0.95)");
  fur.addColorStop(1, "rgba(20,14,24,0)");
  g.fillStyle = fur;
  g.fillRect(0, 0, TEX_W, TEX_H);
  return c;
}

function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(0,0,0,0.8)");
  gr.addColorStop(0.5, "rgba(0,0,0,0.35)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

type Perch =
  | { kind: "letter"; i: number; x: number; y: number }
  | { kind: "sticker"; s: StickerPerch; i: number }
  | { kind: "nav"; n: NavPerch; i: number };
type Mode = "wait" | "fly" | "land" | "perch";
type Butterfly = {
  sp: Species;
  group: THREE.Group;
  /** The forewings and hindwings, right then left; each turns about the body. */
  fore: THREE.Group[];
  hind: THREE.Group[];
  /** The wing materials (top and underside of fore- and hindwing). */
  wingMats: THREE.MeshPhysicalMaterial[];
  shadow: THREE.Mesh;
  shadowMat: THREE.MeshBasicMaterial;
  mats: THREE.Material[];
  /** The modelled body (spheres, capsule, antennae), and the photo body that replaces it once loaded. */
  parts: THREE.Object3D[];
  photoBody: THREE.Mesh | null;
  /** Position on the floor (x, y from the name's far edge) and height z. */
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  goal: THREE.Vector3;
  /** Their own slow, smooth drift (added to the shared breeze). */
  wander: THREE.Vector3;
  mode: Mode;
  arriveAt: number;
  bornAt: number;
  perch: Perch | null;
  perchedAt: number;
  perchUntil: number;
  restAfter: number;
  glideUntil: number;
  phase: number;
  theta: number;
  /** The hindwings' angle: they follow the forewings a moment late. */
  thetaH: number;
  /** While resting, when (s after landing) it opens its wings to bask, and for how long (0: it doesn't). */
  baskAt: number;
  baskFor: number;
  yaw: number;
  pitch: number;
  roll: number;
  seed: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

type Props = { W: number; H: number; slab: number; stage: NameStage };

export default function ButterflyLayer({ W, H, slab, stage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || W === 0 || H === 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const Wc = Math.round(W * (1 + 2 * PAD_X));
    const Hc = Math.round(H * (1 + PAD_TOP + PAD_BOTTOM));

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    // Phones and tablets draw at normal resolution and 30 fps (lighter on their graphics chip).
    const lowPower = isLowPower();
    renderer.setPixelRatio(canvasDpr(1.5, PHONE_DPR, Wc, Hc));
    renderer.setSize(Wc, Hc, false);
    // Pinch-zoomed on a phone: draw at the zoomed resolution, so they stay sharp instead of blocky.
    const offZoom = onPinchZoom(() => {
      renderer.setPixelRatio(canvasDpr(1.5, PHONE_DPR, Wc, Hc));
      renderer.setSize(Wc, Hc, false);
    });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromScene(new RoomEnvironment(), 0.04);
    pm.dispose();

    const scene = new THREE.Scene();
    scene.environment = env.texture;
    const camera = stageCamera(W, H, PAD_X, PAD_TOP, PAD_BOTTOM);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(-0.5, 1.2, 1.4);
    const rim = new THREE.DirectionalLight(0xc8b6ff, 1.6);
    rim.position.set(1.4, 0.6, -1);
    scene.add(key, rim);

    // Everything below is placed in floor coordinates: (x, -y, height).
    const floor = new THREE.Group();
    floor.matrixAutoUpdate = false;
    floor.matrix.copy(floorMatrix(H));
    scene.add(floor);
    let recede = -1;

    const disposables: { dispose: () => void }[] = [env, renderer, { dispose: offZoom }];
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    // ---- Shared pieces ----
    const s = WING * H;
    const wingGeo = track(new THREE.PlaneGeometry(WX * s, (WY_TOP - WY_BOTTOM) * s, 10, 10));
    wingGeo.translate((WX / 2) * s, ((WY_TOP + WY_BOTTOM) / 2) * s, 0);
    // A slight curve, so the wings aren't paper flat.
    const wp = wingGeo.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < wp.count; k++) {
      const u = wp.getX(k) / s;
      const v = wp.getY(k) / s;
      wp.setZ(k, -0.05 * s * u * u + 0.02 * s * v * u);
    }
    wingGeo.computeVertexNormals();
    const halfCanvases = SPECIES.map((sp) => paintHalf(sp));
    // Each flying species' wing cut into forewing and hindwing, top and underside: painted for now, the real ones once
    // they've loaded (drawn into the same canvases).
    type Part = { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture };
    type Parts = { fore: Part; hind: Part; foreUnder: Part; hindUnder: Part };
    const makePart = (): Part => {
      const canvas = document.createElement("canvas");
      canvas.width = TEX_W;
      canvas.height = TEX_H;
      const tex = track(new THREE.CanvasTexture(canvas));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      return { canvas, tex };
    };
    const drawParts = (ps: Parts, top: CanvasImageSource, under: CanvasImageSource, split: P) => {
      drawWingPart(ps.fore.canvas, top, split, "fore");
      drawWingPart(ps.hind.canvas, top, split, "hind");
      drawWingPart(ps.foreUnder.canvas, under, split, "fore");
      drawWingPart(ps.hindUnder.canvas, under, split, "hind");
      for (const part of [ps.fore, ps.hind, ps.foreUnder, ps.hindUnder]) part.tex.needsUpdate = true;
    };
    const wingParts = new Map<number, Parts>();
    for (const kind of new Set(ROSTER)) {
      const ps: Parts = { fore: makePart(), hind: makePart(), foreUnder: makePart(), hindUnder: makePart() };
      drawParts(ps, halfCanvases[kind], halfCanvases[kind], SPECIES[kind].split ?? DEFAULT_SPLIT);
      wingParts.set(kind, ps);
    }
    // Swap in the real wings as they load (only species that fly). Same size and layout as the painted ones.
    let alive = true;
    const photoReady = new Set<number>();
    const loadImage = (url: string) =>
      new Promise<HTMLImageElement>((ok, fail) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => ok(img);
        img.onerror = fail;
        img.src = url;
      });
    for (const kind of new Set(ROSTER)) {
      const sp = SPECIES[kind];
      if (!sp.photo) continue;
      Promise.all([
        loadImage(sp.photo),
        loadImage(sp.photo.replace(/\.webp$/, "-under.webp")).catch(() => null),
        sp.body ? loadImage(sp.photo.replace(/\.webp$/, "-body.webp")) : null,
      ])
        .then(([wingImg, underImg, bodyImg]) => {
          if (!alive) return;
          drawParts(wingParts.get(kind)!, wingImg, underImg ?? wingImg, sp.split ?? DEFAULT_SPLIT);
          const bt = bodyTex.get(kind);
          if (bt && bodyImg) {
            bt.image = bodyImg;
            bt.needsUpdate = true;
          }
          for (const b of flies) {
            if (b.sp !== sp) continue;
            // A photo already has its true colours and shine: no painted-on sheen, and only the morpho keeps a hint of
            // its blue shimmer.
            for (const m of b.wingMats) {
              m.sheen = 0;
              m.iridescence = sp.iridescence >= 1 && m.side === THREE.FrontSide ? 0.35 : 0;
              m.roughness = 0.6;
              m.needsUpdate = true;
            }
            if (b.photoBody && bodyImg) {
              b.photoBody.visible = true;
              for (const p of b.parts) p.visible = false;
            }
          }
          photoReady.add(kind);
        })
        .catch(() => {});
    }
    // The same wing as a picture, for drawing a butterfly resting on a nav button.
    const looks = new Map<Species, ButterflyLook>();
    const lookOf = (sp: Species) => {
      const kind = SPECIES.indexOf(sp);
      let l = looks.get(sp);
      // Rebuild once the real wing has loaded, if the painted one was handed out first.
      if (l && photoReady.has(kind) && l.src !== sp.photo) l = undefined;
      if (!l) {
        l = {
          src: photoReady.has(kind) && sp.photo ? sp.photo : halfCanvases[kind].toDataURL(),
          aspect: TEX_W / TEX_H,
          joint: WY_TOP / (WY_TOP - WY_BOTTOM),
          size: NAV_WING_PX * sp.size,
          body:
            photoReady.has(kind) && sp.photo && sp.body
              ? {
                  src: sp.photo.replace(/\.webp$/, "-body.webp"),
                  w: sp.body.w / WX,
                  h: sp.body.h / WX,
                  x: sp.body.x / WX,
                  y: sp.body.y / WX,
                }
              : undefined,
        };
        looks.set(sp, l);
      }
      return l;
    };
    const sphereGeo = track(new THREE.SphereGeometry(1, 16, 12));
    const abdomenGeo = track(new THREE.CapsuleGeometry(0.045 * s, 0.36 * s, 4, 10));
    const antennaGeo = [-1, 1].map((side) =>
      track(
        new THREE.TubeGeometry(
          new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(side * 0.02 * s, 0.24 * s, 0.03 * s),
            new THREE.Vector3(side * 0.07 * s, 0.45 * s, 0.11 * s),
            new THREE.Vector3(side * 0.17 * s, 0.6 * s, 0.08 * s)
          ),
          12,
          Math.max(0.35, 0.006 * s),
          5
        )
      )
    );
    const planeGeo = track(new THREE.PlaneGeometry(1, 1));
    // Photo bodies, made up front (filled in when the picture loads) so each butterfly's material can use them.
    const bodyTex = new Map<number, THREE.Texture>();
    for (const kind of new Set(ROSTER)) {
      if (!SPECIES[kind].body) continue;
      const t = track(new THREE.Texture());
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      bodyTex.set(kind, t);
    }
    const shadowTex = track(shadowTexture());
    const shadowGeo = track(new THREE.PlaneGeometry(1, 1));

    // ---- Build the butterflies ----
    const now0 = performance.now() / 1000;
    const flies: Butterfly[] = ROSTER.map((kind, n): Butterfly => {
      const sp = SPECIES[kind];
      const ps = wingParts.get(kind)!;
      // Top faces up (front side); the underside shows from below (back side).
      const wingMat = (tex: THREE.Texture, side: THREE.Side) =>
        track(
        new THREE.MeshPhysicalMaterial({
          map: tex,
          side,
          roughness: 0.42,
          metalness: 0,
          iridescence: sp.iridescence,
          iridescenceIOR: 1.35,
          iridescenceThicknessRange: [180, 420],
          sheen: 0.6,
          sheenRoughness: 0.4,
          sheenColor: new THREE.Color(sp.sheen),
          envMapIntensity: 0.9,
          alphaToCoverage: true,
        })
      );
      const wingMats = [
        wingMat(ps.fore.tex, THREE.FrontSide),
        wingMat(ps.foreUnder.tex, THREE.BackSide),
        wingMat(ps.hind.tex, THREE.FrontSide),
        wingMat(ps.hindUnder.tex, THREE.BackSide),
      ];
      const bodyMat = track(
        new THREE.MeshPhysicalMaterial({
          color: 0x17111f,
          roughness: 0.75,
          sheen: 1,
          sheenRoughness: 0.45,
          sheenColor: new THREE.Color(0x8d7bb0),
          alphaToCoverage: true,
        })
      );
      const shadowMat = track(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 }));

      const group = new THREE.Group();
      group.rotation.order = "ZXY";
      // Fore- and hindwing on each side, each turning about the body; the hindwing sits just under the forewing.
      const wingPair = (top: THREE.Material, under: THREE.Material, mirror: boolean, z: number) => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(wingGeo, top), new THREE.Mesh(wingGeo, under));
        if (mirror) g.scale.x = -1;
        g.position.z = z;
        return g;
      };
      const fore = [false, true].map((m) => wingPair(wingMats[0], wingMats[1], m, 0));
      const hind = [false, true].map((m) => wingPair(wingMats[2], wingMats[3], m, -0.006 * s));
      const thorax = new THREE.Mesh(sphereGeo, bodyMat);
      thorax.scale.set(0.075 * s, 0.15 * s, 0.075 * s);
      thorax.position.y = 0.03 * s;
      const abdomen = new THREE.Mesh(abdomenGeo, bodyMat);
      abdomen.scale.set(0.9, 1, 0.9);
      abdomen.position.y = -0.27 * s;
      const head = new THREE.Mesh(sphereGeo, bodyMat);
      head.scale.setScalar(0.055 * s);
      head.position.set(0, 0.2 * s, 0.01 * s);
      group.add(...fore, ...hind, thorax, abdomen, head);
      const parts: THREE.Object3D[] = [thorax, abdomen, head];
      for (const [k, side] of [-1, 1].entries()) {
        const antenna = new THREE.Mesh(antennaGeo[k], bodyMat);
        const club = new THREE.Mesh(sphereGeo, bodyMat);
        club.scale.setScalar(Math.max(0.8, 0.02 * s));
        club.position.set(side * 0.17 * s, 0.6 * s, 0.08 * s);
        group.add(antenna, club);
        parts.push(antenna, club);
      }
      // The real body from the photo, shown (instead of the modelled one) once its picture has loaded.
      let photoBody: THREE.Mesh | null = null;
      if (sp.body) {
        const mat = track(
          new THREE.MeshStandardMaterial({ map: bodyTex.get(kind) ?? null, side: THREE.DoubleSide, roughness: 0.8, alphaToCoverage: true })
        );
        photoBody = new THREE.Mesh(planeGeo, mat);
        photoBody.scale.set(sp.body.w * s, sp.body.h * s, 1);
        photoBody.position.set(sp.body.x * s, sp.body.y * s, 0.03 * s);
        photoBody.visible = false;
        group.add(photoBody);
      }
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      floor.add(shadow, group);
      group.visible = false;
      shadow.visible = false;

      // Arrive from the left or right, high up.
      const fromRight = n % 2 === 1;
      group.scale.setScalar(sp.size);
      return {
        sp,
        group,
        fore,
        hind,
        wingMats,
        shadow,
        shadowMat,
        mats: [...wingMats, bodyMat, ...(photoBody ? [photoBody.material as THREE.Material] : [])],
        parts,
        photoBody,
        pos: new THREE.Vector3(fromRight ? W * 1.2 : -W * 0.2, rand(0.1, 0.9) * H, slab + rand(0.6, 1) * H),
        vel: new THREE.Vector3(fromRight ? -SPEED * H : SPEED * H, 0, 0),
        goal: new THREE.Vector3(),
        wander: new THREE.Vector3(),
        mode: "wait",
        arriveAt: now0 + ARRIVE_AT + n * ARRIVE_GAP,
        bornAt: 0,
        perch: null,
        perchedAt: 0,
        perchUntil: 0,
        restAfter: now0 + ARRIVE_AT + n * ARRIVE_GAP + rand(0.8, 1.6),
        glideUntil: 0,
        phase: rand(0, Math.PI * 2),
        theta: 0.4,
        thetaH: 0.4,
        baskAt: 0,
        baskFor: 0,
        yaw: fromRight ? Math.PI / 2 : -Math.PI / 2,
        pitch: 0.3,
        roll: 0,
        seed: rand(0, 10),
      };
    });

    // Get the graphics card ready now, while the loading screen is still up: upload the wing pictures and build the
    // shaders. Left to the first frame a butterfly appears in, that took 130–350 ms and froze the name as it rose.
    // (One frame drawn with every butterfly showing and wiped straight away, so nothing is ever seen. Synchronous on
    // purpose: compileAsync keeps polling materials that get disposed if this layer is rebuilt, and throws.)
    for (const b of flies) b.group.visible = b.shadow.visible = true;
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    renderer.clear();
    for (const b of flies) b.group.visible = b.shadow.visible = false;

    // ---- Where they go ----
    const roam = { x0: -0.05 * W, x1: 1.05 * W, y0: -0.3 * H, y1: 1.25 * H, z0: slab + 0.3 * H, z1: slab + 1.05 * H };
    const randomGoal = (out: THREE.Vector3) =>
      out.set(rand(roam.x0, roam.x1), rand(roam.y0, roam.y1), rand(roam.z0, roam.z1));
    flies.forEach((b) => randomGoal(b.goal));

    const surfaceAt = (x: number, y: number) => stage.heightAt(x, y, true)?.z ?? 0;
    // Resting height of the body above the surface.
    const rest = 0.08 * s;
    /**
     * The point in the hero's 3D space that appears right on top of a nav button: up in the air, at whichever
     * height puts it closest to just behind the name (so it doesn't have to fly off into the distance).
     * Null if the button is off the hero's ground (e.g. above its horizon).
     */
    const navPoint = (n: NavPerch, out: THREE.Vector3) => {
      const r = n.el.getBoundingClientRect();
      if (!r.width) return null;
      let best: { x: number; y: number; z: number } | null = null;
      for (const f of [0.9, 1.3, 1.8, 2.4]) {
        const z = slab + f * H;
        const p = stage.fromClient(r.left + r.width / 2, r.top + 2, z);
        if (p && (!best || Math.abs(p.y + 0.3 * H) < Math.abs(best.y + 0.3 * H))) best = { x: p.x, y: p.y, z };
      }
      return best ? out.set(best.x, best.y, best.z) : null;
    };
    const perchPoint = (p: Perch, out: THREE.Vector3, lift = rest) => {
      if (p.kind === "letter") return out.set(p.x, p.y, surfaceAt(p.x, p.y) + lift);
      if (p.kind === "sticker") return out.set(p.s.x, p.s.y, p.s.z + lift);
      return navPoint(p.n, out) ?? out;
    };
    const perchLetter = (p: Perch) => p.i;

    // Letters dip more with each butterfly on them, and spring back when they're left alone.
    const counts = new Map<number, number>();
    const pressLetter = (i: number, on: boolean) => {
      const m = stage.letters[i];
      if (!m) return;
      const n = Math.max(0, (counts.get(i) ?? 0) + (on ? 1 : -1));
      counts.set(i, n);
      animate(
        m.perch,
        n === 0 ? 0 : Math.min(1.3, 0.7 + 0.3 * n),
        on ? { type: "spring", stiffness: 320, damping: 11 } : { type: "spring", stiffness: 380, damping: 7 }
      );
    };
    const react = (p: Perch, on: boolean) => {
      if (p.kind === "sticker") p.s.perch(on);
      if (p.i >= 0) pressLetter(p.i, on);
    };

    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const desired = new THREE.Vector3();
    const acc = new THREE.Vector3();

    const pickPerch = (b: Butterfly) => {
      const taken = (x: number, y: number) =>
        flies.some((o) => o !== b && o.perch && perchPoint(o.perch, tmpA).setZ(0).distanceToSquared(tmpB.set(x, y, 0)) < (0.3 * H) ** 2);
      const navs = [...navPerches].filter((n) => !n.busy && !n.startled && navPoint(n, tmpA));
      if (navs.length && Math.random() < NAV_CHANCE) {
        const n = navs[Math.floor(Math.random() * navs.length)];
        n.busy = true;
        b.perch = { kind: "nav", n, i: -1 };
        return true;
      }
      const letters = stage.spots.filter((p) => p.i !== stage.pointerLetter && !taken(p.x, p.y));
      const stickers = [...stage.stickers].filter((p) => p.ready && !taken(p.x, p.y));
      if (stickers.length && (Math.random() < 0.12 || !letters.length)) {
        const st = stickers[Math.floor(Math.random() * stickers.length)];
        b.perch = { kind: "sticker", s: st, i: stage.letterIndexAt(st.x, st.y, true) };
        return true;
      }
      if (letters.length) {
        const p = letters[Math.floor(Math.random() * letters.length)];
        b.perch = { kind: "letter", i: p.i, x: p.x, y: p.y };
        return true;
      }
      return false;
    };

    const touchDown = (b: Butterfly, t: number) => {
      b.mode = "perch";
      b.perchedAt = t;
      b.baskAt = rand(0.6, 2);
      b.baskFor = Math.random() < 0.65 ? rand(1.5, 3.5) : 0;
      b.perchUntil = t + rand(5, 10);
      b.vel.set(0, 0, 0);
      if (b.perch?.kind === "nav") {
        // Hand over to the picture of it resting on the button (drawn above the nav).
        b.perch.n.land(lookOf(b.sp));
        b.group.visible = false;
        b.shadow.visible = false;
      } else if (b.perch) react(b.perch, true);
    };
    const takeOff = (b: Butterfly, t: number) => {
      if (b.perch?.kind === "nav") {
        b.perch.n.leave();
        b.perch.n.busy = false;
        b.group.visible = true;
        b.shadow.visible = true;
      } else if (b.perch) react(b.perch, false);
      b.perch = null;
      b.mode = "fly";
      b.vel.set(rand(-0.25, 0.25) * H, rand(-0.25, 0.25) * H, 0.7 * H);
      randomGoal(b.goal);
      b.restAfter = t + rand(1, 2.5);
    };

    // ---- Every frame ----
    const update = (b: Butterfly, t: number, dt: number) => {
      if (b.mode === "wait") {
        if (t < b.arriveAt) return;
        b.mode = "fly";
        b.bornAt = t;
        b.group.visible = true;
        b.shadow.visible = true;
      }

      if (b.mode === "perch" && b.perch) {
        b.pos.copy(perchPoint(b.perch, tmpA, rest * b.sp.size));
        const startled =
          (perchLetter(b.perch) >= 0 && perchLetter(b.perch) === stage.pointerLetter) || (b.perch.kind === "nav" && b.perch.n.startled);
        const gone = (b.perch.kind === "sticker" && !b.perch.s.ready) || (b.perch.kind === "nav" && !navPoint(b.perch.n, tmpB));
        if (t > b.perchUntil || startled || gone) takeOff(b, t);
      } else {
        let target = b.goal;
        let maxSpeed = SPEED * H;
        if (b.mode === "land" && b.perch) {
          const spot = perchPoint(b.perch, tmpA, rest * b.sp.size);
          const lost =
            (b.perch.kind === "sticker" && !b.perch.s.ready) ||
            (b.perch.kind === "nav" && (b.perch.n.startled || !navPoint(b.perch.n, tmpB))) ||
            // Only a real letter can be pointed at: a nav button or a sticker off the letters is -1, which is also what
            // pointerLetter is when nothing is pointed at, so without the check every such landing was called off at once.
            (perchLetter(b.perch) >= 0 && perchLetter(b.perch) === stage.pointerLetter);
          const dh = Math.hypot(spot.x - b.pos.x, spot.y - b.pos.y);
          const dist = b.pos.distanceTo(spot);
          if (lost) {
            if (b.perch.kind === "nav") b.perch.n.busy = false;
            b.perch = null;
            b.mode = "fly";
            randomGoal(b.goal);
          } else if (dist < Math.max(1.5, 0.035 * H)) {
            touchDown(b, t);
          } else {
            // Come in above the spot, then float down onto it, slowing gently as it gets close.
            target = tmpB.set(spot.x, spot.y, spot.z + Math.min(0.3 * H, dh * 0.8));
            maxSpeed = Math.min(maxSpeed, dist * 1.4 + 0.05 * H);
          }
        } else if (t > b.restAfter) {
          // Time to settle somewhere (a letter, a sticker or a nav button), checked on a timer rather than only on
          // reaching its goal: with the zig-zag flight it rarely gets close enough to a goal to ever decide.
          if (Math.random() < LAND_CHANCE && pickPerch(b)) b.mode = "land";
          else b.restAfter = t + rand(1, 2.5);
        } else if (b.pos.distanceTo(b.goal) < 0.3 * H) {
          randomGoal(b.goal);
        }

        if (b.mode === "fly" || b.mode === "land") {
          // Breezy: ease toward the target on wide curves, carried by a gentle breeze they all share plus
          // a slow drift of their own. Everything is smooth sine waves, so nothing jerks.
          const k = b.seed;
          const drift = H * BREEZE * (b.mode === "land" ? 0.25 : 1);
          b.wander.set(
            drift * (Math.sin(t * 0.23) * 0.6 + Math.sin(t * 0.7 + k) + 0.5 * Math.sin(t * 1.6 + k * 2.1)),
            drift * (Math.sin(t * 0.31 + 1) * 0.4 + Math.sin(t * 0.6 + k * 1.7) + 0.5 * Math.sin(t * 1.3 + k * 0.8)),
            drift * 0.6 * (Math.sin(t * 0.9 + k * 2.6) + 0.4 * Math.sin(t * 2.1 + k))
          );
          // Quick little zig-zags on top, the erratic way real butterflies fly (not while coming in to land).
          if (b.mode === "fly") {
            b.wander.x += drift * 0.9 * Math.sin(t * 3.1 + k * 4.3);
            b.wander.y += drift * 0.9 * Math.sin(t * 2.7 + k * 1.9);
          }
          if (t < b.glideUntil) b.wander.z -= 0.25 * H; // sinking a little while gliding
          desired.subVectors(target, b.pos);
          const d = desired.length();
          if (d > 1e-3) desired.multiplyScalar(maxSpeed / d);
          acc.subVectors(desired, b.vel).multiplyScalar(STEER).add(b.wander);
          b.vel.addScaledVector(acc, dt);
          const sp = b.vel.length();
          if (sp > maxSpeed * 1.3) b.vel.multiplyScalar((maxSpeed * 1.3) / sp);
          b.pos.addScaledVector(b.vel, dt);
          // Stay above the letters in flight; only a landing one comes down to the surface.
          const minZ = b.mode === "land" ? surfaceAt(b.pos.x, b.pos.y) + rest * b.sp.size : slab + 0.1 * H;
          if (b.pos.z < minZ) {
            b.pos.z = minZ;
            if (b.vel.z < 0) b.vel.z = 0;
          }
        }
      }

      // ---- Pose ----
      const flying = b.mode !== "perch";
      if (flying) {
        // Long, lazy glides with the wings held out, between spells of slow flapping.
        if (b.mode === "fly" && t > b.glideUntil + 0.6 && Math.random() < dt * 0.7 * b.sp.glide) b.glideUntil = t + rand(0.5, 1.3);
        const gliding = t < b.glideUntil;
        if (!gliding) b.phase += dt * Math.PI * 2 * FLAP_HZ * b.sp.flap * (b.mode === "land" ? 0.75 : 1);
        const want = gliding ? 0.18 : 0.4 + 0.95 * Math.sin(b.phase);
        b.theta += (want - b.theta) * Math.min(1, dt * (gliding ? 4 : 18));
        const hv = Math.hypot(b.vel.x, b.vel.y);
        if (hv > 0.04 * H) {
          const diff = wrapAngle(Math.atan2(-b.vel.x, -b.vel.y) - b.yaw);
          b.yaw += diff * Math.min(1, dt * 2);
          b.roll += (THREE.MathUtils.clamp(-diff * 0.8, -0.45, 0.45) - b.roll) * Math.min(1, dt * 2);
        }
        b.pitch += (0.22 + 0.12 * Math.sin(b.phase + 1.2) - b.pitch) * Math.min(1, dt * 3);
      } else {
        // Resting like a real one: wings folded up together over its back (a little quiver), now and then opened
        // flat for a while to bask.
        const since = t - b.perchedAt;
        const basking = since > b.baskAt && since < b.baskAt + b.baskFor;
        const fan = basking ? 0.22 + 0.06 * Math.sin(since * 1.3 + b.seed) : 1.45 + 0.04 * Math.sin(since * 2.3 + b.seed);
        b.theta += (fan - b.theta) * Math.min(1, dt * (basking ? 2.5 : 3.5));
        b.pitch += -b.pitch * Math.min(1, dt * 4);
        b.roll += -b.roll * Math.min(1, dt * 4);
      }
      // Each wing beat lifts it a little, so it bobs up and down as it flies.
      const bob = flying ? -0.05 * H * Math.sin(b.phase - 0.6) : 0;
      b.group.position.set(b.pos.x, -b.pos.y, b.pos.z + bob);
      b.group.rotation.set(b.pitch, b.roll, b.yaw);
      // The hindwings follow the forewings a moment late.
      b.thetaH += (b.theta - b.thetaH) * Math.min(1, dt * (flying ? 22 : 8));
      b.fore[0].rotation.y = -b.theta;
      b.fore[1].rotation.y = b.theta;
      b.hind[0].rotation.y = -b.thetaH;
      b.hind[1].rotation.y = b.thetaH;

      // Fade in on arrival.
      const f = clamp01((t - b.bornAt) / 0.8);
      for (const m of b.mats) m.opacity = f;

      // Soft shadow on whatever is under it, smaller and darker the lower it is.
      const ground = surfaceAt(b.pos.x, b.pos.y);
      const k = clamp01(1 - Math.max(0, b.pos.z - ground) / (1.4 * H));
      b.shadow.position.set(b.pos.x, -b.pos.y, ground + 0.6);
      b.shadow.scale.setScalar(s * b.sp.size * (1.6 + (1 - k) * 1.4) * (0.55 + 0.45 * Math.abs(Math.cos(b.theta))));
      b.shadowMat.opacity = 0.42 * k * k * f;
    };

    // Only animate while the hero is on screen.
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    let raf = 0;
    let last = performance.now() / 1000;
    // At most 60 frames a second (on 120 and 144 Hz screens it would otherwise draw more than twice as often).
    let lastDraw = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastDraw < 1000 / (lowPower ? 30 : 60) - 1.5) return;
      lastDraw = now;
      const t = performance.now() / 1000;
      const dt = Math.min(0.05, t - last);
      last = t;
      if (!visible) {
        // Scrolled away from the hero: any butterfly on (or heading for) a nav button lets it go.
        for (const b of flies) {
          if (b.perch?.kind !== "nav") continue;
          if (b.mode === "perch") takeOff(b, t);
          else {
            b.perch.n.busy = false;
            b.perch = null;
            b.mode = "fly";
            randomGoal(b.goal);
          }
        }
        return;
      }
      if (stage.recede !== recede) {
        recede = stage.recede;
        floor.matrix.copy(floorMatrix(H)).multiply(new THREE.Matrix4().makeTranslation(0, recede, 0));
      }
      for (const b of flies) update(b, t, dt);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      // Let go of anything they were sitting on.
      for (const b of flies) if (b.mode === "perch" && b.perch?.kind === "sticker") b.perch.s.perch(false);
      for (const b of flies) {
        if (b.perch?.kind !== "nav") continue;
        if (b.mode === "perch") b.perch.n.leave();
        b.perch.n.busy = false;
      }
      for (const i of counts.keys()) stage.letters[i]?.perch.set(0);
      for (const d of disposables) d.dispose();
    };
  }, [W, H, slab, stage]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute z-[5]"
      style={{ left: -W * PAD_X, top: -H * PAD_TOP, width: W * (1 + 2 * PAD_X), height: H * (1 + PAD_TOP + PAD_BOTTOM) }}
    />
  );
}
