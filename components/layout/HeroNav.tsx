import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import ThemeSwitch from "./ThemeSwitch";

// Minimal nav: a small label on the left and a round menu button on the right that opens a full-screen
// menu with big links. Stays fixed at the top while the page scrolls.

const LABEL = "AI Engineer";
// The round menu button is hidden for now (the full-screen menu below still works). Set to true to bring it back.
const SHOW_MENU_BUTTON = false;

const ITEMS: { label: string; to: string | { pathname: string; hash?: string } }[] = [
  { label: "Work", to: "/work" },
  { label: "Websites", to: { pathname: "/", hash: "#websites" } },
  { label: "About", to: "/about" },
  { label: "Contact", to: { pathname: "/", hash: "#contact" } },
];

const MONO = "ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace";

export default function HeroNav() {
  const [open, setOpen] = useState(false);

  // Escape closes the menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex items-start justify-between px-6 pt-6 md:px-10 md:pt-8">
        <Link
          to="/"
          onClick={() => setOpen(false)}
          className="nav-label pointer-events-auto mt-2 text-[15px] md:text-base font-medium tracking-tight text-white/85 transition-colors hover:text-white"
        >
          {LABEL}
        </Link>
        {/* Light / dark theme switch, beside the label (fades out over the contact section: contactLight.css) */}
        <ThemeSwitch className="theme-switch pointer-events-auto mr-auto ml-4 mt-[3px]" />

        {SHOW_MENU_BUTTON && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--accent,#c8b6ff)] text-[#170f2e] shadow-[0_0_30px_rgba(182,157,248,0.35)] transition-transform duration-300 hover:scale-105"
        >
          <span className="relative block h-3 w-5">
            <motion.span
              className="absolute left-0 top-0 h-[2px] w-full rounded-full bg-current"
              animate={open ? { y: 5, rotate: 45 } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.3 }}
            />
            <motion.span
              className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-current"
              animate={open ? { y: -5, rotate: -45 } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.3 }}
            />
          </span>
        </button>
        )}
      </header>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Menu"
            className="fixed inset-0 z-50 flex flex-col justify-center bg-[#07040f]/95 px-6 backdrop-blur-xl md:px-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ul className="flex flex-col gap-1">
              {ITEMS.map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, delay: 0.08 + i * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="group flex items-baseline gap-4 py-1 text-white/90 transition-colors hover:text-[color:var(--accent,#c8b6ff)]"
                  >
                    <span className="w-8 text-xs tracking-[0.2em] text-white/35" style={{ fontFamily: MONO }}>
                      0{i + 1}
                    </span>
                    <span
                      className="uppercase leading-[1] text-[14vw] md:text-[8rem] transition-transform duration-300 group-hover:translate-x-3"
                      style={{ fontFamily: "'Anton', sans-serif" }}
                    >
                      {item.label}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
