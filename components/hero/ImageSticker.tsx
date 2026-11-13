import React from "react";
import Sticker from "./Sticker";

// A die-cut sticker made from a picture that already has its white border and a transparent background (the
// illustrated skill stickers made with Higgsfield, in public/stickers/). `src` is the sticker with its soft
// shadow baked in, and `cut` is the same picture without the shadow: its outline is the sticker's silhouette,
// so the peeled-up backing and the vinyl sheen follow the cut. Both pictures are the same size.

type Props = {
  src: string;
  cut: string;
  alt: string;
  width: number;
  height: number;
  /** Top-left corner, as fractions of the name's box. */
  left: number;
  top: number;
  rotate: number;
  /** Height it floats at before it's pasted down. */
  lift: number;
  delay: number;
};

export default function ImageSticker({ src, cut, alt, width: w, height: h, left, top, rotate, lift, delay }: Props) {
  const shape: React.CSSProperties = {
    WebkitMaskImage: `url(${cut})`,
    maskImage: `url(${cut})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  };
  return (
    <Sticker
      width={w}
      height={h}
      left={left}
      top={top}
      rotate={rotate}
      lift={lift}
      delay={delay}
      // The picture's corners are empty, so peel far enough to reach the sticker.
      peel={Math.min(w, h) * 0.55}
      silhouette={(c) => <div className="absolute inset-0" style={{ ...shape, background: c }} />}
      face={
        <div className="absolute inset-0">
          <img src={src} alt={alt} draggable={false} className="absolute inset-0 h-full w-full select-none" />
          {/* Vinyl sheen, cut to the sticker's shape */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              ...shape,
              background: "linear-gradient(125deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 40%, rgba(255,255,255,0.07) 70%, rgba(255,255,255,0) 85%)",
            }}
          />
        </div>
      }
    />
  );
}
