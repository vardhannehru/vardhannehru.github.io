import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { buildPencil, LENGTH, type PencilScene } from './pencilScene';
import { whenIdle } from '../../ui/siteReady';
import { canvasDpr, onPinchZoom, PHONE_DPR } from '../../ui/device';

// A 3D pencil that lies on the portrait in the About section and, when your pointer comes into the section, lifts
// off the card, flies to the pointer and becomes the cursor there (three.js, built like RemoteCursor.tsx). Its
// graphite point is the hotspot. It leans the way it's dragged, twists a little as it moves, lifts slightly over
// links and buttons, and presses down when you click. Leaving the section it flies back to the card (or, if the
// card is off screen, or you only moved onto the nav or the scrollbar, it fades out and comes back when you return).
//
// - Where it lives: anything marked `data-pencil-zone` (the About section). It never takes over inside the TV
//   remote's zone (`data-remote-zone`) or over the traffic-light scrollbar.
// - Where it rests: the element marked `data-pencil-rest` (along the bottom of the portrait). It waits for that
//   element's `data-pencil-ready="true"` (the portrait has formed), then drops onto the card.
// - Phones and touch screens keep their normal touch: the pencil just lies on the card, and tapping it rolls it.
// - It only draws while something moves; at rest it doesn't draw at all. The canvas is made only once the About
//   section is near.
//
// Native cursors stay hidden site-wide (index.html); over the About section the pencil takes the place of the
// small dot cursor (SmoothCursor), which hides while `pencil-cursor-on` is on the body.

/** The canvas (CSS px, square) and how much of the page it shows (scene units across). */
const SIZE = 380;
const UNITS = 6.8;
const PPU = SIZE / UNITS;
/** Lying on the card: the angle along the bottom of the portrait (radians, cap to the right, slightly up). */
const REST_ANGLE = 0.1;
/** Held as the cursor: point to cap, up and to the right and towards you, like a pencil in a right hand. */
const HELD_DIR = new THREE.Vector3(0.46, 0.5, 0.74).normalize();
const HELD_SCALE = 0.6;
/** The flight from the card to the pointer (and back). */
const FLY = { duration: 1.05, ease: 'power3.inOut' };
const FLY_BACK = { duration: 0.9, ease: 'power3.inOut' };
/** Leaning with movement (per px/s of pointer speed), and the most it leans or twists. */
const LEAN = 0.00042;
const LEAN_MAX = 0.45;
const TWIST = 0.0011;
const TWIST_MAX = 0.5;

const INTERACTIVE = 'a,button,[role="button"],input,textarea,select,label,summary,[tabindex]:not([tabindex="-1"])';

type Mode = 'rest' | 'fly' | 'held' | 'back';

function canUseWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function PencilCursor() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !canUseWebGL()) return;
    const fine = !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // ---- Canvas and scene (made when first needed; a fresh canvas if the browser takes the context away).
    let canvas: HTMLCanvasElement;
    let scene: PencilScene | null = null;
    let broken = false;
    let rebuilds = 0;
    const onLost = () => {
      scene?.dispose();
      scene = null;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.remove();
      if (++rebuilds > 5) {
        broken = true;
        hideAll();
        return;
      }
      makeCanvas();
      wake();
    };
    const makeCanvas = () => {
      canvas = document.createElement('canvas');
      canvas.className = 'h-full w-full';
      canvas.addEventListener('webglcontextlost', onLost);
      wrap.appendChild(canvas);
    };
    const ensureScene = () => {
      if (scene || broken) return !!scene;
      try {
        scene = buildPencil(canvas);
        scene.setSize(SIZE, SIZE, canvasDpr(2, PHONE_DPR, SIZE, SIZE), UNITS);
      } catch {
        broken = true;
        hideAll();
      }
      return !!scene;
    };
    makeCanvas();

    // ---- State (reused; nothing allocated per frame)
    let mode: Mode = 'rest';
    // GSAP writes these: the flight (0 on the card .. 1 held), how visible it is, the drop onto the card, a roll
    // (tapping it on a phone), hovering a link, and pressing.
    const anim = { t: 0, show: 0, drop: 1, roll: 0, hover: 0, press: 0 };
    const rest = { dir: new THREE.Vector3(Math.cos(REST_ANGLE), Math.sin(REST_ANGLE), 0), scale: 0.6, lift: 0 };
    const held = { dir: new THREE.Vector3().copy(HELD_DIR), scale: HELD_SCALE, lift: 0 };
    const restBox = { x: 0, y: 0, w: 0, on: false, ready: false, el: null as HTMLElement | null };
    let dropped = false;
    // The pointer, where the pencil's point is drawn (a touch behind it), and its velocity.
    const ptr = { x: 0, y: 0, has: false };
    const tip = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };
    const lean = { x: 0, y: 0, twist: 0 };
    let inZone = false;
    let raf = 0;
    let last = performance.now();
    let lastX = NaN;
    let lastY = NaN;
    let lastZ = '';
    let lastSig = NaN;

    const setCursorOn = (on: boolean) => document.body.classList.toggle('pencil-cursor-on', on);

    const hideAll = () => {
      wrap.style.opacity = '0';
      setCursorOn(false);
    };

    /** The rest spot on screen (the marked element along the bottom of the portrait). */
    const readRest = () => {
      const el = restBox.el && restBox.el.isConnected ? restBox.el : (document.querySelector('[data-pencil-rest]') as HTMLElement | null);
      restBox.el = el;
      if (!el) {
        restBox.on = false;
        restBox.ready = false;
        return;
      }
      const r = el.getBoundingClientRect();
      restBox.ready = el.dataset.pencilReady === 'true';
      restBox.x = r.left + r.width / 2;
      restBox.y = r.top + r.height / 2;
      restBox.w = r.width;
      restBox.on = restBox.ready && r.width > 0 && r.bottom > -40 && r.top < window.innerHeight + 40 && r.right > 0 && r.left < window.innerWidth;
      // Lying on the card: as long as the spot is wide.
      rest.scale = Math.max(0.2, (r.width * 0.98) / (LENGTH * PPU));
    };

    const loop = (now: number) => {
      raf = 0;
      if (broken || document.hidden) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      let busy = gsap.isTweening(anim);
      readRest();
      if ((restBox.on || mode !== 'rest') && !scene && ensureScene()) lastSig = NaN;

      // First showing: once the portrait has formed and the card is on screen, drop onto it.
      if (!dropped && restBox.on && scene) {
        dropped = true;
        if (reduce) {
          anim.drop = 0;
          anim.show = 1;
        } else {
          gsap.to(anim, { show: 1, duration: 0.35, ease: 'power1.out' });
          gsap.to(anim, { drop: 0, duration: 0.9, ease: 'bounce.out', delay: 0.1 });
        }
        busy = true;
      }

      // The point follows the pointer closely (a few ms behind, so it moves smoothly but stays on the hotspot).
      if (ptr.has) {
        const k = 1 - Math.exp(-dt * 34);
        const px = tip.x;
        const py = tip.y;
        tip.x += (ptr.x - tip.x) * k;
        tip.y += (ptr.y - tip.y) * k;
        vel.x = (tip.x - px) / dt;
        vel.y = (tip.y - py) / dt;
        if (Math.abs(ptr.x - tip.x) > 0.2 || Math.abs(ptr.y - tip.y) > 0.2) busy = true;
        else {
          tip.x = ptr.x;
          tip.y = ptr.y;
        }
      }

      // Leaning the way it's dragged (the cap trails behind), twisting a little as it goes.
      if (!reduce) {
        const kl = 1 - Math.exp(-dt * 9);
        const lx = Math.max(-LEAN_MAX, Math.min(LEAN_MAX, -vel.x * LEAN));
        const ly = Math.max(-LEAN_MAX, Math.min(LEAN_MAX, vel.y * LEAN));
        const tw = Math.max(-TWIST_MAX, Math.min(TWIST_MAX, vel.x * TWIST));
        lean.x += (lx - lean.x) * kl;
        lean.y += (ly - lean.y) * kl;
        lean.twist += (tw - lean.twist) * kl;
        if (Math.abs(lean.x) + Math.abs(lean.y) + Math.abs(lean.twist) > 1e-3) busy = true;
      }

      if (!scene) {
        if (busy) raf = requestAnimationFrame(loop);
        return;
      }

      // Held pose: leaning; steeper and lifted over a link; pressed down on a click.
      held.dir.set(HELD_DIR.x + lean.x - anim.press * 0.18, HELD_DIR.y + lean.y - anim.press * 0.12, HELD_DIR.z + anim.hover * 0.25 + anim.press * 0.3);
      held.scale = HELD_SCALE * (1 - anim.press * 0.05);
      // Mid-flight it rises off the page (its shadow spreads), then comes down on the point.
      const arc = Math.sin(Math.PI * anim.t);
      held.lift = 0.06 + anim.hover * 0.42 - anim.press * 0.06 + arc * 0.9;
      rest.lift = anim.drop * 1.6 + arc * 0.4;
      // Draw only when the pencil itself changed (just scrolling past it while it rests only moves the canvas).
      const sig =
        anim.t * 1e3 + anim.drop * 7e2 + anim.roll * 3e2 + anim.hover * 1.1e2 + anim.press * 1.3e2 + rest.scale * 17 + lean.x * 51 + lean.y * 37 + lean.twist * 23;
      if (!(Math.abs(sig - lastSig) <= 1e-3)) {
        lastSig = sig;
        scene.setPose(anim.t, rest, held, anim.roll * Math.PI * 2 + lean.twist * anim.t);
        scene.render();
      }

      // Where the canvas sits: centred on the card when resting, on the point when held, in between when flying
      // (with a little upward arc, as if it's lifted towards you).
      const e = anim.t;
      const x = restBox.x + (tip.x - restBox.x) * e;
      const y = restBox.y + (tip.y - restBox.y) * e - arc * 50;
      // (Written as "not close" so the first frame, with nothing written yet (NaN), always places it.)
      if (!(Math.abs(x - lastX) <= 0.1 && Math.abs(y - lastY) <= 0.1)) {
        lastX = x;
        lastY = y;
        wrap.style.transform = `translate3d(${(x - SIZE / 2).toFixed(1)}px, ${(y - SIZE / 2).toFixed(1)}px, 0)`;
      }
      // On the card it sits with the page (under the navs and modals); lifted, it's above everything, like a cursor.
      const z = mode === 'rest' ? '44' : '10000';
      if (z !== lastZ) {
        lastZ = z;
        wrap.style.zIndex = z;
      }
      const visible = mode === 'rest' ? (restBox.on ? anim.show : 0) : anim.show;
      wrap.style.opacity = String(visible);
      // (Resting, it's woken by each scroll to follow the card; nothing runs while the page is still.)
      if (busy) raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (raf || broken || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    // ---- Becoming the cursor, and letting go
    const activate = () => {
      if (!ensureScene()) return;
      readRest();
      tip.x = ptr.x;
      tip.y = ptr.y;
      gsap.killTweensOf(anim, 't,show');
      if (mode === 'rest' && restBox.on && dropped && !reduce) {
        // Lift off the card and fly to the pointer.
        mode = 'fly';
        anim.show = 1;
        gsap.to(anim, {
          t: 1,
          ...FLY,
          onUpdate: () => {
            if (anim.t > 0.55) setCursorOn(true);
          },
          onComplete: () => {
            mode = 'held';
          },
        });
      } else {
        // Appear at the pointer.
        mode = 'held';
        anim.t = 1;
        setCursorOn(true);
        if (reduce) anim.show = 1;
        else gsap.fromTo(anim, { show: 0 }, { show: 1, duration: 0.22, ease: 'power1.out' });
      }
      wake();
    };
    const deactivate = (byScroll: boolean) => {
      readRest();
      gsap.killTweensOf(anim, 't,show');
      setCursorOn(false);
      if (byScroll && restBox.on && !reduce) {
        // The section scrolled away under the pointer: fly back down onto the card.
        mode = 'back';
        gsap.to(anim, {
          t: 0,
          ...FLY_BACK,
          onComplete: () => {
            mode = 'rest';
          },
        });
      } else {
        // Moved onto the nav, a modal or the scrollbar, or the card is off screen: fade out where it is, then go
        // back to lying on the card.
        mode = 'back';
        gsap.to(anim, {
          show: 0,
          duration: reduce ? 0.01 : 0.18,
          ease: 'power1.in',
          onComplete: () => {
            mode = 'rest';
            anim.t = 0;
            if (reduce) anim.show = 1;
            else gsap.to(anim, { show: 1, duration: 0.4, ease: 'power1.out', delay: 0.15 });
            wake();
          },
        });
      }
      wake();
    };

    // Is the pointer in the About section? Checked after moves and scrolls (and now and then, in case the page
    // moved under a still pointer), once per frame at most, and only acted on once it's held for a moment, so
    // passing over a boundary never flickers.
    let evalQueued = false;
    let byScroll = false;
    let pending: boolean | null = null;
    let pendingSince = 0;
    const evaluate = () => {
      evalQueued = false;
      if (!fine || !ptr.has || broken) return;
      const el = document.elementFromPoint(ptr.x, ptr.y);
      const want = !!el?.closest('[data-pencil-zone]') && !el?.closest('[data-remote-zone]');
      // Over a link or button: lift a little.
      const over = want && !!el?.closest(INTERACTIVE);
      if (!reduce && over !== anim.hover > 0.5) gsap.to(anim, { hover: over ? 1 : 0, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
      if (want === inZone) {
        pending = null;
        return;
      }
      const now = performance.now();
      // (Re-checked on the next frames, not with a timer: background-ish tabs slow timers down to a second.)
      if (pending !== want) {
        pending = want;
        pendingSince = now;
        requestAnimationFrame(queueEval);
        return;
      }
      if (now - pendingSince < 60) {
        requestAnimationFrame(queueEval);
        return;
      }
      pending = null;
      inZone = want;
      if (want) activate();
      else deactivate(byScroll);
    };
    const queueEval = () => {
      if (evalQueued) return;
      evalQueued = true;
      requestAnimationFrame(evaluate);
    };
    const evalTimer = window.setInterval(() => {
      if (!document.hidden) {
        // Build the scene once the card is near, so the pencil is ready to drop onto it.
        readRest();
        if (restBox.on && !scene) ensureScene();
        if (restBox.on || inZone) wake();
        queueEval();
      }
    }, 300);

    // ---- Input
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      if (!ptr.has) {
        tip.x = ptr.x;
        tip.y = ptr.y;
      }
      ptr.has = true;
      byScroll = false;
      queueEval();
      if (mode !== 'rest') wake();
    };
    // Resting, the pencil only needs to follow the card while the card is near the screen. Waking it on every scroll
    // regardless measured the card and moved the pencil on every frame of every scroll on the page, which on phones
    // ate into the frame. The browser says when the card comes near (and when it leaves, to hide the pencil).
    let restNear = false;
    let restIO: IntersectionObserver | null = null;
    let restWatched: Element | null = null;
    const watchRest = () => {
      const el = document.querySelector('[data-pencil-rest]');
      if (el === restWatched) return;
      restIO?.disconnect();
      restWatched = el;
      restNear = false;
      if (!el) return;
      restIO = new IntersectionObserver(
        ([e]) => {
          restNear = e.isIntersecting;
          wake();
        },
        { rootMargin: '50% 0px' }
      );
      restIO.observe(el);
    };
    watchRest();
    const restWatch = window.setInterval(watchRest, 1000);
    const onScroll = () => {
      byScroll = true;
      queueEval();
      if (mode !== 'rest' || restNear) wake();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !fine) {
        // Tapping the pencil on the card rolls it over.
        readRest();
        if (restBox.on && mode === 'rest' && Math.abs(e.clientX - restBox.x) < restBox.w / 2 && Math.abs(e.clientY - restBox.y) < 40 && !gsap.isTweening(anim)) {
          if (!reduce) {
            gsap.fromTo(anim, { roll: 0 }, { roll: 1, duration: 0.9, ease: 'power2.out' });
            gsap.to(anim, { drop: 0.35, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 });
          }
          wake();
        }
        return;
      }
      if (e.button !== 0 || mode === 'rest') return;
      if (!reduce) gsap.to(anim, { press: 1, duration: 0.08, ease: 'power2.out', overwrite: 'auto' });
      wake();
    };
    const onUp = () => {
      if (anim.press > 0) gsap.to(anim, { press: 0, duration: 0.3, ease: 'back.out(2)', overwrite: 'auto' });
      wake();
    };
    const onLeaveWindow = () => {
      ptr.has = false;
      if (inZone) {
        inZone = false;
        pending = null;
        deactivate(false);
      }
    };
    const onVisibility = () => {
      if (!document.hidden) wake();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeaveWindow);
    document.addEventListener('visibilitychange', onVisibility);
    wake();
    // Build the 3D scene and draw it once while the browser is idle after the page loads, so the shaders are ready
    // before the About section comes up (built on first sight, it froze the scroll for a moment).
    const cancelIdle = whenIdle(() => {
      if (ensureScene()) scene?.render();
    }, 5000);
    // Pinch-zoomed on a phone: redraw at the zoomed resolution, so the pencil stays sharp.
    const offZoom = onPinchZoom(() => {
      if (!scene) return;
      scene.setSize(SIZE, SIZE, canvasDpr(2, PHONE_DPR, SIZE, SIZE), UNITS);
      scene.render();
      wake();
    });

    return () => {
      cancelIdle();
      offZoom();
      restIO?.disconnect();
      window.clearInterval(restWatch);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('scroll', onScroll);
      document.documentElement.removeEventListener('mouseleave', onLeaveWindow);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(evalTimer);
      cancelAnimationFrame(raf);
      gsap.killTweensOf(anim);
      setCursorOn(false);
      canvas.removeEventListener('webglcontextlost', onLost);
      if (scene) {
        scene.dispose();
        scene.renderer.forceContextLoss();
      }
      scene = null;
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0"
      style={{ width: SIZE, height: SIZE, opacity: 0, zIndex: 44, willChange: 'transform, opacity' }}
    />
  );
}
