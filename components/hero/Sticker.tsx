import React, { createContext, useContext, useEffect, useRef } from "react";
import { animate, motion, useAnimationFrame, useMotionValue, useTransform, type Easing, type MotionValue } from "framer-motion";
import { playStickerLand } from "./chimes";
import { NAME_TILT_DEG, type NameStage, type StickerPerch, type Support } from "./nameStage";

/** The hero name's live stage, so stickers can ride on the letters. */
export const NameStageContext = createContext<NameStage | null>(null);

const RAD = Math.PI / 180;
// Sits this far above the surface, so it never sinks into it.
const GAP = 2;
// Colour of a sticker's backing paper, seen when a corner is peeled up.
export const BACKING = "#ece9f2";
const PEEL_SPRING = { type: "spring", stiffness: 260, damping: 20 } as const;
/** Sticker sounds (landing and clicking). Off: only the name's letters make sound. */
const STICKER_SOUNDS = false;

// Points sampled under the sticker (x, y as fractions of its size, from its bottom centre).
const SAMPLES: [number, number][] = [
  [0, -0.5],
  [-0.42, -0.5],
  [0.42, -0.5],
  [0, -0.08],
  [0, -0.92],
  // A grid over the whole sticker, edges included, so a pressed letter tipping up anywhere under it
  // (a corner rises when it tips) can never poke through between samples.
  ...[-0.5, -0.33, -0.17, 0, 0.17, 0.33, 0.5].flatMap((fx) => [-1, -0.5, 0].map((fy): [number, number] => [fx, fy])),
];

type Props = {
  width: number;
  height: number;
  /** Top-left corner, as fractions of the name's box. */
  left: number;
  top: number;
  rotate: number;
  /** Height it floats at, upright, before it's pasted down. */
  lift: number;
  delay: number;
  /** How far the corner peels up on hover, in px. */
  peel: number;
  face: React.ReactNode;
  /** The sticker's outline filled with a colour (for its backing and shadows). */
  silhouette: (color: string) => React.ReactNode;
};

/**
 * A sticker lying in the name's 3D plane. It pastes itself down once (upright facing you, then tipped
 * flat onto the surface), then stays flat: it rides on the letters under it as they're pressed,
 * peels a corner up on hover, and can be peeled off and stuck somewhere else by dragging.
 */
export default function Sticker({ width: w, height: h, left, top, rotate, lift, delay, peel: peelMax, face, silhouette }: Props) {
  const stage = useContext(NameStageContext);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const z = useMotionValue(lift);
  const rotateX = useMotionValue(-NAME_TILT_DEG);
  const rotateY = useMotionValue(0);
  const scale = useMotionValue(1.08);
  const opacity = useMotionValue(0);
  const pasteTilt = useMotionValue(-NAME_TILT_DEG);
  const pasteLift = useMotionValue(lift);
  const dragLift = useMotionValue(0);
  const peel = useMotionValue(0);
  const surface = useRef({ z: 0, sx: 0, sy: 0, ready: false });
  const drag = useRef<{ id: number; x0: number; y0: number; px: number; py: number; moved: boolean } | null>(null);
  const hovered = useRef(false);
  // Where a butterfly can land on it, kept up to date every frame.
  const perchSpot = useRef<StickerPerch | null>(null);
  const perchReaction = useRef<(on: boolean) => void>(() => {});

  // Paste in, once: upright facing you, then it tips over and slaps flat onto the surface.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      pasteTilt.set(0);
      pasteLift.set(0);
      opacity.set(1);
      scale.set(1);
      return;
    }
    const opts = { duration: 1.3, times: [0, 0.35, 0.85, 1], ease: ["easeOut", "easeIn", "easeOut"] as Easing[], delay };
    const controls = [
      animate(pasteTilt, [-NAME_TILT_DEG, -NAME_TILT_DEG, 3, 0], opts),
      animate(pasteLift, [lift, lift, 0, 0], opts),
      animate(opacity, [0, 1, 1, 1], opts),
      animate(scale, [1.08, 1.08, 0.97, 1], opts),
    ];
    // The moment it slaps down (85% of the way through), it makes a sound, if sound is allowed yet.
    const landed = window.setTimeout(
      () => STICKER_SOUNDS && playStickerLand(Math.max(-0.7, Math.min(0.7, left * 1.4 - 0.6))),
      (delay + opts.duration * 0.85) * 1000
    );
    return () => {
      controls.forEach((c) => c.stop());
      window.clearTimeout(landed);
    };
    // Runs once: the paste is only the entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every frame: find the surface under the sticker (letter tops, pressed or not, or the floor) and
  // lie flat on it.
  useAnimationFrame((_, delta) => {
    if (!stage || stage.H === 0 || !stage.active) return;
    const cr = Math.cos(rotate * RAD);
    const sr = Math.sin(rotate * RAD);
    const bx = left * stage.W + w / 2 + x.get();
    const by = top * stage.H + h + y.get();
    const hits: (Support | null)[] = SAMPLES.map(([fx, fy]) => {
      const ux = fx * w;
      const uy = fy * h;
      return stage.heightAt(bx + ux * cr - uy * sr, by + ux * sr + uy * cr);
    });
    let sx = 0;
    let sy = 0;
    const valid = hits.flatMap((s, k) => (s ? [k] : []));
    if (valid.length) {
      const avg = (f: (k: number) => number) => valid.reduce((a, k) => a + f(k), 0) / valid.length;
      const [, L, R, B, T] = hits;
      // Slope along the sticker's own axes: across the samples if they're all on letters, else the letter's.
      sx = L && R ? (R.z - L.z) / (0.84 * w) : avg((k) => hits[k]!.gx * cr + hits[k]!.gy * sr);
      sy = B && T ? (B.z - T.z) / (0.84 * h) : avg((k) => -hits[k]!.gx * sr + hits[k]!.gy * cr);
      sx = Math.max(-0.6, Math.min(0.6, sx));
      sy = Math.max(-0.6, Math.min(0.6, sy));
    }
    const s = surface.current;
    // Quick smoothing of the tilt, so stepping from the floor onto a letter isn't a jump.
    const f = s.ready ? Math.min(1, (delta / 1000) * 30) : 1;
    s.sx += (sx - s.sx) * f;
    s.sy += (sy - s.sy) * f;
    // Rest on the highest point under it (at the tilt it's actually at), not the average, so when one
    // letter under it is pressed the others don't poke up through it.
    let z0 = valid.length ? -Infinity : 0;
    for (const k of valid) z0 = Math.max(z0, hits[k]!.z - s.sx * SAMPLES[k][0] * w - s.sy * SAMPLES[k][1] * h);
    // Rises at once when a letter comes back up under it; only settles down smoothly.
    s.z = !s.ready || z0 > s.z ? z0 : s.z + (z0 - s.z) * f;
    s.ready = true;
    const set = (mv: MotionValue<number>, v: number) => {
      if (Math.abs(mv.get() - v) > 0.001) mv.set(v);
    };
    set(z, s.z + GAP + pasteLift.get());
    set(rotateX, Math.asin(s.sy) / RAD + pasteTilt.get());
    set(rotateY, -Math.asin(s.sx) / RAD);

    const spot = perchSpot.current;
    if (spot) {
      spot.x = bx + 0.5 * h * sr;
      spot.y = by - 0.5 * h * cr;
      spot.z = z.get() + dragLift.get();
      spot.ready = !drag.current && pasteLift.get() < 0.5 && opacity.get() > 0.95;
    }
  });

  // Butterflies can land on it (see ButterflyLayer).
  useEffect(() => {
    if (!stage) return;
    const spot: StickerPerch = { x: 0, y: 0, z: 0, ready: false, perch: (on) => perchReaction.current(on) };
    perchSpot.current = spot;
    stage.stickers.add(spot);
    return () => {
      stage.stickers.delete(spot);
      perchSpot.current = null;
    };
  }, [stage]);

  const peelTo = (to: number) => animate(peel, to, PEEL_SPRING);

  // A butterfly landing makes it wobble and lift its corner a little; taking off, the wing gust flicks
  // the corner up and it settles again.
  perchReaction.current = (on) => {
    if (drag.current) return;
    animate(scale, [1, 0.95, 1.025, 1], { duration: 0.55, ease: "easeOut" });
    if (on) peelTo(peelMax * 0.3);
    else animate(peel, [peel.get(), peelMax * 0.55, hovered.current ? peelMax : 0], { duration: 0.7, ease: "easeInOut" });
  };

  const lastType = useRef("mouse");
  const tapEffect = () => {
    animate(peel, [peel.get(), peelMax * 1.25, hovered.current ? peelMax : 0], { duration: 0.65, ease: "easeInOut" });
    animate(scale, [1, 0.93, 1.04, 1], { duration: 0.5, ease: "easeOut" });
    if (STICKER_SOUNDS) playStickerLand(Math.max(-0.7, Math.min(0.7, left * 1.4 - 0.6)));
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    lastType.current = e.pointerType;
    // Touch: no dragging (a swipe over a sticker has to scroll the page); a tap is handled in onClick.
    if (e.pointerType === "touch") return;
    if (e.button !== 0 || !stage) return;
    const p = stage.fromClient(e.clientX, e.clientY);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x0: x.get(), y0: y.get(), px: p.x, py: p.y, moved: false };
    stage.busy = true;
    animate(dragLift, Math.min(w, h) * 0.3, { type: "spring", stiffness: 300, damping: 22 });
    peelTo(peelMax * 1.3);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !stage) return;
    const p = stage.fromClient(e.clientX, e.clientY);
    if (!p) return;
    if (Math.hypot(p.x - d.px, p.y - d.py) > 6) d.moved = true;
    x.set(d.x0 + p.x - d.px);
    y.set(d.y0 + p.y - d.py);
  };
  const endDrag = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (stage) stage.busy = false;
    // Stick it back down with a little slap.
    animate(dragLift, 0, { type: "spring", stiffness: 520, damping: 20 });
    if (!d.moved) {
      // A click (no drag): the corner flicks up and flaps back, and the sticker wobbles and thumps.
      tapEffect();
      return;
    }
    peelTo(hovered.current ? peelMax : 0);
  };

  const shadowOpacity = useTransform(dragLift, [0, Math.min(w, h) * 0.3], [0, 0.4]);
  const shadowBlur = useTransform(dragLift, (v) => `blur(${(2 + v * 0.18).toFixed(1)}px)`);
  const shadowY = useTransform(dragLift, (v) => v * 0.25);

  return (
    <motion.div
      className="pointer-events-auto absolute cursor-grab touch-pan-y active:cursor-grabbing"
      style={{
        left: `${left * 100}%`,
        top: `${top * 100}%`,
        width: w,
        height: h,
        x,
        y,
        z,
        rotate,
        rotateX,
        rotateY,
        scale,
        opacity,
        transformOrigin: "50% 100%",
        transformStyle: "preserve-3d",
      }}
      onPointerEnter={() => {
        hovered.current = true;
        if (!drag.current) peelTo(peelMax);
      }}
      onPointerLeave={() => {
        hovered.current = false;
        if (!drag.current) peelTo(0);
      }}
      onClick={(e) => {
        // Keep the tap from also pressing the letter underneath.
        e.stopPropagation();
        if (lastType.current === "touch") tapEffect();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
    >
      {/* Shadow cast on the surface while it's lifted off. */}
      <motion.div className="pointer-events-none absolute inset-0" style={{ opacity: shadowOpacity, filter: shadowBlur, y: shadowY }}>
        {silhouette("#000")}
      </motion.div>
      <motion.div className="absolute inset-0" style={{ z: dragLift }}>
        <Peel w={w} h={h} amount={peel} face={face} silhouette={silhouette} />
      </motion.div>
    </motion.div>
  );
}

/**
 * Peels the bottom-right corner back along a diagonal fold. The flap is the sticker's own outline
 * mirrored over the fold, so it works for any shape (pills, die-cut icons). Also used by the About
 * portrait sticker (ParticlePortrait).
 */
export function Peel({
  w,
  h,
  amount,
  face,
  silhouette,
}: {
  w: number;
  h: number;
  amount: MotionValue<number>;
  face: React.ReactNode;
  silhouette: (color: string) => React.ReactNode;
}) {
  // Everything on this side of the fold line x + y = C stays; the rest is folded over it.
  const big = 2 * (w + h);
  const clip = useTransform(amount, (p) => {
    const c = w + h - p;
    return `polygon(${-big}px ${-big}px, ${c + big}px ${-big}px, ${-big}px ${c + big}px)`;
  });
  const flip = useTransform(amount, (p) => `matrix(0, -1, -1, 0, ${w + h - p}, ${w + h - p})`);
  // The flap's shadow on the sticker, a little further out from the fold.
  const shadeFlip = useTransform(amount, (p) => `matrix(0, -1, -1, 0, ${w + h - p * 1.12}, ${w + h - p * 1.12})`);
  const flapVisible = useTransform(amount, (p) => (p > 0.5 ? 1 : 0));
  return (
    <>
      <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
        {face}
      </motion.div>
      <motion.div className="pointer-events-none absolute inset-0" style={{ clipPath: clip, opacity: flapVisible }}>
        <motion.div className="absolute inset-0" style={{ transform: shadeFlip, transformOrigin: "0 0", opacity: 0.3 }}>
          {silhouette("#000")}
        </motion.div>
        <motion.div className="absolute inset-0" style={{ transform: flip, transformOrigin: "0 0" }}>
          {silhouette(BACKING)}
        </motion.div>
      </motion.div>
    </>
  );
}
