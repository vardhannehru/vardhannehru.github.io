import { Link } from "react-router-dom";
import ThemeSwitch from "./ThemeSwitch";

// Minimal top bar: a small label on the left (home link) with the light / dark theme switch beside it. Stays fixed
// at the top while the page scrolls. (The page links are in the glowing nav bar, GlowNav.tsx.)

const LABEL = "AI Engineer";

export default function HeroNav() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex items-start justify-between px-6 pt-6 md:px-10 md:pt-8">
      <Link
        to="/"
        className="nav-label pointer-events-auto mt-2 text-[15px] md:text-base font-medium tracking-tight text-white/85 transition-colors hover:text-white"
      >
        {LABEL}
      </Link>
      {/* Light / dark theme switch, beside the label (fades out over the contact section: contactLight.css) */}
      <ThemeSwitch className="theme-switch pointer-events-auto mr-auto ml-4 mt-[3px]" />
    </header>
  );
}
