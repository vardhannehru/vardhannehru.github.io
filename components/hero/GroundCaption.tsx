import React from "react";
import { motion } from "framer-motion";

// "Feed ↓ · 2026 · Portfolio", printed flat on the ground in front of the name. It lives in the name's
// tilted floor plane (so it lies on the ground in perspective and slides back with the name when the hero
// is scrolled). Positions and sizes follow the letter height H.

type Props = { H: number; delay: number };

const FONT: React.CSSProperties = { fontFamily: "'Inter', sans-serif", letterSpacing: "-0.055em", lineHeight: 0.8 };

export default function GroundCaption({ H, delay }: Props) {
  const big = H * 0.42;
  return (
    <motion.div
      className="absolute flex items-end"
      style={{ left: "-6%", right: "-6%", top: H * 1.55, height: big }}
      initial={{ opacity: 0, y: H * 0.15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {/* A faint lavender line ruled across the ground above the row. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0"
        style={{
          top: -H * 0.14,
          height: Math.max(1, H * 0.006),
          background: "linear-gradient(90deg, transparent, rgba(200,182,255,0.4) 18%, rgba(200,182,255,0.4) 82%, transparent)",
        }}
      />
      <a
        href="#work"
        className="group mb-[0.2em] inline-flex items-center gap-[0.3em] font-medium text-white/80 transition-colors hover:text-white"
        style={{ fontFamily: "'Inter', sans-serif", fontSize: H * 0.13, letterSpacing: "-0.01em" }}
      >
        Feed
        <motion.span
          className="text-[#c8b6ff]"
          animate={{ y: ["-8%", "12%", "-8%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          ↓
        </motion.span>
      </a>
      {/* Dim, outlined year. */}
      <span
        aria-hidden="true"
        className="ml-auto font-semibold"
        style={{
          ...FONT,
          fontSize: big,
          color: "rgba(157,134,233,0.14)",
          WebkitTextStroke: `${Math.max(1, H * 0.006).toFixed(2)}px rgba(200,182,255,0.3)`,
        }}
      >
        2026
      </span>
      {/* Bright title, white fading into lavender. */}
      <span
        className="font-semibold bg-gradient-to-b from-white via-[#efe8ff] to-[#b69df8] bg-clip-text text-transparent"
        style={{ ...FONT, fontSize: big, marginLeft: H * 0.9, paddingBottom: "0.06em" }}
      >
        Portfolio
      </span>
    </motion.div>
  );
}
