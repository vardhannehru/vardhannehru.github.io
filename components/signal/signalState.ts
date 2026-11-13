import { useSyncExternalStore } from 'react';

// What the floating traffic light (TrafficLight.tsx) shows, worked out from what the visitor is doing:
//   'go'   (green)  the page is scrolling
//   'look' (yellow) the mouse is moving (or a finger is on the screen) without scrolling
//   'stop' (red)    neither
// Scrolling wins when both happen. Each state is held for a moment after the activity ends, and a state stays at
// least `minDwellMs`, so the light never flickers.
//
// Scrolling is read from the page's real scroll position, not from wheel events, so it covers Lenis, the browser's
// own scrolling, the keyboard, the scrollbar, touch and programmatic scrolls (smoothScrollTo) alike. Big one-frame
// jumps (jumping to the top when the page changes, resizing) don't count.
//
// Like theme.ts and siteReady.ts this is a tiny store: React reads it with useSignal(), anything else with
// getSignal() / subscribeSignal(). It only listens to the page while something is subscribed.

export type Signal = 'stop' | 'look' | 'go';

/** Timings (ms) and thresholds. Tune here. */
export const SIGNAL_TIMING = {
  /** Green stays on this long after the last scroll movement. */
  goHoldMs: 220,
  /** Yellow stays on this long after the last mouse movement (or after a finger leaves the screen). */
  lookHoldMs: 700,
  /** A state is shown at least this long before the next one. */
  minDwellMs: 180,
  /** A scroll step smaller than this (px) is the tail of a smooth scroll settling, not scrolling. */
  scrollMinPx: 0.4,
  /** The mouse has to travel this far (px) within `moveWindowMs` to count as moving. Filters out the still
   *  "mouse moved" events browsers send after a scroll, and hand tremor on a resting mouse. */
  moveMinPx: 2,
  moveWindowMs: 120,
  /** A single scroll step longer than this many screen heights is a jump, not scrolling. */
  jumpScreens: 0.9,
  /** A scrolling box inside the page only counts if the visitor touched an input this recently (so boxes that
   *  scroll themselves, like marquees, don't hold the light on green). */
  nestedInputMs: 600,
};

const NEVER = -1e9;

let current: Signal = 'stop';
let changedAt = NEVER;
let lastGo = NEVER;
let lastLook = NEVER;
let lastInput = NEVER;
let fingerDown = false;
let suppressUntil = 0;
let lastY = 0;
// Mouse travel within the current window.
let moveAcc = 0;
let moveAt = NEVER;
let lastPX = 0;
let lastPY = 0;
let hasPointer = false;

let timer = 0;
let timerAt = 0;
const listeners = new Set<() => void>();

const now = () => performance.now();

function emit() {
  listeners.forEach((l) => l());
}

/** Works out the state from the activity so far, switches if it's time, and sets a timer for the next change. */
function resolve(force = false) {
  const t = now();
  const desired: Signal =
    t - lastGo < SIGNAL_TIMING.goHoldMs ? 'go' : fingerDown || t - lastLook < SIGNAL_TIMING.lookHoldMs ? 'look' : 'stop';

  if (desired !== current) {
    const wait = changedAt + SIGNAL_TIMING.minDwellMs - t;
    if (wait > 0 && !force) {
      schedule(t + wait);
      return;
    }
    current = desired;
    changedAt = t;
    emit();
  }

  // When the current state runs out (activity only ever pushes these later, so an early timer just re-checks).
  let next = 0;
  if (current === 'go') next = lastGo + SIGNAL_TIMING.goHoldMs;
  else if (current === 'look' && !fingerDown) next = lastLook + SIGNAL_TIMING.lookHoldMs;
  if (next) schedule(next);
}

function schedule(at: number) {
  if (timer && timerAt <= at) return;
  if (timer) window.clearTimeout(timer);
  timerAt = at;
  timer = window.setTimeout(() => {
    timer = 0;
    timerAt = 0;
    resolve();
  }, Math.max(0, at - now()) + 1);
}

function markGo() {
  lastGo = now();
  resolve();
}

function markLook() {
  lastLook = now();
  resolve();
}

/** Back to red at once: the tab was hidden or the window lost focus. */
function reset() {
  lastGo = NEVER;
  lastLook = NEVER;
  fingerDown = false;
  moveAcc = 0;
  hasPointer = false;
  resolve(true);
}

// ---- Listeners

const onScroll = (e: Event) => {
  const target = e.target;
  if (target === document || target === document.documentElement || target === document.body) {
    const y = window.scrollY;
    const d = Math.abs(y - lastY);
    lastY = y;
    if (now() < suppressUntil) return;
    if (d < SIGNAL_TIMING.scrollMinPx) return;
    if (d > window.innerHeight * SIGNAL_TIMING.jumpScreens) return;
    markGo();
    return;
  }
  // A scrolling box inside the page (a modal, a list).
  if (now() - lastInput < SIGNAL_TIMING.nestedInputMs) markGo();
};

const onInput = () => {
  lastInput = now();
};

const onPointerMove = (e: PointerEvent) => {
  if (e.pointerType === 'touch') {
    if (fingerDown) markLook();
    return;
  }
  const t = now();
  if (!hasPointer) {
    hasPointer = true;
    lastPX = e.clientX;
    lastPY = e.clientY;
    moveAt = t;
    return;
  }
  const d = Math.hypot(e.clientX - lastPX, e.clientY - lastPY);
  lastPX = e.clientX;
  lastPY = e.clientY;
  if (d === 0) return; // the still "mouse moved" a browser sends after scrolling
  if (t - moveAt > SIGNAL_TIMING.moveWindowMs) moveAcc = 0;
  moveAt = t;
  moveAcc += d;
  if (moveAcc >= SIGNAL_TIMING.moveMinPx) {
    moveAcc = 0;
    markLook();
  }
};

const onTouchStart = () => {
  lastInput = now();
  fingerDown = true;
  markLook();
};

const onTouchEnd = (e: TouchEvent) => {
  if (e.touches.length > 0) return;
  fingerDown = false;
  markLook(); // held briefly after the finger lifts
};

const onMouseLeave = () => {
  lastLook = NEVER;
  hasPointer = false;
  resolve();
};

const onVisibility = () => {
  if (document.hidden) reset();
};

const onResize = () => {
  // The page reflowing moves the scroll position without anyone scrolling.
  suppressScrollSignal(250);
};

const opts: AddEventListenerOptions = { passive: true };

function start() {
  lastY = window.scrollY;
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  window.addEventListener('wheel', onInput, opts);
  window.addEventListener('keydown', onInput, opts);
  window.addEventListener('pointermove', onPointerMove, opts);
  window.addEventListener('touchstart', onTouchStart, opts);
  window.addEventListener('touchend', onTouchEnd, opts);
  window.addEventListener('touchcancel', onTouchEnd, opts);
  window.addEventListener('blur', reset);
  window.addEventListener('resize', onResize);
  document.documentElement.addEventListener('mouseleave', onMouseLeave);
  document.addEventListener('visibilitychange', onVisibility);
}

function stop() {
  document.removeEventListener('scroll', onScroll, { capture: true });
  window.removeEventListener('wheel', onInput);
  window.removeEventListener('keydown', onInput);
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('touchstart', onTouchStart);
  window.removeEventListener('touchend', onTouchEnd);
  window.removeEventListener('touchcancel', onTouchEnd);
  window.removeEventListener('blur', reset);
  window.removeEventListener('resize', onResize);
  document.documentElement.removeEventListener('mouseleave', onMouseLeave);
  document.removeEventListener('visibilitychange', onVisibility);
  if (timer) window.clearTimeout(timer);
  timer = 0;
  timerAt = 0;
  lastGo = NEVER;
  lastLook = NEVER;
  fingerDown = false;
  hasPointer = false;
  current = 'stop';
  changedAt = NEVER;
}

// ---- Public

export function getSignal(): Signal {
  return current;
}

export function subscribeSignal(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

/** Ignores scroll movement for `ms` (the page jumping after a route change or a resize isn't scrolling). */
export function suppressScrollSignal(ms: number) {
  suppressUntil = Math.max(suppressUntil, now() + ms);
  lastY = window.scrollY;
}

export function useSignal(): Signal {
  return useSyncExternalStore(subscribeSignal, getSignal, () => 'stop');
}
