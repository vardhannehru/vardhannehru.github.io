import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import NotFoundPage from './components/pages/NotFoundPage';
import CreditsPage from './components/pages/CreditsPage';
import OfflinePage from './components/pages/OfflinePage';
import SmoothCursor from './components/cursor/SmoothCursor';
import RemoteCursor from './components/work/RemoteCursor';
import SmoothScroll from './components/ui/SmoothScroll';
import ClickSpark from './components/cursor/ClickSpark';
import HeroNav from './components/layout/HeroNav';
import GlowNav from './components/layout/GlowNav';
import PageTransition from './components/layout/PageTransition';
import { cn } from './lib/utils';
import SiteLayout from './components/pages/SiteLayout';
import HomeBelowHero from './components/pages/HomeBelowHero';
import AboutBelowHero from './components/pages/AboutBelowHero';
// Pages off the home route load only when visited, so the first load stays small.
const loadWorkPage = () => import('./components/pages/WorkPage');
const WorkPage = lazy(loadWorkPage);
// Fetched in the background once the intro has played, so the first press of Work in the nav opens it at once
// instead of stalling while its code downloads and starts up.
onSiteReady(() =>
  window.setTimeout(() => {
    const idle = (window as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(() => void loadWorkPage());
    else void loadWorkPage();
  }, 4000)
);
const HeroPage = lazy(() => import('./components/pages/HeroPage'));
// The floating 3D traffic light (components/signal): green while you scroll, yellow while the mouse moves, red at
// rest. Set to false to hide it.
const SHOW_TRAFFIC_LIGHT = true;
const TrafficLight = lazy(() => import('./components/signal/TrafficLight'));
// The 3D pencil that rests on the About portrait and becomes the cursor in the About section
// (components/pencil). Set to false to turn it off.
const SHOW_PENCIL_CURSOR = true;
const PencilCursor = lazy(() => import('./components/about/pencil/PencilCursor'));
import { useTheme } from './components/ui/theme';
import { onSiteReady } from './components/ui/siteReady';
import { GITHUB_URL, LINKEDIN_URL } from './components/opensource/OpenSourceSection';

export default function App() {
  const isDark = useTheme() === 'dark';

  // Tells the loading screen (index.html) the app is on the page.
  useEffect(() => {
    window.dispatchEvent(new Event('app:mounted'));
  }, []);

  const contact: ContactInfo = {
    // Same as the resume (public/about/resume.pdf).
    email: 'vardhannehru04@gmail.com',
    linkedin: LINKEDIN_URL,
    customLink: GITHUB_URL,
  };

  return (
    <ClickSpark sparkColor={isDark ? "#c4b5fd" : "#743BBE"} sparkSize={12} sparkRadius={18} sparkCount={10} duration={420}>
      <div
        className={cn(
          // Dark-only theme (tailwind CDN dark: variants can be flaky depending on config)
          'antialiased transition-colors duration-300 bg-[#07040f] text-gray-100 min-h-screen',
          isDark ? 'dark' : ''
        )}
      >
      <SmoothScroll enabled />
      <SmoothCursor isDark={isDark} />
      {/* Over the Work section the cursor becomes a 3D TV remote. */}
      <RemoteCursor />
      {/* Over the About section it becomes a 3D pencil. */}
      {SHOW_PENCIL_CURSOR && (
        <Suspense fallback={null}>
          <PencilCursor />
        </Suspense>
      )}
      {/* Seasonal FX removed */}
      {/* GlobalConfetti removed (paper effect) */}
      {/* ClickSound removed (replaced by ClickSpark) */}

      <HeroNav />
      {/* The main nav bar, lit from behind (GlowNav.tsx). */}
      <GlowNav />
      {/* The curtain that covers the switch between pages (PageTransition.tsx). */}
      <PageTransition />

      <main className="bg-[#07040f] min-h-screen relative z-10 transition-colors">
        <Routes>
          <Route element={<SiteLayout isDark={isDark} />}>
            <Route
              path="/"
              element={
                <HomeBelowHero isDark={isDark} contact={contact} />
              }
            />
            <Route path="/about" element={<AboutBelowHero isDark={isDark} contact={contact} />} />
          </Route>
          {/* The full write-up of every project, without the hero. */}
          <Route path="/work" element={<Suspense fallback={null}><WorkPage /></Suspense>} />
          {/* The hero on its own page. The home page keeps its own hero. */}
          <Route path="/hero" element={<Suspense fallback={null}><HeroPage isDark={isDark} /></Suspense>} />
          {/* Who and what the site builds on. */}
          <Route path="/credits" element={<CreditsPage />} />
          {/* Any other address: say so and offer the way home. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {/* Covers the site while the connection is down (OfflinePage.tsx). */}
      <OfflinePage />

      {/* Bottom padding clears the floating nav bar (GlowNav), which otherwise covers the copyright line. */}
      <footer className="text-center pt-8 pb-32 text-zinc-400 text-sm border-t border-zinc-800 bg-[#07040f] relative z-10 transition-colors">
        <p>&copy; {new Date().getFullYear()} Penkey Vardhan Sai Raghavendra Nehru. All rights reserved.</p>
        <Link to="/credits" className="mt-2 inline-block underline decoration-zinc-600 underline-offset-4 transition-colors hover:text-white">
          Credits
        </Link>
      </footer>
      {SHOW_TRAFFIC_LIGHT && (
        <Suspense fallback={null}>
          <TrafficLight />
        </Suspense>
      )}
      </div>
    </ClickSpark>
  );
}
