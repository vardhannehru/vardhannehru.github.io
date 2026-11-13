import { useEffect } from 'react';
import Lenis from 'lenis';
import { isSiteReady, onSiteReady } from './siteReady';

type Props = {
  enabled?: boolean;
  /**
   * How much of the remaining distance the page covers each frame. Lower = longer, silkier glide.
   */
  lerp?: number;
  /**
   * For wheel smoothing.
   */
  wheelMultiplier?: number;
};

let instance: Lenis | null = null;

/** Scrolls the page smoothly to `target` (px from the top, or an element), through Lenis when it's running so the two don't fight. */
export function smoothScrollTo(target: number | HTMLElement, opts: { offset?: number; immediate?: boolean } = {}) {
  if (instance) {
    // A jump right after a page change: re-measure first, or a stale scroll limit (from before the page grew)
    // stops the jump short.
    if (opts.immediate) instance.resize();
    instance.scrollTo(target, { duration: 1.25, easing: easeOutExpo, offset: opts.offset ?? 0, immediate: opts.immediate });
    return;
  }
  const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY + (opts.offset ?? 0);
  window.scrollTo({ top: y, behavior: opts.immediate ? 'auto' : 'smooth' });
}

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

export default function SmoothScroll({ enabled = true, lerp = 0.1, wheelMultiplier = 1 }: Props) {
  useEffect(() => {
    if (!enabled) return;

    // Respect reduced motion
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

    const lenis = new Lenis({
      lerp,
      wheelMultiplier,
      smoothWheel: true,
      // Touch screens scroll natively: Lenis driving touch scroll from JavaScript drops frames on phones.
      syncTouch: false,
      // Scrollable boxes inside the page (modals, lists) scroll themselves instead of the page.
      allowNestedScroll: true,
    });
    instance = lenis;

    // Hold the page still while the loading screen is up. On a refresh, start from the top when it lifts: the page
    // can have been moved down while it loaded (by the browser, or by an animation measuring the page).
    if (!isSiteReady()) lenis.stop();
    const reload = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'reload';
    const offReady = onSiteReady(() => {
      if (reload && !window.location.hash) lenis.scrollTo(0, { immediate: true, force: true });
      lenis.start();
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Pages grow as images and sections load in; keep Lenis's idea of the page height current.
    const ro = new ResizeObserver(() => lenis.resize());
    ro.observe(document.body);

    return () => {
      offReady();
      ro.disconnect();
      cancelAnimationFrame(raf);
      if (instance === lenis) instance = null;
      lenis.destroy();
    };
  }, [enabled, lerp, wheelMultiplier]);

  return null;
}
