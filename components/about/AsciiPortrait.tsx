// The ASCII art, loaded as plain text from ascii-art.txt. The art was drawn for a white page, so its backdrop
// is solid "@". On this dark page that reads as a light box, so the "@" backdrop connected to the edges is
// cleared to blank space; the figure itself keeps every character exactly as in the file. It is sized so its
// width matches the giant name ("AI Engineer"), sits on the same baseline, and fades out softly at the edges.
//
// Hovering reveals the real photo underneath, only around the cursor, through a small gooey blob: a chain of
// circles that trail the cursor and melt together through an SVG "goo" filter (blur, then a hard alpha
// threshold). The photo is a cut-out (no white backdrop), stretched to the art's box so the two line up.
import React, { useEffect, useId, useMemo, useRef } from 'react';
import art from './ascii-art.txt?raw';

// The name's font size (see AboutSection) and the art's width, measured in em: the art is 220 characters,
// and a monospace character is about 0.6em wide, so 220 × 0.6 = 132em. The name is about 5em wide.
const NAME_SIZE = 'clamp(3rem, 12.5vw, 10.5rem)';
const ART_SIZE = `calc(${NAME_SIZE} * 0.038)`;

const PHOTO = '/about/portrait-cutout.png';
const EDGES = '/about/edges.png';
const EDGE_KEYFRAMES = '@keyframes asciiEdgeGlint{from{background-position:100% 100%}to{background-position:0% 0%}}';
// Soft fades at the sides and the bottom only, so the art melts into the page instead of sitting in a shape.
const EDGE_FADE =
  'linear-gradient(to right, transparent, #000 14%, #000 86%, transparent), linear-gradient(to bottom, #000 70%, transparent)';

/** The trail: the lead blob's radius and how much each following blob shrinks, in px. */
const RADII = [34, 29, 25, 21, 18, 15, 12, 10, 8];
/** Three small blobs that wobble around the lead one, so the edge stays lumpy and liquid even when still. */
const DRIPS = [
  { r: 15, dist: 30, speed: 1.3, phase: 0 },
  { r: 11, dist: 36, speed: -1.0, phase: 2.1 },
  { r: 13, dist: 27, speed: 1.7, phase: 4.2 },
];
/** Springs: each blob is pulled towards the one ahead and overshoots a little, which makes it wobble. */
const STIFF = 0.2;
const DAMP = 0.7;
/** How quickly the blob grows in on hover and shrinks away on leave. */
const GROW = 0.12;

/** Blanks the "@" backdrop that touches the edges of the art, leaving the figure untouched. */
function clearBackdrop(text: string) {
  const rows = text.replace(/\r/g, '').split('\n').map((r) => [...r]);
  const stack: [number, number][] = [];
  rows.forEach((row, y) => row.forEach((_, x) => {
    if (y === 0 || y === rows.length - 1 || x === 0 || x === row.length - 1) stack.push([x, y]);
  }));
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (rows[y]?.[x] !== '@') continue;
    rows[y][x] = ' ';
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return rows.map((r) => r.join('')).join('\n');
}

export default function AsciiPortrait() {
  const id = useId().replace(/:/g, '');
  const text = useMemo(() => clearBackdrop(art), []);
  const wrap = useRef<HTMLDivElement>(null);
  const circles = useRef<(SVGCircleElement | null)[]>([]);
  const s = useRef({
    target: { x: 0, y: 0 },
    pts: RADII.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 })),
    size: 0,
    on: false,
    hover: false,
    scrolling: false,
    raf: 0,
  });

  useEffect(() => () => cancelAnimationFrame(s.current.raf), []);

  const tick = () => {
    const st = s.current;
    st.size += ((st.on ? 1 : 0) - st.size) * GROW;
    st.pts.forEach((p, i) => {
      const lead = i === 0 ? st.target : st.pts[i - 1];
      // Later blobs are looser, so the tail lags and swings more.
      const k = STIFF * (1 - i * 0.06);
      p.vx = (p.vx + (lead.x - p.x) * k) * DAMP;
      p.vy = (p.vy + (lead.y - p.y) * k) * DAMP;
      p.x += p.vx;
      p.y += p.vy;
      // Stretch: a fast-moving blob swells a little, like a drop being pulled.
      const swell = 1 + Math.min(Math.hypot(p.vx, p.vy) / 40, 0.35);
      const c = circles.current[i];
      if (c) {
        c.setAttribute('cx', p.x.toFixed(1));
        c.setAttribute('cy', p.y.toFixed(1));
        c.setAttribute('r', (RADII[i] * st.size * swell).toFixed(1));
      }
    });
    const head = st.pts[0];
    const t = performance.now() / 1000;
    DRIPS.forEach((d, j) => {
      const c = circles.current[RADII.length + j];
      if (!c) return;
      const a = t * d.speed + d.phase;
      const wobble = d.dist * (0.75 + 0.25 * Math.sin(t * 3 + d.phase));
      c.setAttribute('cx', (head.x + Math.cos(a) * wobble).toFixed(1));
      c.setAttribute('cy', (head.y + Math.sin(a) * wobble).toFixed(1));
      c.setAttribute('r', (d.r * st.size).toFixed(1));
    });
    // Keep animating while visible; stop once it has fully shrunk away.
    st.raf = !st.on && st.size < 0.005 ? 0 : requestAnimationFrame(tick);
  };

  // While the page scrolls, the reveal also opens over the art: it sits on the part of the art nearest the
  // middle of the screen and sways as you scroll. It closes once scrolling stops, unless the mouse is over the art.
  useEffect(() => {
    let idle = 0;
    const onScroll = () => {
      const el = wrap.current;
      const st = s.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) {
        st.scrolling = false;
        if (!st.hover) st.on = false;
        return;
      }
      st.target = {
        x: r.width / 2 + Math.sin(window.scrollY / 70) * r.width * 0.25,
        y: Math.min(Math.max(window.innerHeight / 2 - r.top, 0), r.height),
      };
      st.scrolling = true;
      st.on = true;
      if (!st.raf) st.raf = requestAnimationFrame(tick);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        st.scrolling = false;
        if (!st.hover) st.on = false;
      }, 450);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(idle);
    };
  }, []);

  const pointAt = (e: React.MouseEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    s.current.target = { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div aria-hidden="true" className="group pointer-events-auto absolute inset-x-0 bottom-0 hidden translate-y-[12%] justify-start pl-[200px] md:flex">
      <div
        ref={wrap}
        className="relative"
        onMouseEnter={(e) => {
          const st = s.current;
          pointAt(e);
          // Start the whole trail at the cursor so it grows from one spot instead of flying in.
          if (st.size < 0.01) st.pts.forEach((p) => Object.assign(p, st.target, { vx: 0, vy: 0 }));
          st.hover = true;
          st.on = true;
          if (!st.raf) st.raf = requestAnimationFrame(tick);
        }}
        onMouseMove={pointAt}
        onMouseLeave={() => {
          const st = s.current;
          st.hover = false;
          st.on = st.scrolling;
        }}
      >
        <pre
          className="select-none font-mono leading-[1.02] whitespace-pre opacity-40 transition-opacity duration-700 group-hover:opacity-75"
          style={{
            fontSize: ART_SIZE,
            WebkitMaskImage: EDGE_FADE,
            maskImage: EDGE_FADE,
            WebkitMaskComposite: 'source-in',
            maskComposite: 'intersect',
          }}
        >
          {text}
        </pre>

        {/* Neon outline of the figure: a dim line that a bright glint travels around, following only the edges */}
        <style>{EDGE_KEYFRAMES}</style>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(115deg, rgba(200,182,255,0.22) 0%, rgba(200,182,255,0.22) 40%, #ffffff 50%, rgba(200,182,255,0.22) 60%, rgba(200,182,255,0.22) 100%) 0 0 / 300% 300%',
            WebkitMaskImage: `url(${EDGES})`,
            maskImage: `url(${EDGES})`,
            WebkitMaskSize: '100% 100%',
            maskSize: '100% 100%',
            animation: 'asciiEdgeGlint 3.6s linear infinite',
            filter: 'drop-shadow(0 0 3px #c8b6ff) drop-shadow(0 0 9px #9d86e9)',
          }}
        />

        {/* The photo, shown only through the gooey blob, with a faint lavender glow at its edge */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <filter id={`${id}goo`} x="-50%" y="-50%" width="200%" height="200%">
              {/* Warp the blobs with drifting noise first, so the shape is an irregular, shifting splat, not a circle */}
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="noise">
                <animate attributeName="baseFrequency" values="0.03;0.045;0.03" dur="5s" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="38" xChannelSelector="R" yChannelSelector="G" result="warped" />
              <feGaussianBlur in="warped" stdDeviation="9" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -11" result="goo" />
              <feGaussianBlur in="goo" stdDeviation="0.8" />
            </filter>
            <filter id={`${id}glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#c8b6ff" floodOpacity="0.55" />
            </filter>
            <mask id={`${id}mask`} maskUnits="userSpaceOnUse" x="-10%" y="-10%" width="120%" height="120%">
              <g filter={`url(#${id}goo)`} fill="#fff">
                {[...RADII, ...DRIPS].map((_, i) => (
                  <circle key={i} ref={(el) => { circles.current[i] = el; }} cx="0" cy="0" r="0" />
                ))}
              </g>
            </mask>
          </defs>
          <g filter={`url(#${id}glow)`}>
            <image href={PHOTO} width="100%" height="100%" preserveAspectRatio="none" mask={`url(#${id}mask)`} />
          </g>
        </svg>
      </div>
    </div>
  );
}
