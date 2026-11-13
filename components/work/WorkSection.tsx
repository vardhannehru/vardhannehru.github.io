import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from 'framer-motion';
import { projects, Mockup, FlatMockup, KindLabel, LABELS, MONO, ACCENT, TestCard, type Project } from './projects';
import TV3D, { type TVChannel } from './TV3D';
import { smoothScrollTo } from '../ui/SmoothScroll';

// Work on the home page: a big "Work." header, then either
// - one TV where every project is a channel: the TV stays pinned while you scroll, and each stretch of scrolling
//   tunes it to the next project, with a channel guide beside it, or
// - the earlier two-column grid, one TV per project.
// Either way each project's full write-up is on the Work page (/work#slug).

/** One TV with a channel per project (true), or the grid of TVs (false). */
const SINGLE_TV = true;
/** How much scrolling (in screen heights) moves the TV on by one channel. */
const STEP = 0.7;

function Arrow({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const viewProjectClass =
  'inline-flex items-center gap-2 border border-white/15 px-4 py-2.5 text-[11px] uppercase tracking-[0.22em] text-white/75 transition-colors duration-300 hover:border-[color:var(--accent,#c8b6ff)] hover:bg-[color:var(--accent,#c8b6ff)] hover:text-[#07040f]';

// The title and the "View full project" button open the write-up. The TV isn't a link: clicking it works the TV.
function WorkCard({ project, index }: { project: Project; index: number }) {
  const num = String(index + 1).padStart(2, '0');
  const to = `/work#${project.slug}`;
  return (
    <article className="group grid grid-rows-subgrid row-span-2 gap-y-0 content-start">
      <Link to={to} className="flex items-start justify-between gap-6">
        <div>
          <KindLabel project={project} />
          <h3 className="mt-3 flex items-center gap-2 text-[24px] md:text-[30px] font-semibold leading-tight tracking-[-0.02em] text-white">
            {project.title}
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-white/15 text-white/70 transition-all duration-300 group-hover:border-[color:var(--accent,#c8b6ff)] group-hover:bg-[color:var(--accent,#c8b6ff)] group-hover:text-[#07040f]">
              <Arrow />
            </span>
          </h3>
          <p className="text-[18px] md:text-[22px] italic text-white/40" style={{ fontFamily: "'Ranade', Georgia, serif" }}>
            {project.subtitle}
          </p>
        </div>
        <span className="text-[40px] md:text-[56px] font-light leading-none text-transparent [-webkit-text-stroke:1px_var(--accent-35,rgba(200,182,255,0.35))]">{num}</span>
      </Link>

      <div className="mt-6">
        <Mockup project={project} />
        <Link to={to} className={`mt-4 ${viewProjectClass}`} style={{ fontFamily: MONO }}>
          View full project
          <Arrow />
        </Link>
      </div>
    </article>
  );
}

// ---- The single TV and its channel guide

const pad2 = (i: number) => String(i).padStart(2, '0');
/** A made-up but plausible VHF frequency for the tuner's readout, gliding as you scroll. */
const frequency = (p: number, n: number) => (55.25 + p * n * 6).toFixed(2);

/** A pulsing red "Live" tag, like a broadcast. */
function LiveTag() {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#ff5a4f]" style={{ fontFamily: MONO }}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff5a4f] opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ff5a4f]" />
      </span>
      Live
    </span>
  );
}

/**
 * The tuner: a strip of fine tick marks with the channel numbers along it, and a glowing lavender needle that
 * glides along as you scroll. The readout above shows the "frequency". Click anywhere on it to tune there.
 */
function TunerDial({ progress, ch, n, onTune }: { progress: MotionValue<number>; ch: number; n: number; onTune: (i: number) => void }) {
  // The needle slides with a transform (in px, from the dial's measured width), not `left`: changing `left` made the
  // page lay out again on every frame of the scroll.
  const dialRef = useRef<HTMLDivElement>(null);
  const dialW = useMotionValue(0);
  useEffect(() => {
    const el = dialRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => dialW.set(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [dialW]);
  const x = useTransform([progress, dialW], ([v, w]: number[]) => v * w);
  const readout = useRef<HTMLSpanElement>(null);
  useMotionValueEvent(progress, 'change', (v) => {
    if (readout.current) readout.current.textContent = frequency(v, n);
  });
  return (
    <div>
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.25em] text-white/40" style={{ fontFamily: MONO }}>
        <span>Tuner</span>
        <span>
          <span ref={readout} className="tabular-nums text-white/70">
            {frequency(progress.get(), n)}
          </span>{' '}
          MHz
        </span>
      </div>
      <div
        ref={dialRef}
        className="relative mt-3 h-11 select-none"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onTune(Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n))));
        }}
      >
        <div className="absolute inset-x-0 top-0 flex h-5 items-end justify-between text-white/25">
          {Array.from({ length: n * 10 + 1 }, (_, i) => (
            <span key={i} className="w-px bg-current" style={{ height: i % 10 === 0 ? '100%' : i % 5 === 0 ? '70%' : '40%' }} />
          ))}
        </div>
        {projects.map((p, i) => (
          <span
            key={p.slug}
            className={`absolute top-7 -translate-x-1/2 text-[10px] tracking-[0.2em] transition-colors duration-300 ${i === ch ? '' : 'text-white/35'}`}
            style={{ left: `${((i + 0.5) / n) * 100}%`, fontFamily: MONO, color: i === ch ? ACCENT : undefined }}
          >
            {pad2(i + 1)}
          </span>
        ))}
        <motion.div aria-hidden="true" className="pointer-events-none absolute -top-1.5 left-0 h-7 w-0" style={{ x }}>
          <div className="absolute inset-y-0 left-0 w-[2px] -translate-x-1/2" style={{ background: ACCENT, boxShadow: `0 0 14px ${ACCENT}, 0 0 3px ${ACCENT}` }}>
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45" style={{ background: ACCENT }} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** A hairline under a programme that fills as you scroll through its channel (lavender for the one on air). */
function RowProgress({ progress, i, n, active }: { progress: MotionValue<number>; i: number; n: number; active: boolean }) {
  const scaleX = useTransform(progress, (v) => Math.max(0, Math.min(1, v * n - i)));
  return (
    <motion.span
      aria-hidden="true"
      className={`pointer-events-none absolute -bottom-px left-0 h-px w-full origin-left ${active ? '' : 'bg-current text-white/20'}`}
      style={{ scaleX, background: active ? ACCENT : undefined, boxShadow: active ? `0 0 8px ${ACCENT}` : undefined }}
    />
  );
}

/** The current programme's details: what it is, its stack, and the way to its full write-up. */
function ProgrammeDetails({ project }: { project: Project }) {
  return (
    <>
      <p className="text-[17px] md:text-[19px] italic leading-snug text-white/55" style={{ fontFamily: "'Ranade', Georgia, serif" }}>
        {project.subtitle}
      </p>
      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/45" style={{ fontFamily: MONO }}>
        {LABELS[project.kind]} · {project.year} <span style={{ color: ACCENT }}>/</span> {project.core.join(' · ')}
      </p>
      <Link to={`/work#${project.slug}`} className={`mt-4 ${viewProjectClass}`} style={{ fontFamily: MONO }}>
        View full project
        <Arrow />
      </Link>
    </>
  );
}

/**
 * The single TV. The section is a tall track; inside it the TV and the channel guide stay pinned to the screen
 * while the track scrolls past, and how far it has scrolled picks the channel. Changing channel on the TV (or
 * with the remote, or in the guide) scrolls to that channel's stretch, so the page and the TV always agree.
 * The guide is a TV listing: a tuner dial whose needle follows the scroll, then the programmes, each with a
 * still from its video. The one on air is lit up, tagged Live, and opens to show its details.
 */
function ChannelTV() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [ch, setCh] = useState(0);
  /** 0 → 1 through all the channels. */
  const progress = useMotionValue(0);
  const n = projects.length;
  const channels = useMemo<TVChannel[]>(() => projects.map((p) => ({ videoUrl: p.videoUrl, imageUrl: p.imageUrl, name: p.title })), []);
  const project = projects[ch];

  // One channel's stretch of scrolling, in px. Worked out from the track, whose height is in svh (the screen height
  // with the address bar showing, which never changes), not from window.innerHeight: on phones that changes while
  // the address bar slides in and out mid-scroll, which moved the channel boundaries and could flip the channel.
  const stepPx = (el: HTMLElement) => (el.offsetHeight / (1 + n * STEP)) * STEP;

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = trackRef.current;
      if (!el) return;
      const step = stepPx(el);
      const scrolled = -el.getBoundingClientRect().top;
      progress.set(Math.max(0, Math.min(1, scrolled / (step * n))));
      setCh(Math.max(0, Math.min(n - 1, Math.floor(scrolled / step))));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [n, progress]);

  /** Scrolls to channel i's stretch of the track (a little way in, so it settles on that channel). */
  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const step = stepPx(el);
    smoothScrollTo(el.getBoundingClientRect().top + window.scrollY + i * step + step * 0.3);
  };
  /** Past the TV, to whatever comes next. */
  const skip = () => {
    const el = trackRef.current;
    if (el) smoothScrollTo(el.getBoundingClientRect().bottom + window.scrollY);
  };

  return (
    // One screen for the pinned view, plus one stretch of scrolling per channel.
    <div ref={trackRef} className="relative mt-6 md:mt-10" style={{ height: `calc(100svh + ${n * STEP * 100}svh)` }}>
      <div className="sticky top-0 flex h-[100svh] items-center">
        <div className="grid w-full grid-cols-1 items-center gap-5 md:grid-cols-12 md:gap-12">
          {/* The TV, as big as fits on the screen next to (or, on phones, above) the guide. */}
          <div className="md:col-span-7">
            <div className="relative mx-auto w-full max-w-[calc((100svh_-_400px)_*_1.25)] md:max-w-[calc((100svh_-_120px)_*_1.25)]">
              {/* The glow behind the TV in the channel's colour. A soft gradient over the area the old blur(80px)
                  spread to, not a blur filter: under the TV's 3D canvas the blur got a layer of its own and was redone
                  by the graphics card on every frame (and on every frame of each channel's colour fade). */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute opacity-30"
                style={
                  {
                    left: 'calc(14% - 140px)',
                    right: 'calc(14% - 140px)',
                    top: 'calc(18% - 140px)',
                    bottom: 'calc(8% - 140px)',
                    '--tv-glow': project.tint,
                    background:
                      'radial-gradient(closest-side, var(--tv-glow) 0%, color-mix(in srgb, var(--tv-glow) 78%, transparent) 30%, color-mix(in srgb, var(--tv-glow) 38%, transparent) 58%, color-mix(in srgb, var(--tv-glow) 10%, transparent) 80%, transparent 100%)',
                    transition: '--tv-glow 700ms',
                  } as React.CSSProperties
                }
              />
              <TV3D
                title="Vardhan's projects"
                channels={channels}
                channel={ch}
                onChannelChange={goTo}
                fallback={<FlatMockup project={project} />}
              />
            </div>
          </div>

          {/* data-signal-avoid: the floating traffic light (components/signal) moves out of the way of the guide. */}
          <div className="md:col-span-5" data-signal-avoid>
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/55" style={{ fontFamily: MONO }}>
                Channel guide
              </p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/30" style={{ fontFamily: MONO }}>
                Scroll to tune ↓
              </p>
            </div>
            <div className="mt-5">
              <TunerDial progress={progress} ch={ch} n={n} onTune={goTo} />
            </div>

            {/* The programmes (desktop). */}
            <ol className="mt-6 hidden border-t border-white/[0.08] md:block">
              {projects.map((p, i) => {
                const active = i === ch;
                return (
                  <li key={p.slug} className="relative border-b border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={active ? 'true' : undefined}
                      className="group/row flex w-full items-center gap-4 py-3 text-left"
                    >
                      <span
                        className="w-9 shrink-0 text-[24px] font-light leading-none text-transparent transition-all duration-300"
                        style={{ WebkitTextStroke: `1px ${active ? ACCENT : 'var(--accent-35, rgba(200,182,255,0.35))'}` }}
                      >
                        {pad2(i + 1)}
                      </span>
                      <span className="relative aspect-video w-[76px] shrink-0 overflow-hidden bg-black">
                        {p.poster ? (
                          <img
                            src={p.poster}
                            alt=""
                            loading="lazy"
                            className={`h-full w-full object-cover transition-all duration-500 ${
                              active ? '' : 'opacity-40 grayscale group-hover/row:opacity-80 group-hover/row:grayscale-0'
                            }`}
                          />
                        ) : (
                          // No video yet: the test card's colour bars.
                          <span
                            className={`absolute inset-0 transition-all duration-500 ${
                              active ? '' : 'opacity-40 grayscale group-hover/row:opacity-80 group-hover/row:grayscale-0'
                            }`}
                          >
                            <TestCard name={p.title} compact />
                          </span>
                        )}
                        {/* Scanlines, so the stills look like they're on a screen. */}
                        <span
                          aria-hidden="true"
                          className="absolute inset-0"
                          style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 3px)' }}
                        />
                        {active && <span aria-hidden="true" className="absolute inset-0" style={{ boxShadow: `inset 0 0 0 1px ${ACCENT}` }} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-[17px] font-medium tracking-tight transition-colors duration-300 ${
                            active ? 'text-white' : 'text-white/45 group-hover/row:text-white/80'
                          }`}
                        >
                          {p.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.2em] text-white/30" style={{ fontFamily: MONO }}>
                          {LABELS[p.kind]}
                        </span>
                      </span>
                      {active ? (
                        <LiveTag />
                      ) : (
                        <span
                          className="shrink-0 text-[10px] uppercase tracking-[0.22em] text-white/40 opacity-0 transition-opacity duration-300 group-hover/row:opacity-100"
                          style={{ fontFamily: MONO }}
                        >
                          Tune →
                        </span>
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {active && (
                        <motion.div
                          key="details"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pb-5 pl-[52px]">
                            <ProgrammeDetails project={p} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <RowProgress progress={progress} i={i} n={n} active={active} />
                  </li>
                );
              })}
            </ol>

            {/* Phones: just what's on now, under the dial. */}
            <motion.div
              key={project.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="mt-5 md:hidden"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="truncate text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white">
                  <span className="mr-2 text-[13px] align-middle" style={{ fontFamily: MONO, color: ACCENT }}>
                    CH {pad2(ch + 1)}
                  </span>
                  {project.title}
                </h3>
                <LiveTag />
              </div>
              <div className="mt-1">
                <ProgrammeDetails project={project} />
              </div>
            </motion.div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={skip}
                className="text-[10px] uppercase tracking-[0.25em] text-white/35 transition-colors hover:text-white/75"
                style={{ fontFamily: MONO }}
              >
                Skip channels ↓
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WorkSectionProps {
  isDark: boolean;
}

const WorkSection = forwardRef<HTMLElement, WorkSectionProps>((_props, ref) => {
  return (
    // data-remote-zone: the cursor turns into the TV remote here (RemoteCursor.tsx).
    // overflow-x: clip keeps the TV's glow (which spreads past the TV) from making the page wider than a phone's
    // screen, which made phones shrink the whole page to fit. Unlike `hidden`, `clip` doesn't break the pinned TV.
    <section id="work" ref={ref} data-remote-zone className="relative px-5 pb-24 pt-8 md:px-12 md:pb-32 md:pt-12" style={{ fontFamily: "'Geist', 'Inter', sans-serif", overflowX: 'clip' }}>
      {/* Header: a hairline, then the section name with a link to the full Work page on the right. */}
      <div className="flex items-end justify-between border-t border-white/[0.08] pt-6">
        <h2 className="relative text-[56px] md:text-[96px] font-semibold leading-[0.9] tracking-[-0.04em] text-white">
          Work<span style={{ color: ACCENT }}>.</span>
          {/* The TV remote leans here when it isn't the cursor; its tip touches this point (RemoteCursor.tsx). */}
          <span data-remote-rest aria-hidden="true" className="pointer-events-none absolute left-[calc(100%-0.35rem)] top-[8%] hidden h-px w-px md:block" />
        </h2>
        <Link
          to="/work"
          className="group mb-2 inline-flex items-center gap-2 text-[12px] md:text-[13px] uppercase tracking-[0.25em] text-white/50 transition-colors hover:text-white"
          style={{ fontFamily: MONO }}
        >
          All work · {String(projects.length).padStart(2, '0')}
          <span className="transition-transform duration-300 group-hover:translate-x-1" style={{ color: ACCENT }}>
            <Arrow size={12} />
          </span>
        </Link>
      </div>
      {SINGLE_TV ? (
        <ChannelTV />
      ) : (
        <div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-20 md:mt-20 md:grid-cols-2">
          {projects.map((p, i) => (
            <WorkCard key={p.slug} project={p} index={i} />
          ))}
        </div>
      )}
    </section>
  );
});

export default WorkSection;
