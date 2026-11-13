import { useSyncExternalStore } from 'react';

// The loading screen (in index.html) lifts once the app has mounted and its fonts are in. At that moment it fires
// 'site:ready', so intros that should be seen (the name rising, the stickers landing) wait for it instead of
// playing underneath the loader. With no loading screen on the page, the site counts as ready at once.

declare global {
  interface Window {
    __siteReady?: boolean;
  }
}

export function isSiteReady() {
  if (typeof window === 'undefined') return true;
  return !!window.__siteReady || !document.getElementById('preloader');
}

export function onSiteReady(fn: () => void): () => void {
  if (isSiteReady()) {
    fn();
    return () => {};
  }
  const h = () => fn();
  window.addEventListener('site:ready', h, { once: true });
  return () => window.removeEventListener('site:ready', h);
}

const subscribe = (cb: () => void) => onSiteReady(cb);

export function useSiteReady() {
  return useSyncExternalStore(subscribe, isSiteReady, () => true);
}

// ---- Setting heavy things up ahead of time ----------------------------------------------------------------------
// The 3D scenes (the traffic light, the pencil, the TV remote, the certificate drawer) each take 100 ms or more to
// set up. Done the moment they're first seen, they froze the scroll; done once the page was showing, they made the
// opening animation (the name rising) stutter. So they're done behind the loading screen: the screen waits for
// them (holdLoader, up to a cap in index.html) and lifts onto a page with nothing heavy left to do. Anything queued
// once the page is showing waits until the intro has played, then runs one task per idle moment.

/** How long after the loading screen lifts the intro animations need (ms). */
const INTRO_MS = 2600;
/** The gap between one queued task and the next once the page is showing (ms). */
const GAP_MS = 350;
const queue: (() => void)[] = [];
let pumping = false;
let introDone = false;

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts: { timeout: number }) => number;
  __loaderHolds?: Promise<unknown>[];
};

/** Keeps the loading screen up until `p` settles (index.html waits for these, up to a cap). */
export function holdLoader(p: Promise<unknown>) {
  if (typeof window === 'undefined' || isSiteReady()) return;
  const w = window as IdleWindow;
  (w.__loaderHolds ||= []).push(p.catch(() => undefined));
}

// While the loading screen is up, the queue holds it until it's empty (plus a moment for React to build what the
// tasks asked for).
let drained: (() => void) | null = null;
function holdUntilDrained() {
  if (drained || isSiteReady()) return;
  holdLoader(new Promise<void>((res) => (drained = res)));
}

function pump() {
  const loading = !isSiteReady();
  if (pumping || (!loading && !introDone)) return;
  const next = queue.shift();
  if (!next) {
    if (drained) {
      const done = drained;
      drained = null;
      window.setTimeout(done, 150);
    }
    return;
  }
  pumping = true;
  const w = window as IdleWindow;
  const run = () => {
    try {
      next();
    } finally {
      pumping = false;
      // Behind the loading screen, straight on to the next; once the page shows, spaced out.
      window.setTimeout(pump, loading ? 0 : GAP_MS);
    }
  };
  if (loading) window.setTimeout(run, 0);
  else if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 3000 });
  else window.setTimeout(run, 50);
}

if (typeof window !== 'undefined') {
  onSiteReady(() =>
    window.setTimeout(() => {
      introDone = true;
      pump();
    }, INTRO_MS)
  );
}

/**
 * Queues `cb` to set up something heavy (a 3D scene) ahead of time: behind the loading screen if it's still up,
 * otherwise after the intro, one at a time, when the browser is idle. `timeout` is kept for callers but the queue
 * decides the timing. Returns a function that cancels it if it hasn't run yet.
 */
export function whenIdle(cb: () => void, _timeout?: number): () => void {
  let cancelled = false;
  const task = () => {
    if (!cancelled) cb();
  };
  queue.push(task);
  holdUntilDrained();
  pump();
  return () => {
    cancelled = true;
    const i = queue.indexOf(task);
    if (i >= 0) queue.splice(i, 1);
  };
}
