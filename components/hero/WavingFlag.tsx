import React from 'react';
import './wavingFlag.css';

/*
 * The Indian flag on a thin pole, waving. No box round it.
 *
 * The cloth is cut into thin vertical strips. Each strip bobs up and down a little later than the one before it,
 * and further the further it is from the pole, so a wave runs out along the flag. A soft shadow rides in step
 * with each strip so the folds read as light and shade. Reduced motion: the flag hangs still.
 */

const W = 30; // cloth width (viewBox units)
const H = 20; // cloth height
const STRIPS = 15;
const POLE_X = 2; // where the cloth starts, right of the pole

function Cloth() {
  return (
    <>
      <rect width={W} height={H} fill="#fff" />
      <rect width={W} height={H / 3} fill="#FF9933" />
      <rect y={(H * 2) / 3} width={W} height={H / 3} fill="#138808" />
      <circle cx={W / 2} cy={H / 2} r="2.6" fill="none" stroke="#000080" strokeWidth="0.5" />
      <circle cx={W / 2} cy={H / 2} r="0.45" fill="#000080" />
      {Array.from({ length: 24 }, (_, k) => {
        const a = (k / 24) * Math.PI * 2;
        return (
          <line
            key={k}
            x1={W / 2 + Math.cos(a) * 0.45}
            y1={H / 2 + Math.sin(a) * 0.45}
            x2={W / 2 + Math.cos(a) * 2.6}
            y2={H / 2 + Math.sin(a) * 2.6}
            stroke="#000080"
            strokeWidth="0.22"
          />
        );
      })}
    </>
  );
}

export default function WavingFlag({ className = '' }: { className?: string }) {
  const sw = W / STRIPS;
  // Room above and below for the wave, and on the left for the pole.
  return (
    <svg
      className={`wf ${className}`}
      viewBox={`-1 -3 ${W + POLE_X + 2} ${H + 14}`}
      role="img"
      aria-label="Flag of India"
    >
      <defs>
        <g id="wf-cloth">
          <Cloth />
        </g>
        {Array.from({ length: STRIPS }, (_, i) => (
          // A hair wider than the strip, so no seams show between them.
          <clipPath key={i} id={`wf-strip-${i}`}>
            <rect x={i * sw - 0.05} y={-1} width={sw + 0.1} height={H + 2} />
          </clipPath>
        ))}
      </defs>

      {/* The pole, with a little gold knob on top. */}
      <rect className="wf-pole" x={0} y={-1.2} width={1} height={H + 12} rx={0.5} />
      <circle className="wf-knob" cx={0.5} cy={-1.6} r={1} />

      <g transform={`translate(${POLE_X} 0)`}>
        {Array.from({ length: STRIPS }, (_, i) => {
          const t = i / (STRIPS - 1); // 0 at the pole, 1 at the free end
          const style = {
            '--amp': `${0.25 + t * 1.6}px`,
            animationDelay: `${-i * 0.09}s`,
          } as React.CSSProperties;
          return (
            <g key={i} className="wf-strip" style={style}>
              <g clipPath={`url(#wf-strip-${i})`}>
                <use href="#wf-cloth" />
                <rect className="wf-shade" style={{ animationDelay: `${-i * 0.09}s` }} x={i * sw - 0.05} width={sw + 0.1} height={H} />
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
