import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, Home, Mail, User } from 'lucide-react';
import { navPerches, type ButterflyLook, type NavPerch } from './navPerch';
import { useTheme } from '../ui/theme';

// The main navigation as a little row of solid 3D buttons, made like the letters of my name in the hero: a
// matte lavender top face lit softly from the top left, and a thick slab side underneath that goes from deep
// indigo at the bottom up to a pale bevel just under the top, with a soft contact shadow on the page. No gloss.
// The labels are carved into the faces, dark and crisp. A round VN badge (my name slowly turning around it)
// leads the row. Each button rests at its own slight angle; pointing at one pops it up (taller side, straightened
// out) and pressing pushes it right down. The page you're on stays half pressed in.
// Now and then one of the hero's butterflies flies up and settles on a button, slowly fanning its wings, and the
// button dips a little under it; it flies off after a while, or as soon as you point at that button.
// On phones the row sits at the bottom, icons only.

const LINKS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/work', label: 'Work', icon: Briefcase },
  { to: '/about', label: 'About', icon: User },
  { to: '/#contact', label: 'Contact', icon: Mail },
];
/** Each button's resting angle (deg): the badge first, then the links. */
const TILT = [-6, 3, -2, 4, -3];
/** How a butterfly sits on each button (deg): turned a little, like it landed naturally. */
const PERCH_TURN = [-14, 9, -6, 12, -9];

// A button's colours: its top face, the slab under it (dark near the page, rising to `top`, then a pale `lip`
// just under the face) and the carved label. The dark theme uses the hero letters' lavender (HeroName.tsx) for all
// of them. The pastel theme gives the buttons the three swatches in turn, lavender first, then green, then yellow,
// each with its own ink (the colours of index.html's pastel theme).
type Tone = {
  face: string;
  bottom: number[];
  top: number[];
  lip: number[];
  edge: string;
  ink: string;
  cut: string;
  ring: string;
};

const DARK_TONE: Tone = {
  face: 'radial-gradient(120% 90% at 18% 0%, rgba(255,255,255,0.35), transparent 55%), linear-gradient(165deg, #e6dcff 0%, #c6b5fb 42%, #a891f0 78%, #9479e6 100%)',
  bottom: [26, 17, 66],
  top: [112, 92, 190],
  lip: [196, 182, 250],
  edge: 'rgba(70,50,150,0.35)',
  ink: '#33226e',
  cut: 'rgba(30,15,70,0.45)',
  ring: 'rgba(51,34,110,0.85)',
};

const PASTEL_TONES: Tone[] = [
  {
    // Soft Lavender #EBDEFC, ink #743BBE
    face: 'radial-gradient(120% 90% at 18% 0%, rgba(255,255,255,0.75), transparent 55%), linear-gradient(165deg, #FFFFFF 0%, #EBDEFC 55%, #DCC8F9 100%)',
    bottom: [52, 21, 95],
    top: [116, 59, 190],
    lip: [217, 195, 249],
    edge: 'rgba(116,59,190,0.45)',
    ink: '#743BBE',
    cut: 'rgba(52,21,95,0.35)',
    ring: 'rgba(116,59,190,0.9)',
  },
  {
    // Summer Green #B1E4E3, ink #08746B
    face: 'radial-gradient(120% 90% at 18% 0%, rgba(255,255,255,0.75), transparent 55%), linear-gradient(165deg, #F2FBFB 0%, #B1E4E3 55%, #9CD9D8 100%)',
    bottom: [3, 61, 56],
    top: [8, 116, 107],
    lip: [205, 238, 237],
    edge: 'rgba(8,116,107,0.45)',
    ink: '#08746B',
    cut: 'rgba(3,61,56,0.35)',
    ring: 'rgba(8,116,107,0.9)',
  },
  {
    // Limencello #FED141, ink #3F260C
    face: 'radial-gradient(120% 90% at 18% 0%, rgba(255,255,255,0.7), transparent 55%), linear-gradient(165deg, #FFF4CC 0%, #FED141 55%, #F2C22E 100%)',
    bottom: [63, 38, 12],
    top: [176, 128, 22],
    lip: [255, 230, 140],
    edge: 'rgba(63,38,12,0.4)',
    ink: '#3F260C',
    cut: 'rgba(63,38,12,0.3)',
    ring: 'rgba(63,38,12,0.85)',
  },
];

/** The badge is lavender; the links take lavender, green, yellow, lavender... */
const toneFor = (pastel: boolean, i: number) => (pastel ? PASTEL_TONES[i === 0 ? 0 : (i - 1) % PASTEL_TONES.length] : DARK_TONE);

const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

/**
 * The slab side under a button, `depth` px tall, built up 1px at a time like the hero letters' layers: dark
 * near the page, rising to a pale bevel lip just under the face. A fine darker line crisps up the face's edge,
 * and a soft shadow sits where the slab meets the page.
 */
function slab(depth: number, t: Tone, pastel: boolean) {
  const layers: string[] = [`0 0 0 1px ${t.edge}`];
  for (let y = 1; y <= depth; y++) {
    const f = 1 - y / (depth + 1); // 1 just under the face, 0 at the page
    const c = f > 0.85 ? mix(t.top, t.lip, (f - 0.85) / 0.15) : mix(t.bottom, t.top, Math.pow(f / 0.85, 1.6));
    layers.push(`0 ${y}px 0 ${c}`);
  }
  // A softer, tinted shadow on the pale pastel page.
  if (pastel) layers.push(`0 ${depth + 1}px 2px rgba(52,21,95,0.35)`, `0 ${depth + 6}px 14px rgba(52,21,95,0.22)`);
  else layers.push(`0 ${depth + 1}px 2px rgba(10,6,30,0.6)`, `0 ${depth + 6}px 14px rgba(10,6,30,0.5)`);
  return layers.join(', ');
}

/**
 * Text and icons carved into the face: an ink cut, in shadow along its top edge (light comes from above) and
 * catching a thin line of light along its bottom edge. Dark enough to read easily on the face.
 */
const carved = (t: Tone) => ({
  color: t.ink,
  shadow: `0 -1px 0 ${t.cut}, 0 1px 0 rgba(255,255,255,0.75)`,
  filter: `drop-shadow(0 -1px 0 ${t.cut}) drop-shadow(0 1px 0 rgba(255,255,255,0.75))`,
});

/** A butterfly resting on top of a button, wings slowly fanning open and shut. */
function PerchedButterfly({ look, turn }: { look: ButterflyLook; turn: number }) {
  const w = look.size;
  const h = w / look.aspect;
  const wing = (side: 'r' | 'l') => (
    <span
      className="absolute top-0 h-full"
      style={{
        width: w,
        [side === 'r' ? 'left' : 'right']: '50%',
        transformOrigin: side === 'r' ? '0% 50%' : '100% 50%',
        animation: `gnav-fan-${side} 2.8s ease-in-out infinite`,
      }}
    >
      <img src={look.src} alt="" draggable={false} className="h-full w-full" style={side === 'l' ? { transform: 'scaleX(-1)' } : undefined} />
    </span>
  );
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 z-10"
      style={{ top: -h * 0.62, width: w * 2, height: h, marginLeft: -w, transform: `rotate(${turn}deg)` }}
    >
      <span className="absolute inset-0" style={{ perspective: '90px', animation: 'gnav-land 0.55s cubic-bezier(0.22,1,0.36,1)' }}>
        {wing('r')}
        {wing('l')}
        {/* The body: head, thorax and abdomen (and antennae) along the middle. */}
        {look.body ? (
          <img
            src={look.body.src}
            alt=""
            draggable={false}
            className="absolute max-w-none"
            style={{
              width: look.body.w * w,
              height: look.body.h * w,
              left: w + (look.body.x - look.body.w / 2) * w,
              top: h * look.joint - (look.body.y + look.body.h / 2) * w,
            }}
          />
        ) : (
          <span
            className="absolute left-1/2 rounded-full"
            style={{ width: 3, marginLeft: -1.5, top: h * (look.joint - 0.12), height: h * 0.34, background: '#17111f' }}
          />
        )}
        {/* Its little shadow on the button. */}
        <span
          className="absolute left-1/2 -z-10 rounded-full blur-[2px]"
          style={{ width: w * 1.4, height: h * 0.35, marginLeft: -w * 0.7, top: h * 0.62, background: 'rgba(30,15,70,0.35)' }}
        />
      </span>
    </span>
  );
}

export default function GlowNav() {
  const { pathname, hash } = useLocation();
  const pastel = useTheme() === 'light';
  const [hover, setHover] = useState<number | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  const isActive = (to: string) => (to === '/#contact' ? hash === '#contact' : to === '/' ? pathname === '/' && hash !== '#contact' : pathname.startsWith(to));

  // Each button is a spot the hero's butterflies can land on (navPerch.ts).
  const btnRefs = useRef<(HTMLElement | null)[]>([]);
  const perchRefs = useRef<(NavPerch | null)[]>([]);
  const [sitters, setSitters] = useState<(ButterflyLook | null)[]>([]);
  useEffect(() => {
    const set = (i: number, look: ButterflyLook | null) =>
      setSitters((s) => {
        const next = [...s];
        next[i] = look;
        return next;
      });
    const perches = btnRefs.current.map((el, i): NavPerch | null =>
      el ? { el, busy: false, startled: false, land: (look) => set(i, look), leave: () => set(i, null) } : null
    );
    perchRefs.current = perches;
    perches.forEach((p) => p && navPerches.add(p));
    return () => perches.forEach((p) => p && navPerches.delete(p));
  }, []);
  // Pointing at a button startles any butterfly on it.
  useEffect(() => {
    perchRefs.current.forEach((p, i) => {
      if (p) p.startled = hover === i;
    });
  }, [hover]);

  /**
   * A button's pose: resting on its slab at a slight angle; popped up (taller, straight) while pointed at;
   * pushed right down while pressed; half pressed in for the page you're on; dipping a little under a butterfly.
   */
  const pose = (i: number, current = false): React.CSSProperties => {
    const sat = sitters[i] ? 2 : 0;
    const t = toneFor(pastel, i);
    if (pressed === i) return { transform: 'translateY(5px) rotate(0deg)', boxShadow: slab(1, t, pastel), transitionDuration: '90ms' };
    if (hover === i) return { transform: 'translateY(-3px) rotate(0deg) scale(1.04)', boxShadow: slab(9, t, pastel) };
    if (current) return { transform: `translateY(${3 + sat}px) rotate(${TILT[i % TILT.length]}deg)`, boxShadow: slab(Math.max(1, 3 - sat), t, pastel), filter: 'brightness(0.93)' };
    return { transform: `translateY(${sat}px) rotate(${TILT[i % TILT.length]}deg)`, boxShadow: slab(6 - sat, t, pastel) };
  };
  const handlers = (i: number) => ({
    // Hover is for a mouse: a finger "hovers" a button it touched until it taps somewhere else, which left the
    // button raised (and the bar redrawing) after a tap.
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') setHover(i);
    },
    onPointerLeave: () => {
      setHover(null);
      setPressed(null);
    },
    onPointerDown: () => setPressed(i),
    onPointerUp: () => setPressed(null),
    onPointerCancel: () => setPressed(null),
    onFocus: () => setHover(i),
    onBlur: () => setHover(null),
  });
  const base = 'transition-[transform,box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[61] flex justify-center md:bottom-auto md:top-6">
      <nav aria-label="Main" className="pointer-events-auto flex items-center gap-3.5">
        {/* The badge: VN, with my name turning around it. */}
        <Link
          to="/"
          ref={(el) => {
            btnRefs.current[0] = el;
          }}
          aria-label="Penkey Vardhan Sai Raghavendra Nehru, home"
          {...handlers(0)}
          className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full ${base}`}
          style={{ background: toneFor(pastel, 0).face, ...pose(0) }}
        >
          <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <path id="gnav-ring" d="M32,32 m-23,0 a23,23 0 1,1 46,0 a23,23 0 1,1 -46,0" />
            </defs>
            {/* Turns about the badge's exact centre (32, 32), so the text stays on its circle. */}
            <g>
              <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="16s" repeatCount="indefinite" />
              <text fill={toneFor(pastel, 0).ring} fontSize="7.6" fontWeight="600" letterSpacing="0.9" style={{ fontFamily: "'Geist Mono', monospace" }}>
                <textPath href="#gnav-ring" textLength="142" lengthAdjust="spacing">
                  VARDHAN NEHRU · AI ENGINEER ·
                </textPath>
              </text>
            </g>
          </svg>
          <span className="relative text-[13px] font-extrabold tracking-tight" style={{ fontFamily: "'Geist', 'Inter', sans-serif", color: carved(toneFor(pastel, 0)).color, textShadow: carved(toneFor(pastel, 0)).shadow }}>
            VN
          </span>
          {sitters[0] && <PerchedButterfly look={sitters[0]} turn={PERCH_TURN[0]} />}
        </Link>

        {LINKS.map(({ to, label, icon: Icon }, idx) => {
          const i = idx + 1;
          const active = isActive(to);
          const tone = toneFor(pastel, i);
          const cut = carved(tone);
          return (
            <Link
              key={to}
              to={to}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              {...handlers(i)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex h-9 items-center gap-2 rounded-full px-3 text-[13px] font-bold tracking-[-0.01em] sm:px-4 ${base}`}
              style={{ fontFamily: "'Geist', 'Inter', sans-serif", background: tone.face, color: cut.color, textShadow: cut.shadow, ...pose(i, active) }}
            >
              <Icon size={15} strokeWidth={2.6} style={{ color: cut.color, filter: cut.filter }} />
              <span className="hidden sm:inline">{label}</span>
              {sitters[i] && <PerchedButterfly look={sitters[i]!} turn={PERCH_TURN[i]} />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
