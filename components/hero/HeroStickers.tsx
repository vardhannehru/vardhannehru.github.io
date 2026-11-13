import React from "react";
import PeelSticker from "./PeelSticker";
import IconSticker from "./IconSticker";
import ImageSticker from "./ImageSticker";

// Stickers in Claude's warm palette (cream, terracotta, ink, sand) with serif lettering, plus Claude
// and OpenAI as die-cut icon stickers. They live in the name's 3D floor plane: positions are fractions
// of the name's box. Ones placed over letters ride on the letter tops (and dip when a letter is
// pressed); the rest lie on the floor in front. Each pastes itself down after the name has risen.

const PAPER = "#FAF9F5";
const TERRACOTTA = "#D97757";
const INK = "#1F1E1D";
const SAND = "#E8DFD0";
const LAVENDER = "#c8b6ff";
// In the pastel theme (index.html) the label stickers take the three swatches and their inks instead.
const v = (name: string, fallback: string) => `var(--st-${name}, ${fallback})`;

const serif: React.CSSProperties = { fontFamily: "'Newsreader', Georgia, serif" };

// Drawn stand-ins, used until the official symbols are in public/brand/.
const claudeFallback = (
  <path
    fill="#D97757"
    d={Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const len = [34, 28, 32, 26, 35, 29, 31, 27, 34, 28, 30, 26][i];
      const p = (ang: number, r: number) => `${(50 + Math.cos(ang) * r).toFixed(1)},${(50 + Math.sin(ang) * r).toFixed(1)}`;
      return `M${p(a - 0.15, 5)} L${p(a, len)} L${p(a + 0.15, 5)} Z`;
    }).join(" ")}
  />
);
const openaiFallback = (
  <>
    {Array.from({ length: 6 }, (_, i) => (
      <rect
        key={i}
        x={-5}
        y={-7}
        width={22}
        height={14}
        rx={7}
        fill="none"
        stroke="#000"
        strokeWidth={3.4}
        transform={`rotate(${i * 60}) translate(3 -9)`}
      />
    ))}
  </>
);

type Variant = "all" | "top" | "bottom";
type Props = { scale: number; lift: number; startDelay: number; variant?: Variant };
type Spot = Partial<Record<Variant, readonly [number, number]>>;

// The main tools from the resume, as die-cut stickers of their official logos (SVGs in public/brand/). A row lies
// on the floor behind the name and a couple in front. Phones (two rows) get only a few, so the name stays clear.
const LOGOS: { name: string; src: string; viewBox: string; size: number; rotate: number; at: Spot }[] = [
  // The row behind the name is farther away, so it's drawn bigger to read about the same size.
  { name: "Python", src: "/brand/python.svg", viewBox: "0 0 128 128", size: 112, rotate: -8, at: { all: [0.1, -0.66], top: [0.42, -0.66] } },
  { name: "LangChain", src: "/brand/langchain.svg", viewBox: "0 0 24 24", size: 108, rotate: 6, at: { all: [0.29, -0.6] } },
  { name: "MCP", src: "/brand/mcp.svg", viewBox: "0 0 24 24", size: 100, rotate: -5, at: { all: [0.46, -0.7] } },
  { name: "Microsoft Azure", src: "/brand/azure.svg", viewBox: "0 0 128 128", size: 104, rotate: 9, at: { all: [0.63, -0.62] } },
  { name: "AWS", src: "/brand/aws.svg", viewBox: "0 0 128 128", size: 118, rotate: -6, at: { all: [0.81, -0.68] } },
  { name: "Docker", src: "/brand/docker.svg", viewBox: "0 0 128 128", size: 84, rotate: 7, at: { all: [0.27, 1.32] } },
  { name: "ElevenLabs", src: "/brand/elevenlabs.svg", viewBox: "0 0 24 24", size: 68, rotate: -9, at: { all: [0.81, 1.2] } },
];

// Skills without a brand, as illustrated die-cut stickers made with Higgsfield (public/stickers/), in the same
// palette as the other stickers. `aspect` is the picture's width / height.
const ART: { name: string; src: string; cut: string; size: number; aspect: number; rotate: number; at: Spot }[] = [
  { name: "AI Agents", src: "/stickers/agents.webp", cut: "/stickers/agents-cut.png", size: 120, aspect: 1.019, rotate: -7, at: { all: [-0.14, 0.24], bottom: [0.6, 1.5] } },
  { name: "Voice AI", src: "/stickers/voice.webp", cut: "/stickers/voice-cut.png", size: 120, aspect: 0.983, rotate: 8, at: { all: [0.99, 0.18] } },
  { name: "Prompt Engineering", src: "/stickers/prompt.webp", cut: "/stickers/prompt-cut.png", size: 124, aspect: 1.108, rotate: 4, at: { all: [0.6, 1.28] } },
];

// Where each sticker sits (fractions of the name's box) on the full name, and on its two rows when it is
// split in two on a phone ("VARDHAN" on top, "NEHRU" below). A sticker with no entry isn't on that row.
const POS = {
  claude: { all: [0.05, 0.04], top: [0.04, 0.0] },
  openai: { all: [0.58, 0.06], top: [0.74, 0.02] },
  engineer: { all: [0.28, 0.52], top: [0.27, 0.5] },
  human: { all: [0.04, 1.06], bottom: [0.06, 1.12] },
  ship: { all: [0.46, 1.1], bottom: [0.6, 1.16] },
  rag: { all: [0.8, 0.44], bottom: [0.6, 0.36] },
} as const;

export default function HeroStickers({ scale, lift, startDelay, variant = "all" }: Props) {
  const at = (k: keyof typeof POS): readonly [number, number] | null => (POS[k] as Record<string, readonly [number, number]>)[variant] ?? null;
  const claude = at("claude");
  const openai = at("openai");
  const engineer = at("engineer");
  const human = at("human");
  const ship = at("ship");
  const rag = at("rag");
  const s = (px: number) => Math.round(px * scale);
  const delay = (i: number) => startDelay + i * 0.35;
  // The skill stickers paste in quickly one after another, after the first six.
  const skillDelay = (k: number) => delay(6) + k * 0.2;
  const logos = LOGOS.filter((l) => l.at[variant]);
  const art = ART.filter((a) => a.at[variant]);

  return (
    <>
      {claude && (
      <IconSticker
        src="/brand/claude-symbol.svg"
        fallback={claudeFallback}
        fallbackViewBox="0 0 100 100"
        size={s(96)}
        left={claude[0]}
        top={claude[1]}
        rotate={-10}
        lift={lift}
        delay={delay(0)}
      />
      )}
      {openai && (
      <IconSticker
        src="/brand/openai-symbol.svg"
        fallback={openaiFallback}
        fallbackViewBox="-30 -30 60 60"
        size={s(92)}
        left={openai[0]}
        top={openai[1]}
        rotate={12}
        lift={lift}
        delay={delay(1)}
      />
      )}
      {engineer && <PeelSticker width={s(196)} height={s(56)} left={engineer[0]} top={engineer[1]} rotate={5} color={v("engineer", TERRACOTTA)} radius="9999px" lift={lift} delay={delay(2)}>
        <span className="italic" style={{ ...serif, fontSize: s(28), color: v("engineer-ink", PAPER) }}>
          AI Engineer
        </span>
      </PeelSticker>}
      {human && <PeelSticker width={s(188)} height={s(48)} left={human[0]} top={human[1]} rotate={3} color={v("human", SAND)} lift={lift} delay={delay(3)}>
        <span className="font-semibold uppercase tracking-[0.18em]" style={{ fontSize: s(13), color: v("human-ink", INK) }}>
          Human in the loop
        </span>
      </PeelSticker>}
      {ship && <PeelSticker width={s(116)} height={s(50)} left={ship[0]} top={ship[1]} rotate={-6} color={v("ship", LAVENDER)} radius="9999px" lift={lift} delay={delay(4)}>
        <span className="italic" style={{ ...serif, fontSize: s(22), color: v("ship-ink", INK) }}>
          Ship it ✦
        </span>
      </PeelSticker>}
      {/* RAG: retrieval-augmented generation. A search lens over lines of text, then the letters. */}
      {rag && <PeelSticker width={s(128)} height={s(54)} left={rag[0]} top={rag[1]} rotate={-8} color={v("rag", INK)} lift={lift} delay={delay(5)}>
        <span className="inline-flex items-center" style={{ gap: s(7) }}>
          <svg width={s(21)} height={s(21)} viewBox="0 0 24 24" fill="none" stroke={v("rag-lens", TERRACOTTA)} strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 21 21" />
            <path d="M7.6 9h5.8M7.6 12h3.8" strokeWidth={1.8} />
          </svg>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: s(24), letterSpacing: "0.06em", color: v("rag-ink", PAPER) }}>RAG</span>
        </span>
      </PeelSticker>}

      {logos.map((l, k) => {
        const [left, top] = l.at[variant]!;
        return (
          <IconSticker
            key={l.name}
            src={l.src}
            fallback={null}
            fallbackViewBox={l.viewBox}
            size={s(l.size)}
            left={left}
            top={top}
            rotate={l.rotate}
            lift={lift}
            delay={skillDelay(k)}
          />
        );
      })}
      {art.map((a, k) => {
        const [left, top] = a.at[variant]!;
        const w = a.aspect >= 1 ? s(a.size) : Math.round(s(a.size) * a.aspect);
        const h = a.aspect >= 1 ? Math.round(s(a.size) / a.aspect) : s(a.size);
        return (
          <ImageSticker
            key={a.name}
            src={a.src}
            cut={a.cut}
            alt={a.name}
            width={w}
            height={h}
            left={left}
            top={top}
            rotate={a.rotate}
            lift={lift}
            delay={skillDelay(logos.length + k)}
          />
        );
      })}
    </>
  );
}
