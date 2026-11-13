import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import AnimatedMenuButton from "./AnimatedMenuButton";

interface NavbarProps {
  isDark: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ isDark }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // Lock body scroll when menu is open (mobile)
  useEffect(() => {
    if (!isMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMenuOpen]);

  // Close menu on route/hash change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.hash]);

  const menuItems: Array<{ label: string; to: string | { pathname: string; hash?: string } }> = [
    { label: "Websites", to: { pathname: "/", hash: "#websites" } },
    { label: "Work", to: { pathname: "/", hash: "#work" } },
    { label: "About", to: "/about" },
    { label: "Contact", to: { pathname: "/", hash: "#contact" } },
  ];

  const isActive = (to: string | { pathname: string; hash?: string }) => {
    if (typeof to === 'string') {
      return location.pathname === to;
    }
    const samePath = location.pathname === to.pathname;
    const hash = to.hash || '';
    if (!hash) return samePath;
    return samePath && location.hash === hash;
  };

  return (
    <>
      {/* Desktop: floating glass pill */}
      <header className="hidden md:flex fixed top-5 left-0 right-0 z-50 justify-center px-6">
        <nav className="flex items-center gap-6 pl-2 pr-2 py-2 rounded-full bg-[#120a24]/60 border border-violet-300/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_40px_rgba(0,0,0,0.5)]">
          <Link to="/" data-clicksound="nav" className="flex items-center gap-2.5 pr-2">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-[#d8caff] to-[#9d86e9] text-[#170f2e] shadow-[0_0_16px_rgba(182,157,248,0.6)]">
              V
            </span>
            <span className="text-sm font-semibold text-white">Vardhan</span>
          </Link>

          <div className="flex items-center gap-1">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                data-clicksound="nav"
                className={
                  'px-3.5 py-1.5 rounded-full text-sm transition-colors ' +
                  (isActive(item.to)
                    ? 'text-white bg-white/10'
                    : 'text-white/60 hover:text-white')
                }
              >
                {item.label}
              </Link>
            ))}
          </div>

          <a
            href="/#contact"
            className="px-4 py-2 rounded-full text-sm font-medium text-white bg-black/60 border border-white/15 hover:border-violet-400/60 hover:bg-[#c8b6ff]/20 transition-colors"
          >
            Let's Connect
          </a>
        </nav>
      </header>

      {/* Mobile: keep a top bar + right-side sheet */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-300">
        <nav className="flex items-center justify-between max-w-screen-2xl mx-auto">
          {/* Left: Name */}
          <div className="flex justify-start">
            <Link
              to="/"
              data-clicksound="nav"
              className="flex items-center gap-2.5 text-base font-semibold text-white"
            >
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-[#d8caff] to-[#9d86e9] text-[#170f2e] shadow-[0_0_16px_rgba(182,157,248,0.6)]">V</span>
              Vardhan
            </Link>
          </div>

          {/* Right: Mobile Menu */}
          <div className="flex justify-end items-center space-x-2">
            <div className="relative">
              <AnimatedMenuButton
                buttonRef={buttonRef}
                isOpen={isMenuOpen}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07]"
              />

              {/* Premium mobile sheet */}
              <div
                className={
                  'fixed inset-0 z-[90] transition-opacity duration-200 ' +
                  (isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')
                }
                aria-hidden={!isMenuOpen}
              >
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setIsMenuOpen(false)}
                />

                {/* Sheet */}
                <div
                  ref={menuRef}
                  className={
                    'absolute right-3 top-20 w-[min(92vw,360px)] rounded-2xl border border-white/10 bg-[#07040f]/90 backdrop-blur-xl shadow-[0_30px_120px_rgba(0,0,0,0.65)] p-3 transition-transform duration-200 ' +
                    (isMenuOpen ? 'translate-y-0' : '-translate-y-2')
                  }
                >
                  <div className="px-2 pt-2 pb-3">
                    <div className="text-[10px] tracking-[0.28em] uppercase text-white/45">Menu</div>
                  </div>

                  <div className="flex flex-col">
                    {menuItems.map((item) => (
                      <Link
                        key={item.label}
                        to={item.to}
                        data-clicksound="nav"
                        className={
                          'flex items-center justify-between px-4 py-3 rounded-xl text-base font-semibold transition-colors ' +
                          (isActive(item.to)
                            ? 'bg-white/[0.08] text-white'
                            : 'text-white/80 hover:text-white hover:bg-white/[0.06]')
                        }
                      >
                        <span>{item.label}</span>
                        <span className="text-white/30">→</span>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-3 px-3 pb-2">
                    <div className="h-px w-full bg-white/10" />
                    <div className="mt-3 text-xs text-white/50">Tip: tap outside to close</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Navbar;