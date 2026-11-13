// Certifications as a folder of cards. When the section scrolls into view the certificates slide up out of a
// lavender folder and sweep along an arc into a fan. Pointing at a card lifts it out of the fan and shows what it
// is; clicking opens it full size. Dragging across the fan spins it, and scrolling turns it a little. Clicking the
// folder puts the cards back and deals them out again. On phones the folder sits at the bottom and the cards fan
// out above it like a hand of cards.
// The folder's paper texture and the VERIFIED stamp were made with Higgsfield (public/certificates/).
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { CERTIFICATES } from './certificates';

const MONO = "'Geist Mono', ui-monospace, monospace";
const DISPLAY = "'Anton', 'Inter', sans-serif";
const PAPER = 'url(/certificates/folder-paper.webp) center / 360px';
const STAMP = '/certificates/stamp-verified.webp';
const CARD_ASPECT = 1.414;
const SPRING = { stiffness: 120, damping: 18 };

type Geo = {
  W: number;
  H: number;
  /** The point the fan turns around, and its radius. */
  cx: number;
  cy: number;
  R: number;
  /** Angle of the first card (deg, 0 = straight up from the centre) and the angle between cards. */
  start: number;
  step: number;
  /** Where the cards wait inside the folder, as an angle and radius about the same centre. */
  hidden: { a: number; r: number };
  cw: number;
  ch: number;
  /** How far a card rises out of the fan when pointed at. */
  lift: number;
  spin: [number, number];
  folder: { x: number; y: number; w: number; h: number };
  phone: boolean;
};

const DEG = 180 / Math.PI;

/** Lays the folder and the fan out for a stage `W` px wide holding `n` cards. */
function layout(W: number, n: number): Geo {
  if (W >= 768) {
    // Desktop: the folder on the left, the fan rising out of it and sweeping to the right.
    const k = Math.min(1, W / 1180);
    const H = Math.round(640 * k);
    const folder = { w: 300 * k, h: 210 * k, x: 30 * k, y: H - 30 * k - 210 * k };
    const R = 470 * k;
    const start = -58;
    const fx = folder.x + folder.w / 2;
    const fy = folder.y - 50 * k; // the first card's centre: well out of the folder, its bottom still tucked in
    const cx = fx - R * Math.sin(start / DEG);
    const cy = fy + R * Math.cos(start / DEG);
    const px = fx;
    const py = folder.y + folder.h * 0.6;
    const cw = 250 * k;
    return {
      W,
      H,
      cx,
      cy,
      R,
      start,
      step: 18,
      hidden: { a: Math.atan2(px - cx, cy - py) * DEG, r: Math.hypot(px - cx, py - cy) },
      cw,
      ch: cw / CARD_ASPECT,
      lift: 34 * k,
      spin: [-36, 14],
      folder,
      phone: false,
    };
  }
  // Phones: the folder at the bottom in the middle, the cards fanned out above it.
  const k = W / 375;
  const H = Math.round(460 * k);
  const folder = { w: 200 * k, h: 136 * k, x: (W - 200 * k) / 2, y: H - 16 * k - 136 * k };
  const R = 260 * k;
  // Spread so the outer cards stay on screen (sin(30°) × R plus half a card is under half the width).
  const step = 60 / Math.max(1, n - 1);
  const cx = W / 2;
  // The middle card stands well clear of the folder, its bottom edge just tucked in.
  const cy = folder.y - 70 * k + R;
  const py = folder.y + folder.h * 0.6;
  const cw = 112 * k;
  return {
    W,
    H,
    cx,
    cy,
    R,
    start: (-step * (n - 1)) / 2,
    step,
    hidden: { a: 0, r: cy - py },
    cw,
    ch: cw / CARD_ASPECT,
    lift: 22 * k,
    spin: [-20, 20],
    folder,
    phone: true,
  };
}

/** One certificate in the fan. */
function FanCard({
  i,
  geo,
  dealt,
  hovered,
  spin,
  onEnter,
  onLeave,
  onOpen,
}: {
  i: number;
  geo: Geo;
  dealt: boolean;
  hovered: boolean;
  spin: MotionValue<number>;
  onEnter: () => void;
  onLeave: () => void;
  onOpen: () => void;
}) {
  const c = CERTIFICATES[i];
  const target = geo.start + i * geo.step;
  const base = useSpring(geo.hidden.a, SPRING);
  const radius = useSpring(geo.hidden.r, SPRING);
  const scale = useSpring(0.72, SPRING);
  const opacity = useSpring(0, { stiffness: 220, damping: 30 });
  // The first deal is staggered card by card; after that (hover, resizing) cards respond at once.
  const settled = useRef(false);

  useEffect(() => {
    const apply = () => {
      base.set(dealt ? target : geo.hidden.a);
      radius.set(dealt ? geo.R + (hovered ? geo.lift : 0) : geo.hidden.r);
      scale.set(dealt ? (hovered ? 1.06 : 1) : 0.72);
      opacity.set(dealt ? 1 : 0);
      settled.current = dealt;
    };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      apply();
      base.jump(base.get());
      return undefined;
    }
    if (dealt && settled.current) {
      apply();
      return undefined;
    }
    const t = window.setTimeout(apply, dealt ? i * 90 : (CERTIFICATES.length - i) * 35);
    return () => window.clearTimeout(t);
  }, [dealt, hovered, target, geo.R, geo.lift, geo.hidden.a, geo.hidden.r, i, base, radius, scale, opacity]);

  const angle = useTransform([base, spin] as MotionValue<number>[], ([b, s]: number[]) => b + s);
  const out = useTransform(radius, (r) => -r);
  const transform = useMotionTemplate`translate(${geo.cx}px, ${geo.cy}px) rotate(${angle}deg) translateY(${out}px) translate(-50%, -50%) scale(${scale})`;

  return (
    <motion.button
      type="button"
      aria-label={`Open certificate: ${c.title}, ${c.issuer}`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onEnter()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && onLeave()}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onOpen}
      className="absolute left-0 top-0 block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#c8b6ff]"
      style={{ width: geo.cw, height: geo.ch, transform, opacity, zIndex: hovered ? 50 : 20 - i, borderRadius: 14 }}
    >
      <span
        className="block h-full w-full rounded-[14px] bg-[#f4efe6] p-[5px]"
        style={{ boxShadow: hovered ? '0 26px 50px rgba(0,0,0,0.55)' : '0 12px 28px rgba(0,0,0,0.45)', transition: 'box-shadow 0.3s' }}
      >
        <img
          src={c.thumb}
          alt=""
          loading="lazy"
          draggable={false}
          className="block h-full w-full select-none rounded-[9px] bg-white object-contain"
        />
      </span>
    </motion.button>
  );
}

/** The folder: a back panel with its tab (behind the cards) and a front flap (in front of them). */
function Folder({ geo, count, onShuffle }: { geo: Geo; count: number; onShuffle: () => void }) {
  const { x, y, w, h } = geo.folder;
  const flapTop = h * 0.2;
  return (
    <>
      <div aria-hidden="true" className="absolute z-0" style={{ left: x, top: y, width: w, height: h }}>
        {/* The tab */}
        <div
          className="absolute left-0 flex items-center overflow-hidden px-3"
          style={{
            top: -h * 0.13,
            width: w * 0.44,
            height: h * 0.18,
            borderRadius: '12px 14px 0 0',
            background: `linear-gradient(rgba(110,86,200,0.18), rgba(110,86,200,0.18)), ${PAPER}`,
          }}
        >
          <span className="truncate text-[10px] uppercase tracking-[0.2em] text-[#33226e]/75 md:text-[11px]" style={{ fontFamily: MONO }}>
            certificates
          </span>
        </div>
        {/* The back panel, a shade darker: it's inside the folder */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: '4px 16px 16px 16px',
            background: `linear-gradient(180deg, rgba(110,86,200,0.22), rgba(70,50,150,0.38)), ${PAPER}`,
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
          }}
        />
      </div>

      {/* The front flap: opens a little when pointed at; clicking it shuffles the cards back in and out again. */}
      <div className="absolute z-[60]" style={{ left: x, top: y + flapTop, width: w, height: h - flapTop, perspective: 700 }}>
        <motion.button
          type="button"
          onClick={onShuffle}
          aria-label="Shuffle the certificates back into the folder and deal them out again"
          className="relative block h-full w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-[#c8b6ff]"
          style={{
            transformOrigin: '50% 100%',
            borderRadius: 16,
            background: `linear-gradient(172deg, rgba(255,255,255,0.42), rgba(255,255,255,0) 38%), ${PAPER}`,
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -3px 6px rgba(70,50,150,0.18), 0 -8px 18px rgba(40,20,90,0.28), 0 22px 40px rgba(0,0,0,0.45)',
          }}
          whileHover={{ rotateX: -18 }}
          whileTap={{ rotateX: -6, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <img
            src={STAMP}
            alt=""
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{ right: w * 0.07, top: (h - flapTop) * 0.14, width: w * 0.42, rotate: '-9deg', opacity: 0.92 }}
          />
          <span className="absolute bottom-[12%] left-[7%] block text-[#33226e]" style={{ fontFamily: MONO }}>
            <span className="block text-[9px] uppercase tracking-[0.22em] opacity-70 md:text-[10px]">Vardhan Nehru</span>
            <span className="block text-[11px] font-medium md:text-[13px]">
              {String(count).padStart(2, '0')} files · 2026
            </span>
          </span>
        </motion.button>
      </div>
    </>
  );
}

/** The certificate full size, with its details. Drawn into the page body so nothing clips it. Also used by CertificateStack. */
export function Viewer({ index, onClose, onStep }: { index: number | null; onClose: () => void; onStep: (d: number) => void }) {
  useEffect(() => {
    if (index === null) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onStep(1);
      if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, onClose, onStep]);

  const c = index === null ? null : CERTIFICATES[index];
  const btn =
    'grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-[#c8b6ff] hover:text-white';
  return createPortal(
    <AnimatePresence>
      {c && index !== null && (
        <motion.div
          key="viewer"
          role="dialog"
          aria-modal="true"
          aria-label={c.title}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-[#07040f]/90 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.figure
            className="relative w-full max-w-4xl"
            initial={{ y: 30, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl bg-[#f4efe6] p-2 shadow-[0_40px_90px_rgba(0,0,0,0.6)] md:p-3">
              <AnimatePresence mode="wait">
                <motion.img
                  key={c.id}
                  src={c.full}
                  alt={c.title}
                  className="mx-auto block max-h-[68vh] w-full rounded-xl object-contain"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22 }}
                />
              </AnimatePresence>
            </div>
            <figcaption className="mt-4 flex flex-wrap items-end justify-between gap-4 text-white">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/45" style={{ fontFamily: MONO }}>
                  {String(index + 1).padStart(2, '0')} / {String(CERTIFICATES.length).padStart(2, '0')}
                </p>
                <p className="mt-1 text-lg font-semibold md:text-xl">{c.title}</p>
                <p className="text-sm text-white/60">
                  {c.issuer} · {c.date}
                  {c.credential ? ` · ID ${c.credential}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.verify && (
                  <a
                    href={c.verify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#c8b6ff] px-4 py-2 text-sm font-bold text-[#07040f] transition-transform hover:scale-105"
                  >
                    Verify ↗
                  </a>
                )}
                <button type="button" aria-label="Previous certificate" className={btn} onClick={() => onStep(-1)}>
                  ←
                </button>
                <button type="button" aria-label="Next certificate" className={btn} onClick={() => onStep(1)}>
                  →
                </button>
                <button type="button" aria-label="Close" className={btn} onClick={onClose}>
                  ×
                </button>
              </div>
            </figcaption>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function CertificateFolder() {
  const n = CERTIFICATES.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1180);
  const geo = layout(W, n);
  const inView = useInView(stageRef, { once: true, amount: 0.35 });
  const [dealt, setDealt] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => setW(el.clientWidth || 1180);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (inView) setDealt(true);
  }, [inView]);

  // The fan's turn: dragged by hand, plus a little with the scroll, smoothed.
  const dragSpin = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ['start end', 'end start'] });
  const phone = useRef(geo.phone);
  phone.current = geo.phone;
  const scrollSpin = useTransform(scrollYProgress, (p) => (0.5 - p) * (phone.current ? 8 : 16));
  const spinRaw = useTransform([dragSpin, scrollSpin] as MotionValue<number>[], ([d, s]: number[]) => d + s);
  const spin = useSpring(spinRaw, { stiffness: 140, damping: 22 });

  // Dragging across the fan spins it. A drag never counts as a click on a card.
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, start: dragSpin.get(), moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      setHover(null);
    }
    if (d.moved) dragSpin.set(Math.max(geo.spin[0], Math.min(geo.spin[1], d.start + dx * (geo.phone ? 0.18 : 0.12))));
  };
  const onPointerUp = () => {
    justDragged.current = !!drag.current?.moved;
    drag.current = null;
  };

  const shuffle = () => {
    setHover(null);
    setDealt(false);
    window.setTimeout(() => setDealt(true), 650);
  };
  const openCard = (i: number) => {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    setShown(i);
    setOpen(i);
  };
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + n) % n)), [n]);

  const info = CERTIFICATES[hover ?? shown];

  return (
    <div className="relative mx-auto max-w-7xl px-4 md:px-8">
      {/* Heading */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5 md:mb-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/45 md:text-[11px]" style={{ fontFamily: MONO }}>
            Verified credentials
          </p>
          <h3 className="pastel-heading mt-2 text-[clamp(2.6rem,6vw,4.5rem)] leading-none text-white" style={{ fontFamily: DISPLAY }}>
            CERTIFICATIONS <span className="align-top text-[0.4em] text-[#c8b6ff]">({String(n).padStart(2, '0')})</span>
          </h3>
        </div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 md:text-[11px]" style={{ fontFamily: MONO }}>
          {geo.phone ? 'swipe to spin · tap to open' : 'drag to spin · click to open'}
        </p>
      </div>

      {/* The stage: the folder and the fan */}
      <div
        ref={stageRef}
        className="relative select-none"
        style={{ height: geo.H, touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Folder geo={geo} count={n} onShuffle={shuffle} />
        {CERTIFICATES.map((c, i) => (
          <FanCard
            key={c.id}
            i={i}
            geo={geo}
            dealt={dealt}
            hovered={hover === i}
            spin={spin}
            onEnter={() => {
              setHover(i);
              setShown(i);
            }}
            onLeave={() => setHover((h) => (h === i ? null : h))}
            onOpen={() => openCard(i)}
          />
        ))}

        {/* The card being pointed at (or the last one opened): what it is */}
        {!geo.phone && (
          <div className="pointer-events-none absolute bottom-[6%] right-0 z-[61] w-[min(320px,28%)] text-right">
            <AnimatePresence mode="wait">
              <motion.div key={info.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#c8b6ff]" style={{ fontFamily: MONO }}>
                  {info.issuer}
                </p>
                <p className="mt-1 text-lg font-semibold leading-snug text-white">{info.title}</p>
                <p className="text-sm text-white/50">{info.date}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {geo.phone && (
        <p className="mt-3 text-center text-sm text-white/55">
          <span className="text-white">{info.title}</span> · {info.issuer}
        </p>
      )}

      <Viewer index={open} onClose={close} onStep={step} />
    </div>
  );
}
