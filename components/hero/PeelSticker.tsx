import React from "react";
import Sticker from "./Sticker";

// Fine vinyl grain, so flat colours don't look like plain boxes.
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.35'/></svg>\")";

type Props = {
  width: number;
  height: number;
  /** Top-left corner, as fractions of the name's box. */
  left: number;
  top: number;
  rotate: number;
  color: string;
  radius?: string;
  /** Height it floats at before it's pasted down. */
  lift: number;
  delay: number;
  children: React.ReactNode;
};

// A vinyl label sticker with a white border. Hover peels its corner back; drag to peel it off and
// stick it somewhere else.
export default function PeelSticker({ width: w, height: h, left, top, rotate, color, radius = "14px", lift, delay, children }: Props) {
  return (
    <Sticker
      width={w}
      height={h}
      left={left}
      top={top}
      rotate={rotate}
      lift={lift}
      delay={delay}
      // Rounded ends are empty at the very corner, so peel far enough to reach the sticker.
      peel={Math.min(w, h) * (radius === "9999px" ? 0.62 : 0.45)}
      silhouette={(c) => <div className="absolute inset-0" style={{ borderRadius: radius, background: c }} />}
      face={
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{
            borderRadius: radius,
            background: color,
            border: `${Math.max(2, Math.round(Math.min(w, h) * 0.08))}px solid #fff`,
            whiteSpace: "nowrap",
            lineHeight: 1,
            // Contact shadow as box-shadow (not a filter), so it stays sharp in 3D.
            boxShadow:
              "0 1px 1px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 3px rgba(0,0,0,0.12)",
          }}
        >
          {children}
          <div className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ backgroundImage: GRAIN, opacity: 0.5 }} />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(125deg, rgba(255,255,255,0.4), rgba(255,255,255,0) 40%, rgba(255,255,255,0.08) 70%, rgba(255,255,255,0) 85%)" }}
          />
        </div>
      }
    />
  );
}
