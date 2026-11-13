// Certifications as a real drawer: a green enamel steel filing cabinet seen from above (drawer/drawerScene.ts). As you
// scroll, the drawer slides out towards you, then the certificates lift out of it one by one and land, overlapping,
// on the cabinet top. GSAP ScrollTrigger ties it to the scroll, so scrolling back up puts everything back and closes
// the drawer. Pointing at a landed certificate lifts it; clicking opens it full size (the viewer from
// CertificateFolder). The scene is only built once the section is near the screen, and only renders while on screen.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CERTIFICATES } from './certificates';
import { Viewer } from './CertificateFolder';
import { certOut, createDrawerScene, drawerOpen, type DrawerScene } from './drawerScene';
import { whenIdle } from '../ui/siteReady';
import { onPinchZoom } from '../ui/device';

gsap.registerPlugin(ScrollTrigger);

const MONO = "'Geist Mono', ui-monospace, monospace";
const DISPLAY = "'Anton', 'Inter', sans-serif";
const pad = (k: number) => String(k).padStart(2, '0');

export default function CertificateDrawer() {
  const n = CERTIFICATES.length;
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<DrawerScene | null>(null);
  const [near, setNear] = useState(false);
  const [reduce] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const [phone, setPhone] = useState(() => window.innerWidth < 768);
  const [stage, setStage] = useState({ open: 0, landed: 0 });
  const [hover, setHover] = useState(-1);
  const [open, setOpen] = useState<number | null>(null);

  // Build the scene while the browser is idle after the page loads, or once the section is within a screen of being
  // seen, whichever comes first (built only on approach, its set-up froze the scroll for a moment).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '100% 0px' });
    io.observe(el);
    const cancelIdle = whenIdle(() => setNear(true), 8000);
    return () => {
      io.disconnect();
      cancelIdle();
    };
  }, []);

  useEffect(() => {
    const onResize = () => setPhone(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const report = useCallback(
    (t: number) => {
      const landed = CERTIFICATES.filter((_, i) => certOut(t, i) >= 0.98).length;
      const o = drawerOpen(t) > 0.5 ? 1 : 0;
      setStage((s) => (s.landed === landed && s.open === o ? s : { open: o, landed }));
    },
    []
  );

  useEffect(() => {
    if (!near) return undefined;
    const canvas = canvasRef.current;
    const stageEl = stageRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !stageEl || !wrap) return undefined;
    let scene: DrawerScene;
    try {
      scene = createDrawerScene(
        canvas,
        CERTIFICATES.map((c) => ({ src: c.full, aspect: c.aspect })),
        { phone: window.innerWidth < 768 }
      );
    } catch (err) {
      // No WebGL: the hidden list of buttons still opens every certificate.
      console.warn('[CertificateDrawer] 3D scene unavailable:', err);
      return undefined;
    }
    sceneRef.current = scene;

    const fit = () => scene.resize(stageEl.clientWidth, stageEl.clientHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stageEl);
    // Pinch-zoomed on a phone: redraw at the zoomed resolution (resize picks it up), so it stays sharp.
    const offZoom = onPinchZoom(fit);

    // Render only while the stage is on screen.
    const io = new IntersectionObserver(([e]) => scene.setActive(e.isIntersecting));
    io.observe(stageEl);

    // The scroll drives one number, 0..1, smoothed a little (scrub), and reversed when scrolling back up.
    const proxy = { t: 0 };
    let tween: gsap.core.Tween | null = null;
    if (reduce) {
      scene.setProgress(1);
      report(1);
    } else {
      tween = gsap.to(proxy, {
        t: 1,
        ease: 'none',
        onUpdate: () => {
          scene.setProgress(proxy.t);
          report(proxy.t);
        },
        scrollTrigger: { trigger: wrap, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true },
      });
    }
    // Lenis scrolls the window, which ScrollTrigger follows; make sure it measures after the page settles.
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 300);

    return () => {
      window.clearTimeout(refresh);
      tween?.scrollTrigger?.kill();
      tween?.kill();
      ro.disconnect();
      offZoom();
      io.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [near, reduce, report]);

  // Pointing at a landed certificate lifts it; clicking opens it.
  const pickAt = (e: React.PointerEvent | React.MouseEvent) => {
    const scene = sceneRef.current;
    const el = stageRef.current;
    if (!scene || !el) return -1;
    const r = el.getBoundingClientRect();
    return scene.pick(e.clientX - r.left, e.clientY - r.top);
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const i = pickAt(e);
    const box = stageRef.current?.getBoundingClientRect();
    if (box) sceneRef.current?.setPointer(e.clientX - box.left, e.clientY - box.top);
    if (i !== hover) {
      setHover(i);
      sceneRef.current?.setHover(i);
    }
  };
  const onLeave = () => {
    setHover(-1);
    sceneRef.current?.setHover(-1);
  };
  const onClick = (e: React.MouseEvent) => {
    const i = pickAt(e);
    if (i >= 0) setOpen(i);
  };

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((k: number) => setOpen((i) => (i === null ? i : (i + k + n) % n)), [n]);

  const info = hover >= 0 ? CERTIFICATES[hover] : null;
  const hint = stage.landed === n ? (phone ? 'tap a certificate to open it' : 'click a certificate to open it') : stage.open ? 'keep scrolling' : 'scroll to open the drawer';

  return (
    <div className="relative">
      {/* Heading */}
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/45 md:text-[11px]" style={{ fontFamily: MONO }}>
              Verified credentials
            </p>
            <h3 className="pastel-heading mt-2 text-[clamp(2.6rem,6vw,4.5rem)] leading-none text-white" style={{ fontFamily: DISPLAY }}>
              CERTIFICATIONS <span className="align-top text-[0.4em] text-[#c8b6ff]">({pad(n)})</span>
            </h3>
          </div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 md:text-[11px]" style={{ fontFamily: MONO }}>
            from the drawer
          </p>
        </div>
      </div>

      {/* The tall track the scroll runs through; the stage stays pinned on screen meanwhile. */}
      <div ref={wrapRef} className="relative" style={{ height: reduce ? '100vh' : phone ? '440vh' : '480vh' }}>
        <div className="sticky top-0 h-screen w-full">
          <div
            ref={stageRef}
            className="absolute inset-0"
            style={{ cursor: hover >= 0 ? 'pointer' : undefined, touchAction: 'pan-y' }}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            onClick={onClick}
          >
            <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
          </div>

          {/* Counter and hint: bottom left on desktop, top on phones (clear of the navigation bars); what's being
              pointed at, bottom centre. */}
          <div className="pointer-events-none absolute left-4 top-24 md:bottom-10 md:left-8 md:top-auto">
            {/* Colours set inline: the light theme turns `text-white` into dark ink (index.html), but these sit on a dark chip. */}
            <div className="rounded-2xl bg-[#07040f]/75 px-4 py-2.5 backdrop-blur-sm" style={{ fontFamily: MONO, color: '#fff' }}>
              <p className="text-[11px] uppercase tracking-[0.3em] md:text-[12px]">
                certificates · {pad(stage.landed)} / {pad(n)}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {hint}
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-24 px-4 text-center md:bottom-10">
            {info && (
              <div className="mx-auto inline-block max-w-[min(420px,80vw)] rounded-2xl bg-[#07040f]/80 px-5 py-3 text-left backdrop-blur-sm" style={{ color: '#fff' }}>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#c8b6ff]" style={{ fontFamily: MONO }}>
                  {info.issuer}
                </p>
                <p className="mt-1 text-base font-semibold leading-snug md:text-lg">{info.title}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {info.date}
                </p>
              </div>
            )}
          </div>

          {/* Keyboard and screen readers: every certificate, as a button. */}
          <ul className="sr-only">
            {CERTIFICATES.map((c, i) => (
              <li key={c.id}>
                <button type="button" onClick={() => setOpen(i)}>
                  Open certificate: {c.title}, {c.issuer}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Viewer index={open} onClose={close} onStep={step} />
    </div>
  );
}
