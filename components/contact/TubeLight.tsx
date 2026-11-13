import React, { useEffect } from 'react';
import { playSwitchClick, primeTubeAudio, tubeSoundActive, tubeSoundLevel } from './tubeSounds';
import './contactLight.css';

/*
 * The fluorescent tube over "Get in touch" (styles in contactLight.css).
 *
 * The fixture and every light layer read one CSS variable, --tube (0 = off, 1 = fully lit), set on the stage
 * that holds them. In the dark theme useTubeFlicker drives it like an ageing tube outside a building at dusk:
 * it starts the way a switch-start tube does, then sits steady, with a faint flutter or sag now and then and,
 * rarely, a stutter or a drop-out. It only changes the variable at discrete moments (no per-frame work), stops
 * while the section is off screen or the tab is hidden, and stays fully lit for visitors who prefer reduced
 * motion. In the light theme the tube is steady.
 */

type Step = [level: number, ms: number];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));

/** Brightness while the tube waits to be seen for the first time: dark glass. */
const COLD = 0.02;

/**
 * A switch-start tube coming on: the ends glow while the cathodes heat, the starter fires and the gas catches
 * for an instant, drops, tries again, then holds. A cold tube holds dim, and comes up to full over a few seconds.
 */
function ignition(): Step[] {
  const steps: Step[] = [[COLD, rand(650, 950)]];
  for (let i = randInt(2, 3); i > 0; i--) {
    steps.push([rand(0.6, 0.85), rand(45, 90)], [0.04, rand(280, 620)]);
  }
  // Caught. Warming up.
  for (let level = 0.68; level < 0.99; level += 0.04) steps.push([level, rand(170, 260)]);
  return steps;
}

/** One disturbance. Most are small enough to half-notice; the big ones are rare. */
function disturbance(): Step[] {
  const r = Math.random();
  const steps: Step[] = [];
  if (r < 0.55) {
    // Flutter: one to three shallow dips.
    for (let i = randInt(1, 3); i > 0; i--) {
      steps.push([rand(0.74, 0.9), rand(30, 70)], [1, rand(50, 160)]);
    }
  } else if (r < 0.8) {
    // Sag: the light drops a little, holds, and comes back in two steps.
    steps.push([rand(0.62, 0.8), rand(160, 460)], [rand(0.86, 0.93), rand(90, 180)]);
  } else if (r < 0.95) {
    // Stutter: a few deeper, quick drops.
    for (let i = randInt(2, 4); i > 0; i--) {
      steps.push([rand(0.25, 0.5), rand(30, 70)], [1, rand(40, 120)]);
    }
  } else {
    // Drop-out and restrike.
    steps.push([0.04, rand(320, 700)], [0.8, 60], [0.05, rand(140, 260)], [0.9, 120]);
  }
  return steps;
}

/**
 * Drives --tube on `ref`. `on` is the wall switch: off holds the tube dark; switching it on runs the start-up
 * again (the tube has to strike every time, like a real one), then the usual flicker.
 */
export function useTubeFlicker(ref: React.RefObject<HTMLElement | null>, on: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = (v: number) => {
      el.style.setProperty('--tube', v.toFixed(3));
      tubeSoundLevel(v);
    };
    if (!on) {
      tubeSoundActive(false);
      set(0);
      return;
    }

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer = 0;
    let visible = false;
    let ignited = false;

    const clear = () => {
      window.clearTimeout(timer);
      timer = 0;
    };

    const play = (steps: Step[], done: () => void) => {
      let i = 0;
      const next = () => {
        if (i >= steps.length) return done();
        const [level, ms] = steps[i++];
        set(level);
        timer = window.setTimeout(next, ms);
      };
      next();
    };

    // Long calm stretches; now and then a disturbance is followed soon after by another (they cluster).
    const schedule = () => {
      clear();
      const wait = Math.random() < 0.2 ? rand(300, 1300) : rand(5000, 14000);
      timer = window.setTimeout(() => play(disturbance(), () => { set(1); schedule(); }), wait);
    };

    const start = () => {
      if (motion.matches || document.hidden || !visible) return;
      clear();
      if (!ignited) {
        // Counts as started only once it has caught: scrolled away mid-start, it starts again next time.
        play(ignition(), () => { ignited = true; set(1); schedule(); });
      } else {
        schedule();
      }
    };

    // Rest state: lit, or still dark if it has never been seen (so it can come on in front of the visitor).
    const stop = () => {
      clear();
      set(ignited || motion.matches ? 1 : COLD);
    };
    stop();

    // The tube is heard only while it's on screen and the page is visible (with or without the flicker).
    const audible = () => tubeSoundActive(visible && !document.hidden);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        audible();
        if (visible) start();
        else stop();
      },
      { threshold: 0.35 },
    );
    io.observe(el);

    const onVisibility = () => {
      audible();
      if (document.hidden) stop();
      else start();
    };
    const onMotion = () => (motion.matches ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotion);

    return () => {
      clear();
      tubeSoundActive(false);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
      el.style.removeProperty('--tube');
    };
  }, [ref, on]);
}

/*
 * The fixture is a photograph (generated with Higgsfield; sources in assets-src/contact), lit by the tube itself
 * and fading to black at every edge. It's screen-blended onto the stage, so the black drops out and only the
 * fixture and the light on the wall remain: an old T12 batten, as two pixel-aligned frames of the same shot,
 * tube off underneath and tube on over it at opacity --tube, so a flicker dims the tube and the wall together.
 * Both themes show the same thing (the light theme frames it as a black card).
 */
const photo = (name: string) => ({
  src: `/contact/${name}-2000.webp`,
  srcSet: `/contact/${name}-1100.webp 1100w, /contact/${name}-2000.webp 2000w`,
  sizes: '(max-width: 640px) 166vw, (max-width: 1100px) 128vw, 1250px',
  alt: '',
  decoding: 'async' as const,
  draggable: false,
});

/** The fixture and the light it throws. Decorative only; sits behind the stage's content. */
export const TubeLight: React.FC = () => (
  <div className="tube-photo" aria-hidden="true">
    <img className="tube-photo-off" {...photo('tube-off')} />
    <img className="tube-photo-on" {...photo('tube-on')} />
  </div>
);

/**
 * The wall switch that powers the tube: a photograph per position, swapped on click. It sits on the same wall,
 * so it's lit by the tube too (and stays faintly visible in the dark, so it can be found again).
 */
export const LightSwitch: React.FC<{ on: boolean; onToggle: () => void }> = ({ on, onToggle }) => {
  // Lets the tube be heard after the visitor's first click or key press anywhere on the page.
  useEffect(() => primeTubeAudio(), []);
  return (
  <button
    type="button"
    className="light-switch"
    aria-pressed={on}
    aria-label={on ? 'Turn the light off' : 'Turn the light on'}
    onClick={() => {
      playSwitchClick(!on);
      onToggle();
    }}
  >
    <img className="light-switch-img" src="/contact/switch-off.webp" alt="" draggable={false} data-shown={!on} />
    <img className="light-switch-img" src="/contact/switch-on.webp" alt="" draggable={false} data-shown={on} />
  </button>
  );
};
