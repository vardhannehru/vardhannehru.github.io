// How hard the 3D canvases can push the device. Phones and tablets have screens of 2–3× pixel density but small
// graphics chips: drawing every 3D canvas at full density made the site lag on phones and, while it loaded, leave
// blank white patches where the chip hadn't caught up. So they draw a little softer there.

/** Phones and tablets: a small screen, or touch without a mouse. */
export function isLowPower(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.matchMedia?.('(max-width: 767px), (hover: none) and (pointer: coarse)').matches;
}

/**
 * The resolution 3D canvases draw at on phones and tablets. It was 1–1.25, which looked blurry (phone screens are
 * 2–3×, so the picture was stretched up to 2.4×). 2 is sharp, and each canvas is small on a phone, so it costs about
 * half of drawing at the full 3×. Lower it again if a phone lags.
 */
export const PHONE_DPR = 2;

/** Pinch-zoomed, a canvas draws at most this many pixels per CSS pixel... */
const ZOOM_MAX_DPR = 4;
/** ...and at most this many pixels in all (a large canvas zoomed in would otherwise get huge). */
const ZOOM_MAX_PIXELS = 4_000_000;

/** How far the page is pinch-zoomed (1 = not zoomed). */
export function pinchZoom(): number {
  if (typeof window === 'undefined') return 1;
  return Math.max(1, window.visualViewport?.scale ?? 1);
}

/**
 * The pixel ratio to draw a canvas at: the screen's, capped at `desktop`, or at `phone` on phones and tablets.
 * While the page is pinch-zoomed it goes up with the zoom (a pinch only magnifies what's already drawn, so a 3D
 * canvas would look blocky), within the limits above; pass the canvas's CSS size (`w`, `h`) for the pixel limit.
 */
export function canvasDpr(desktop: number, phone: number, w = 0, h = 0): number {
  const base = Math.min(window.devicePixelRatio || 1, isLowPower() ? phone : desktop);
  const zoom = pinchZoom();
  if (zoom <= 1.01) return base;
  let dpr = Math.min(base * zoom, Math.max(base, ZOOM_MAX_DPR));
  if (w > 0 && h > 0) dpr = Math.min(dpr, Math.max(base, Math.sqrt(ZOOM_MAX_PIXELS / (w * h))));
  return dpr;
}

/**
 * Calls `fn` once a pinch-zoom has settled at a new scale, so canvases can redraw at the new resolution (see
 * canvasDpr). Waits for the fingers to stop, so it doesn't reallocate canvases mid-pinch. Returns the unsubscribe.
 */
export function onPinchZoom(fn: () => void): () => void {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (!vv) return () => {};
  let last = Math.max(1, vv.scale);
  let timer = 0;
  const onResize = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const s = Math.max(1, vv.scale);
      if (Math.abs(s - last) / last < 0.08) return;
      last = s;
      fn();
    }, 220);
  };
  vv.addEventListener('resize', onResize);
  return () => {
    window.clearTimeout(timer);
    vv.removeEventListener('resize', onResize);
  };
}
