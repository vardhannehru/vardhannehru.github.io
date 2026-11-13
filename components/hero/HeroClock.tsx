import React, { useEffect, useState } from 'react';
import './heroClock.css';

/*
 * The little clock in the hero's bottom-right corner (opposite the flag).
 *
 * A dark round dial ringed with 60 ticks, one per second. The ticks light up one by one as the minute goes by,
 * then the ring clears and starts again. The current second's tick is drawn bolder. The local time sits in the
 * middle (the colon blinks once a second), with am/pm under it.
 *
 * The dial is dark in both themes; only the colours change:
 *   pastel theme: lit ticks in Soft Lavender, the current one in Limencello, time in lavender white;
 *   dark theme: lit ticks in soft violet, the current one in the site's red.
 */

const TICKS = Array.from({ length: 60 }, (_, i) => i);

const HeroClock: React.FC<{ isDark: boolean; className?: string }> = ({ isDark, className = '' }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer = 0;
    // Line each update up with the start of the next second, so the ticks stay in step with the real clock.
    const schedule = () => {
      timer = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 1000 - (Date.now() % 1000) + 5);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  const s = now.getSeconds();
  const h24 = now.getHours();
  const hh = String(h24 % 12 || 12).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  return (
    <div className={`hc ${isDark ? 'hc--dark' : 'hc--light'} ${className}`} aria-hidden="true">
      <svg className="hc-ring" viewBox="-50 -50 100 100">
        {TICKS.map((i) => {
          const major = i % 5 === 0;
          const cls = i === s ? 'hc-tick is-now' : i < s ? 'hc-tick is-lit' : 'hc-tick';
          return (
            <line
              key={i}
              className={cls}
              x1={0}
              y1={-44}
              x2={0}
              y2={major ? -35 : -39}
              transform={`rotate(${i * 6})`}
            />
          );
        })}
      </svg>
      <div className="hc-face">
        <span className="hc-time">
          {hh}
          <span className={`hc-colon ${s % 2 ? 'is-off' : ''}`}>:</span>
          {mm}
        </span>
        <span className="hc-ampm">{h24 < 12 ? 'am' : 'pm'}</span>
      </div>
    </div>
  );
};

export default HeroClock;
