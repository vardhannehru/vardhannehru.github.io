// A portrait that builds itself out of pixels when it scrolls into view, then "prints" into the real photo
// sticker. Each pixel is a small square sampled from the cut-out photo, in its real colour. They fly in from
// all around (the face lands first), settle into the picture, and the sticker fades in over them.
// Pointing at the portrait opens a pixel lens: around the cursor the photo melts back into its pixels, which
// scatter away from the pointer and spring back when it leaves.
//
// Once printed it behaves like the hero's skill stickers: pointing at it peels its bottom-right corner back
// (showing the white backing), and clicking flicks the corner up and lets it slap back down (silently).
//
// `cutout` is the person alone and `sticker` is the same picture with its die-cut borders. Both images must
// be the same size, so the pixels line up with the sticker.
import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useMotionValue } from 'framer-motion';
import { Peel } from '../hero/Sticker';

type Particle = {
  /** Where it lands, in canvas px. */
  tx: number;
  ty: number;
  /** Where it flies in from. */
  sx: number;
  sy: number;
  delay: number;
  dur: number;
  /** How far its path bends sideways on the way in. */
  swirl: number;
  color: string;
  /** Current push from the lens. */
  ox: number;
  oy: number;
};

/** Pixel size, CSS px. */
const CELL = 6;
/** How far outside the portrait the canvas reaches (a fraction of its width), so pixels fly in from beyond it. */
const BLEED = 0.35;
/** Radius of the pixel lens, CSS px. */
const LENS = 90;
/** The pixel lens on hover. Off: hovering the portrait only peels the sticker. */
const HOVER_LENS = false;
/** How long the sticker takes to print over the pixels, ms. */
const PRINT = 650;
const LENS_MASK = 'radial-gradient(circle var(--lens) at var(--lx) var(--ly), transparent 45%, #000 100%)';

const PEEL_SPRING = { type: 'spring', stiffness: 260, damping: 20 } as const;
/** How far the corner peels on hover, as a fraction of the portrait's smaller side (its corner is empty, so
 *  it has to reach in a little before the fold meets the sticker). */
const PEEL = 0.44;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

type Props = {
  cutout: string;
  sticker: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  /** Called once the pixels have landed and the sticker starts printing. */
  onAssembled?: () => void;
};

export default function ParticlePortrait({ cutout, sticker, alt, className = '', style, onAssembled }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(box, { once: true, amount: 0.35 });
  const [printed, setPrinted] = useState(false);
  const assembled = useRef(onAssembled);
  assembled.current = onAssembled;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const peel = useMotionValue(0);
  const hovered = useRef(false);
  const scale = useMotionValue(1);

  // The peel works in px, so keep the portrait's size.
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const peelMax = Math.min(size.w, size.h) * PEEL;
  const peelTo = (to: number) => animate(peel, to, PEEL_SPRING);
  const pull = useRef<{ id: number; cx: number; cy: number; moved: boolean; offset: number } | null>(null);
  /** The pointer in the portrait's own px (it's drawn turned a little, which is close enough to ignore). */
  const local = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * size.w, y: ((e.clientY - r.top) / r.height) * size.h };
  };
  const flick = () => {
    animate(peel, [peel.get(), peelMax * 1.3, hovered.current ? peelMax : 0], { duration: 0.65, ease: 'easeInOut' });
    animate(scale, [1, 0.96, 1.02, 1], { duration: 0.5, ease: 'easeOut' });
  };

  useEffect(() => {
    const el = box.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!inView || !el || !canvas || !ctx) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPrinted(true);
      assembled.current?.();
      return undefined;
    }

    let parts: Particle[] = [];
    let raf = 0;
    let alive = true;
    let start = 0;
    let introEnd = 0;
    let printedAt = 0;
    let w = 0;
    let h = 0;
    let bleed = 0;
    let size = CELL;
    let lens = 0;
    const pointer = { x: 0, y: 0, on: false };
    const img = new Image();

    /** Samples the cut-out into pixels sized to the portrait as it is now. */
    const build = (intro: boolean) => {
      w = el.clientWidth;
      h = el.clientHeight;
      bleed = Math.round(w * BLEED);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = w + bleed * 2;
      const ch = h + bleed * 2;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      canvas.style.left = `${-bleed}px`;
      canvas.style.top = `${-bleed}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.max(8, Math.round(w / CELL));
      const rows = Math.max(8, Math.round(h / CELL));
      const sample = document.createElement('canvas');
      sample.width = cols;
      sample.height = rows;
      const sctx = sample.getContext('2d', { willReadFrequently: true });
      if (!sctx) return;
      sctx.drawImage(img, 0, 0, cols, rows);
      const data = sctx.getImageData(0, 0, cols, rows).data;
      const sw = w / cols;
      const sh = h / rows;
      size = Math.max(1.5, sw * 0.82);
      // The face lands first: delays grow with distance from it.
      const fx = w * 0.5;
      const fy = h * 0.32;
      const far = Math.hypot(w, h);

      parts = [];
      let last = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = (j * cols + i) * 4;
          if (data[k + 3] < 140) continue;
          const tx = bleed + (i + 0.5) * sw;
          const ty = bleed + (j + 0.5) * sh;
          const angle = Math.random() * Math.PI * 2;
          const reach = (0.55 + Math.random() * 0.8) * far;
          const p: Particle = {
            tx,
            ty,
            sx: bleed + fx + Math.cos(angle) * reach,
            sy: bleed + fy + Math.sin(angle) * reach,
            delay: (Math.hypot(tx - bleed - fx, ty - bleed - fy) / far) * 650 + Math.random() * 280,
            dur: 900 + Math.random() * 500,
            swirl: (Math.random() - 0.5) * 120,
            color: `rgb(${data[k]},${data[k + 1]},${data[k + 2]})`,
            ox: 0,
            oy: 0,
          };
          last = Math.max(last, p.delay + p.dur);
          parts.push(p);
        }
      }
      if (intro) introEnd = last;
    };

    const draw = (now: number) => {
      raf = 0;
      if (!alive) return;
      const t = now - start;
      ctx.clearRect(0, 0, w + bleed * 2, h + bleed * 2);
      // Once the sticker has printed, pixels only show inside the lens.
      const printing = printedAt ? Math.min(1, (now - printedAt) / PRINT) : 0;
      lens += ((pointer.on ? LENS : 0) - lens) * 0.14;
      if (lens < 0.3) lens = 0;
      el.style.setProperty('--lens', `${lens.toFixed(1)}px`);
      el.style.setProperty('--lx', `${(pointer.x - bleed).toFixed(1)}px`);
      el.style.setProperty('--ly', `${(pointer.y - bleed).toFixed(1)}px`);

      let settling = false;
      for (const p of parts) {
        const local = Math.min(1, Math.max(0, (t - p.delay) / p.dur));
        if (local <= 0) continue;
        let dx = 0;
        let dy = 0;
        let show = 1 - printing;
        if (lens > 0) {
          const vx = p.tx - pointer.x;
          const vy = p.ty - pointer.y;
          const d = Math.hypot(vx, vy) || 1;
          const f = Math.max(0, 1 - d / LENS);
          dx = (vx / d) * f * f * 34;
          dy = (vy / d) * f * f * 34;
          show = Math.max(show, Math.min(1, f * 1.6) * (lens / LENS));
        }
        p.ox += (dx - p.ox) * 0.2;
        p.oy += (dy - p.oy) * 0.2;
        if (Math.abs(dx - p.ox) > 0.1 || Math.abs(dy - p.oy) > 0.1) settling = true;
        if (show <= 0.01) continue;
        const e = easeOut(local);
        const bend = Math.sin(e * Math.PI) * p.swirl;
        const ux = p.tx - p.sx;
        const uy = p.ty - p.sy;
        const len = Math.hypot(ux, uy) || 1;
        const x = p.sx + ux * e - (uy / len) * bend + p.ox;
        const y = p.sy + uy * e + (ux / len) * bend + p.oy;
        ctx.globalAlpha = Math.min(1, local * 2) * show;
        ctx.fillStyle = p.color;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;

      if (!printedAt && t >= introEnd) {
        printedAt = now;
        setPrinted(true);
        assembled.current?.();
      }
      const busy = t < introEnd || now - printedAt < PRINT || pointer.on || lens > 0 || settling;
      if (busy) raf = requestAnimationFrame(draw);
    };

    const wake = () => {
      if (!raf && alive && parts.length) raf = requestAnimationFrame(draw);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.x = e.clientX - r.left + bleed;
      pointer.y = e.clientY - r.top + bleed;
      pointer.on = true;
      wake();
    };
    const onLeave = () => {
      pointer.on = false;
      wake();
    };

    img.onload = () => {
      if (!alive) return;
      build(true);
      start = performance.now();
      wake();
    };
    img.src = cutout;
    if (HOVER_LENS) {
      el.addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('pointerleave', onLeave, { passive: true });
    }
    const resize = new ResizeObserver(() => {
      if (!parts.length) return;
      build(false);
      wake();
    });
    resize.observe(el);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      img.onload = null;
      resize.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [inView, cutout]);

  return (
    <div
      ref={box}
      className={`relative ${className}`}
      style={{ '--lens': '0px', '--lx': '50%', '--ly': '50%', ...style } as React.CSSProperties}
    >
      {/* The sticker, which peels like the hero's stickers once it has printed */}
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: printed ? 1 : 0,
          transform: printed ? 'scale(1)' : 'scale(1.035)',
          transition: `opacity ${PRINT}ms ease, transform ${PRINT + 300}ms cubic-bezier(.2,.8,.2,1)`,
          pointerEvents: printed ? 'auto' : 'none',
          cursor: printed ? 'grab' : undefined,
          touchAction: 'pan-y',
        }}
        onPointerEnter={() => {
          hovered.current = true;
          if (printed && !pull.current) peelTo(peelMax);
        }}
        onPointerMove={(e) => {
          if (!printed) return;
          const d = pull.current;
          if (!d) {
            // Peels even if the pointer was already over it when it printed.
            hovered.current = true;
            if (peel.get() < peelMax * 0.5) peelTo(peelMax);
            return;
          }
          if (d.id !== e.pointerId) return;
          const at = local(e);
          if (Math.hypot(e.clientX - d.cx, e.clientY - d.cy) > 5) d.moved = true;
          // Grabbing and pulling: the folded-over corner follows the pointer (it's the corner mirrored over
          // the fold, so the fold sits halfway between the corner and the pointer).
          const reach = (size.w + size.h - at.x - at.y) / 2;
          peel.set(Math.max(peelMax, Math.min((size.w + size.h) * 0.8, reach + d.offset)));
        }}
        onPointerLeave={() => {
          hovered.current = false;
          if (!pull.current) peelTo(0);
        }}
        onPointerDown={(e) => {
          if (!printed || e.button !== 0 || e.pointerType === 'touch') return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          const at = local(e);
          // Keep the corner where it is at the moment of grabbing, then follow the pointer from there.
          pull.current = { id: e.pointerId, cx: e.clientX, cy: e.clientY, moved: false, offset: peel.get() - (size.w + size.h - at.x - at.y) / 2 };
        }}
        onPointerUp={() => {
          const d = pull.current;
          pull.current = null;
          if (!d) return;
          if (!d.moved) flick();
          // Let go: it slaps back down (to the hover peel while the pointer is still on it).
          else animate(peel, hovered.current ? peelMax : 0, { type: 'spring', stiffness: 520, damping: 22 });
        }}
        onPointerCancel={() => {
          pull.current = null;
          peelTo(hovered.current ? peelMax : 0);
        }}
        onClick={(e) => {
          // Touch has no hover or drag: a tap flicks the corner.
          if (printed && (e.nativeEvent as PointerEvent).pointerType === 'touch') flick();
        }}
      >
        <motion.div className="absolute inset-0" style={{ scale }}>
          {size.w > 0 && (
            <Peel
              w={size.w}
              h={size.h}
              amount={peel}
              silhouette={(c) => <div className="absolute inset-0" style={{ ...stickerShape(sticker), background: c }} />}
              face={
                <div className="absolute inset-0" style={{ WebkitMaskImage: LENS_MASK, maskImage: LENS_MASK }}>
                  <img
                    src={sticker}
                    alt={alt}
                    draggable={false}
                    className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                  />
                  {/* Vinyl sheen, cut to the sticker's shape */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      ...stickerShape(sticker),
                      background:
                        'linear-gradient(125deg, rgba(255,255,255,0.28), rgba(255,255,255,0) 40%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0) 85%)',
                    }}
                  />
                </div>
              }
            />
          )}
        </motion.div>
      </motion.div>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute" />
    </div>
  );
}

/** The sticker's die-cut outline (from its transparent edges), placed like the picture (object-contain). */
function stickerShape(src: string): React.CSSProperties {
  return {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  };
}
