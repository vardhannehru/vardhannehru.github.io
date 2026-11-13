import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { holdLoader, onSiteReady } from '../ui/siteReady';
import { canvasDpr, onPinchZoom, PHONE_DPR } from '../ui/device';
import { useTheme, type Theme } from '../ui/theme';
import { smoothScrollTo } from '../ui/SmoothScroll';
import { getSignal, subscribeSignal, suppressScrollSignal, type Signal } from './signalState';
import { BRAND_FILES, buildTrafficLight, type BrandImages, type Pose, type TrafficLightScene } from './trafficLightScene';
import { LAMP_COLORS, LAMP_ORDER, loadImage } from './signalArt';

// A 3D traffic light on the right edge of the screen that doubles as a scrollbar (three.js, built like
// RemoteCursor.tsx). The striped pole runs the full height of the screen and stays put: it's the track. The heads
// ride along it as the thumb, so where they sit shows how far down the page you are. Drag them to scroll, or press
// the pole to jump there. It goes green while you scroll, yellow while you move the mouse, and red when you stop
// (signalState.ts decides which).
//
// When the heads would cover something you might read or use (text, a link, a button, a card's image, the nav,
// a modal, anything marked data-signal-avoid), two of them fold back into their clamps and the one in the best
// spot slides to the middle and shows the live colour by itself. When there's room again, the others fold back
// out. The pole stays the whole time, and so does the scrollbar.
//
// Only the pole and the heads take the pointer; everything else in the column lets clicks through. It sits under
// the navs, the menu, modals and the cursors (z-45). It only draws while something is changing (a lamp fading,
// the heads moving or turning, the chevrons flowing on green); at rest on red it doesn't draw at all.

/** The column on the right edge, where the browser's scrollbar was (CSS px): width, how big the light is drawn
 *  (px per scene unit), how far the pole's centre is from the screen's edge, and how close the heads may come to
 *  the top and bottom (the funny eyes sit bottom right; on phones the nav runs along the bottom and the round menu
 *  button's spot is top right). */
// The pole's centre is one pole radius (0.082 units × ppu) in from the edge, so it sits flush against the screen's
// edge like a real scrollbar track (it was 13 / 8 px, which left a gap of about 3.5 px).
const LAYOUT = {
  desktop: { w: 108, ppu: 114, pole: 9.5, top: 18, bottom: 64 },
  phone: { w: 54, ppu: 54, pole: 4.5, top: 64, bottom: 104 },
} as const;

/** The heads hang off the pole's left side, turned a little towards the page on their joints (radians), and turn
 *  a little further or back towards the cursor. */
const BASE_FACE = 0.26;
const YAW_RANGE = 0.16;
const NOD_RANGE = 0.07;
/** Lamp changes (GSAP): a lamp flares on with a little overshoot and its head clicks forward on its arms; the one
 *  going off dies away more slowly, like a warm bulb, and its head settles back. */
const LAMP_ON = { duration: 0.34, ease: 'back.out(2.4)' };
const LAMP_OFF = { duration: 0.42, ease: 'power2.inOut' };
const PUSH_ON = { duration: 0.6, ease: 'back.out(2.8)' };
const PUSH_OFF = { duration: 0.45, ease: 'power2.out' };
/** Two heads folding away (or back out), and the one that stays sliding to the middle. */
const FOLD_AWAY = { duration: 0.6, ease: 'power3.inOut', stagger: 0.07 };
const FOLD_OUT = { duration: 0.7, ease: 'power3.out', stagger: 0.08 };
/** Scrolling tips the heads on their joints in the direction of travel, on a damped spring (no wobble). */
const SPRING_K = 70;
const SPRING_C = 15;
const SPRING_KICK = 0.0035;
const SPRING_MAX = 0.11;
/** Moving fast along the pole swings the heads back a little on their joints, and so does grabbing them. */
const SPEED_SWING = 0.07;
const GRAB_SWING = 0.16;
/** Keep this far (px) from content, and wait this long (ms) with the spot clear before unfolding again. */
const CLEARANCE = 14;
const CLEAR_FOR_MS = 500;
/** Peak opacity of the coloured glow it throws on the page. */
const PAGE_GLOW: Record<Theme, number> = { light: 0.34, dark: 0.5 };

const SIGNAL_INDEX: Record<Signal, number> = { stop: 0, look: 1, go: 2 };

let webglOk: boolean | null = null;
function canUseWebGL() {
  if (webglOk !== null) return webglOk;
  try {
    const c = document.createElement('canvas');
    webglOk = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    webglOk = false;
  }
  return webglOk;
}

function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}

const CONTENT_TAGS = /^(A|BUTTON|INPUT|TEXTAREA|SELECT|LABEL|H[1-6]|P|LI|DT|DD|BLOCKQUOTE|PRE|CODE|IMG|PICTURE|VIDEO|CANVAS|IFRAME|FIGCAPTION|TD|TH)$/;

/** Is this something the heads shouldn't cover: text, media, a control, the nav or a modal? */
function isContent(el: Element) {
  if (el.closest('[data-signal-avoid],[aria-modal="true"],[role="dialog"],nav')) return true;
  if (el.closest('a,button,[role="button"],input,textarea,select,label')) return true;
  let n: Element | null = el;
  for (let k = 0; k < 3 && n && n !== document.body; k++, n = n.parentElement) {
    if (CONTENT_TAGS.test(n.tagName)) return true;
    for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && c.textContent && c.textContent.trim()) return true;
  }
  return false;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export default function TrafficLight() {
  const theme = useTheme();
  const phone = useIsPhone();
  const { pathname } = useLocation();
  const [supported] = useState(() => typeof window !== 'undefined' && canUseWebGL());

  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const glowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const themeRef = useRef(theme);
  themeRef.current = theme;
  const phoneRef = useRef(phone);
  phoneRef.current = phone;
  // Hooks into the running scene for the theme, layout and route effects below.
  const live = useRef<{ scene: TrafficLightScene | null; wake: () => void; check: () => void; sync: () => void }>({
    scene: null,
    wake: () => {},
    check: () => {},
    sync: () => {},
  });

  useEffect(() => {
    live.current.scene?.setTheme(theme);
    live.current.wake();
  }, [theme]);

  useEffect(() => {
    // A new page jumps the scroll position: that isn't scrolling. Then see what's beside the heads there.
    suppressScrollSignal(400);
    live.current.sync();
    const t = window.setTimeout(() => {
      live.current.sync();
      live.current.check();
    }, 450);
    return () => window.clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    // Built straight away, behind the loading screen, so its first full draw (which prepares its shadows and
    // shaders, a few hundred ms) is done before anyone sees the page; the opening plays once the screen lifts.
    // (Built only after the screen lifted, that first draw stalled the hero's intro.)
    if (!supported) return;
    const outer = outerRef.current;
    const host = stageRef.current;
    const trackEl = trackRef.current;
    const thumbEl = thumbRef.current;
    if (!outer || !host || !trackEl || !thumbEl) return;

    const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const finePointer = !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const layout = () => (phoneRef.current ? LAYOUT.phone : LAYOUT.desktop);

    // ---- Canvas and scene, rebuilt on a fresh canvas if the browser takes the WebGL context away.
    let canvas: HTMLCanvasElement;
    let scene: TrafficLightScene | null = null;
    let rebuilds = 0;
    let broken = false;
    let disposed = false;
    let brand: BrandImages | null = null;
    let size = { w: 0, h: 0, dpr: 1 };
    let warmed = false;

    const onLost = () => {
      scene?.dispose();
      scene = null;
      live.current.scene = null;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.remove();
      if (++rebuilds > 5) {
        broken = true;
        outer.style.display = 'none';
        return;
      }
      makeCanvas();
      build();
      wake();
    };
    const makeCanvas = () => {
      canvas = document.createElement('canvas');
      canvas.className = 'absolute inset-0 h-full w-full';
      canvas.addEventListener('webglcontextlost', onLost);
      host.appendChild(canvas);
    };
    const build = () => {
      if (scene || broken || disposed) return;
      try {
        scene = buildTrafficLight(canvas, themeRef.current);
      } catch {
        broken = true;
        outer.style.display = 'none';
        return;
      }
      if (brand) scene.setBrandImages(brand);
      if (size.w) scene.setSize(size.w, size.h, size.dpr, layout().ppu, layout().pole);
      scene.setDisplay(display);
      live.current.scene = scene;
      // Draw nothing until the shaders are ready (prepared in the background), so the opening frames, while the
      // name rises, aren't held up building them.
      warmed = false;
      const built = scene;
      holdLoader(
        built.warm().then(() => {
          if (scene !== built) return;
          warmed = true;
          wake();
        })
      );
    };

    // ---- State (all reused; nothing is allocated per frame)
    const levels = [0, 0, 0];
    // Driven by GSAP: each lamp's light and its head's click forward; each head folding away; the gathering of
    // the head that stays; the sign; grabbing; and the opening swing.
    const lamps = [
      { level: 0, push: 0 },
      { level: 0, push: 0 },
      { level: 0, push: 0 },
    ];
    // The heads start folded into the pole and pop out once it's on screen.
    const folds = [
      { r: 1, g: 0 },
      { r: 1, g: 0 },
      { r: 1, g: 0 },
    ];
    const gathering = { gather: 0, sign: 1 };
    const grab = { v: 0 };
    const intro = { on: true };
    const tweened: object[] = [...lamps, ...folds, gathering, grab, intro];

    const display = [0, 1, 2];
    const pose: Pose = { thumb: 0, yaw: 0, nod: [0, 0, 0], swing: [0, 0, 0], push: [0, 0, 0], retract: [1, 1, 1], gather: [0, 0, 0], sign: 1 };
    let lit = -1;
    let compact = false;
    let kept = -1;

    let yaw = 0;
    let yawT = 0;
    let nod = 0;
    let nodT = 0;
    const spring = { x: 0, v: 0 };
    let speedSwing = 0;
    const pupil = { x: 0, y: 0, tx: 0, ty: 0 };
    let chevronBoost = 0;
    // The thumb: where the heads are (canvas px from the top, which is the screen's top), and where they're going.
    const thumb = { y: -1, target: 0, vel: 0 };
    let maxScroll = 1;
    let drag: { id: number; offset: number } | null = null;
    const lamp = { x: 0, y: 0 };
    const glowAt = [
      { x: -1, y: -1, o: -1 },
      { x: -1, y: -1, o: -1 },
      { x: -1, y: -1, o: -1 },
    ];
    // The thumb's hit area, as last written.
    const hit = { top: -1, h: -1, left: -1, w: -1 };

    makeCanvas();
    build();
    if (!scene) return () => canvas.remove();

    /** The range the heads' centre travels along the pole (canvas px). */
    const range = () => {
      const L = layout();
      const half = scene ? scene.assemblyHalf(false) : 100;
      const min = L.top + half;
      return { min, max: Math.max(min, size.h - L.bottom - half) };
    };
    const syncThumb = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const r = range();
      thumb.target = r.min + clamp(window.scrollY / maxScroll, 0, 1) * (r.max - r.min);
      if (thumb.y < 0) thumb.y = thumb.target;
    };

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = 0;
      if (!scene || disposed || document.hidden) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      let busy = false;
      for (let i = 0; i < tweened.length && !busy; i++) if (gsap.isTweening(tweened[i])) busy = true;
      // (Before the loading screen lifts it draws once, then waits: the opening hasn't started.)
      if (intro.on && opened) busy = true;

      // The heads sliding along the pole (snappier while dragged).
      const prev = thumb.y;
      const d = thumb.target - thumb.y;
      if (Math.abs(d) < 0.3) thumb.y = thumb.target;
      else {
        thumb.y += d * (1 - Math.exp(-dt * (drag ? 32 : 16)));
        busy = true;
      }
      thumb.vel = (thumb.y - prev) / dt;

      // Turning towards the cursor.
      const k = 1 - Math.exp(-dt * 6);
      yaw += (yawT - yaw) * k;
      nod += (nodT - nod) * k;
      if (Math.abs(yawT - yaw) > 1e-4 || Math.abs(nodT - nod) > 1e-4) busy = true;
      else {
        yaw = yawT;
        nod = nodT;
      }

      // Tipping in the direction of travel (a damped spring, in two half steps so a slow frame stays stable).
      for (let s = 0; s < 2; s++) {
        const h = dt / 2;
        spring.v += (-SPRING_K * spring.x - SPRING_C * spring.v) * h;
        spring.x = clamp(spring.x + spring.v * h, -SPRING_MAX, SPRING_MAX);
      }
      if (Math.abs(spring.x) < 1e-4 && Math.abs(spring.v) < 1e-3) {
        spring.x = 0;
        spring.v = 0;
      } else busy = true;

      // Swinging back a little with speed along the pole.
      const swT = reduce ? 0 : clamp(Math.abs(thumb.vel) / 2500, 0, 1) * SPEED_SWING;
      speedSwing += (swT - speedSwing) * (1 - Math.exp(-dt * 8));
      if (Math.abs(swT - speedSwing) > 1e-4) busy = true;
      else speedSwing = swT;

      // The yellow lamp's eyes.
      const kp = 1 - Math.exp(-dt * 10);
      pupil.x += (pupil.tx - pupil.x) * kp;
      pupil.y += (pupil.ty - pupil.y) * kp;
      if (Math.abs(pupil.tx - pupil.x) > 1e-3 || Math.abs(pupil.ty - pupil.y) > 1e-3) busy = true;

      // The green lamp's chevrons flow while it's lit, faster while the page moves.
      if (!reduce && levels[2] > 0.01) {
        scene.scrollChevrons(dt * (0.55 + chevronBoost));
        chevronBoost *= Math.exp(-dt * 4);
        busy = true;
      }

      for (let i = 0; i < 3; i++) {
        levels[i] = Math.max(0, lamps[i].level);
        pose.push[i] = lamps[i].push;
        pose.retract[i] = folds[i].r;
        pose.gather[i] = folds[i].g;
        // The lower heads tip a touch less, so they don't move in lockstep.
        pose.nod[i] = nod + spring.x * (1 - i * 0.12);
        pose.swing[i] = BASE_FACE + (reduce ? 0 : yaw) + speedSwing + grab.v * GRAB_SWING;
      }
      pose.thumb = thumb.y;
      // The pole and everything clamped to it stays still; only the heads turn, each on its own joint.
      pose.yaw = 0;
      pose.sign = gathering.sign;
      scene.setPose(pose);
      scene.setLevels(levels);
      scene.setPupils(pupil.x, pupil.y);
      if (warmed) scene.render();

      writeThumbHit();

      // The coloured glow on the page behind each lit lamp.
      const peak = PAGE_GLOW[themeRef.current];
      for (let i = 0; i < 3; i++) {
        const el = glowRefs.current[i];
        if (!el) continue;
        const g = glowAt[i];
        const vis = levels[i] > 0.001 ? scene.lampOnCanvas(i, size.w, size.h, lamp) : 0;
        const o = Math.round(Math.min(1, levels[i]) * peak * vis * 1000) / 1000;
        if (o !== g.o) {
          el.style.opacity = String(o);
          g.o = o;
        }
        if (o > 0 && (Math.abs(lamp.x - g.x) > 0.5 || Math.abs(lamp.y - g.y) > 0.5)) {
          g.x = lamp.x;
          g.y = lamp.y;
          el.style.transform = `translate3d(${lamp.x.toFixed(1)}px, ${lamp.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        }
      }

      if (busy) raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (raf || !scene || disposed || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    live.current.wake = wake;

    /** Where you can grab the heads: all three, or just the one that's left (and the pole beside it). */
    const writeThumbHit = () => {
      if (!scene) return;
      const gathered = compact && gathering.gather > 0.5;
      const half = scene.assemblyHalf(gathered) + 4;
      const top = Math.round(thumb.y - half);
      const h = Math.round(half * 2);
      const left = 0;
      const w = size.w;
      if (top === hit.top && h === hit.h && left === hit.left && w === hit.w) return;
      hit.top = top;
      hit.h = h;
      hit.left = left;
      hit.w = w;
      thumbEl.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      thumbEl.style.width = `${w}px`;
      thumbEl.style.height = `${h}px`;
    };

    // ---- Lamp changes and the opening, on GSAP. Its tweens only write numbers; the loop above draws them.
    const showDisplay = () => {
      for (let h = 0; h < 3; h++) display[h] = h;
      if (compact && kept >= 0 && lit >= 0) display[kept] = lit;
      scene?.setDisplay(display);
    };
    const setLamp = (i: number) => {
      if (i === lit) return;
      lit = i;
      for (let j = 0; j < 3; j++) {
        const on = j === i;
        gsap.to(lamps[j], { level: on ? 1 : 0, ...(on ? LAMP_ON : LAMP_OFF), overwrite: 'auto' });
        if (!reduce) gsap.to(lamps[j], { push: on ? 1 : 0, ...(on ? PUSH_ON : PUSH_OFF), overwrite: 'auto' });
      }
      // With one head left, that head shows the live lamp.
      if (compact) showDisplay();
      wake();
    };
    // The heads pop out of the pole one after another (and the sign after them) while the lamps test themselves:
    // red, yellow, green, then the live state. (If they're already in the way, the collision check folds two
    // straight back in.)
    const opening = gsap.timeline({
      paused: true,
      onComplete: () => {
        intro.on = false;
        setLamp(SIGNAL_INDEX[getSignal()]);
        queueCheck(0);
      },
    });
    opening
      .to(folds, { r: 0, duration: reduce ? 0.01 : 0.75, ease: 'back.out(1.6)', stagger: reduce ? 0 : 0.14 }, 0.1)
      .to(gathering, { sign: 0, duration: reduce ? 0.01 : 0.6, ease: 'back.out(1.6)' }, reduce ? 0.1 : 0.45)
      .call(() => setLamp(0), [], 0.3)
      .call(() => setLamp(1), [], 0.7)
      .call(() => setLamp(2), [], 1.1)
      .to({}, { duration: 0.5 }, 1.1);
    let opened = false;
    const offReady = onSiteReady(() => {
      opened = true;
      opening.play();
      wake();
    });

    // ---- One head or three
    const quick = reduce ? { duration: 0.01 } : null;
    const foldTo = (keep: number) => {
      compact = true;
      kept = keep;
      showDisplay();
      const away = folds.filter((_, j) => j !== keep);
      // The others fold back into their clamps (staying where they are); the one that stays unfolds if it had
      // folded, and slides to the middle.
      // (A head that was the one left, when it hands over, slides back to its own place as it folds, so the two
      // never pass through each other.)
      gsap.to(away, { r: 1, g: 0, ...(quick ?? FOLD_AWAY), overwrite: 'auto' });
      gsap.to(folds[keep], { r: 0, g: 1, ...(quick ?? { duration: 0.65, ease: 'power3.inOut', delay: 0.12 }), overwrite: 'auto' });
      gsap.to(gathering, { gather: 1, sign: 1, ...(quick ?? { duration: 0.65, ease: 'power3.inOut', delay: 0.12 }), overwrite: 'auto' });
      wake();
    };
    const unfold = () => {
      compact = false;
      // The kept head slides back to its own place as the others unfold; each head shows its own lamp again.
      gsap.to(gathering, {
        gather: 0,
        sign: 0,
        ...(quick ?? { duration: 0.6, ease: 'power3.inOut' }),
        overwrite: 'auto',
        onComplete: () => {
          if (!compact) kept = -1;
        },
      });
      showDisplay();
      gsap.to(folds, { r: 0, g: 0, ...(quick ?? { ...FOLD_OUT, delay: 0.1 }), overwrite: 'auto' });
      wake();
    };

    // ---- Collisions: is there room beside the heads? Sample what's under the whole assembly's footprint (even
    // when folded, so it can tell when there's room to unfold), on each side of the pole.
    let clearSince = 0;
    let checkTimer = 0;
    const under = (x: number, y: number) => {
      const els = document.elementsFromPoint(x, y);
      for (const el of els) {
        if (outer.contains(el)) continue;
        return isContent(el);
      }
      return false;
    };
    const check = () => {
      if (disposed || !scene || drag || intro.on) return;
      const col = outer.getBoundingClientRect();
      if (!col.width) return;
      const half = scene.assemblyHalf(false) + CLEARANCE;
      const top = Math.max(0, thumb.target - half);
      const bottom = Math.min(size.h, thumb.target + half);
      // The heads hang left of the pole: sample from a little beyond their outer edge up to the pole.
      const poleX = col.right - layout().pole;
      const x0 = col.left - CLEARANCE;
      const x1 = poleX - 8;
      // Hits beside the upper, middle and lower thirds of the assembly.
      const hits = [0, 0, 0];
      const rows = 6;
      for (let r = 0; r < rows; r++) {
        const y = top + ((r + 0.5) / rows) * (bottom - top);
        const third = Math.min(2, Math.floor((r / rows) * 3));
        for (const fx of [0, 0.45, 0.9]) if (under(x0 + (x1 - x0) * fx, y)) hits[third]++;
      }
      // Areas marked as off limits.
      document.querySelectorAll('[data-signal-avoid]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || r.top > bottom || r.bottom < top || r.right < x0 || r.left > col.right) return;
        for (let t = 0; t < 3; t++) {
          const t0 = top + ((bottom - top) * t) / 3;
          const t1 = top + ((bottom - top) * (t + 1)) / 3;
          if (r.top < t1 && r.bottom > t0) hits[t] += 3;
        }
      });
      const blocked = hits[0] + hits[1] + hits[2] > 0;
      const now = performance.now();
      if (blocked) {
        clearSince = 0;
        // The head in the best spot: the one beside the least content (it then slides to the middle). On a tie,
        // the one already showing the live colour, so nothing changes over needlessly.
        let best = lit >= 0 ? lit : 1;
        for (let t = 0; t < 3; t++) if (hits[t] < hits[best]) best = t;
        if (!compact) foldTo(best);
        else if (best !== kept && hits[kept] > 0 && hits[best] === 0) foldTo(best); // its spot got crowded
      } else if (compact) {
        if (!clearSince) clearSince = now;
        if (now - clearSince >= CLEAR_FOR_MS) unfold();
        else queueCheck(CLEAR_FOR_MS - (now - clearSince) + 20);
      }
    };
    const queueCheck = (ms = 100) => {
      if (checkTimer) return;
      checkTimer = window.setTimeout(() => {
        checkTimer = 0;
        check();
      }, ms);
    };
    live.current.check = check;
    live.current.sync = () => {
      syncThumb();
      wake();
    };
    // Things also appear and move without scrolling (sections revealing, the TV's guide opening, a modal).
    const checkInterval = window.setInterval(() => !document.hidden && queueCheck(0), 700);

    // ---- Size
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      // A tall canvas: a little under 2x is plenty sharp for it.
      const dpr = canvasDpr(1.75, PHONE_DPR, w, h);
      // Nothing changed (a window resize that didn't move it): don't rebuild the canvas.
      if (size && size.w === w && size.h === h && size.dpr === dpr) return;
      size = { w, h, dpr };
      scene?.setSize(w, h, size.dpr, layout().ppu, layout().pole);
      glowAt.forEach((g) => (g.x = g.y = -1));
      hit.top = -1;
      syncThumb();
      queueCheck();
      wake();
    };
    resize();
    thumb.y = thumb.target;
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    // The page grows as sections load in: keep the thumb's idea of the page length current.
    const pageRO = new ResizeObserver(() => live.current.sync());
    pageRO.observe(document.body);
    window.addEventListener('resize', resize);
    // Pinch-zoomed on a phone: redraw at the zoomed resolution (resize picks it up), so it stays sharp.
    const offZoom = onPinchZoom(resize);

    // ---- Brand logos for the stickers, and the sign's font
    // The stickers and the sign's lettering arrive a moment after the scene; the loading screen waits for them too,
    // and they're drawn once behind it, so their textures aren't uploaded during the opening.
    const drawHidden = () => {
      if (!opened && warmed) void scene?.prime();
    };
    holdLoader(
      Promise.all(BRAND_FILES.map((f) => loadImage(`/brand/${f}.svg`))).then((imgs) => {
        if (disposed) return;
        const loaded: BrandImages = {};
        BRAND_FILES.forEach((f, i) => (loaded[f] = imgs[i]));
        brand = loaded;
        scene?.setBrandImages(brand);
        drawHidden();
        wake();
      })
    );
    if (document.fonts)
      holdLoader(
        document.fonts.ready.then(() => {
          if (disposed) return;
          scene?.repaintSign();
          drawHidden();
          wake();
        })
      );

    // ---- Scrolling, the cursor, and the scrollbar
    const onSignal = () => {
      if (!intro.on) setLamp(SIGNAL_INDEX[getSignal()]);
    };
    const offSignal = subscribeSignal(onSignal);

    let lastScrollY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - lastScrollY;
      lastScrollY = y;
      syncThumb();
      queueCheck();
      if (!reduce && Math.abs(d) <= window.innerHeight * 0.9) {
        spring.v += clamp(d, -60, 60) * SPRING_KICK;
        chevronBoost = Math.min(2.5, chevronBoost + Math.abs(d) * 0.01);
      }
      // The green lamp's chevrons point (and flow) the way the page is going: up when scrolling up.
      if (Math.abs(d) >= 0.5 && Math.abs(d) <= window.innerHeight * 0.9) scene?.setChevronsUp(d < 0);
      wake();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (reduce || e.pointerType === 'touch') return;
      const col = outer.getBoundingClientRect();
      const dx = e.clientX - col.left;
      const dy = e.clientY - thumb.y;
      // The cursor further left (out on the page) turns the heads further towards it.
      yawT = clamp(-dx / (window.innerWidth * 0.55), -0.4, 1) * YAW_RANGE;
      nodT = clamp(dy / (window.innerHeight * 0.6), -1, 1) * NOD_RANGE;
      // Pupils: towards the cursor, further the further away it is.
      const ex = e.clientX - (col.left + (glowAt[1].x >= 0 ? glowAt[1].x : col.width * 0.3));
      const ey = e.clientY - (glowAt[1].y >= 0 ? glowAt[1].y : thumb.y);
      const dist = Math.hypot(ex, ey) || 1;
      const reach = Math.min(1, dist / 220);
      pupil.tx = (ex / dist) * reach;
      pupil.ty = (-ey / dist) * reach;
      wake();
    };
    const onLeave = () => {
      yawT = 0;
      nodT = 0;
      pupil.tx = 0;
      pupil.ty = 0;
      wake();
    };
    const onVisibility = () => {
      if (!document.hidden) wake();
    };

    /** Scrolls the page so the heads' centre lands at `y` (canvas px). */
    const scrollToThumb = (y: number, immediate: boolean) => {
      const r = range();
      const p = r.max > r.min ? clamp((y - r.min) / (r.max - r.min), 0, 1) : 0;
      smoothScrollTo(p * maxScroll, { immediate });
    };
    const startDrag = (e: PointerEvent, offset: number) => {
      drag = { id: e.pointerId, offset };
      try {
        thumbEl.setPointerCapture(e.pointerId);
      } catch {
        // (the pointer is already gone)
      }
      if (!reduce) gsap.to(grab, { v: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      wake();
    };
    const onThumbDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      startDrag(e, e.clientY - thumb.y);
    };
    // Pressing the pole: the heads glide there, and keep following if you hold on and drag.
    const onTrackDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      scrollToThumb(e.clientY, false);
      startDrag(e, 0);
    };
    const onDragMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      scrollToThumb(e.clientY - drag.offset, true);
    };
    const endDrag = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      try {
        thumbEl.releasePointerCapture(e.pointerId);
      } catch {
        // (already released)
      }
      gsap.to(grab, { v: 0, duration: 0.6, ease: 'power3.inOut', overwrite: 'auto' });
      queueCheck(150);
      wake();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    if (finePointer) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.documentElement.addEventListener('mouseleave', onLeave);
    }
    document.addEventListener('visibilitychange', onVisibility);
    thumbEl.addEventListener('pointerdown', onThumbDown);
    trackEl.addEventListener('pointerdown', onTrackDown);
    thumbEl.addEventListener('pointermove', onDragMove);
    thumbEl.addEventListener('pointerup', endDrag);
    thumbEl.addEventListener('pointercancel', endDrag);
    thumbEl.addEventListener('lostpointercapture', endDrag);

    // ---- Show it, in place of the browser's scrollbar (index.html hides that while this class is on).
    // (It slides in when the loading screen lifts, with its opening; until then it's built and waiting behind it.)
    document.documentElement.classList.add('signal-scrollbar');
    const offShow = onSiteReady(() => {
      outer.style.opacity = '1';
      outer.style.transform = 'translate3d(0, 0, 0)';
    });
    wake();
    queueCheck(300);

    return () => {
      disposed = true;
      offReady();
      offShow();
      opening.kill();
      gsap.killTweensOf(tweened);
      cancelAnimationFrame(raf);
      window.clearTimeout(checkTimer);
      window.clearInterval(checkInterval);
      offSignal();
      ro.disconnect();
      pageRO.disconnect();
      window.removeEventListener('resize', resize);
      offZoom();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      thumbEl.removeEventListener('pointerdown', onThumbDown);
      trackEl.removeEventListener('pointerdown', onTrackDown);
      thumbEl.removeEventListener('pointermove', onDragMove);
      thumbEl.removeEventListener('pointerup', endDrag);
      thumbEl.removeEventListener('pointercancel', endDrag);
      thumbEl.removeEventListener('lostpointercapture', endDrag);
      live.current = { scene: null, wake: () => {}, check: () => {}, sync: () => {} };
      canvas.removeEventListener('webglcontextlost', onLost);
      if (scene) {
        scene.dispose();
        scene.renderer.forceContextLoss();
      }
      scene = null;
      canvas.remove();
      document.documentElement.classList.remove('signal-scrollbar');
      outer.style.opacity = '';
      outer.style.transform = '';
    };
  }, [supported]);

  if (!supported) return null;

  const L = phone ? LAYOUT.phone : LAYOUT.desktop;
  const glowSize = L.w * 1.5;

  return (
    <div
      ref={outerRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 z-[45] select-none"
      style={{
        width: L.w,
        right: 0,
        // Phones: the screen's tallest height (address bar hidden), which never changes. Pinned to the bottom, its
        // height changed every time the address bar slid in or out while scrolling, and the canvas was rebuilt
        // mid-scroll each time.
        ...(phone ? { height: '100lvh' } : { bottom: 0 }),
        opacity: 0,
        transform: 'translate3d(24px, 0, 0)',
        transition: 'opacity 0.7s ease, transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* The coloured light each lamp throws on the page. */}
      {LAMP_ORDER.map((k, i) => (
        <div
          key={k}
          ref={(el) => {
            glowRefs.current[i] = el;
          }}
          className="absolute left-0 top-0 rounded-full"
          style={{
            width: glowSize,
            height: glowSize,
            opacity: 0,
            background: `radial-gradient(circle, rgba(${LAMP_COLORS[k].rgb},0.55) 0%, rgba(${LAMP_COLORS[k].rgb},0.18) 38%, rgba(${LAMP_COLORS[k].rgb},0) 70%)`,
          }}
        />
      ))}
      {/* The canvas goes in here. The pole runs the full height of the screen, top to bottom, like a scrollbar's
          track (it used to fade out at the very top and bottom). */}
      <div
        ref={stageRef}
        className="absolute inset-0"
        style={{ filter: phone ? undefined : 'drop-shadow(0 10px 10px rgba(20,12,40,0.26))' }}
      />
      {/* The scrollbar: the pole is the track, the heads are the thumb. (Wider than the pole, so it's easy to grab.) */}
      <div
        ref={trackRef}
        className="pointer-events-auto absolute bottom-0 top-0"
        style={{ right: 0, width: Math.max(L.pole * 2 + 4, phone ? 22 : 18), touchAction: 'none' }}
      />
      <div ref={thumbRef} className="pointer-events-auto absolute left-0 top-0" style={{ width: L.w, height: 0, touchAction: 'none' }} />
    </div>
  );
}
