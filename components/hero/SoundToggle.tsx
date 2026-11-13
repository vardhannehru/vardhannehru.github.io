import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, type MotionStyle } from "framer-motion";
import {
  audioAllowed,
  isMuted,
  onAudioUnlocked,
  playStickerArpeggio,
  setMuted,
  unlockAudio,
} from "./chimes";
import "./LeverSwitch.css";

// A sound switch drawn as a little lever: a glossy red ball on a stick that flips over a grey base.
// Lever up and leaning = sound on, laid flat = off. No text. Browsers block sound until the visitor
// clicks, taps or presses a key, so while it's still locked the lever pulses softly; flipping it turns
// sound on and replays the stickers' landing chimes. After that it's a mute switch.

type State = "locked" | "on" | "off";

/** When it appears (s after load): as the first sticker lands. */
const SHOW_AFTER = 4.2;

/** The lever: same structure as the 21st.dev lever-switch (hidden checkbox, handle with knob and bar, base). */
function Lever({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className="ls-container">
      <input className="ls-input" type="checkbox" checked={on} readOnly tabIndex={-1} />
      <span className="ls-handle-wrapper">
        <span className="ls-handle">
          <span className="ls-handle-knob" />
          <span className="ls-handle-bar-wrapper">
            <span className="ls-handle-bar" />
          </span>
        </span>
      </span>
      <span className="ls-base">
        <span className="ls-base-inside" />
      </span>
    </span>
  );
}

/** `style` is for the outer box (e.g. a scroll-linked fade); the switch fades itself in inside it. */
export default function SoundToggle({
  className = "",
  style,
}: {
  className?: string;
  style?: MotionStyle;
}) {
  const [state, setState] = useState<State>(() =>
    audioAllowed() ? (isMuted() ? "off" : "on") : "locked",
  );
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), SHOW_AFTER * 1000);
    return () => window.clearTimeout(t);
  }, []);
  // Any first click or key press on the page also turns sound on.
  useEffect(
    () => onAudioUnlocked(() => setState(isMuted() ? "off" : "on")),
    [],
  );

  const onClick = async () => {
    if (state === "locked") {
      setMuted(false);
      if (await unlockAudio()) {
        setState("on");
        playStickerArpeggio();
      }
      return;
    }
    const next = state === "on" ? "off" : "on";
    setMuted(next === "off");
    setState(next);
  };

  return (
    <motion.div className={className} style={style}>
      <AnimatePresence>
        {shown && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <button
              type="button"
              onClick={onClick}
              role="switch"
              aria-checked={state === "on"}
              aria-label={
                state === "locked"
                  ? "Turn sound on"
                  : state === "on"
                    ? "Mute sound"
                    : "Unmute sound"
              }
              className="relative flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] p-1 backdrop-blur-md transition-colors hover:bg-white/[0.1]"
            >
              {/* A soft pulse while sound is still locked, to draw the eye. */}
              {state === "locked" && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border border-[color:var(--accent-60,rgba(200,182,255,0.6))]"
                  animate={{ scale: [1, 1.2], opacity: [0.7, 0] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
              )}
              <Lever on={state === "on"} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
