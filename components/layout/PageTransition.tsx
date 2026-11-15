import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../ui/theme';

// The page transition: pressing a link to another page (or any button in the nav bar) brings up a curtain of three
// coloured panels with the page's name on it. The page changes and jumps to its place underneath, then the
// curtain lifts off the top. Only transforms are animated (Web Animations API), so it stays smooth even while the
// new page is being set up underneath. Links opening a new tab, other sites, mail and so on are left alone.

const PANELS = {
  // The pastel theme's swatches: Summer Green, Limencello, then Soft Lavender with the name in purple.
  light: { panels: ['#B1E4E3', '#FED141', '#EBDEFC'], ink: '#743BBE', sub: 'rgba(63,38,12,0.55)' },
  dark: { panels: ['#c8b6ff', '#2a1f4a', '#0d0818'], ink: '#c8b6ff', sub: 'rgba(255,255,255,0.45)' },
};

const EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';
const IN_MS = 440;
const OUT_MS = 540;
const STAGGER = 60;

function labelFor(path: string, hash: string) {
  if (hash === '#contact') return 'Contact';
  if (path.startsWith('/work')) return 'Work';
  if (path.startsWith('/about')) return 'About';
  if (path.startsWith('/hero')) return 'Hero';
  if (path.startsWith('/credits')) return 'Credits';
  return path === '/' ? 'Home' : 'Page not found';
}

// A frame, or 100 ms if frames are paused (tab in the background), so the curtain can never get stuck up.
const nextFrame = () =>
  new Promise<void>((r) => {
    const t = window.setTimeout(r, 100);
    requestAnimationFrame(() => {
      window.clearTimeout(t);
      r();
    });
  });
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export default function PageTransition() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const colors = PANELS[theme];
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const labelRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const [label, setLabel] = useState('');
  // The latest location, for the click handler (set up once).
  const here = useRef(location);
  here.current = location;

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const play = async (to: string, path: string, hash: string) => {
      const root = rootRef.current;
      const panels = panelRefs.current.filter(Boolean) as HTMLDivElement[];
      const labelEl = labelRef.current;
      if (!root || !panels.length || !labelEl) {
        navigate(to);
        return;
      }
      busy.current = true;
      setLabel(labelFor(path, hash));
      root.style.visibility = 'visible';
      root.style.pointerEvents = 'auto';

      // In: the panels rise from the bottom one after another, then the name comes up.
      const ins = panels.map((p, i) =>
        p.animate(
          reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'translateY(100%)' }, { transform: 'translateY(0%)' }],
          { duration: reduced ? 150 : IN_MS, delay: reduced ? 0 : i * STAGGER, easing: EASE, fill: 'forwards' }
        )
      );
      labelEl.animate(
        reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(40%)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 340, delay: reduced ? 0 : (panels.length - 1) * STAGGER + 140, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
      );
      // The Work page's code is fetched while the curtain comes up (usually it's in already).
      const ready = path.startsWith('/work') ? import('../pages/WorkPage').catch(() => undefined) : Promise.resolve();
      await Promise.all([...ins.map((a) => a.finished.catch(() => undefined)), ready]);

      // Change page under the curtain, and give it a moment to set itself up and jump to its place.
      navigate(to);
      await nextFrame();
      await nextFrame();
      await wait(reduced ? 0 : 60);

      // Out: the name goes first, then the panels lift off the top, last one in first out.
      labelEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'forwards' });
      const outs = panels
        .slice()
        .reverse()
        .map((p, i) =>
          p.animate(
            reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translateY(0%)' }, { transform: 'translateY(-100%)' }],
            { duration: reduced ? 150 : OUT_MS, delay: reduced ? 0 : i * STAGGER, easing: EASE, fill: 'forwards' }
          )
        );
      await Promise.all(outs.map((a) => a.finished.catch(() => undefined)));
      root.style.visibility = 'hidden';
      root.style.pointerEvents = 'none';
      panels.forEach((p) => p.getAnimations().forEach((a) => a.cancel()));
      labelEl.getAnimations().forEach((a) => a.cancel());
      busy.current = false;
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const cur = here.current;
      const otherPage = url.pathname !== cur.pathname;
      const fromNav = !!a.closest('nav[aria-label="Main"]');
      // Another page, or a nav button that goes somewhere else on this one (Contact from Home). Pressing the page
      // you're on, or a link within a page, just jumps as before.
      if (!otherPage && !(fromNav && url.hash !== cur.hash)) return;
      e.preventDefault();
      if (busy.current) return;
      void play(url.pathname + url.search + url.hash, url.pathname, url.hash);
    };
    // Capture phase, ahead of React Router's own link handling (which then sees the click is taken).
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[10000] overflow-hidden"
      style={{ visibility: 'hidden', pointerEvents: 'none' }}
    >
      {colors.panels.map((c, i) => (
        <div
          key={i}
          ref={(el) => {
            panelRefs.current[i] = el;
          }}
          className="absolute inset-0 will-change-transform"
          style={{ background: c, transform: 'translateY(100%)' }}
        />
      ))}
      <div className="absolute inset-0 grid place-items-center">
        <div ref={labelRef} className="text-center" style={{ opacity: 0 }}>
          <div
            className="text-[13px] font-medium tracking-[-0.01em] md:text-[14px]"
            style={{ fontFamily: "'Bricolage Grotesque', 'Geist', sans-serif", color: colors.sub }}
          >
            Vardhan Nehru
          </div>
          <div
            className="mt-2 text-[clamp(3.5rem,14vw,9rem)] leading-none"
            style={{ fontFamily: "'Anton', 'Impact', sans-serif", color: colors.ink }}
          >
            {label}
            <span style={{ color: colors.ink, opacity: 0.5 }}>.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
