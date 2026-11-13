// Links the 3D remote cursor (RemoteCursor.tsx) and the 3D TVs (TV3D.tsx).
// - Where the remote is: the cursor turns into the remote over any element marked `data-remote-zone` (the
//   Work section on the home page, and the demos on the Work page). While it's out, TVs in view turn on.
// - Where the TVs are, so the remote can point at one when it's near, and press the right button for a click.
// - Whether the visitor has tried a TV yet; until they have, a small label under each TV says it works.

type Listener = () => void;

let active = false;
const activeListeners = new Set<Listener>();

export const isRemoteActive = () => active;

export function setRemoteActive(v: boolean) {
  if (v === active) return;
  active = v;
  activeListeners.forEach((l) => l());
}

/** Calls `cb` whenever the remote comes out or goes away. Returns a function that stops listening. */
export function onRemoteActive(cb: Listener) {
  activeListeners.add(cb);
  return () => {
    activeListeners.delete(cb);
  };
}

// ---- TVs on the page

/** A button on the remote: power, the channel rocker, the volume rocker, or the OK button in the middle. */
export type RemoteButton = 'power' | 'ch' | 'vol' | 'ok';

type TVHandle = {
  el: HTMLElement;
  /** Which remote button a click at (x, y) would press on this TV, or null if (x, y) isn't on it. */
  peek: (x: number, y: number) => RemoteButton | null;
};
const tvs = new Set<TVHandle>();

export function registerTV(handle: TVHandle) {
  tvs.add(handle);
  return () => {
    tvs.delete(handle);
  };
}

/** The TV nearest to (x, y): its screen centre and how far (x, y) is from the TV itself (0 when over it). */
export function nearestTV(x: number, y: number) {
  let best: { cx: number; cy: number; dist: number } | null = null;
  const vh = window.innerHeight;
  tvs.forEach(({ el }) => {
    const b = el.getBoundingClientRect();
    if (b.bottom < 0 || b.top > vh || !b.width) return;
    // The TV takes up the middle of its box; the rest is floor and air.
    const left = b.left + b.width * 0.1;
    const right = b.right - b.width * 0.1;
    const top = b.top + b.height * 0.1;
    const bottom = b.bottom - b.height * 0.12;
    const dist = Math.hypot(Math.max(left - x, 0, x - right), Math.max(top - y, 0, y - bottom));
    if (!best || dist < best.dist) best = { cx: b.left + b.width / 2, cy: b.top + b.height * 0.42, dist };
  });
  return best as { cx: number; cy: number; dist: number } | null;
}

/** Which remote button a click at (x, y) presses: the TV's answer if it's over one, otherwise OK. */
export function remoteButtonAt(x: number, y: number): RemoteButton {
  for (const tv of tvs) {
    const b = tv.peek(x, y);
    if (b) return b;
  }
  return 'ok';
}

// ---- The remote's button press (shown when it turns a TV on by itself)

const pressListeners = new Set<(button: RemoteButton) => void>();

/** Makes the remote cursor press one of its buttons. */
export function pressRemote(button: RemoteButton = 'power') {
  pressListeners.forEach((l) => l(button));
}

export function onRemotePress(cb: (button: RemoteButton) => void) {
  pressListeners.add(cb);
  return () => {
    pressListeners.delete(cb);
  };
}

/** TVs turning on together go one after another, this far apart (ms). */
const STAGGER = 260;
let lastAutoOn = 0;

/** How long this TV should wait before it turns on, so a row of TVs comes on one by one. */
export function nextAutoOnDelay() {
  const now = performance.now();
  const at = Math.max(now, lastAutoOn + STAGGER);
  lastAutoOn = at;
  return at - now;
}

// ---- Has the visitor tried the controls?

const USED_KEY = 'tv-controls-used';
let used = (() => {
  try {
    return sessionStorage.getItem(USED_KEY) === '1';
  } catch {
    return false;
  }
})();
const usedListeners = new Set<Listener>();

export const controlsUsed = () => used;

export function markControlsUsed() {
  if (used) return;
  used = true;
  try {
    sessionStorage.setItem(USED_KEY, '1');
  } catch {
    // Storage unavailable: the hint just shows again next visit.
  }
  usedListeners.forEach((l) => l());
}

export function onControlsUsed(cb: Listener) {
  usedListeners.add(cb);
  return () => {
    usedListeners.delete(cb);
  };
}
