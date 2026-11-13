// The stage the name stands on: a dark studio with a spotlight falling on the name (the backdrop was made with
// Higgsfield), a soft beam of light over it, and dust drifting up through the beam. The backdrop leans a little
// away from the cursor and the dust shies away from it, so the scene feels deep. It all dims as the name
// slides back while you scroll.
import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';

const STAGE = '/hero/stage.webp';
const STAGE_SMALL = '/hero/stage-small.webp';
/** Dust motes in the air. */
const MOTES = 70;

type Mote = { x: number; y: number; r: number; vy: number; phase: number; px: number; py: number };

export default function HeroStage({ progress }: { progress: MotionValue<number> }) {
  // Pointer position across the screen, -1..1, eased.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const ex = useSpring(mx, { stiffness: 50, damping: 18 });
  const ey = useSpring(my, { stiffness: 50, damping: 18 });
  const backX = useTransform(ex, (v) => v * -18);
  const backY = useTransform(ey, (v) => v * -10);
  const beamX = useTransform(ex, (v) => `${v * 3}vw`);
  const beamTurn = useTransform(ex, (v) => v * -3);
  const dim = useTransform(progress, [0, 1], [1, 0.3]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
      pointer.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [mx, my]);

  // Dust: drifts up slowly, brighter inside the beam, and gets nudged away from the cursor.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let visible = true;
    const motes: Mote[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!motes.length) {
        for (let i = 0; i < MOTES; i++) {
          motes.push({
            x: w * (0.2 + Math.random() * 0.6),
            y: Math.random() * h,
            r: 0.5 + Math.random() * 1.5,
            vy: 4 + Math.random() * 12,
            phase: Math.random() * Math.PI * 2,
            px: 0,
            py: 0,
          });
        }
      }
    };

    const draw = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      ctx.clearRect(0, 0, w, h);
      const r = canvas.getBoundingClientRect();
      const cx = pointer.current.x - r.left;
      const cy = pointer.current.y - r.top;
      const fade = Math.max(0, 1 - progress.get() * 1.4);
      for (const m of motes) {
        m.y -= m.vy * dt;
        m.x += Math.sin(now / 1600 + m.phase) * 6 * dt;
        if (m.y < -10) {
          m.y = h + 10;
          m.x = w * (0.2 + Math.random() * 0.6);
        }
        // Shy away from the cursor.
        const dx = m.x - cx;
        const dy = m.y - cy;
        const d = Math.hypot(dx, dy);
        if (d < 140 && d > 0.1) {
          const f = (1 - d / 140) * 60;
          m.px += (dx / d) * f * dt;
          m.py += (dy / d) * f * dt;
        }
        m.px *= 0.96;
        m.py *= 0.96;
        m.x += m.px * dt * 10;
        m.y += m.py * dt * 10;
        // Brighter near the middle of the beam.
        const inBeam = Math.max(0, 1 - Math.abs(m.x / w - 0.5) / 0.32);
        const twinkle = 0.6 + 0.4 * Math.sin(now / 700 + m.phase * 3);
        const a = (0.12 + inBeam * 0.6) * twinkle * fade;
        if (a < 0.02) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = '#e4d9ff';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!still) raf = requestAnimationFrame(draw);
    };
    const wake = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    wake();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) wake();
    });
    io.observe(canvas);
    const onVisibility = () => {
      if (!document.hidden) wake();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [progress]);

  return (
    <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity: dim }}>
      {/* The studio: the spotlight's pool of light is lifted to sit under the name, and the picture melts
          into the page colour at its edges. */}
      <motion.div
        className="absolute inset-[-4%]"
        style={{
          x: backX,
          y: backY,
          maskImage: 'radial-gradient(ellipse 75% 70% at 50% 42%, #000 55%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 42%, #000 55%, transparent 100%)',
        }}
      >
        <picture>
          <source media="(max-width: 767px)" srcSet={STAGE_SMALL} />
          <img
            src={STAGE}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            style={{ transform: 'translateY(-24%) scale(1.3)', opacity: 0.9 }}
          />
        </picture>
      </motion.div>

      {/* A soft beam from above that leans a little toward the cursor. */}
      <motion.div
        className="absolute left-1/2 top-[-20%] h-[95%] w-[46vw] max-w-[760px]"
        style={{
          marginLeft: 'calc(min(46vw, 760px) / -2)',
          x: beamX,
          rotate: beamTurn,
          transformOrigin: '50% 0%',
          background: 'conic-gradient(from 180deg at 50% 0%, transparent 154deg, rgba(200,182,255,0.10) 170deg, rgba(225,214,255,0.16) 180deg, rgba(200,182,255,0.10) 190deg, transparent 206deg)',
          filter: 'blur(14px)',
          mixBlendMode: 'screen',
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </motion.div>
  );
}
