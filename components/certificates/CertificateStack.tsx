// Certifications as a stack of big coloured cards that deal in from the sides as you scroll (after the "what we do
// best" section of emblematica.agency). Each card is pinned near the top of the screen; while it's pinned, the next
// one slides in from alternating sides (left, right, left...), tilted, and straightens as it lands on top of the
// stack. The cards underneath ease back a little. When the last card has landed the whole stack scrolls away
// together. Clicking a card opens the certificate full size (the viewer from CertificateFolder).
//
// Each card shows its certificate whole, in a frame cut to the certificate's own shape (nothing cropped, no empty
// margins), with a hard black offset shadow and corner marks like a tattoo flash sheet. Every card has its own flower
// and its own colour mandala in the flower's colours, never repeated (made with Higgsfield, public/certificates/
// flowers/ and mandala/), kept apart so they never overlap: the flower at the top of the words, the mandala on the
// card's bottom corner, turning as you scroll.
// In the light theme they're painted; in the dark theme they're redrawn glowing, on a deep jewel-coloured card (the
// certificate's shadow and corner marks turn gold there too). Every other card is mirrored: certificate on the
// right, words on the left.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, motionValue, useMotionValueEvent, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { CERTIFICATES, type Certificate } from './certificates';
import { Viewer } from './CertificateFolder';

const MONO = "'Geist Mono', ui-monospace, monospace";
const DISPLAY = "'Anton', 'Inter', sans-serif";
// Each card's flower, its colour in the light theme (from the site's palette) and its colour in the dark theme.
// Card colours, inks and the flower shown are switched by the theme in CARD_THEME_CSS below.
const CARDS = [
  { flower: 'crocus', light: '#EBDEFC', dark: '#24123f' }, // saffron crocus · deep violet
  { flower: 'lotus', light: '#B1E4E3', dark: '#0a1a33' }, // blue lotus · midnight
  { flower: 'iris', light: '#FED141', dark: '#1b1236' }, // iris · indigo
  { flower: 'marigold', light: '#c8b6ff', dark: '#2a1507' }, // marigold · burnt umber
  { flower: 'jasmine', light: '#B1E4E3', dark: '#111a26' }, // jasmine · night slate
  { flower: 'hibiscus', light: '#EBDEFC', dark: '#2a0c19' }, // hibiscus · wine
  { flower: 'plumeria', light: '#FED141', dark: '#251810' }, // plumeria · cocoa
];
// A card's art: its flower (public/certificates/flowers/) or its mandala (public/certificates/mandala/), for a theme.
const artSrc = (kind: 'flowers' | 'mandala', name: string, theme: 'light' | 'dark') => `/certificates/${kind}/${theme}-${name}.webp`;
// The light theme: dark ink on pastel. The dark theme: cream words and gold linework on deep colour. Each piece of
// art comes in both themes; only the one for the current theme shows.
const CARD_THEME_CSS = `
.cert-card { --cs-bg: var(--cs-light); --cs-ink: #120c22; --cs-line: #120c22; }
html.dark .cert-card { --cs-bg: var(--cs-dark); --cs-ink: #f4ead6; --cs-line: #d8b46a; }
.cert-dark { display: none; }
html.dark .cert-light { display: none; }
html.dark .cert-dark { display: block; }
`;
// How far a card is tilted as it comes in from the side (deg), and how far below its spot it starts (px).
const ENTRY_TILT = 8.6;
const ENTRY_DROP = 74;
// The card's widest, and the padding round the certificate (px).
const MAX_CARD_W = 1160;
const PAD = 22;

type Dims = {
  phone: boolean;
  /** Where the cards are pinned, from the top of the screen (px). */
  stickTop: number;
  cardH: number;
  /** Scroll between one card pinning and the next (px), on top of the card's height. */
  gap: number;
  /** Extra scroll the finished stack stays pinned for before it leaves (px). */
  tail: number;
};

function measureDims(): Dims {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const phone = vw < 768;
  const stickTop = phone ? 92 : Math.max(120, vh * 0.17);
  const cardH = phone ? Math.min(vh - stickTop - 20, 640) : Math.max(380, Math.min(vh - stickTop - 56, 560));
  return { phone, stickTop, cardH, gap: vh * (phone ? 0.42 : 0.38), tail: vh * 0.45 };
}

type CardMotion = { x: MotionValue<number>; y: MotionValue<number>; r: MotionValue<number>; s: MotionValue<number>; shade: MotionValue<number> };

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const pad = (k: number) => String(k).padStart(2, '0');

/** Little L-shaped marks just outside each corner of the certificate, like the registration marks on a flash sheet. */
function CornerMarks() {
  const mark = 'absolute h-4 w-4 border-[color:var(--cs-line)]';
  return (
    <>
      <span aria-hidden="true" className={`${mark} -left-3 -top-3 border-l-[1.5px] border-t-[1.5px]`} />
      <span aria-hidden="true" className={`${mark} -right-3 -top-3 border-r-[1.5px] border-t-[1.5px]`} />
      <span aria-hidden="true" className={`${mark} -bottom-3 -left-3 border-b-[1.5px] border-l-[1.5px]`} />
      <span aria-hidden="true" className={`${mark} -bottom-3 -right-3 border-b-[1.5px] border-r-[1.5px]`} />
    </>
  );
}

function StackCard({
  c,
  i,
  dims,
  cardW,
  m,
  spin,
  onOpen,
}: {
  c: Certificate;
  i: number;
  dims: Dims;
  cardW: number;
  m: CardMotion;
  spin: MotionValue<number>;
  onOpen: () => void;
}) {
  const card = CARDS[i % CARDS.length];
  const mirrored = i % 2 === 1;
  const details = [c.date, c.credential ? `ID ${c.credential}` : null].filter(Boolean).join(' · ');
  // Neighbouring mandalas turn opposite ways.
  const turn = useTransform(spin, (s) => (mirrored ? -s : s));

  // The certificate's frame, cut to its own shape: as big as the card allows (on desktop, up to 62% of its width).
  const frame = dims.phone
    ? { w: cardW - PAD * 2, h: (cardW - PAD * 2) / c.aspect }
    : (() => {
        const h = Math.min(dims.cardH - PAD * 2 - 8, (cardW * 0.62) / c.aspect);
        return { w: h * c.aspect, h };
      })();

  const outer = (v: number): React.CSSProperties => (mirrored ? { left: v } : { right: v });
  // The flower and the mandala never overlap: they're laid out in separate parts of the card.
  // Desktop: the flower stands at the top of the words, on the card's outer side, ending about halfway down; the
  // mandala is a big one centred on the card's bottom outer corner (a quarter of it shows), starting well below the
  // flower.
  // Phones: the flower stands in the bottom corner; the mandala sits on the right edge in the space between the
  // certificate and the flower (left out if there's no room for it).
  const PHONE_FLOWER_H = 150;
  const flowerStyle: React.CSSProperties = dims.phone
    ? { right: -4, bottom: -8, height: PHONE_FLOWER_H, maxWidth: '42%' }
    : { top: -dims.cardH * 0.04, height: dims.cardH * 0.5, maxWidth: '72%', ...outer(-PAD * 0.4) };
  let mSize: number;
  let mandalaPos: React.CSSProperties;
  if (dims.phone) {
    const y0 = PAD + frame.h + 12; // below the certificate
    const y1 = dims.cardH + 8 - PHONE_FLOWER_H - 12; // above the flower
    mSize = Math.min(cardW * 0.5, y1 - y0);
    mandalaPos = { top: (y0 + y1) / 2 - mSize / 2, right: -mSize / 2 };
  } else {
    // The flower ends at PAD + 0.46 × the card's height; the mandala's top edge is at 0.64 × it, well clear.
    mSize = dims.cardH * 0.72;
    mandalaPos = { bottom: -mSize / 2, ...outer(-mSize / 2) };
  }
  const showMandala = mSize >= 70;
  // How far the title keeps in from the outer edge of the words, to stay clear of the mandala's corner.
  // (The quarter-circle is narrow at its top, where the title starts, so the title only needs to keep clear of most of it.)
  const titleInset = !dims.phone && showMandala ? Math.max(0, (mSize / 2) * 0.62 - PAD) : 0;
  // On phones the flower and mandala sit at the right, so the words keep to the left two-thirds.
  const titleWidth = dims.phone ? '66%' : undefined;

  return (
    // The slot is what's pinned; the card inside it is what slides in.
    <div className="sticky" style={{ top: dims.stickTop, height: dims.cardH, marginTop: i ? dims.gap : 0, zIndex: i + 1 }}>
      <motion.article
        className="cert-card group relative mx-auto h-full w-full overflow-hidden rounded-[22px] shadow-[0_30px_70px_rgba(0,0,0,0.35)] ring-1 ring-black/10 dark:ring-white/10"
        style={
          {
            maxWidth: MAX_CARD_W,
            x: m.x,
            y: m.y,
            rotate: m.r,
            scale: m.s,
            '--cs-light': card.light,
            '--cs-dark': card.dark,
            background: 'var(--cs-bg)',
            color: 'var(--cs-ink)',
            transformOrigin: '50% 12%',
          } as never
        }
      >
        {/* The card's colour mandala, turning with the scroll: painted in the light theme, glowing in the dark one. */}
        {showMandala && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{ ...mandalaPos, width: mSize, height: mSize, rotate: turn }}
          >
            {(['light', 'dark'] as const).map((theme) => (
              <img
                key={theme}
                src={artSrc('mandala', card.flower, theme)}
                alt=""
                loading="lazy"
                draggable={false}
                className={`cert-${theme} h-full w-full select-none object-contain`}
                style={{ filter: theme === 'light' ? 'drop-shadow(0 8px 16px rgba(18,12,34,0.28))' : 'drop-shadow(0 0 18px rgba(216,180,106,0.18))' }}
              />
            ))}
          </motion.div>
        )}

        <div
          className={`relative flex h-full ${dims.phone ? 'flex-col' : mirrored ? 'flex-row-reverse' : 'flex-row'}`}
          style={{ padding: PAD, gap: dims.phone ? 16 : 36 }}
        >
          {/* The certificate, whole, in its frame. */}
          <div className="flex shrink-0 items-center justify-center" style={{ width: frame.w + (dims.phone ? 0 : 8) }}>
            <div className="relative" style={{ width: frame.w, height: frame.h }}>
              <span aria-hidden="true" className="absolute inset-0 translate-x-2 translate-y-2 rounded-[10px]" style={{ background: 'var(--cs-line)' }} />
              <img
                src={c.full}
                alt=""
                loading="lazy"
                draggable={false}
                className="relative block h-full w-full select-none rounded-[10px] border-[1.5px] object-cover transition-transform duration-500 ease-out group-hover:-translate-x-1 group-hover:-translate-y-1"
                style={{ borderColor: 'var(--cs-line)', background: '#fff' }}
              />
              <CornerMarks />
            </div>
          </div>

          {/* The words: the issuer at the top (clear of the corner art), the number and title at the bottom. */}
          <div className={`relative flex min-w-0 flex-1 flex-col ${dims.phone ? 'gap-2' : 'justify-between py-2'}`}>
            {/* The card's flower, swaying a little: painted in the light theme, glowing line art in the dark one. */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute z-[1]"
              style={{ ...flowerStyle, transformOrigin: '50% 100%' }}
              animate={{ rotate: [-1.5, 1.5, -1.5] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
            >
              {(['light', 'dark'] as const).map((theme) => (
                <img
                  key={theme}
                  src={artSrc('flowers', card.flower, theme)}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  className={`cert-${theme} h-full w-auto max-w-full select-none object-contain`}
                  style={{
                    objectPosition: mirrored && !dims.phone ? 'left top' : 'right top',
                    marginLeft: mirrored && !dims.phone ? 0 : 'auto',
                    filter: theme === 'light' ? 'drop-shadow(0 10px 16px rgba(18,12,34,0.25))' : 'drop-shadow(0 0 14px rgba(216,180,106,0.25))',
                  }}
                />
              ))}
            </motion.div>
            <span
              className="relative z-[2] block text-[11px] uppercase tracking-[0.18em] md:text-[12px]"
              style={{ fontFamily: MONO, maxWidth: dims.phone ? titleWidth : '46%', ...(mirrored && !dims.phone ? { marginLeft: 'auto', textAlign: 'right' } : {}) }}
            >
              {c.issuer}
            </span>
            <div
              className="relative z-[2]"
              style={{ maxWidth: titleWidth, ...(mirrored ? { paddingLeft: titleInset } : { paddingRight: titleInset }) }}
            >
              <span className="block leading-none" style={{ fontFamily: DISPLAY, fontSize: dims.phone ? '2.2rem' : 'clamp(3rem, 5vw, 4.6rem)' }}>
                {pad(i + 1)}
              </span>
              <h4
                className="m-0 mt-2 uppercase leading-[0.94]"
                style={{ fontFamily: DISPLAY, fontSize: dims.phone ? 'clamp(1.4rem, 6.4vw, 2rem)' : 'clamp(1.7rem, 2.6vw, 2.7rem)' }}
              >
                {c.title}
              </h4>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] uppercase md:text-[12px]" style={{ fontFamily: MONO }}>
                <span>{details}</span>
                {c.verify && (
                  <a
                    href={c.verify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative z-10 rounded-full px-4 py-2 font-bold transition-transform hover:scale-105"
                    style={{ background: 'var(--cs-ink)', color: 'var(--cs-bg)' }}
                  >
                    Verify ↗
                  </a>
                )}
                <span className="opacity-60">· open ↗</span>
              </div>
            </div>
          </div>
        </div>

        {/* The whole card opens the certificate; the Verify link sits above this. */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open certificate: ${c.title}, ${c.issuer}`}
          className="absolute inset-0 z-[5] cursor-pointer rounded-[22px] outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#120c22]"
        />
        {/* Cards further down the stack fall into shadow. */}
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[6] bg-black" style={{ opacity: m.shade }} />
      </motion.article>
    </div>
  );
}

export default function CertificateStack() {
  const n = CERTIFICATES.length;
  const stackRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<Dims>(() =>
    typeof window === 'undefined' ? { phone: false, stickTop: 140, cardH: 520, gap: 340, tail: 400 } : measureDims()
  );
  const dimsRef = useRef(dims);
  dimsRef.current = dims;
  const [cardW, setCardW] = useState(MAX_CARD_W);
  const [landed, setLanded] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const motions = useMemo<CardMotion[]>(
    () => CERTIFICATES.map(() => ({ x: motionValue(0), y: motionValue(0), r: motionValue(0), s: motionValue(1), shade: motionValue(0) })),
    []
  );

  // Works out where every card is for the current scroll position.
  const update = useCallback(() => {
    const el = stackRef.current;
    if (!el) return;
    const d = dimsRef.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const spacing = d.cardH + d.gap;
    const vw = window.innerWidth;
    // How far each card has come in: 0 = off to the side, 1 = landed. It starts once its slot is pinned and lands
    // just before the next one pins.
    const p = motions.map((_, i) => (reduce ? 1 : clamp01((window.scrollY - (top + i * spacing - d.stickTop)) / (spacing * 0.88))));
    let count = 0;
    motions.forEach((m, i) => {
      const e = easeOut(p[i]);
      const side = i % 2 === 0 ? -1 : 1;
      // Cards landed on top of this one push it back a little.
      let above = 0;
      for (let j = i + 1; j < p.length; j++) above += easeOut(p[j]);
      m.x.set(side * (1 - e) * vw * 1.05);
      m.y.set((1 - e) * ENTRY_DROP - Math.min(above, 4) * 12);
      m.r.set(side * (1 - e) * ENTRY_TILT);
      m.s.set(1 - Math.min(above, 4) * 0.025);
      m.shade.set(Math.min(above, 4) * 0.09);
      if (p[i] > 0.5) count++;
    });
    setLanded((c) => (c === count ? c : count));
  }, [motions]);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', update);
  // The mandalas turn slowly as you scroll (a full turn over about 7 screens).
  const spin = useTransform(scrollY, (y) => y * 0.05);

  useLayoutEffect(() => {
    const onResize = () => setDims(measureDims());
    window.addEventListener('resize', onResize);
    const el = stackRef.current;
    const ro = new ResizeObserver(() => setCardW(Math.min(MAX_CARD_W, el?.clientWidth || MAX_CARD_W)));
    if (el) ro.observe(el);
    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, []);
  useEffect(() => {
    update();
  }, [dims, update]);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((k: number) => setOpen((i) => (i === null ? i : (i + k + n) % n)), [n]);

  return (
    <div className="relative mx-auto max-w-7xl px-4 md:px-8">
      <style>{CARD_THEME_CSS}</style>
      {/* Heading */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/45 md:text-[11px]" style={{ fontFamily: MONO }}>
            Verified credentials
          </p>
          <h3 className="pastel-heading mt-2 text-[clamp(2.6rem,6vw,4.5rem)] leading-none text-white" style={{ fontFamily: DISPLAY }}>
            CERTIFICATIONS <span className="align-top text-[0.4em] text-[#c8b6ff]">({pad(n)})</span>
          </h3>
        </div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 md:text-[11px]" style={{ fontFamily: MONO }}>
          scroll to deal · {dims.phone ? 'tap' : 'click'} to open
        </p>
      </div>

      <div className="relative">
        {/* A small label pinned above the cards, counting them as they land. */}
        <div className="sticky z-[60] h-0" style={{ top: dims.stickTop - 40 }}>
          <p className="pastel-heading text-center text-[11px] uppercase tracking-[0.3em] text-white/70 md:text-[13px]" style={{ fontFamily: MONO }}>
            certifications · {pad(Math.max(1, landed))} / {pad(n)}
          </p>
        </div>
        <div ref={stackRef} style={{ paddingBottom: dims.tail }}>
          {CERTIFICATES.map((c, i) => (
            <StackCard key={c.id} c={c} i={i} dims={dims} cardW={cardW} m={motions[i]} spin={spin} onOpen={() => setOpen(i)} />
          ))}
        </div>
      </div>

      <Viewer index={open} onClose={close} onStep={step} />
    </div>
  );
}
