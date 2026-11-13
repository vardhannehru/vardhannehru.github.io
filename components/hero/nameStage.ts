import type { MotionValue } from "framer-motion";

// Shared 3D "stage" for the hero name. The CSS 3D letters, the stickers and the WebGL keychain all
// read these, so changing a value here keeps everything lined up with the letters automatically.

/** How far the letters are laid back onto the floor, in degrees. */
export const NAME_TILT_DEG = 58;
/** Slab thickness, as a fraction of letter height. */
export const NAME_SLAB_DEPTH = 0.16;
/** Camera distance, in letter heights (CSS `perspective`). */
export const NAME_PERSPECTIVE = 5;
/** Camera height above the top of the name, in letter heights (CSS `perspective-origin` y). */
export const NAME_PERSPECTIVE_ORIGIN_Y = -0.6;
/** The name finishes sliding back along its floor after scrolling this many screen heights. */
export const RECEDE_SCREENS = 0.95;
/**
 * The screen height the hero's scroll effects are measured against. Not window.innerHeight: on phones that changes
 * while the address bar slides in and out mid-scroll, which made the name jump. The page's own height stays put.
 */
export const screenHeight = () => document.documentElement.clientHeight || window.innerHeight;

/** How much a pressed slab flattens (hover / click). */
export const PRESS_SQUASH = 0.45;
export const PUSH_SQUASH = 0.4;
/**
 * How far a pressed slab's top tips toward the pressure point: the corner under the cursor sinks by this
 * fraction of the top's height (split between tipping across and tipping front-to-back). Kept under 1 so
 * the top never reaches the floor; the bottom of the slab stays flat on the floor.
 */
export const PRESS_DIP = 0.75;
export const DIP_ACROSS = 0.35;
export const DIP_DEPTH = 0.65;

/** Tip of a pressed letter's top face (radians): `a` rolls it across (CSS rotateY), `b` front-to-back (rotateX). */
export function slabTip(px: number, py: number, pressed: number, top: number, halfW: number, halfH: number) {
  const c = (v: number) => Math.max(-0.95, Math.min(0.95, v));
  const p = Math.min(1, pressed);
  return {
    a: Math.asin(c((px * PRESS_DIP * DIP_ACROSS * p * top) / Math.max(1, halfW))),
    b: Math.asin(c((-py * PRESS_DIP * DIP_DEPTH * p * top) / Math.max(1, halfH))),
  };
}
/** How much a letter dips when a butterfly lands on it. */
export const PERCH_SQUASH = 0.14;

export type LetterBox = { x: number; w: number };
/** A letter's inked area on the floor, in px from the name's left (x) and far (y) edges. */
export type InkBox = { x0: number; x1: number; y0: number; y1: number };

/** Live state of one letter: how far it has risen out of the floor, how hard it's pressed, and where. */
export type LetterMotion = {
  rise: MotionValue<number>;
  press: MotionValue<number>;
  push: MotionValue<number>;
  px: MotionValue<number>;
  py: MotionValue<number>;
  /** A butterfly is sitting on it (0..~1.3, more with more butterflies). */
  perch: MotionValue<number>;
};

/** A solid spot on a letter's top face a butterfly can land on (px from the name's left and far edges). */
export type PerchSpot = { i: number; x: number; y: number };
/** A sticker a butterfly can land on: its centre on the floor, its height, and how it reacts. */
export type StickerPerch = { x: number; y: number; z: number; ready: boolean; perch: (on: boolean) => void };

/** Top-face height, tilt (CSS rotateY `a` / rotateX `b`, radians) and pivot of a letter right now. */
export type LetterPose = { rise: number; top: number; a: number; b: number; cx: number; cy: number };
/** Height of the surface under a floor point, and its slope along x and y. */
export type Support = { z: number; gx: number; gy: number };

const RAD = Math.PI / 180;

/** Every name on screen right now (phones show the name as two rows, so two). Effects outside the name,
 *  like the rain on the /hero page, use these to fall in the same 3D space and land on the letters. */
export const liveStages = new Set<NameStage>();

/**
 * The name's floor and letters as one live surface. HeroName keeps it up to date; stickers and the
 * keychain ask it how high the letters are under them, so they move with the letters when pressed.
 */
export class NameStage {
  letters: LetterMotion[] = [];
  boxes: LetterBox[] = [];
  ink: InkBox[] = [];
  W = 0;
  H = 0;
  slab = 0;
  /** The name's text and font size (px), once fonts have loaded (for effects that draw the letter shapes). */
  text = '';
  fontPx = 0;
  /** The element with the CSS `perspective` (its box is the name's box). */
  el: HTMLElement | null = null;
  /** The name is on screen. Stickers skip their per-frame work while it is not. */
  active = true;
  /** Something (a sticker or a charm) is being dragged, so letters shouldn't react to the pointer. */
  busy = false;
  /** How far the name has slid away along its floor (px), as the hero is scrolled past. */
  recede = 0;
  /** The letter under the pointer (-1 for none): butterflies sitting on it take off. */
  pointerLetter = -1;
  /** Where butterflies can land on the letters. */
  spots: PerchSpot[] = [];
  /** Stickers butterflies can land on (each sticker registers itself). */
  stickers = new Set<StickerPerch>();

  pose(i: number): LetterPose {
    const m = this.letters[i];
    const box = this.boxes[i];
    if (!m || !box) return { rise: 0, top: 0, a: 0, b: 0, cx: 0, cy: 0 };
    const press = m.press.get();
    const push = m.push.get();
    const rise = m.rise.get();
    const perch = m.perch.get();
    const top = Math.max(0, rise) * (1 - press * PRESS_SQUASH - push * PUSH_SQUASH - perch * PERCH_SQUASH) * this.slab;
    const { a, b } = slabTip(m.px.get(), m.py.get(), press + push, top, box.w / 2, this.H / 2);
    return {
      rise,
      top,
      a,
      b,
      cx: box.x + box.w / 2,
      cy: this.H / 2,
    };
  }

  /** Letter under a floor point (its layout box, or its inked area with `ink`), or -1. */
  letterIndexAt(x: number, y: number, ink = false) {
    if (ink) {
      return this.ink.findIndex((b) => b && x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
    }
    if (y < 0 || y > this.H) return -1;
    return this.boxes.findIndex((b) => x >= b.x && x <= b.x + b.w);
  }

  /** The letter top under a floor point, following the letter's press and tilt; null over bare floor. */
  heightAt(x: number, y: number, ink = false): Support | null {
    const i = this.letterIndexAt(x, y, ink);
    if (i < 0) return null;
    const p = this.pose(i);
    if (p.top <= 0.01) return null;
    // The top face tips about its own centre, so its centre stays at `top`.
    const cb = Math.cos(p.b);
    const sb = Math.sin(p.b);
    const gx = -cb * Math.sin(p.a);
    return { z: p.top + gx * (x - p.cx) + sb * (y - p.cy), gx, gy: sb };
  }

  /**
   * The point on the name's plane at height `z` that's under a screen position, in px from the
   * name's left and far edges. Inverts the CSS perspective + tilt exactly.
   */
  fromClient(clientX: number, clientY: number, z = 0) {
    if (!this.el || this.H === 0) return null;
    const r = this.el.getBoundingClientRect();
    const { W, H } = this;
    const t = NAME_TILT_DEG * RAD;
    const d = NAME_PERSPECTIVE * H;
    const ox = W / 2;
    const oy = NAME_PERSPECTIVE_ORIGIN_Y * H;
    const sx = clientX - r.left;
    const sy = clientY - r.top;
    const den = (sy - oy) * Math.sin(t) + d * Math.cos(t);
    if (Math.abs(den) < 1e-6) return null;
    const u = ((sy - oy) * (d - Math.cos(t) * z) - (H - oy - Math.sin(t) * z) * d) / den;
    const k = d / (d - (Math.sin(t) * u + Math.cos(t) * z));
    if (!(k > 0)) return null;
    return { x: ox + (sx - ox) / k, y: H + u + this.recede };
  }

  /**
   * Where a point on the name's plane (px from the name's left and far edges, `z` px up from the floor) appears
   * on screen, in client px. The exact inverse of `fromClient`. Also returns its perspective scale (bigger is
   * nearer the camera), or null if it's behind the camera.
   */
  toClient(x: number, y: number, z = 0) {
    if (!this.el || this.H === 0) return null;
    const r = this.el.getBoundingClientRect();
    const { W, H } = this;
    const t = NAME_TILT_DEG * RAD;
    const d = NAME_PERSPECTIVE * H;
    const ox = W / 2;
    const oy = NAME_PERSPECTIVE_ORIGIN_Y * H;
    const u = y - H - this.recede;
    const den = d - Math.sin(t) * u - Math.cos(t) * z;
    if (den <= 1) return null;
    const k = d / den;
    return { x: r.left + ox + (x - ox) * k, y: r.top + oy + k * (H - oy - Math.sin(t) * z + Math.cos(t) * u), k };
  }

  /** The letter under a screen position (its top face or front), with the spot on it. */
  letterAtClient(clientX: number, clientY: number) {
    for (const f of [1, 0.5]) {
      const p = this.fromClient(clientX, clientY, this.slab * f);
      if (!p) continue;
      const i = this.letterIndexAt(p.x, p.y);
      if (i >= 0) return { i, x: p.x, y: p.y };
    }
    return null;
  }
}
