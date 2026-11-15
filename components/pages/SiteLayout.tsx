import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PortfolioHero from "../hero/portfolio-hero";
import WorkSection from "../work/WorkSection";
import { smoothScrollTo } from "../ui/SmoothScroll";
import { onSiteReady, isSiteReady } from "../ui/siteReady";

type Props = {
  isDark: boolean;
};

export default function SiteLayout({ isDark }: Props) {
  const location = useLocation();

  // Nav presses jump straight to the page or section (/, /about, /#contact): no scrolling animation up or down.
  // Runs on every navigation (location.key), so pressing Home while already on Home still takes you to the top.
  // Opened from a link on first load, the page waits until the loading screen has lifted (scrolling is held until
  // then, so an earlier jump was lost), then a moment for the section to be laid out.
  useEffect(() => {
    const hash = location.hash?.replace('#', '');
    // Only the page load itself (loading screen still up) counts as first: coming back from /work mounts this layout
    // again, and must still jump.
    const first = !isSiteReady();
    // No section named (Home, or another page): go to the top. (On a refresh SmoothScroll does it.)
    if (!hash) {
      if (!first) smoothScrollTo(0, { immediate: true });
      return;
    }

    const jump = () => {
      const el = document.getElementById(hash);
      if (el) smoothScrollTo(el, { immediate: true });
    };
    // Navigating within the site: go there now. The page may still be laying itself out (coming from About, the
    // hero and Work mount fresh, and images load in), which moves the section down after the jump and left you in
    // Work. So for a moment, jump again whenever the page changes size, until you scroll yourself.
    if (!first) {
      jump();
      let raf = requestAnimationFrame(function again() {
        jump();
        raf = requestAnimationFrame(again);
      });
      const ro = new ResizeObserver(jump);
      ro.observe(document.body);
      const stop = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.clearTimeout(settle);
        window.removeEventListener('wheel', stop);
        window.removeEventListener('touchstart', stop);
        window.removeEventListener('keydown', stop);
      };
      const settle = window.setTimeout(stop, 1200);
      window.addEventListener('wheel', stop, { passive: true });
      window.addEventListener('touchstart', stop, { passive: true });
      window.addEventListener('keydown', stop);
      return stop;
    }
    let t = 0;
    const offReady = onSiteReady(() => {
      t = window.setTimeout(jump, 80);
    });

    return () => {
      offReady();
      window.clearTimeout(t);
    };
  }, [location.key]);

  return (
    <>
      {/* The hero is on the home page only; About opens straight on its own content. On the home page the Work
          section lives inside the hero, so the name stays put at the top while your work scrolls up beneath it. */}
      {location.pathname === "/" && (
        <PortfolioHero isDark={isDark}>
          <WorkSection isDark={isDark} />
        </PortfolioHero>
      )}

      {/* Route content changes below */}
      <div className="bg-[#07040f] relative z-10 transition-colors">
        <Outlet />
      </div>
    </>
  );
}
