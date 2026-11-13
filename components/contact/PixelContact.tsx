import React, { useEffect, useId, useMemo, useRef } from 'react';
import MailIcon from '../icons/MailIcon';
import LinkedinIcon from '../icons/LinkedinIcon';
import CustomIcon from '../icons/CustomIcon';
import './pixelContact.css';

/*
 * Light theme's contact section (dark keeps the fluorescent tube, ContactSection.tsx): a pixel arcade on a fine
 * grid, after the pixel-art cherry the user pinned (dgrees.studio), in the site's own swatches.
 *
 *   - A pixel Pac-Man in Limencello runs along a lane of pellets under the heading, following the pointer (or a
 *     tap), eating the pellets he passes; they come back a few seconds later. A lavender ghost trails behind him.
 *     (Switched off, PLAYER: the user's face as the player, exact or in pixels.)
 *   - A pixel cherry sits on the lane. Eating it turns the ghost blue and sends it running for a few seconds.
 *   - With no pointer about, he does one lap on his own now and then, then rests.
 *   - Clicking him turns him round. No sound.
 *
 * Pixel players step in whole sprite pixels, so it reads as pixel art. It runs on requestAnimationFrame while the
 * section is on screen. Reduced motion: no chomping or lap on his own; he jumps straight to where you point.
 */

// ---------- Pixel sprites (one character per pixel) ----------

// Pac-Man, the player (PLAYER = 'pacman'): three frames, mouth open, half, shut; while he runs CSS cycles them.
const PAC_FRAMES = [
  [
    '....XXXXX....',
    '..XXXXXXXXX..',
    '.XXXXXXXXXXX.',
    '.XXXXXXXXX...',
    'XXXXXXXXX....',
    'XXXXXXX......',
    'XXXXX........',
    'XXXXXXX......',
    'XXXXXXXXX....',
    '.XXXXXXXXX...',
    '.XXXXXXXXXXX.',
    '..XXXXXXXXX..',
    '....XXXXX....',
  ],
  [
    '....XXXXX....',
    '..XXXXXXXXX..',
    '.XXXXXXXXXXX.',
    '.XXXXXXXXXXX.',
    'XXXXXXXXXXX..',
    'XXXXXXXXX....',
    'XXXXXXX......',
    'XXXXXXXXX....',
    'XXXXXXXXXXX..',
    '.XXXXXXXXXXX.',
    '.XXXXXXXXXXX.',
    '..XXXXXXXXX..',
    '....XXXXX....',
  ],
  [
    '....XXXXX....',
    '..XXXXXXXXX..',
    '.XXXXXXXXXXX.',
    '.XXXXXXXXXXX.',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    '.XXXXXXXXXXX.',
    '.XXXXXXXXXXX.',
    '..XXXXXXXXX..',
    '....XXXXX....',
  ],
];

// (Off: PLAYER = 'pixel'.) The user's face as the player (from logo/svg/vardhan-portrait-*.svg, drawn by hand at 21×21): the swept hair
// with its flick, brows, eyes, moustache and goatee. Three mouth frames: closed (at rest), half open, open; while
// he moves they cycle closed, half, open, half, so he chomps. X ink, S skin (Pac-Man yellow), W eye, M mouth.
const FACE_FRAMES = [
  [
      '......XXXXXXXX.......',
      '....XXXXXXXXXXXXX....',
      '...XXXXXXXXXXXXXXXX..',
      '..XXXXXXXXXXXXXXXXXX.',
      '..XXXXXXXXXXXXXXXXXXX',
      '..XXXXXSSSSSSSXXXXXX.',
      '..XXXSSSSSSSSSSSXXX..',
      '...XSSSSSSSSSSSSSX...',
      '...SSXXXSSSSSXXXSS...',
      '..SSSSSSSSSSSSSSSSS..',
      '..SSSWXSSSSSSSWXSSS..',
      '..SSSSSSSSSSSSSSSSS..',
      '...SSSSSSSSSSSSSSS...',
      '...SSSSSSSXSSSSSSS...',
      '...SSSSXXXXXXXSSSS...',
      '...SSSXSSSSSSSXSSS...',
      '....SSSSXXXXXSSSS....',
      '....SSSSSSSSSSSSS....',
      '.....SSSXXXXXSSS.....',
      '......SXXXXXXXS......',
      '........XXXXX........',
  ],
  [
      '......XXXXXXXX.......',
      '....XXXXXXXXXXXXX....',
      '...XXXXXXXXXXXXXXXX..',
      '..XXXXXXXXXXXXXXXXXX.',
      '..XXXXXXXXXXXXXXXXXXX',
      '..XXXXXSSSSSSSXXXXXX.',
      '..XXXSSSSSSSSSSSXXX..',
      '...XSSSSSSSSSSSSSX...',
      '...SSXXXSSSSSXXXSS...',
      '..SSSSSSSSSSSSSSSSS..',
      '..SSSWXSSSSSSSWXSSS..',
      '..SSSSSSSSSSSSSSSSS..',
      '...SSSSSSSSSSSSSSS...',
      '...SSSSSSSXSSSSSSS...',
      '...SSSSXXXXXXXSSSS...',
      '...SSSXSSSSSSSXSSS...',
      '....SSSSXMMMXSSSS....',
      '....SSSSSXXXSSSSS....',
      '.....SSSXXXXXSSS.....',
      '......SXXXXXXXS......',
      '........XXXXX........',
  ],
  [
      '......XXXXXXXX.......',
      '....XXXXXXXXXXXXX....',
      '...XXXXXXXXXXXXXXXX..',
      '..XXXXXXXXXXXXXXXXXX.',
      '..XXXXXXXXXXXXXXXXXXX',
      '..XXXXXSSSSSSSXXXXXX.',
      '..XXXSSSSSSSSSSSXXX..',
      '...XSSSSSSSSSSSSSX...',
      '...SSXXXSSSSSXXXSS...',
      '..SSSSSSSSSSSSSSSSS..',
      '..SSSWXSSSSSSSWXSSS..',
      '..SSSSSSSSSSSSSSSSS..',
      '...SSSSSSSSSSSSSSS...',
      '...SSSSSSSXSSSSSSS...',
      '...SSSSXXXXXXXSSSS...',
      '...SSSXSSSSSSSXSSS...',
      '....SSSXMMMMMXSSS....',
      '....SSSXMMMMMXSSS....',
      '.....SSSXXXXXSSS.....',
      '......SXXXXXXXS......',
      '........XXXXX........',
  ],
];
/** The face map's width plus its outline: one sprite pixel is the sprite box divided by this. */
const FACE_GRID = FACE_FRAMES[0][0].length + 2;

const GHOST = [
  '.....XXXX.....',
  '...XXXXXXXX...',
  '..XXXXXXXXXX..',
  '.XXWWXXXXWWXX.',
  '.XWWWWXXWWWWX.',
  '.XWWPPXXWWPPX.',
  'XXWWPPXXWWPPXX',
  'XXXWWXXXXWWXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XX.XXX..XXX.XX',
  'X...XX..XX...X',
];

const CHERRY = [
  '.........SS.',
  '........S.S.',
  '.......S..S.',
  '......S...S.',
  '.....S...S..',
  '..RRR...S...',
  '.RRRRRSRRR..',
  '.RWRRRRRRRR.',
  '.RRRRRRWRRRR',
  '.RRRRRRRRRRR',
  '..RRR.RRRRR.',
  '.......RRR..',
];

/** Draws a pixel map as crisp SVG squares, with a one-pixel ink outline round the shape. */
function Sprite({ map, cls, outline = true }: { map: string[]; cls?: Record<string, string>; outline?: boolean }) {
  const h = map.length;
  const w = map[0].length;
  const filled = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && map[y][x] !== '.';
  const rects: React.ReactNode[] = [];
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (filled(x, y)) {
        const c = map[y][x];
        rects.push(<rect key={`${x},${y}`} x={x + 1} y={y + 1} width={1.02} height={1.02} className={cls?.[c] ?? 'px-c'} />);
      } else if (outline && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) {
        rects.push(<rect key={`o${x},${y}`} x={x + 1} y={y + 1} width={1.02} height={1.02} className="px-o" />);
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${w + 2} ${h + 2}`} shapeRendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  );
}

// ---------- The player: the user's face, exactly as drawn (public/contact/face.svg, a copy of
// logo/svg/vardhan-portrait-transparent.svg) ----------

/**
 * Which player runs the lane: 'pacman' (the classic yellow Pac-Man, what the user wants), 'face' (their exact portrait
 * with a puppet jaw and motion design) or 'pixel' (their face hand-drawn in pixels). The face versions were tried on
 * Nov 14, 2026 and switched off at the user's request.
 */
const PLAYER = 'pacman' as 'pacman' | 'face' | 'pixel';

const FACE_SRC = '/contact/face.svg';
const FACE_SIZE = 2875.1; // the portrait's own units
const FACE_BOX = { x: 525, y: 309, w: 1827, h: 2259 }; // where the ink is
const MOUTH_Y = 2040; // the line between the lips: everything below it is the jaw
const MOUTH_X0 = 1130; // the corners of the mouth
const MOUTH_X1 = 1690;
const JAW_MAX = 120; // how far the jaw drops at its widest, in the portrait's units
const STRIP = 6; // the slice above the cut that's stretched over the gap

/**
 * The exact portrait cut along the lips, so the lower part (lips, goatee, chin) can drop and snap shut like a
 * puppet's jaw. The gap is filled by stretching a thin slice of the face just above the cut (data-gap), so the
 * outline and the skin carry on unbroken, with a dark mouth between the corners of the lips over it. The jaw and the
 * slice are moved by setting their transforms.
 */
function FacePlayer({ uid }: { uid: string }) {
  const img = <image href={FACE_SRC} x={0} y={0} width={FACE_SIZE} height={FACE_SIZE} />;
  return (
    <svg
      className="px-face-svg"
      viewBox={`${FACE_BOX.x} ${FACE_BOX.y} ${FACE_BOX.w} ${FACE_BOX.h + JAW_MAX}`}
      overflow="visible"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${uid}-top`}>
          <rect x={0} y={0} width={FACE_SIZE} height={MOUTH_Y} />
        </clipPath>
        <clipPath id={`${uid}-jaw`}>
          <rect x={0} y={MOUTH_Y} width={FACE_SIZE} height={FACE_SIZE - MOUTH_Y} />
        </clipPath>
        <clipPath id={`${uid}-strip`}>
          <rect x={0} y={MOUTH_Y - STRIP} width={FACE_SIZE} height={STRIP} />
        </clipPath>
      </defs>
      {/* Behind the cut: a slice of the face stretched down over the gap, and the inside of the mouth. */}
      <g data-gap="">
        <g clipPath={`url(#${uid}-strip)`}>{img}</g>
      </g>
      <rect className="px-face-mouth" x={MOUTH_X0} y={MOUTH_Y - 20} width={MOUTH_X1 - MOUTH_X0} height={JAW_MAX + 60} rx={70} />
      <g clipPath={`url(#${uid}-top)`}>{img}</g>
      <g data-jaw="">
        <g clipPath={`url(#${uid}-jaw)`}>{img}</g>
      </g>
    </svg>
  );
}

export const PixelContact: React.FC<{ contact: ContactInfo }> = ({ contact }) => {
  const stage = useRef<HTMLDivElement>(null);
  const lane = useRef<HTMLDivElement>(null);
  const pac = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const cherry = useRef<HTMLDivElement>(null);
  const pellets = useRef<HTMLDivElement>(null);
  const flip = useRef<() => void>(() => {});
  const uid = useId().replace(/:/g, '');

  const pacSprites = useMemo(
    () =>
      PLAYER === 'pacman'
        ? PAC_FRAMES.map((f, i) => <Sprite key={i} map={f} cls={{ X: 'px-pac' }} />)
        : FACE_FRAMES.map((f, i) => <Sprite key={i} map={f} cls={{ X: 'px-hair', S: 'px-pac', W: 'px-white', M: 'px-mouth' }} />),
    []
  );
  const ghostSprite = useMemo(() => <Sprite map={GHOST} cls={{ X: 'px-ghost', W: 'px-white', P: 'px-pupil' }} />, []);
  const cherrySprite = useMemo(() => <Sprite map={CHERRY} cls={{ R: 'px-red', W: 'px-white', S: 'px-stem' }} />, []);

  useEffect(() => {
    const root = stage.current;
    const road = lane.current;
    const p = pac.current;
    const b = body.current;
    const g = ghost.current;
    const ch = cherry.current;
    const pl = pellets.current;
    if (!root || !road || !p || !b || !g || !ch || !pl) return;
    const jaw = p.querySelector<SVGGElement>('[data-jaw]');
    const gap = p.querySelector<SVGGElement>('[data-gap]');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0; // lane width
    let size = 60; // the player's width
    let unit = 4; // one sprite pixel (pixel players step in whole pixels)
    let dots: { x: number; el: HTMLSpanElement; back: number }[] = [];
    let pacX = 0;
    let vel = 0; // px/s
    let target = 0;
    let dir = 1;
    let ghostX = 0;
    let ghostVel = 0;
    let ghostDir = 1;
    let scared = 0;
    let cherryX = 0;
    let cherryBack = 0;
    let visible = false;
    let raf = 0;
    let last = 0;
    let lastPointer = 0;
    let lapStart = 0;
    let lapHome = 0;
    // motion design state
    let facing = 1; // eases through 0 when he turns round, like a card flipping
    let chomp = 0; // chomp phase (radians)
    let jawOpen = 0; // 0–1
    let gulp = 0; // a little swell each time he eats, decaying
    let lean = 0; // degrees, into the run
    let stretch = 0; // squash and stretch with speed

    const clampX = (v: number) => Math.max(0, Math.min(W - size, v));

    /** Critically damped follow (no overshoot): eases into and out of every move. */
    const follow = (x: number, v: number, to: number, smooth: number, maxSpeed: number, dt: number) => {
      const omega = 2 / smooth;
      const k = omega * dt;
      const exp = 1 / (1 + k + 0.48 * k * k + 0.235 * k * k * k);
      let change = x - to;
      const maxChange = maxSpeed * smooth;
      change = Math.max(-maxChange, Math.min(maxChange, change));
      const goal = x - change;
      const temp = (v + omega * change) * dt;
      let nv = (v - omega * temp) * exp;
      let nx = goal + (change + temp) * exp;
      if (to - x > 0 === nx > to) {
        nx = to;
        nv = 0;
      }
      return [nx, nv] as const;
    };

    /** Lays the pellets out again for the lane's width. */
    const build = () => {
      W = road.clientWidth;
      size = p.offsetWidth || 60;
      unit = size / (PLAYER === 'pacman' ? 15 : FACE_GRID);
      const gap = size * 1.05;
      const n = Math.max(4, Math.floor((W - size) / gap));
      const step = (W - size) / n;
      pl.replaceChildren();
      dots = [];
      for (let i = 0; i <= n; i++) {
        const el = document.createElement('span');
        el.className = 'px-dot';
        const x = i * step + size / 2;
        el.style.left = `${x}px`;
        pl.appendChild(el);
        dots.push({ x, el, back: 0 });
      }
      cherryX = clampX(W * 0.82 - size / 2);
      pacX = clampX(Math.min(pacX || W * 0.12, W - size));
      target = pacX;
      ghostX = clampX(pacX - size * 1.8);
      draw(performance.now());
    };

    const snap = (v: number) => Math.round(v / unit) * unit;
    const draw = (now: number) => {
      const moving = Math.abs(vel) > size * 0.3;
      if (PLAYER !== 'face') {
        // Pixel players: whole sprite pixels, turned by flipping, the mouth chomping by CSS frames while he runs.
        p.style.transform = `translateX(${snap(pacX)}px)`;
        b.style.transform = `scaleX(${dir})`;
        p.classList.toggle('is-moving', moving);
        g.style.transform = `translateX(${snap(ghostX)}px) scaleX(${ghostDir})`;
        ch.style.transform = `translateX(${snap(cherryX)}px)`;
        return;
      }
      p.style.transform = `translateX(${pacX.toFixed(1)}px)`;
      const t = now / 1000;
      // A run bobs in step with the chomp; at rest he floats gently.
      const bob = reduced ? 0 : moving ? -Math.abs(Math.sin(chomp)) * size * 0.07 : Math.sin(t * 2.2) * size * 0.025;
      const sx = facing * (1 + stretch + gulp * 0.08);
      const sy = 1 - stretch * 0.6 + gulp * 0.08;
      b.style.transform = `translateY(${bob.toFixed(2)}px) rotate(${lean.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      if (jaw && gap) {
        const d = jawOpen * JAW_MAX;
        // the jaw drops straight down; the slice above the cut stretches exactly over the gap
        jaw.setAttribute('transform', `translate(0 ${d.toFixed(1)})`);
        const top = MOUTH_Y - STRIP;
        gap.setAttribute('transform', `translate(0 ${top}) scale(1 ${((STRIP + d) / STRIP).toFixed(3)}) translate(0 ${-top})`);
      }
      g.style.transform = `translateX(${ghostX.toFixed(1)}px) scaleX(${ghostDir})`;
      ch.style.transform = `translateX(${cherryX.toFixed(1)}px)`;
    };

    const eat = (now: number) => {
      const mouth = pacX + size / 2;
      for (const d of dots) {
        if (!d.back && Math.abs(d.x - mouth) < size * 0.18) {
          d.el.classList.add('is-eaten');
          d.back = now + 4500;
          gulp = Math.max(gulp, 0.6);
        } else if (d.back && now > d.back && Math.abs(d.x - mouth) > size) {
          d.el.classList.remove('is-eaten');
          d.back = 0;
        }
      }
      if (!cherryBack && Math.abs(cherryX + size / 2 - mouth) < size * 0.25) {
        ch.classList.add('is-eaten');
        cherryBack = now + 7000;
        scared = now + 4200;
        g.classList.add('is-scared');
        gulp = 1;
      }
      if (cherryBack && now > cherryBack) {
        // Back somewhere else on the lane, away from him.
        cherryX = clampX(mouth < W / 2 ? W * (0.65 + Math.random() * 0.25) : W * (0.08 + Math.random() * 0.25));
        ch.classList.remove('is-eaten');
        cherryBack = 0;
      }
      if (scared && now > scared) {
        scared = 0;
        g.classList.remove('is-scared');
      }
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;

      // On his own: one lap there and back if nobody has pointed for a while, then rest.
      if (!reduced && !lapStart && now - lastPointer > 6000) {
        lapStart = now;
        lapHome = pacX;
        target = pacX < W / 2 ? W - size : 0;
      } else if (lapStart && Math.abs(pacX - target) < 1) {
        if (target !== lapHome) {
          target = lapHome; // reached the far end: head back
        } else {
          lapStart = 0; // home again: rest until the next quiet spell
          lastPointer = now;
        }
      }

      const maxSpeed = size * 4.2; // px/s
      if (dt > 0) {
        const prev = vel;
        [pacX, vel] = follow(pacX, vel, target, 0.22, maxSpeed, dt);
        if (Math.abs(target - pacX) > 1) dir = target > pacX ? 1 : -1;
        const speed = Math.min(1, Math.abs(vel) / maxSpeed);
        const accel = (vel - prev) / dt;
        // lean into the run, and a touch extra when speeding up or braking
        const wantLean = reduced ? 0 : Math.max(-14, Math.min(14, (vel / maxSpeed) * 9 + (accel / (maxSpeed * 6)) * 6));
        lean += (wantLean - lean) * (1 - Math.exp(-dt * 12));
        const wantStretch = reduced ? 0 : speed * 0.1;
        stretch += (wantStretch - stretch) * (1 - Math.exp(-dt * 10));
        facing += (dir - facing) * (1 - Math.exp(-dt * (reduced ? 60 : 16)));
        // chomp about four times a second while running; close the mouth when he stops
        if (!reduced && speed > 0.08) {
          chomp += dt * Math.PI * 2 * 4;
          const wantOpen = Math.max(0, Math.sin(chomp)) * (1 - gulp);
          jawOpen += (wantOpen - jawOpen) * (1 - Math.exp(-dt * 30));
        } else {
          jawOpen += (0 - jawOpen) * (1 - Math.exp(-dt * 14));
        }
        gulp *= Math.exp(-dt * 7);
      }

      // The ghost: keeps a little way behind him, or runs away while scared.
      const want = scared ? (pacX < W / 2 ? W - size : 0) : clampX(pacX - dir * size * 1.8);
      if (dt > 0) {
        const gx = ghostX;
        [ghostX, ghostVel] = follow(ghostX, ghostVel, want, scared ? 0.3 : 0.38, maxSpeed * (scared ? 0.9 : 0.78), dt);
        if (Math.abs(ghostX - gx) > 0.05) ghostDir = ghostX > gx ? 1 : -1;
      }

      eat(now);
      draw(now);
      // Keep going while the section is on screen (it's one transform a frame).
      if (visible) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const wake = () => {
      if (visible && !raf) raf = requestAnimationFrame(tick);
    };

    const point = (clientX: number) => {
      const r = road.getBoundingClientRect();
      lastPointer = performance.now();
      lapStart = 0;
      target = clampX(clientX - r.left - size / 2);
      if (reduced) {
        dir = target >= pacX ? 1 : -1;
        pacX = target;
        vel = 0;
        eat(performance.now());
        draw(performance.now());
        return;
      }
      wake();
    };
    const onMove = (e: PointerEvent) => point(e.clientX);
    flip.current = () => {
      dir = -dir;
      target = clampX(pacX + dir * size * 3);
      lastPointer = performance.now();
      gulp = Math.max(gulp, 0.5);
      wake();
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        lastPointer = performance.now() - 4000;
        wake();
      }
    });
    io.observe(root);
    const ro = new ResizeObserver(build);
    ro.observe(road);
    build();
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerdown', onMove);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerdown', onMove);
    };
  }, []);

  const links = [
    { href: `mailto:${contact.email}`, label: contact.email, short: 'Email', Icon: MailIcon, external: false },
    { href: contact.linkedin, label: 'LinkedIn', short: 'LinkedIn', Icon: LinkedinIcon, external: true },
    ...(contact.customLink && contact.customLink !== '#'
      ? [{ href: contact.customLink, label: 'GitHub', short: 'GitHub', Icon: CustomIcon, external: true }]
      : []),
  ];

  return (
    <div ref={stage} className="px-stage">
      <h1 className="px-title">Contact me</h1>

      <div ref={lane} className="px-lane" aria-hidden="true">
        <div ref={pellets} className="px-dots" />
        <div ref={cherry} className="px-sprite px-cherry">
          {cherrySprite}
        </div>
        <div ref={ghost} className="px-sprite px-ghost-wrap">
          {ghostSprite}
        </div>
        <div
          ref={pac}
          className={`px-sprite px-pacman${PLAYER === 'face' ? ' px-face' : PLAYER === 'pixel' ? ' px-pixface' : ''}`}
          onClick={() => flip.current()}
        >
          <div ref={body} className="px-body">
            {PLAYER === 'face' ? <FacePlayer uid={uid} /> : pacSprites}
          </div>
        </div>
      </div>

      <ul className="px-links">
        {links.map(({ href, label, short, Icon, external }) => (
          <li key={short}>
            <a
              className="px-btn"
              href={href}
              aria-label={short === 'Email' ? `Email ${contact.email}` : short}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <Icon className="px-btn-icon" />
              <span>{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
