// Glasses that wait on the About page and, once your portrait has formed, fly over and land on your face.
// The three pairs were made with Higgsfield (public/about/glasses-*.webp). Each pair's lens centres were measured,
// and so were your pupils in the portrait sticker, so a pair lands with its lenses over your eyes, at the right
// size and tilt. Hovering the worn pair slides it down your nose a little; clicking it swaps it for the next pair.
//
// Three pieces share one controller (useGlassesFlight): the pair lying on the page (RestingGlasses), the pair on
// your face (WornGlasses, placed in the portrait), and, during the flight, a copy flying above the page between
// the two (FlyingGlasses), which follows both as the page scrolls.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

/** Your pupils in the portrait sticker (vardhan-sticker.webp), as fractions of its width and height, how far
 *  apart they are (in sticker widths), and the tilt of the line between them (degrees, right eye lower). */
const EYES = { x: 0.5083, y: 0.3764, ipd: 0.1948, tilt: 0.9 };
/** The sticker's width / height. */
const STICKER_ASPECT = 1100 / 1406;
/** The portrait leans this much (ParticlePortrait gets -rotate-2). */
const PORTRAIT_TILT = -2;
/** How the pair lies on the page before it flies. */
const REST_TILT = -12;
const FLIGHT_MS = 1300;
/** How long after the portrait has formed before they fly, so you see the portrait first. */
const WAIT_MS = 900;

type Pair = {
  name: string;
  src: string;
  /** Width / height of the picture. */
  aspect: number;
  /** Lens centres, as fractions of the picture's width and height. */
  lensL: [number, number];
  lensR: [number, number];
  /** Lens height, as a fraction of the picture's height. */
  lensH: number;
};

export const PAIRS: Pair[] = [
  { name: 'Black wayfarer sunglasses', src: '/about/glasses-wayfarer.webp', aspect: 2.8772, lensL: [0.2484, 0.493], lensR: [0.75, 0.4932], lensH: 0.827 },
  { name: 'Round gold sunglasses', src: '/about/glasses-round.webp', aspect: 2.5935, lensL: [0.2282, 0.4521], lensR: [0.7696, 0.4543], lensH: 0.8465 },
  { name: 'Black glasses', src: '/about/glasses-clear.webp', aspect: 3.3481, lensL: [0.2409, 0.4963], lensR: [0.7575, 0.4961], lensH: 0.8675 },
];

/**
 * Where a pair sits on the portrait, in % of the sticker's box: the lens centres over the pupils (with the pupils a
 * touch above the middle of the lenses, the way glasses sit), turned with the eyes about the lenses' midpoint.
 */
function wornPlace(p: Pair) {
  const w = EYES.ipd / (p.lensR[0] - p.lensL[0]); // the pair's width, in sticker widths
  const h = (w / p.aspect) * STICKER_ASPECT; // its height, in sticker heights
  const mx = (p.lensL[0] + p.lensR[0]) / 2;
  const my = (p.lensL[1] + p.lensR[1]) / 2;
  return {
    style: {
      position: 'absolute',
      width: `${(w * 100).toFixed(3)}%`,
      left: `${((EYES.x - mx * w) * 100).toFixed(3)}%`,
      top: `${((EYES.y + 0.06 * p.lensH * h - my * h) * 100).toFixed(3)}%`,
    } as React.CSSProperties,
    origin: `${(mx * 100).toFixed(2)}% ${(my * 100).toFixed(2)}%`,
  };
}

type Phase = 'rest' | 'flying' | 'worn';

export type GlassesFlight = {
  phase: Phase;
  pair: number;
  restRef: React.RefObject<HTMLButtonElement>;
  wornRef: React.RefObject<HTMLDivElement>;
  flyRef: React.RefObject<HTMLImageElement>;
  fly: () => void;
  swap: () => void;
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** `ready`: the portrait has formed. A moment later the glasses fly over by themselves (or at once if clicked). */
export function useGlassesFlight(ready: boolean): GlassesFlight {
  const restRef = useRef<HTMLButtonElement>(null);
  const wornRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<Phase>('rest');
  const [pair, setPair] = useState(0);

  const fly = useCallback(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setPhase('worn');
    else setPhase((p) => (p === 'rest' ? 'flying' : p));
  }, []);
  const swap = useCallback(() => setPair((i) => (i + 1) % PAIRS.length), []);

  useEffect(() => {
    if (!ready || phase !== 'rest') return undefined;
    const t = window.setTimeout(fly, WAIT_MS);
    return () => window.clearTimeout(t);
  }, [ready, phase, fly]);

  // The flight: from where they lie to your face, following both as the page scrolls. They lift into an arc,
  // roll over once on the way, and grow a little as they come up toward you.
  useEffect(() => {
    if (phase !== 'flying') return undefined;
    const flyEl = flyRef.current;
    const rest = restRef.current;
    const worn = wornRef.current;
    if (!flyEl || !rest || !worn) {
      setPhase('worn');
      return undefined;
    }
    const aspect = PAIRS[pair].aspect;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / FLIGHT_MS);
      const e = easeInOut(p);
      const lift = Math.sin(Math.PI * p);
      const a = rest.getBoundingClientRect();
      const b = worn.getBoundingClientRect();
      const ax = a.left + a.width / 2;
      const ay = a.top + a.height / 2;
      const bx = b.left + b.width / 2;
      const by = b.top + b.height / 2;
      const w = rest.offsetWidth + (worn.offsetWidth - rest.offsetWidth) * e;
      const x = ax + (bx - ax) * e;
      const y = ay + (by - ay) * e - lift * Math.min(220, Math.hypot(bx - ax, by - ay) * 0.45);
      const angle = REST_TILT + (PORTRAIT_TILT + EYES.tilt + 360 - REST_TILT) * e;
      flyEl.style.width = `${w.toFixed(1)}px`;
      flyEl.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - w / aspect / 2).toFixed(1)}px) rotate(${angle.toFixed(2)}deg) scale(${(1 + lift * 0.18).toFixed(3)})`;
      flyEl.style.filter = `drop-shadow(0 ${(6 + lift * 28).toFixed(0)}px ${(5 + lift * 16).toFixed(0)}px rgba(0,0,0,${(0.35 - lift * 0.15).toFixed(2)}))`;
      if (p < 1) raf = requestAnimationFrame(frame);
      else setPhase('worn');
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, pair]);

  return { phase, pair, restRef, wornRef, flyRef, fly, swap };
}

/** The pair lying on the page, tilted, until it flies. Clicking it sends it over at once. */
export function RestingGlasses({ g, className = '' }: { g: GlassesFlight; className?: string }) {
  const p = PAIRS[0];
  return (
    <motion.button
      ref={g.restRef}
      type="button"
      onClick={g.fly}
      aria-label="Put the sunglasses on"
      className={`absolute z-20 block cursor-pointer ${className}`}
      style={{ rotate: REST_TILT, opacity: g.phase === 'rest' ? 1 : 0, pointerEvents: g.phase === 'rest' ? 'auto' : 'none' }}
      whileHover={{ rotate: REST_TILT + 6, scale: 1.06, y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
    >
      <img src={p.src} alt="" draggable={false} className="block h-auto w-full select-none" style={{ filter: 'drop-shadow(0 6px 5px rgba(0,0,0,0.3))' }} />
    </motion.button>
  );
}

/**
 * The pair on your face. It sits in a layer laid exactly over the portrait (turned like it), so it moves with the
 * portrait. It's always there (invisible until it lands), so the flight knows where to go.
 */
export function WornGlasses({ g }: { g: GlassesFlight }) {
  const on = g.phase === 'worn';
  const pair = PAIRS[g.pair];
  const { style, origin } = wornPlace(pair);
  return (
    <div aria-hidden={!on} className="pointer-events-none absolute inset-0 z-[35]" style={{ rotate: `${PORTRAIT_TILT}deg` }}>
      {/* This layer slides down your nose on hover; the picture inside does the landing bounce. */}
      <motion.div
        ref={g.wornRef}
        style={{ ...style, rotate: EYES.tilt, transformOrigin: origin, pointerEvents: on ? 'auto' : 'none' }}
        whileHover={on ? { y: '16%' } : undefined}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <motion.img
          // A new pair drops into place when swapped.
          key={g.pair}
          src={pair.src}
          alt={on ? pair.name : ''}
          draggable={false}
          role={on ? 'button' : undefined}
          tabIndex={on ? 0 : -1}
          title={on ? 'Swap glasses' : undefined}
          onClick={g.swap}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              g.swap();
            }
          }}
          className="block h-auto w-full cursor-pointer select-none"
          style={{ filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.35))', transformOrigin: origin }}
          initial={on ? { opacity: 0, y: '-30%', scale: 1.06 } : false}
          animate={on ? { opacity: 1, y: ['-14%', '3%', '0%'], scale: [1.06, 0.98, 1] } : { opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
        {/* A glint that sweeps across the pair as it lands (cut to the pair's own shape). */}
        {on && (
          <motion.div
            key={`glint-${g.pair}`}
            className="pointer-events-none absolute inset-0"
            style={{
              WebkitMaskImage: `url(${pair.src})`,
              maskImage: `url(${pair.src})`,
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
              backgroundImage: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.75) 50%, transparent 65%)',
              backgroundSize: '250% 100%',
              backgroundRepeat: 'no-repeat',
            }}
            initial={{ backgroundPosition: '130% 0%' }}
            animate={{ backgroundPosition: '-30% 0%' }}
            transition={{ duration: 0.9, delay: 0.3, ease: 'easeInOut' }}
          />
        )}
      </motion.div>
    </div>
  );
}

/** The copy that flies between the two, above the page. Drawn into the document body so nothing clips it. */
export function FlyingGlasses({ g }: { g: GlassesFlight }) {
  if (g.phase !== 'flying') return null;
  return createPortal(
    <img
      ref={g.flyRef}
      src={PAIRS[g.pair].src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="pointer-events-none fixed left-0 top-0 z-[65] h-auto select-none"
      style={{ width: 0, willChange: 'transform' }}
    />,
    document.body
  );
}
