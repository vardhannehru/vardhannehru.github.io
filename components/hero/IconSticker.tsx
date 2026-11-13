import React, { useEffect, useId, useState } from "react";
import Sticker from "./Sticker";

// A die-cut vinyl sticker of an icon: the icon's own shape with a white border, a vinyl sheen and a
// crisp shadow, all drawn as vector SVG so it stays sharp in the tilted 3D plane. Uses the official
// SVG from `src` when it exists (e.g. public/brand/claude-symbol.svg), otherwise `fallback`.

type SvgMarkup = { viewBox: string; inner: string };

// Loads a local SVG file's markup (scripts and event handlers stripped). Null until loaded or if missing.
function useSvgMarkup(url: string) {
  const [svg, setSvg] = useState<SvgMarkup | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) => (r.ok && (r.headers.get("content-type") ?? "").includes("svg") ? r.text() : Promise.reject()))
      .then((txt) => {
        const root = new DOMParser().parseFromString(txt, "image/svg+xml").documentElement;
        if (root.nodeName.toLowerCase() !== "svg") return;
        root.querySelectorAll("script, foreignObject").forEach((n) => n.remove());
        root.querySelectorAll("*").forEach((el) => {
          for (const a of Array.from(el.attributes)) if (/^on/i.test(a.name)) el.removeAttribute(a.name);
        });
        const viewBox =
          root.getAttribute("viewBox") ?? `0 0 ${parseFloat(root.getAttribute("width") ?? "100")} ${parseFloat(root.getAttribute("height") ?? "100")}`;
        // Keep paint set on the outer <svg> (e.g. the Claude symbol's colour is its root `fill`) by moving
        // the shapes into a group that carries it.
        const group = root.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
        for (const a of Array.from(root.attributes)) {
          if (/^(fill|stroke|stroke-width|stroke-linejoin|stroke-linecap|fill-rule|clip-rule|opacity|fill-opacity|stroke-opacity)$/.test(a.name)) {
            group.setAttribute(a.name, a.value);
          }
        }
        while (root.firstChild) group.appendChild(root.firstChild);
        if (alive) setSvg({ viewBox, inner: new XMLSerializer().serializeToString(group) });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);
  return svg;
}

type Props = {
  src: string;
  /** Drawn stand-in (SVG children in `fallbackViewBox` units) until the official file exists. */
  fallback: React.ReactNode;
  fallbackViewBox: string;
  size: number;
  /** Top-left corner, as fractions of the name's box. */
  left: number;
  top: number;
  rotate: number;
  /** Height it floats at before it's pasted down. */
  lift: number;
  delay: number;
};

export default function IconSticker({ src, fallback, fallbackViewBox, size, left, top, rotate, lift, delay }: Props) {
  const id = useId().replace(/:/g, "");
  const svg = useSvgMarkup(src);
  const viewBox = svg?.viewBox ?? fallbackViewBox;
  const [vx, vy, vw, vh] = viewBox.split(/[\s,]+/).map(Number);
  const border = Math.max(vw, vh) * 0.07;
  const pad = border * 1.6;
  const padded = `${vx - pad} ${vy - pad} ${vw + pad * 2} ${vh + pad * 2}`;
  const art = (className?: string) =>
    svg ? <g className={className} dangerouslySetInnerHTML={{ __html: svg.inner }} /> : <g className={className}>{fallback}</g>;
  const svgStyle = (extra?: Record<string, string | number>) =>
    ({ position: "absolute", inset: 0, overflow: "visible", display: "block", "--diecut": border * 2, ...extra }) as React.CSSProperties;

  return (
    <Sticker
      width={size}
      height={size}
      left={left}
      top={top}
      rotate={rotate}
      lift={lift}
      delay={delay}
      // The bounding box's corner is empty, so peel far enough to reach the icon's edge.
      peel={size * 0.62}
      // The die-cut outline filled with one colour: the border traced in that colour, art included.
      silhouette={(c) => (
        <svg viewBox={padded} width={size} height={size} style={svgStyle({ "--diecut-color": c })}>
          {art("diecut-fill")}
        </svg>
      )}
      face={
        <svg viewBox={padded} width={size} height={size} style={svgStyle()}>
          <defs>
            <filter id={`shadow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy={border * 0.5} stdDeviation={border * 0.45} floodColor="#000" floodOpacity="0.45" />
            </filter>
            <linearGradient id={`sheen-${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.75" stopColor="#fff" stopOpacity="0.08" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id={`shape-${id}`}>{art("diecut-mask")}</mask>
          </defs>
          <g filter={`url(#shadow-${id})`}>
            {/* White die-cut border: the icon traced with a thick white outline */}
            {art("diecut")}
            {art()}
          </g>
          {/* Vinyl sheen over the whole sticker */}
          <rect x={vx - pad} y={vy - pad} width={vw + pad * 2} height={vh + pad * 2} fill={`url(#sheen-${id})`} mask={`url(#shape-${id})`} />
        </svg>
      }
    />
  );
}
