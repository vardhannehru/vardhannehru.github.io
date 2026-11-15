// The About block as a zine page: a sheet of torn grid paper on the dark page, with the portrait as a cut-out
// sticker that builds itself out of pixels when it scrolls into view (see ParticlePortrait), handwritten notes
// around it, and a black tape band of "AI ENGINEER" running behind it that speeds up while you scroll.
import React, { useRef, useState } from 'react';
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import ParticlePortrait from './ParticlePortrait';
import { FlyingGlasses, RestingGlasses, WornGlasses, useGlassesFlight } from './FlyingGlasses';

const INK = '#16131c';
const PAPER = '#ece6da';
/** The red paper behind the cut-out (baked into the sticker image) and small red accents. */
const RED = '#e9402f';
const LAVENDER = '#c8b6ff';

// Made from your photo: upscaled and cut out with Higgsfield, then given the white border and red paper cut.
const STICKER = '/about/vardhan-sticker.webp';
const CUTOUT = '/about/vardhan-cutout.png';
const STICKER_RATIO = '1100 / 1406';

const HAND = "'Caveat', 'Dancing Script', cursive";
const MONO = "'Bricolage Grotesque', 'Geist', sans-serif"; // the labels' font (was a spaced-out mono)
const DISPLAY = "'Anton', 'Inter', sans-serif";

const SUMMARY =
  "AI Engineer with a B.Tech in Computer Science (AI & ML) and six months of internship experience building LLM agents and RAG applications on OpenAI and Microsoft Azure. Contributed to TomandJerry.ai, a two-agent platform covering candidate profiling, CV generation, mock interviews and AI-led hiring screens, and built ReveloSoft's enterprise RAG chatbot. Hands-on with LangChain, CrewAI, Model Context Protocol (MCP) and ElevenLabs voice agents; certified in MCP (Anthropic), Generative AI (Databricks) and LangChain & LangGraph (LangChain Academy).";

type ExperienceItem = { when: string; what: string; note: string; links?: { label: string; href: string }[] };
const EXPERIENCE: ExperienceItem[] = [
  { when: 'May – Oct 2026', what: 'AI Intern · ReveloSoft, Hyderabad', note: 'TomandJerry.ai agents, enterprise RAG chatbot' },
  {
    when: 'Open source · 2026',
    what: 'Contributor · pipecat, stripe/ai',
    note: 'Merged tests for pipecat’s audio mixer; config-validation and test-runner fixes for Stripe’s agent toolkit',
    links: [
      { label: 'pipecat #5864 · merged', href: 'https://github.com/pipecat-ai/pipecat/pull/5864' },
      { label: 'stripe/ai #559', href: 'https://github.com/stripe/ai/pull/559' },
      { label: 'stripe/ai #560', href: 'https://github.com/stripe/ai/pull/560' },
    ],
  },
  { when: 'Freelance', what: 'Websites for clients', note: 'VimanOne, Future Spark, Shivaji Vidya Peeth' },
];
const TOOLKIT = [
  'Claude',
  'Claude Code',
  'ChatGPT',
  'OpenAI API',
  'GitHub Copilot',
  'Python',
  'TypeScript',
  'LangChain',
  'LangGraph',
  'CrewAI',
  'MCP',
  'RAG',
  'FAISS',
  'ChromaDB',
  'Azure OpenAI',
  'AWS Bedrock',
  'ElevenLabs',
  'Docker',
  'Kubernetes',
  'Git',
  'Postman',
];

const BAND = ['AI ENGINEER', 'LLM AGENTS', 'RAG', 'VOICE AI', 'MCP'];

/** Photocopy grain, laid over the paper and the tape. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")";

/** A clip-path with torn top and/or bottom edges. The same seed tears the same way on every render. */
function torn(seed: number, top: boolean, bottom: boolean, depth = 14) {
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const steps = 72;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) pts.push(`${((i / steps) * 100).toFixed(2)}% ${top ? (rand() * depth).toFixed(1) : 0}px`);
  for (let i = steps; i >= 0; i--) {
    pts.push(`${((i / steps) * 100).toFixed(2)}% calc(100% - ${bottom ? (rand() * depth).toFixed(1) : 0}px)`);
  }
  return `polygon(${pts.join(',')})`;
}

const PAPER_CLIP = torn(7, false, true, 16);
const BAND_CLIP = torn(31, true, true, 10);

const wrap = (min: number, max: number, v: number) => {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
};

/** The black tape band: words run past on their own and speed up (or reverse) with the scroll. */
function TapeBand() {
  const band = useRef<HTMLDivElement>(null);
  const onScreen = useInView(band);
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [0, 1000], [0, 4], { clamp: false });
  const direction = useRef(1);
  useAnimationFrame((_, delta) => {
    if (!onScreen) return;
    let move = direction.current * -2.4 * (delta / 1000);
    if (boost.get() < 0) direction.current = -1;
    else if (boost.get() > 0) direction.current = 1;
    move += direction.current * move * boost.get();
    baseX.set(baseX.get() + move);
  });
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);

  const row = (copy: number) => (
    <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy > 0}>
      {BAND.map((word, i) => (
        <React.Fragment key={word}>
          <span
            className="px-6 leading-none md:px-10"
            style={
              i % 2
                ? { color: 'transparent', WebkitTextStroke: `1.5px var(--tape-ink, ${PAPER})` }
                : { color: `var(--tape-ink, ${PAPER})` }
            }
          >
            {word}
          </span>
          <span className="text-[0.45em]" style={{ color: i % 2 ? `var(--tape-star-b, ${LAVENDER})` : `var(--tape-star-a, ${RED})` }}>
            ✦
          </span>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    // The band is a direct child of the full-width section, so it fills that width (plus a little bleed each side, for its tilt).
    <div
      ref={band}
      className="relative z-20 select-none"
      style={{ clipPath: BAND_CLIP, width: 'calc(100% + 12vw)', marginLeft: '-6vw', transform: 'rotate(-3deg)' }}
    >
      {/* Ink black in the dark theme; lavender ink in the pastel theme (index.html). */}
      <div className="relative overflow-hidden py-5 md:py-7" style={{ fontFamily: DISPLAY, background: 'var(--tape-bg, #0d0b11)' }}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: GRAIN }} />
        <motion.div className="flex whitespace-nowrap text-[clamp(3.2rem,9vw,8.5rem)]" style={{ x }}>
          {row(0)}
          {row(1)}
        </motion.div>
      </div>
    </div>
  );
}

/** A handwritten note that pops onto the page once the portrait has printed. */
function Note({
  show,
  delay,
  rotate,
  className,
  children,
}: {
  show: boolean;
  delay: number;
  rotate: number;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={`absolute z-40 select-none ${className}`}
      initial={{ opacity: 0, scale: 0.6, rotate: rotate - 10 }}
      animate={show ? { opacity: 1, scale: 1, rotate } : undefined}
      whileHover={{ scale: 1.08, rotate: rotate + 4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 15, delay }}
      style={{ fontFamily: HAND, color: INK }}
    >
      {children}
    </motion.div>
  );
}

/** A scrap of paper held on with a strip of tape, for notes that sit over the dark band. */
function Scrap({ children, tilt = 0 }: { children: React.ReactNode; tilt?: number }) {
  return (
    <div className="relative px-4 pb-2 pt-3 shadow-[0_10px_24px_rgba(0,0,0,0.45)]" style={{ background: PAPER }}>
      <span
        className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2"
        style={{ rotate: `${tilt}deg`, background: 'linear-gradient(90deg, rgba(255,255,255,0.55), rgba(200,182,255,0.45))' }}
      />
      <span className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: GRAIN }} />
      <span className="relative block text-[1.35rem] leading-tight md:text-[1.55rem]">{children}</span>
    </div>
  );
}

/** A hand-drawn arrow that draws itself in. */
function Scribble({ d, show, delay, className }: { d: string; show: boolean; delay: number; className: string }) {
  return (
    <svg viewBox="0 0 120 80" fill="none" className={`pointer-events-none absolute z-40 ${className}`} aria-hidden="true">
      <motion.path
        d={d}
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={show ? { pathLength: 1 } : undefined}
        transition={{ duration: 0.7, ease: 'easeInOut', delay }}
      />
    </svg>
  );
}

/** Words that rise into place one after another when they scroll into view. */
function RiseWords({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  return (
    <span ref={ref} className={className} style={style}>
      {text.split(' ').map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.06em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%' }}
            animate={inView ? { y: '0%' } : undefined}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
};

export default function AboutCollage({ resumeUrl }: { resumeUrl: string }) {
  const page = useRef<HTMLDivElement>(null);
  const [printed, setPrinted] = useState(false);
  // Sunglasses lie on the page and fly onto the portrait once it has formed (FlyingGlasses.tsx).
  const glasses = useGlassesFlight(printed);
  // The portrait drifts a little slower than the page, so it floats above the paper.
  const { scrollYProgress } = useScroll({ target: page, offset: ['start end', 'end start'] });
  const drift = useTransform(scrollYProgress, [0, 1], [14, -14]);

  return (
    <>
    <div className="relative w-full max-w-7xl mx-auto px-4 md:px-8 pt-28 md:pt-32 z-10" style={{ color: INK }}>
      <div ref={page} className="relative">
        {/* The sheet of paper: grid lines, light and shade, photocopy grain, a torn bottom edge */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            clipPath: PAPER_CLIP,
            backgroundColor: PAPER,
            backgroundImage:
              'linear-gradient(rgba(22,19,28,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,28,0.07) 1px, transparent 1px), radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.5), transparent 60%), radial-gradient(140% 120% at 50% 120%, rgba(70,50,30,0.2), transparent 60%)',
            backgroundSize: '26px 26px, 26px 26px, 100% 100%, 100% 100%',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{ clipPath: PAPER_CLIP, backgroundImage: GRAIN }}
        />

        <div className="relative px-5 pb-16 pt-6 md:px-10 md:pb-28 md:pt-8">
          {/* Masthead */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between border-b border-black/15 pb-3 text-[12px] font-medium tracking-[-0.01em] md:text-[13px]"
            style={{ fontFamily: MONO }}
          >
            {/* The two ends take equal room, so the marks sit in the exact middle. */}
            <span className="flex-1">About me — 02</span>
            <span className="hidden sm:inline">✷ ✦ ✣</span>
            <span className="flex-1 text-right">Vardhan Nehru · 2026</span>
          </motion.div>

          {/* Title */}
          <div className="relative mt-6 flex items-end justify-between gap-6 md:mt-8">
            {/* The sunglasses lie here, in the open space beside the title, until they fly to the portrait. */}
            <RestingGlasses g={glasses} className="bottom-2 right-0 w-[54px] md:bottom-auto md:right-[15%] md:top-[14%] md:w-[clamp(110px,11vw,160px)]" />
            <h2
              className="relative font-semibold leading-[0.85] tracking-[-0.055em] text-[clamp(3.6rem,10vw,9.5rem)]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <RiseWords text="this is me" />
              {/* Where the 3D pencil lies at the start of the section, just after "me" (on phones, under the
                  heading), until your pointer comes into the section and it lifts off to become the cursor
                  (PencilCursor.tsx). Only a marker: it takes no clicks and draws nothing itself. */}
              <span
                aria-hidden="true"
                data-pencil-rest
                data-pencil-ready="true"
                className="pointer-events-none absolute left-0 top-full mt-2 h-6 w-[58%] md:left-[calc(100%+1.75rem)] md:top-auto md:bottom-[26%] md:mt-0 md:h-8 md:w-[clamp(170px,17vw,250px)]"
              />
            </h2>
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-3 hidden text-right text-[13px] font-medium tracking-[-0.01em] md:block"
              style={{ fontFamily: MONO }}
            >
              right now
              <span className="mt-1 block normal-case tracking-normal" style={{ fontFamily: HAND, fontSize: '1.5rem', color: RED }}>
                (no filter)
              </span>
            </motion.div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-10 md:mt-10 lg:grid-cols-[1fr_1.3fr_1fr] lg:gap-8">
            {/* Portrait first on phones; on desktop in the middle column, right under the title */}
            <div className="relative order-1 flex items-start justify-center lg:order-2">
              {/* On desktop it's pulled up by the empty margin at the top of the sticker image (5.8% of its height,
                  which is 7.4% of its width), so the cut-out's top lines up with HELLO and EXPERIENCE. */}
              <motion.div className="relative z-30 w-[min(78vw,340px)] lg:-mt-[7.4%] lg:w-full" style={{ y: drift }}>
                {/* Tape holding the top of the sticker to the page */}
                <span
                  aria-hidden="true"
                  className="absolute left-[27%] top-[3%] z-10 h-6 w-20 -rotate-[14deg] md:h-7 md:w-24"
                  style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.62), rgba(200,182,255,0.5))' }}
                />
                <span
                  aria-hidden="true"
                  className="absolute right-[24%] top-[5%] z-10 h-6 w-20 rotate-[16deg] md:h-7 md:w-24"
                  style={{ background: 'linear-gradient(90deg, rgba(200,182,255,0.5), rgba(255,255,255,0.62))' }}
                />
                <ParticlePortrait
                  cutout={CUTOUT}
                  sticker={STICKER}
                  alt="Penkey Vardhan Sai Raghavendra Nehru"
                  className="-rotate-2"
                  style={{ aspectRatio: STICKER_RATIO }}
                  onAssembled={() => setPrinted(true)}
                />
                <WornGlasses g={glasses} />
                {/* Signature, written across the shirt */}
                <motion.div
                  className="pointer-events-none absolute bottom-[14%] right-[6%] z-40 text-[clamp(2.2rem,4vw,3.4rem)]"
                  style={{ fontFamily: "'Dancing Script', cursive", color: PAPER, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                  initial={{ clipPath: 'inset(0 100% 0 0)' }}
                  animate={printed ? { clipPath: 'inset(0 0% 0 0)' } : undefined}
                  transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.5 }}
                >
                  Vardhan
                </motion.div>

                <Note show={printed} delay={0.15} rotate={-6} className="-top-10 right-[-4%] text-[1.7rem] md:text-[2rem]">
                  yes, that's me
                </Note>
                <Scribble
                  show={printed}
                  delay={0.35}
                  className="right-[6%] top-[1%] h-16 w-24"
                  d="M108 10 C 92 8, 62 20, 40 58 M40 58 L 37 44 M40 58 L 52 51"
                />

                <Note show={printed} delay={0.45} rotate={-5} className="bottom-[5%] left-[-3%] hidden lg:block">
                  <Scrap tilt={-4}>6 months @ ReveloSoft</Scrap>
                </Note>
                <Note show={printed} delay={0.6} rotate={6} className="bottom-[-3%] right-[-2%] hidden lg:block">
                  <Scrap tilt={5}>MCP certified ✓</Scrap>
                </Note>
              </motion.div>
            </div>

            {/* Left column: hello, the summary, resume */}
            <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.1 }} className="relative z-10 order-2 lg:order-1">
              <h3 className="text-[clamp(2.6rem,4.4vw,3.8rem)] leading-none" style={{ fontFamily: DISPLAY }}>
                HELLO
              </h3>
              <p className="mt-4 text-[1.2rem] font-medium leading-snug md:text-[1.35rem]">
                I'm Penkey Vardhan Sai Raghavendra Nehru, Vardhan for short. I build{' '}
                <span className="bg-[length:100%_42%] bg-bottom bg-no-repeat" style={{ backgroundImage: `linear-gradient(${LAVENDER}, ${LAVENDER})` }}>
                  intelligent AI systems
                </span>{' '}
                that solve real-world problems.
              </p>
              <p className="mt-4 text-[0.92rem] leading-relaxed text-black/70">{SUMMARY}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-transform hover:-rotate-2 hover:scale-105"
                  style={{ background: INK, color: PAPER }}
                >
                  View Resume <ArrowUpRight size={16} />
                </a>
                <div className="flex items-center gap-2 rounded-full border border-black/20 px-5 py-3 text-sm font-medium">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
                  Open to Work
                </div>
              </div>
            </motion.div>

            {/* Right column: experience, education, toolkit */}
            <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.2 }} className="relative z-10 order-3">
              <h3 className="text-[clamp(2rem,3.2vw,2.8rem)] leading-none" style={{ fontFamily: DISPLAY }}>
                EXPERIENCE
              </h3>
              <ul className="mt-4 space-y-4">
                {EXPERIENCE.map((item) => (
                  <li key={item.what} className="border-l-2 pl-3" style={{ borderColor: RED }}>
                    <span className="block text-[12px] font-medium tracking-[-0.01em] text-black/55" style={{ fontFamily: MONO }}>
                      {item.when}
                    </span>
                    <span className="block font-semibold">{item.what}</span>
                    <span className="block text-sm text-black/65">{item.note}</span>
                    {item.links && (
                      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ fontFamily: MONO }}>
                        {item.links.map((l) => (
                          <a
                            key={l.href}
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 underline decoration-black/25 underline-offset-2 hover:decoration-current"
                            style={{ color: RED }}
                          >
                            {l.label}
                            <ArrowUpRight size={11} />
                          </a>
                        ))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <h3 className="mt-8 text-[clamp(2rem,3.2vw,2.8rem)] leading-none" style={{ fontFamily: DISPLAY }}>
                EDUCATION
              </h3>
              <div className="mt-4 border-l-2 pl-3" style={{ borderColor: RED }}>
                <span className="block text-[12px] font-medium tracking-[-0.01em] text-black/55" style={{ fontFamily: MONO }}>
                  2021 – 2025
                </span>
                <span className="block font-semibold">B.Tech CSE (AI & ML)</span>
                <span className="block text-sm text-black/65">Pragati Engineering College, Kakinada</span>
              </div>

              <h3 className="mt-8 text-[clamp(2rem,3.2vw,2.8rem)] leading-none" style={{ fontFamily: DISPLAY }}>
                TOOLKIT
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {TOOLKIT.map((tool, i) => (
                  <motion.span
                    key={tool}
                    className="cursor-default border-[1.5px] px-2.5 py-1 text-[13px] font-medium tracking-[-0.01em]"
                    style={{ fontFamily: MONO, borderColor: INK, rotate: `${((i * 37) % 7) - 3}deg` }}
                    whileHover={{ rotate: 0, scale: 1.08, backgroundColor: INK, color: PAPER }}
                  >
                    {tool}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <FlyingGlasses g={glasses} />
    </div>

    {/* The tape band is outside the centred column, directly in the full-width section, so nothing narrower can
        cut it off at the sides. It runs under the bottom of the paper. */}
    <div className="relative z-10 -mt-10 lg:-mt-24">
      <TapeBand />
    </div>
    </>
  );
}
