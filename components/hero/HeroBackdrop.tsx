import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { liveStages, NAME_PERSPECTIVE, NAME_PERSPECTIVE_ORIGIN_Y, NAME_TILT_DEG, type NameStage } from './nameStage';

// Backdrops for the separate /hero page. Each one fills the hero screen behind the name and stickers.
// water: still water the letters stand in, rippling as you move. night: a soft lavender glow with a warm spot.
// aurora: slow drifting bands of colour. grid: a glowing horizon with a perspective floor grid.
// sunset: a big sun sinking behind the name.

export type BackdropKind = 'water' | 'night' | 'aurora' | 'grid' | 'sunset';
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const layer = 'pointer-events-none absolute inset-0';

function Grain() {
  return <div aria-hidden="true" className={`${layer} opacity-[0.07] mix-blend-overlay`} style={{ backgroundImage: GRAIN }} />;
}

function Night() {
  return (
    <>
      <div
        aria-hidden="true"
        className={layer}
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 42%, rgba(122,90,248,0.22), transparent 70%), radial-gradient(ellipse 35% 30% at 80% 16%, rgba(240,160,75,0.12), transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className={`${layer} hidden dark:block`}
        style={{ background: 'radial-gradient(ellipse 120% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)' }}
      />
    </>
  );
}

/** Three big blurred blobs drifting slowly, blended so they glow like northern lights. */
function Aurora() {
  const blob = (color: string, size: string, pos: React.CSSProperties, dx: number[], dy: number[], dur: number) => (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute rounded-full mix-blend-screen blur-[90px]"
      style={{ width: size, height: size, background: color, ...pos }}
      animate={{ x: dx, y: dy }}
      transition={{ duration: dur, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
    />
  );
  return (
    <>
      <div aria-hidden="true" className={layer} style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(20,10,60,0.9), transparent 70%)' }} />
      {blob('rgba(122,90,248,0.55)', '55vw', { left: '-8vw', top: '-10vh' }, [0, 90, -30], [0, 60, 20], 14)}
      {blob('rgba(45,212,191,0.38)', '48vw', { right: '-6vw', top: '14vh' }, [0, -80, 20], [0, -40, 50], 17)}
      {blob('rgba(236,72,153,0.38)', '42vw', { left: '28vw', bottom: '-18vh' }, [0, 70, -50], [0, -50, 10], 19)}
    </>
  );
}

/** A glowing horizon and a floor of grid lines running toward it. */
function Grid() {
  return (
    <>
      <div
        aria-hidden="true"
        className={layer}
        style={{
          background:
            'radial-gradient(ellipse 70% 38% at 50% 62%, rgba(122,90,248,0.5), transparent 70%), linear-gradient(to bottom, transparent 55%, rgba(122,90,248,0.14) 100%)',
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] overflow-hidden [perspective:420px]">
        <div
          className="absolute -inset-x-[60%] bottom-0 h-[220%] origin-bottom"
          style={{
            transform: 'rotateX(62deg)',
            backgroundImage:
              'linear-gradient(rgba(190,170,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(190,170,255,0.55) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(to top, black 15%, transparent 85%)',
            WebkitMaskImage: 'linear-gradient(to top, black 15%, transparent 85%)',
          }}
        />
      </div>
      <div aria-hidden="true" className={layer} style={{ background: 'linear-gradient(to bottom, rgba(7,4,15,0.7), transparent 35%)' }} />
    </>
  );
}

/** A huge sun half-sunk at the bottom, with warm light spilling up into an indigo sky. */
function Sunset() {
  return (
    <>
      <div
        aria-hidden="true"
        className={layer}
        style={{ background: 'linear-gradient(to bottom, rgba(24,10,70,0.9) 0%, rgba(88,40,150,0.55) 55%, rgba(236,110,80,0.5) 100%)' }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 aspect-square w-[70vmax] -translate-x-1/2 rounded-full"
        style={{
          bottom: '-48vmax',
          background: 'radial-gradient(circle at 50% 30%, #ffd08a 0%, #ff9a5a 38%, #ee5a7a 62%, rgba(238,90,122,0) 72%)',
          boxShadow: '0 0 160px 40px rgba(255,150,90,0.35)',
        }}
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div aria-hidden="true" className={layer} style={{ background: 'radial-gradient(ellipse 120% 90% at 50% 40%, transparent 55%, rgba(7,4,15,0.6) 100%)' }} />
    </>
  );
}

/**
 * Clear, shallow water over sand, under the name. It's drawn by a small WebGL shader on the same tilted floor
 * the letters stand on (see nameStage.ts), so the letters look like they're standing in it, and the water
 * recedes into the distance in the same perspective. You see the sand through it, bent by the gentle waves, with
 * sunlight caustics (the bright wobbly lines) dancing across it; further away the surface reflects more of the
 * bright sky. The water laps in soft rings around each letter. Move the cursor (or a finger)
 * over it and it ripples; click or tap for a bigger ripple. It pauses off screen and holds still for reduced
 * motion. Drawn behind the name, so the letters stay in front.
 */
const WATER_VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const WATER_FRAG = `
precision highp float;
uniform vec2 uRes;      // canvas size, device px
uniform float uDpr;
uniform vec2 uOrigin;   // the name's top-left, css px from the canvas's top-left
uniform float uW;
uniform float uH;
uniform float uTilt;
uniform float uD;       // perspective distance, css px
uniform float uOy;      // perspective origin y, css px
uniform float uRecede;
uniform float uTime;
uniform vec4 uRip[16];  // ripple: floor x, floor y, age (s), strength
uniform vec4 uInk[16];  // letter footprints on the floor: x0, x1, y0, y1
uniform int uInkN;
uniform sampler2D uMask; // the letter shapes, drawn on the floor (alpha)
uniform float uHasMask;
uniform float uSlab;     // how tall the letters stand out of the water right now (px)

// Is there a letter at this floor point (0..1)?
float letterAt(vec2 px) {
  vec2 uv = px / vec2(uW, uH);
  if (uHasMask < 0.5 || uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return texture2D(uMask, uv).a;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Height of the water at a floor point (in letter heights).
float height(vec2 p) {
  float t = uTime;
  float h = noise(p * 1.3 + vec2(t * 0.10, t * 0.05)) * 0.5;
  h += noise(p * 2.9 - vec2(t * 0.17, -t * 0.08)) * 0.25;
  h += noise(p * 6.5 + vec2(t * 0.30, t * 0.22)) * 0.1;
  for (int i = 0; i < 16; i++) {
    vec4 r = uRip[i];
    if (r.w <= 0.0) continue;
    float d = length(p - r.xy / uH);
    float front = r.z * 1.4;
    float env = exp(-pow((d - front) * 3.0, 2.0)) * exp(-r.z * 1.1);
    h += 0.45 * r.w * env * sin(24.0 * (d - front));
  }
  for (int i = 0; i < 16; i++) {
    if (i >= uInkN) break;
    vec4 b = uInk[i] / uH;
    vec2 q = max(vec2(b.x - p.x, b.z - p.y), vec2(p.x - b.y, p.y - b.w));
    float d = length(max(q, 0.0));
    h += 0.05 * sin(d * 34.0 - t * 2.6) * exp(-d * 7.0);
  }
  return h;
}

// Sunlight focused by the waves into bright, wobbly lines on the sand (a tileable caustic pattern).
float caustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 5; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 5.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

// Fine beach sand: soft patches of light and dark, with grains and the odd small pebble.
vec3 sand(vec2 p, vec2 px) {
  vec3 base = vec3(0.60, 0.51, 0.36);
  float patches = noise(p * 2.2) * 0.6 + noise(p * 5.0) * 0.4;
  float grain = hash(floor(px * 1.4));
  float pebble = smoothstep(0.82, 0.9, noise(p * 26.0));
  vec3 col = base * (0.78 + 0.32 * patches) * (0.9 + 0.18 * grain);
  col = mix(col, vec3(0.78, 0.74, 0.66), pebble * 0.5);
  return col;
}

void main() {
  // This pixel, in css px from the name's top-left.
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec2 s = frag - uOrigin;
  float st = sin(uTilt);
  float ct = cos(uTilt);
  float den = (s.y - uOy) * st + uD * ct;
  if (den <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float u = uD * (s.y - uH) / den;
  float k = uD / (uD - st * u);
  if (k <= 0.0) { gl_FragColor = vec4(0.0); return; }
  vec2 floorPx = vec2(uW * 0.5 + (s.x - uW * 0.5) / k, uH + u + uRecede);
  vec2 p = floorPx / uH;

  // Surface normal from the waves.
  float e = 0.02;
  float h0 = height(p);
  float hx = height(p + vec2(e, 0.0)) - h0;
  float hy = height(p + vec2(0.0, e)) - h0;
  vec3 n = normalize(vec3(-hx / e * 0.35, -hy / e * 0.35, 1.0));

  // Clear, shallow water at night: the sand shows through, dim and blue in the moonlight, bent by the waves.
  vec2 bent = p + n.xy * 0.05;
  vec3 col = sand(bent, floorPx + n.xy * 3.0) * vec3(0.17, 0.18, 0.28);
  // Faint moonlight caustics on the sand.
  float t = uTime * 0.45;
  float cs = caustic(bent * 0.32, t);
  col += vec3(0.55, 0.62, 1.0) * cs * 0.16;
  col = mix(col, vec3(0.02, 0.03, 0.08), 0.25);

  // Looking across it (further away) it reflects more of the lavender night sky and you see less sand.
  float far = 1.0 - clamp(k, 0.0, 1.3) / 1.3;
  float fres = mix(0.12, 0.95, pow(far, 0.9));
  float g = clamp(0.35 + n.y * 2.6 + far * 0.6, 0.0, 1.0);
  vec3 sky = mix(vec3(0.05, 0.04, 0.12), vec3(0.44, 0.35, 0.8), g);
  col = mix(col, sky, fres * 0.85);

  // A path of moonlight down the middle, broken up by the waves, and glints on the wave tops.
  float sx = frag.x / (uRes.x / uDpr) - 0.5;
  float path = pow(clamp(1.0 - abs(sx * 4.5 + n.x * 3.2), 0.0, 1.0), 3.0);
  float glint = pow(clamp(n.y * 2.2 + 0.55, 0.0, 1.0), 7.0);
  col += vec3(0.95, 0.9, 1.0) * path * (0.1 + 1.3 * glint) * (0.25 + far) * 0.55;
  col += vec3(0.85, 0.8, 1.0) * smoothstep(0.88, 0.97, noise(p * 9.0 + uTime * 0.6)) * 0.15 * fres;

  // The letters in the water. Their fronts are mirrored just in front of them, wobbling with the waves and
  // fading with depth; and the light from them spills softly onto the water around them.
  vec2 wob = n.xy * uH * 0.07;
  float refl = 0.0;
  for (int j = 1; j <= 8; j++) {
    float f = float(j) / 8.0;
    refl = max(refl, letterAt(floorPx + wob - vec2(0.0, f * uSlab * 1.7)) * (1.0 - f * 0.75));
  }
  float spill = 0.0;
  for (int j = 0; j < 8; j++) {
    float ang = float(j) * 0.7854;
    spill += letterAt(floorPx + vec2(cos(ang), sin(ang)) * uH * 0.2 + wob * 0.5);
  }
  spill /= 8.0;
  float onLetter = letterAt(floorPx);
  col += vec3(0.8, 0.7, 1.0) * refl * (0.4 + 0.45 * fres) * (1.0 - onLetter);
  col += vec3(0.5, 0.4, 0.95) * spill * 0.3;

  // Fade out toward the horizon, into the night.
  float a = smoothstep(0.05, 0.3, k);
  gl_FragColor = vec4(col * a, a);
}
`;

function Water() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    // A fresh canvas each time, so a context given back on cleanup is never reused.
    const canvas = document.createElement('canvas');
    canvas.className = 'h-full w-full';
    host.appendChild(canvas);
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
    if (!gl) {
      canvas.remove();
      return;
    }
    const still = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const shader = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, WATER_VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, WATER_FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.remove();
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const U = (name: string) => gl.getUniformLocation(prog, name);
    const loc = {
      res: U('uRes'), dpr: U('uDpr'), origin: U('uOrigin'), w: U('uW'), h: U('uH'), tilt: U('uTilt'), d: U('uD'),
      oy: U('uOy'), recede: U('uRecede'), time: U('uTime'), rip: U('uRip'), ink: U('uInk'), inkN: U('uInkN'),
      mask: U('uMask'), hasMask: U('uHasMask'), slab: U('uSlab'),
    };

    // The letter shapes, drawn flat as they lie on the floor, for the reflections. Redrawn when the name changes.
    const maskCanvas = document.createElement('canvas');
    const maskTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(loc.mask, 0);
    let maskKey = '';
    const updateMask = (st: NameStage) => {
      if (!st.text || !st.fontPx || st.boxes.length === 0) return false;
      const key = `${st.text}|${st.fontPx}|${st.W}|${st.H}|${st.boxes.map((b) => `${b.x},${b.w}`).join(';')}`;
      if (key === maskKey) return true;
      maskKey = key;
      maskCanvas.width = Math.max(1, Math.ceil(st.W));
      maskCanvas.height = Math.max(1, Math.ceil(st.H));
      const g = maskCanvas.getContext('2d')!;
      g.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      g.font = `${st.fontPx}px Anton`;
      g.textBaseline = 'alphabetic';
      g.fillStyle = '#fff';
      [...st.text].forEach((ch, i) => {
        const box = st.boxes[i];
        if (!box || ch === ' ') return;
        // Same baseline as the 3D letters: the font's content box centred in the line box.
        const m = g.measureText(ch);
        const ascent = m.fontBoundingBoxAscent ?? st.fontPx * 0.9;
        const descent = m.fontBoundingBoxDescent ?? st.fontPx * 0.25;
        g.fillText(ch, box.x, (st.H - (ascent + descent)) / 2 + ascent);
      });
      gl.bindTexture(gl.TEXTURE_2D, maskTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
      return true;
    };
    // Each letter's rise and press last frame, to splash when it comes up out of the water or is pressed.
    const lastRise: number[] = [];
    const lastPress: number[] = [];

    let dpr = 1;
    const resize = () => {
      const r = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, r.width < 768 ? 1 : 1.25);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // Ripples you make: where on the floor, when, and how strong.
    const ripples: { x: number; y: number; born: number; strength: number }[] = [];
    const stage = () => [...liveStages].find((st) => st.el && st.H > 0) ?? null;
    const addRipple = (clientX: number, clientY: number, strength: number) => {
      const st = stage();
      const p = st?.fromClient(clientX, clientY, 0);
      if (!p) return;
      pushRipple(p.x, p.y, strength);
    };
    function pushRipple(x: number, y: number, strength: number) {
      ripples.push({ x, y, born: performance.now(), strength });
      if (ripples.length > 16) ripples.shift();
    }
    let lastRipple = 0;
    let lx = 0;
    let ly = 0;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRipple < 90 || Math.hypot(e.clientX - lx, e.clientY - ly) < 8) return;
      lastRipple = now;
      lx = e.clientX;
      ly = e.clientY;
      addRipple(e.clientX, e.clientY, 0.55);
    };
    const onDown = (e: PointerEvent) => addRipple(e.clientX, e.clientY, 1.4);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });

    const ripArr = new Float32Array(64);
    const inkArr = new Float32Array(64);
    const start = performance.now();
    const draw = (now: number) => {
      const st = stage();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!st || !st.el) return;
      const c = host.getBoundingClientRect();
      const r = st.el.getBoundingClientRect();
      gl.uniform2f(loc.res, canvas.width, canvas.height);
      gl.uniform1f(loc.dpr, dpr);
      gl.uniform2f(loc.origin, r.left - c.left, r.top - c.top);
      gl.uniform1f(loc.w, st.W);
      gl.uniform1f(loc.h, st.H);
      gl.uniform1f(loc.tilt, (NAME_TILT_DEG * Math.PI) / 180);
      gl.uniform1f(loc.d, NAME_PERSPECTIVE * st.H);
      gl.uniform1f(loc.oy, NAME_PERSPECTIVE_ORIGIN_Y * st.H);
      gl.uniform1f(loc.recede, st.recede);
      gl.uniform1f(loc.time, (now - start) / 1000);
      ripArr.fill(0);
      ripples.forEach((rp, i) => {
        const age = (now - rp.born) / 1000;
        if (age > 4) return;
        ripArr.set([rp.x, rp.y, age, rp.strength], i * 4);
      });
      gl.uniform4fv(loc.rip, ripArr);
      inkArr.fill(0);
      const ink = st.ink.filter(Boolean).slice(0, 16);
      ink.forEach((b, i) => inkArr.set([b.x0, b.x1, b.y0, b.y1], i * 4));
      gl.uniform4fv(loc.ink, inkArr);
      gl.uniform1i(loc.inkN, ink.length);

      // A letter coming up out of the water, or pressed down into it, sends out a ring of ripples.
      let riseSum = 0;
      st.letters.forEach((m, i) => {
        const rise = m.rise.get();
        const press = m.press.get() + m.push.get();
        riseSum += Math.max(0, Math.min(1, rise));
        const b = st.ink[i];
        if (b) {
          const cx = (b.x0 + b.x1) / 2;
          const cy = (b.y0 + b.y1) / 2;
          if ((lastRise[i] ?? 0) < 0.05 && rise >= 0.05) pushRipple(cx, cy, 1.3);
          if ((lastPress[i] ?? 0) < 0.4 && press >= 0.4) pushRipple(cx, cy, 0.9);
        }
        lastRise[i] = rise;
        lastPress[i] = press;
      });
      const hasMask = updateMask(st);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, maskTex);
      gl.uniform1f(loc.hasMask, hasMask ? 1 : 0);
      gl.uniform1f(loc.slab, st.slab * (st.letters.length ? riseSum / st.letters.length : 1));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let raf = 0;
    const loop = (now: number) => {
      draw(now);
      if (!still) raf = requestAnimationFrame(loop);
    };
    // Only run while it's on screen. (The name measures itself after mounting, so start on the next frame.)
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e.isIntersecting) raf = requestAnimationFrame(loop);
    });
    io.observe(host);

    return () => {
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    };
  }, []);

  return (
    <>
      {/* A night sky above the water, with a soft glow where the moon is. */}
      <div
        aria-hidden="true"
        className={layer}
        style={{
          background:
            'radial-gradient(ellipse 30% 22% at 50% 8%, rgba(220,210,255,0.22), transparent 70%), linear-gradient(to bottom, #07051a, #150f36 55%, #1d1546)',
        }}
      />
      <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0" />
    </>
  );
}

export default function HeroBackdrop({ kind }: { kind: BackdropKind }) {
  return (
    <>
      {kind === 'water' && <Water />}
      {kind === 'night' && <Night />}
      {kind === 'aurora' && <Aurora />}
      {kind === 'grid' && <Grid />}
      {kind === 'sunset' && <Sunset />}
      <Grain />
    </>
  );
}
