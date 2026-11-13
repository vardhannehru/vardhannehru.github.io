import React from 'react';
import { motion } from 'framer-motion';
import { setTheme, useTheme } from '../ui/theme';

/** A small sun/moon switch between the pastel theme (lavender, green and yellow) and the dark one. */
export default function ThemeSwitch({ className = '' }: { className?: string }) {
  const theme = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!dark}
      aria-label={dark ? 'Switch to the pastel theme' : 'Switch to the dark theme'}
      title={dark ? 'Pastel theme' : 'Dark theme'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={`relative inline-flex h-[30px] w-[58px] items-center rounded-full border transition-colors duration-300 ${
        dark ? 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)]' : 'border-[rgba(116,59,190,0.3)] bg-[rgba(255,255,255,0.6)]'
      } ${className}`}
    >
      {/* Icons on the track */}
      <span className={`absolute left-[8px] transition-opacity ${dark ? 'opacity-40' : 'opacity-0'}`} aria-hidden="true">
        <Sun color="#ffffff" />
      </span>
      <span className={`absolute right-[8px] transition-opacity ${dark ? 'opacity-0' : 'opacity-50'}`} aria-hidden="true">
        <Moon color="#743BBE" />
      </span>
      {/* The knob, carrying the current mode's icon */}
      <motion.span
        aria-hidden="true"
        className="absolute top-[3px] flex h-[22px] w-[22px] items-center justify-center rounded-full"
        initial={false}
        animate={{ left: dark ? 31 : 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        style={{
          // Pastel: a Limencello sun.
          background: dark ? '#c8b6ff' : '#FED141',
          boxShadow: dark ? '0 0 14px rgba(200,182,255,0.6)' : '0 2px 8px rgba(63,38,12,0.3), inset 0 0 0 1px rgba(63,38,12,0.15)',
        }}
      >
        {dark ? <Moon color="#170f2e" /> : <Sun color="#3F260C" />}
      </motion.span>
    </button>
  );
}

function Sun({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" fill={color} stroke="none" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1="12" y1="2.5" x2="12" y2="5" transform={`rotate(${a} 12 12)`} />
      ))}
    </svg>
  );
}

function Moon({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill={color} />
    </svg>
  );
}
