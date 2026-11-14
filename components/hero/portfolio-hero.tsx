import React, { Suspense, lazy, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
// Loaded only when SHOW_AVATAR is on: its module preloads a 2.9 MB model.
const Avatar = lazy(() => import("./Avatar"));
import HeroName from "./HeroName";
import SoundToggle from "./SoundToggle";
import HeroBackdrop, { type BackdropKind } from "./HeroBackdrop";
import HeroStage from "./HeroStage";
import HeroClock from "./HeroClock";
import WavingFlag from "./WavingFlag";
import { RECEDE_SCREENS, screenHeight } from "./nameStage";

interface PortfolioHeroProps {
  isDark: boolean;
  /** Content that scrolls up beneath the name once it has settled at the top (the Work section). */
  children?: React.ReactNode;
  /** A backdrop behind the name (used on the separate /hero page only). None by default. */
  backdrop?: BackdropKind;
}

const NAME = "VARDHAN NEHRU";
const [FIRST, LAST] = NAME.split(" ");

/** True on phone-sized screens, where the name breaks onto two lines so it can be bigger. */
function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setPhone(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}
// The spinning 3D avatar in the middle of the hero (off for now). Set to true to bring it back.
const SHOW_AVATAR = false;
// The lever switch for sound is hidden for now. Set to true to bring it back.
const SHOW_SOUND_TOGGLE = false;
// The band under the settled name that the Work cards fade out behind (screen heights).
const NAME_BAND = "28svh";
// The lit studio behind the name (HeroStage: a Higgsfield backdrop, a light beam and drifting dust). Off: the
// plain dotted grid suits the rest of the site better. Set to true to bring it back.
const SHOW_STAGE = false;
// "Feed" along the bottom in a small, quiet chip. Set to false for the earlier bare link. (The flag has no chip.)
const BOTTOM_CHIPS = true;
const glassChip = "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] font-medium text-white/75";

const PortfolioHero = React.forwardRef<HTMLDivElement, PortfolioHeroProps>(({ isDark, children, backdrop }, ref) => {
  const phone = useIsPhone();
  // 0 at the top of the page, 1 once the name has slid back and settled.
  const { scrollY } = useScroll();
  const progress = useTransform(scrollY, (y) => Math.min(1, Math.max(0, y / (screenHeight() * RECEDE_SCREENS))));
  const feedOpacity = useTransform(progress, [0, 0.25], [1, 0]);

  return (
    // The hero screen is pinned (sticky) and the children, your Work, sit after it and scroll up from below,
    // under the name once it has settled at the top. The pin ends when the children end.
    <div ref={ref} className="relative bg-[#07040f] text-white">
      {/* The screen layer lets clicks through, except on the name and the little controls. Nothing in it
          can be selected, copied, cut or dragged out as text or images. */}
      <div
        className="pointer-events-none relative z-20 h-[100svh] select-none overflow-hidden"
        style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
      {SHOW_STAGE && <HeroStage progress={progress} />}

      {/* Dotted grid */}
      {!SHOW_STAGE && <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "radial-gradient(rgba(var(--accent-rgb,196,181,253),0.5) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
        }}
      />}

      {/* A backdrop (only on the separate /hero page; see HeroBackdrop.tsx). */}
      {backdrop && <HeroBackdrop kind={backdrop} />}

      {SHOW_AVATAR && (
        <>
          {/* 3D avatar: pinned to the center of the screen. It sits above the name (z-0)
              but below the page sections (z-10), so they slide over it as you scroll.
              Keep this a plain div: a Framer Motion style would override the centering transform. */}
          <div className="fixed z-[5] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-[86vw] md:w-[42vw] max-w-[560px] h-[56vh] md:h-[82vh]">
            <motion.div
              className="w-full h-full"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.5 }}
            >
              <Suspense fallback={null}><Avatar className="!w-full !h-full" /></Suspense>
            </motion.div>
          </div>
        </>
      )}

      <main className="relative h-full flex flex-col items-center justify-center px-4 pt-6 pb-[14vh] md:pb-[16vh]">
        {/* No z-index here, so the name's layers stack correctly against the fixed avatar. */}
        <div className="pointer-events-auto relative w-full flex items-center justify-center">
          {phone ? (
            // Phones: "VARDHAN" over "NEHRU", each as big as the screen allows.
            <div className="flex w-full flex-col items-center space-y-4">
              <HeroName
                text={FIRST}
                scroll={progress}
                fontClass="flex select-none leading-[0.85] text-[27vw] tracking-tight"
                stickerSet="top"
                scaleBoost={1.5}
                totalLetters={NAME.length}
                recedeUnit={100}
              />
              <HeroName
                text={LAST}
                scroll={progress}
                fontClass="flex select-none leading-[0.85] text-[34vw] tracking-tight"
                stickerSet="bottom"
                scaleBoost={1.3}
                butterflies={false}
                delayOffset={FIRST.length + 1}
                totalLetters={NAME.length}
                recedeUnit={100}
              />
            </div>
          ) : (
            <HeroName text={NAME} scroll={progress} />
          )}
        </div>

        {/* Sound switch, top-right. Fades out with Feed as the name slides back. */}
        {SHOW_SOUND_TOGGLE && (
  <SoundToggle className="pointer-events-auto absolute right-[4.75rem] md:right-[6.5rem] top-6 md:top-8 z-20" style={{ opacity: feedOpacity }} />
        )}

        {/* The Indian flag on its pole, waving, bottom-left. No box round it. */}
        <motion.div
          style={{ opacity: feedOpacity }}
          className="pointer-events-auto absolute left-6 md:left-10 bottom-7 md:bottom-9 z-20 hidden sm:block"
          title="Made in India"
        >
          <WavingFlag />
        </motion.div>

        {/* The little clock, bottom-right (HeroClock.tsx). Only in the hero; fades out with Feed. */}
        <motion.div
          style={{ opacity: feedOpacity }}
          className="pointer-events-none absolute right-6 md:right-10 bottom-6 md:bottom-8 z-20 hidden sm:block"
        >
          <HeroClock isDark={isDark} />
        </motion.div>

        {/* "Feed ↓" at the bottom centre, down to the work. Fades out as the name slides back. */}
        <motion.a
          href="#work"
          style={{ opacity: feedOpacity }}
          className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-8 md:bottom-10 z-20 inline-flex items-center transition-colors hover:text-white ${
            BOTTOM_CHIPS ? `${glassChip} hover:border-[rgba(200,182,255,0.45)]` : "gap-1.5 text-[15px] md:text-base font-medium text-white/80"
          }`}
        >
          {BOTTOM_CHIPS && (
            // A little mouse with its wheel rolling down.
            <span aria-hidden="true" className="relative mr-0.5 inline-block h-[18px] w-[12px] rounded-full border-[1.5px] border-white/60">
              <motion.span
                className="absolute left-[3.5px] top-[3px] h-[4px] w-[2px] rounded-full bg-[color:var(--accent,#c8b6ff)]"
                animate={{ y: [0, 5, 0], opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </span>
          )}
          Feed
          <motion.span
            className="text-[color:var(--accent,#c8b6ff)]"
            animate={{ y: [-2, 3, -2] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            ↓
          </motion.span>
        </motion.a>
      </main>
      </div>

      {/* Work: starts below the fold and scrolls up beneath the pinned name. */}
      {children && (
        <div className="relative z-10">{children}</div>
      )}
    </div>
  );
});

export default PortfolioHero;
