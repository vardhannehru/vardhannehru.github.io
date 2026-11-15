import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { nearestTV, onRemotePress, remoteButtonAt, setRemoteActive, type RemoteButton } from './remote';
import { tvClick } from './tvSounds';
import { whenIdle } from '../ui/siteReady';

// Over the Work section (anything marked `data-remote-zone`) the cursor turns into a 3D TV remote (three.js).
// Its infrared tip is the hotspot. Near a TV it points at it, as if held by someone in front of the set; away
// from the TVs it's held upright like a normal pointer. It leans a little as it moves.
// Matte graphite with a glossy top panel, a red power button, a D-pad with a metal OK button, volume and channel
// rockers, colour keys and a number pad. A click presses the button that does the job: power when the TV under it
// is off (or its power button is clicked), the channel rocker when it's on, the volume rocker over the volume knob,
// and OK anywhere else. The button stays down while the mouse button is held, the remote's red light shows while
// it sends, and its infrared window gives a faint flicker.
// Mouse and trackpad only; phones keep their normal touch.

/** The cursor's size on the page (CSS px). The remote's tip sits at its centre. */
const SIZE = 240;
// The remote, in scene units: length, width, thickness. The tip is at y = 0, the body runs down to y = -L.
const L = 3.4;
const W = 0.9;
const T = 0.3;
/** How far the tip leans into the screen, and how far the remote rolls onto its side. */
const PITCH = -0.78;
const ROLL = 0.32;
/** Within this distance of a TV (px), the remote turns to point at it. */
const NEAR = 170;
/** At rest, away from the TVs: tipped up and a little to the left, like a pointer. */
const REST_DIR = { x: -0.34, y: -0.94 };
// Off duty, it leans on the "Work." heading (the `data-remote-rest` marker is where its tip touches): tip up and
// to the left against the word, its body slanting down to the right, turned a little more face-on.
const LEAN_DIR = { x: -0.6, y: -0.8 };
const LEAN_PITCH = -0.42;
/** How fast it flies between the heading and the pointer, and how high it arcs on the way (px). */
const FLY_RATE = 4.5;
const FLY_ARC = 70;

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  return new THREE.CanvasTexture(c);
}

type Key = { mesh: THREE.Mesh; z: number; travel: number; tilt: number };

function build(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 13);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight(0xfff4ea, 2.2);
  key.position.set(-3, 5, 6);
  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.5);
  fill.position.set(4, -2, 5);
  const rim = new THREE.DirectionalLight(0xc8b6ff, 1.2);
  rim.position.set(2, 3, -5);
  scene.add(key, fill, rim);

  const textures: THREE.Texture[] = [];
  const track = <X extends THREE.Texture>(t: X) => (textures.push(t), t);

  // A fine grain for the plastic.
  const grain = track(
    canvasTexture(128, 128, (g, w, h) => {
      const img = g.createImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 118 + Math.random() * 30;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    })
  );
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(3, 8);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: '#1c1e22',
    roughness: 0.5,
    roughnessMap: grain,
    bumpMap: grain,
    bumpScale: 0.3,
    clearcoat: 0.25,
    clearcoatRoughness: 0.5,
  });
  const panelMat = new THREE.MeshPhysicalMaterial({ color: '#0e0f12', roughness: 0.18, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06 });
  const rubber = (color: string) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.72, clearcoat: 0.15, clearcoatRoughness: 0.6 });
  const keyMat = rubber('#2e3036');
  const padMat = rubber('#3a3d43');
  const powerMat = new THREE.MeshPhysicalMaterial({ color: '#d8413a', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const silver = new THREE.MeshPhysicalMaterial({ color: '#c9ccd2', metalness: 0.92, roughness: 0.3, clearcoat: 0.3 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#dfe2e8', metalness: 1, roughness: 0.16 });
  const irMat = new THREE.MeshPhysicalMaterial({
    color: '#1a0508',
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    emissive: '#ff2a3a',
    emissiveIntensity: 0,
  });
  const ledMat = new THREE.MeshBasicMaterial({ color: '#4a1214', toneMapped: false });

  // aim (turns toward the TV) > pitch (tip into the screen) > roll (onto its side) > the remote
  const aim = new THREE.Group();
  const pitch = new THREE.Group();
  const roll = new THREE.Group();
  aim.add(pitch);
  pitch.add(roll);
  pitch.rotation.x = PITCH;
  roll.rotation.y = ROLL;
  scene.add(aim);

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    roll.add(m);
    return m;
  };
  const face = T / 2;

  // Body: a touch narrower at the head, with a rounded back that fits a hand.
  const HEAD = 0.18;
  const BL = L - HEAD;
  const bodyGeo = new RoundedBoxGeometry(W, BL, T, 8, 0.13);
  {
    const p = bodyGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = (p.getY(i) + BL / 2) / BL; // 0 at the bottom, 1 at the head
      const nx = p.getX(i) / (W / 2);
      p.setX(i, p.getX(i) * (1.02 - 0.06 * u));
      const z = p.getZ(i);
      if (z < 0) p.setZ(i, z - 0.06 * (1 - Math.min(1, nx * nx)));
    }
    bodyGeo.computeVertexNormals();
  }
  add(bodyGeo, bodyMat, 0, -(HEAD + BL / 2), 0);

  // The dark infrared window at the tip.
  add(new RoundedBoxGeometry(W * 0.955, 0.26, T * 0.96, 4, 0.11), irMat, 0, -0.14, 0);

  // Glossy top panel around the main keys.
  add(new RoundedBoxGeometry(W * 0.84, 1.62, 0.02, 3, 0.009), panelMat, 0, -1.15, face + 0.006);

  const keys = {} as Record<RemoteButton, Key>;

  // Power (red) and input buttons, and the red light between them.
  const power = add(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 32), powerMat, -0.24, -0.52, face + 0.035);
  power.rotation.x = Math.PI / 2;
  keys.power = { mesh: power, z: power.position.z, travel: 0.032, tilt: 0 };
  add(new RoundedBoxGeometry(0.22, 0.1, 0.05, 3, 0.03), keyMat, 0.24, -0.52, face + 0.03);
  add(new THREE.SphereGeometry(0.026, 16, 8), ledMat, 0, -0.38, face + 0.012);

  // D-pad: a rubber ring in a chrome bezel, with a metal OK button.
  const ring = add(new THREE.TorusGeometry(0.27, 0.075, 18, 56), keyMat, 0, -1.1, face + 0.035);
  ring.scale.z = 0.45;
  add(new THREE.TorusGeometry(0.37, 0.014, 12, 64), chrome, 0, -1.1, face + 0.022);
  const ok = add(new THREE.CylinderGeometry(0.14, 0.145, 0.06, 40), silver, 0, -1.1, face + 0.045);
  ok.rotation.x = Math.PI / 2;
  keys.ok = { mesh: ok, z: ok.position.z, travel: 0.03, tilt: 0 };

  // Volume (left) and channel (right) rockers: pressed at the top, they tip in. Mute and menu between them.
  const vol = add(new RoundedBoxGeometry(0.19, 0.5, 0.07, 4, 0.08), keyMat, -0.29, -1.76, face + 0.035);
  const ch = add(new RoundedBoxGeometry(0.19, 0.5, 0.07, 4, 0.08), keyMat, 0.29, -1.76, face + 0.035);
  keys.vol = { mesh: vol, z: vol.position.z, travel: 0.018, tilt: -0.2 };
  keys.ch = { mesh: ch, z: ch.position.z, travel: 0.018, tilt: -0.2 };
  for (const y of [-1.63, -1.89]) {
    const b = add(new THREE.CylinderGeometry(0.065, 0.065, 0.045, 24), padMat, 0, y, face + 0.03);
    b.rotation.x = Math.PI / 2;
  }

  // Colour keys and the number pad.
  ['#c9463f', '#3f9a55', '#d8b03e', '#4570c4'].forEach((c, i) =>
    add(new RoundedBoxGeometry(0.15, 0.065, 0.04, 2, 0.02), rubber(c), -0.3 + i * 0.2, -2.14, face + 0.025)
  );
  const padGeo = new RoundedBoxGeometry(0.2, 0.12, 0.05, 3, 0.04);
  for (const y of [-2.36, -2.56, -2.76]) for (const x of [-0.26, 0, 0.26]) add(padGeo, padMat, x, y, face + 0.028);
  add(padGeo, padMat, 0, -2.96, face + 0.028);

  // A small printed mark near the bottom.
  const logo = track(
    canvasTexture(256, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(205,208,216,0.85)';
      g.font = '600 34px Inter, Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('V N', w / 2, h / 2 + 1);
    })
  );
  logo.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.PlaneGeometry(0.4, 0.1), new THREE.MeshStandardMaterial({ map: logo, transparent: true, roughness: 0.4, metalness: 0.4 }), 0, -3.17, face + 0.002);

  const dispose = () => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    textures.forEach((t) => t.dispose());
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
  };

  return { renderer, scene, camera, aim, pitch, roll, keys, ledMat, irMat, dispose };
}

export default function RemoteCursor() {
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // With a mouse it's the cursor over the Work section. On phones and tablets it only rests on the "Work." heading
    // (like the pencil on the About portrait).
    const mouse = !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const wrap = wrapRef.current;
    if (!wrap) return;

    // The canvas is made here, so it can be swapped for a fresh one if the browser takes its WebGL context away.
    let canvas: HTMLCanvasElement;
    let r: ReturnType<typeof build> | null = null;
    let rebuilds = 0;
    let broken = false;
    const makeCanvas = () => {
      canvas = document.createElement('canvas');
      canvas.className = 'h-full w-full';
      canvas.style.filter = 'drop-shadow(0 16px 14px rgba(10,6,24,0.35))';
      canvas.addEventListener('webglcontextlost', onLost);
      wrap.appendChild(canvas);
    };
    const onLost = () => {
      r?.dispose();
      r = null;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.remove();
      if (++rebuilds > 5) {
        broken = true;
        setActive(false);
        return;
      }
      makeCanvas();
    };
    const ensureBuilt = () => {
      if (r || broken) return;
      try {
        r = build(canvas);
      } catch {
        broken = true;
      }
    };
    makeCanvas();
    // Build the remote and draw it once while the browser is idle after load, so entering the Work section doesn't
    // stall while its shaders are prepared.
    const cancelIdle = whenIdle(() => {
      ensureBuilt();
      r?.renderer.render(r.scene, r.camera);
    }, 6000);

    const pos = { x: 0, y: 0, has: false };
    const vel = { x: 0, y: 0 };
    let active = false;
    let shown = 0;
    let angle = Math.atan2(-REST_DIR.y, REST_DIR.x) - Math.PI / 2;
    let raf = 0;
    let evalQueued = false;
    // The button being pressed, whether the mouse button is still down, and when the press ends at the earliest.
    let pressed: RemoteButton | null = null;
    let held = false;
    let pressUntil = 0;
    let depth = 0;

    const setActive = (v: boolean) => {
      if (v === active) return;
      active = v;
      setRemoteActive(v);
      document.body.classList.toggle('remote-cursor-on', v);
      if (v) {
        ensureBuilt();
        startLoop();
      } else {
        held = false;
      }
    };

    // Where it rests: the marker in the Work heading, while that's on or near the screen.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const rest = { x: 0, y: 0, ok: false };
    const parked = { x: NaN, y: NaN };
    let fly = 0; // 0 resting on the heading .. 1 in the hand
    // Where the wrap's own box starts, for placing it: the screen (fixed, in the hand) or its parent (absolute, at
    // rest). Switches its position mode on the way.
    let lastFixed: boolean | null = null;
    const place = (fixed: boolean) => {
      if (fixed !== lastFixed) {
        lastFixed = fixed;
        wrap.style.position = fixed ? 'fixed' : 'absolute';
      }
      if (fixed) return { x: 0, y: 0 };
      const parent = wrap.offsetParent as HTMLElement | null;
      const pr = parent ? parent.getBoundingClientRect() : null;
      return pr ? { x: pr.left, y: pr.top } : { x: -window.scrollX, y: -window.scrollY };
    };
    const readRest = () => {
      const el = broken ? null : document.querySelector<HTMLElement>('[data-remote-rest]');
      if (!el) {
        rest.ok = false;
        return;
      }
      const b = el.getBoundingClientRect();
      rest.x = b.left;
      rest.y = b.top;
      rest.ok = b.width > 0 && b.bottom > -SIZE && b.top < window.innerHeight + SIZE && b.right > -SIZE && b.left < window.innerWidth + SIZE;
    };

    // Is the cursor over the Work section? Checked after moves and scrolls (and every so often, in case the
    // page moved under a still cursor), once per frame at most.
    const evaluate = () => {
      evalQueued = false;
      readRest();
      // (Compared in page coordinates: scrolling alone moves the heading and the resting remote together.)
      // (Written as "not close", so the first look, with nothing parked yet (NaN), counts as moved and draws it.)
      if (rest.ok && !(Math.abs(rest.x + window.scrollX - parked.x) <= 0.5 && Math.abs(rest.y + window.scrollY - parked.y) <= 0.5)) {
        ensureBuilt();
        startLoop();
      } else if (!rest.ok && shown > 0) startLoop();
      if (!pos.has) return;
      const el = document.elementFromPoint(pos.x, pos.y);
      setActive(!broken && !!el?.closest('[data-remote-zone]'));
    };
    const queueEval = () => {
      if (evalQueued) return;
      evalQueued = true;
      requestAnimationFrame(evaluate);
    };
    const evalTimer = window.setInterval(queueEval, 250);

    const press = (button: RemoteButton, minMs: number) => {
      pressed = button;
      pressUntil = performance.now() + minMs;
      startLoop();
    };
    const onMove = (e: PointerEvent) => {
      if (!mouse || e.pointerType !== 'mouse') return;
      if (pos.has) {
        vel.x += e.clientX - pos.x;
        vel.y += e.clientY - pos.y;
      }
      pos.x = e.clientX;
      pos.y = e.clientY;
      pos.has = true;
      queueEval();
    };
    const onDown = (e: PointerEvent) => {
      if (!active || !mouse || e.pointerType !== 'mouse' || e.button !== 0) return;
      held = true;
      press(remoteButtonAt(e.clientX, e.clientY), 120);
      tvClick('remote');
    };
    const onUp = () => {
      held = false;
    };
    const onLeaveWindow = () => {
      pos.has = false;
      setActive(false);
    };
    const offPress = onRemotePress((button) => {
      if (active) press(button, 170);
    });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('scroll', queueEval, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeaveWindow);

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      readRest();
      // Off the heading's screen it just fades in and out at the pointer, as before.
      if (!rest.ok) fly = active ? 1 : 0;
      else fly += ((active ? 1 : 0) - fly) * (1 - Math.exp(-dt * (reduced ? 40 : FLY_RATE)));
      if (Math.abs(fly - (active ? 1 : 0)) < 0.002) fly = active ? 1 : 0;
      const s = fly * fly * (3 - 2 * fly); // eased
      shown += ((active || rest.ok ? 1 : 0) - shown) * Math.min(1, dt * 14);
      if (!active && !rest.ok && shown < 0.01) {
        shown = 0;
        wrap.style.opacity = '0';
        parked.x = parked.y = NaN;
        raf = 0;
        return;
      }
      let px = pos.x;
      let py = pos.y;
      if (rest.ok) {
        const hx = pos.has ? pos.x : rest.x;
        const hy = pos.has ? pos.y : rest.y;
        px = rest.x + (hx - rest.x) * s;
        py = rest.y + (hy - rest.y) * s - Math.sin(Math.PI * s) * (reduced ? 0 : FLY_ARC);
      }
      wrap.style.opacity = String(shown);
      // Under the nav and pop-ups while it rests on the heading; above everything in the hand.
      wrap.style.zIndex = fly > 0.02 ? '10000' : '44';
      // Resting, it's placed in the page (position: absolute) so it scrolls with the heading by itself; fixed to the
      // screen and moved by script, it lagged a frame behind the heading on phones. In the hand it's fixed.
      const off = place(fly > 0.02);
      // The phone heading is smaller, so the remote resting on it is too.
      const restScale = window.innerWidth < 768 ? 0.6 : 1;
      const k = (0.7 + 0.3 * shown) * (restScale + (1 - restScale) * s);
      wrap.style.transform = `translate3d(${px - off.x - SIZE / 2}px, ${py - off.y - SIZE / 2}px, 0) scale(${k})`;
      if (!r && (active || rest.ok)) ensureBuilt(); // after a lost context

      if (r) {
        // Where to point. Away from the TVs: upright, like a pointer. Near one: at its screen. Over one: up and
        // away, the way it's held by someone in front of the set.
        let dx = REST_DIR.x;
        let dy = REST_DIR.y;
        const tv = nearestTV(pos.x, pos.y);
        if (tv && tv.dist < NEAR) {
          const hx = pos.x - window.innerWidth / 2;
          const hy = pos.y - (window.innerHeight + 260);
          const hl = Math.hypot(hx, hy) || 1;
          const tx = tv.cx - pos.x;
          const ty = tv.cy - pos.y;
          const tl = Math.hypot(tx, ty) || 1;
          const a = Math.min(1, tv.dist / 50); // 0 over the TV .. 1 just outside it
          const ax = (hx / hl) * (1 - a) + (tx / tl) * a;
          const ay = (hy / hl) * (1 - a) + (ty / tl) * a;
          const f = Math.max(0, Math.min(1, (tv.dist - 90) / (NEAR - 90))); // back to upright further away
          dx = ax * (1 - f) + dx * f;
          dy = ay * (1 - f) + dy * f;
        }
        // Screen y points down; the scene's points up. The remote's tip points along +y.
        const target = Math.atan2(-dy, dx) - Math.PI / 2;
        let diff = target - angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        angle += diff * (1 - Math.exp(-dt * 8));
        // Blend from the lean on the heading to the hand-held angle as it flies.
        const leanAngle = Math.atan2(-LEAN_DIR.y, LEAN_DIR.x) - Math.PI / 2;
        const toHeld = Math.atan2(Math.sin(angle - leanAngle), Math.cos(angle - leanAngle));
        r.aim.rotation.z = leanAngle + toHeld * s;

        // The pressed button goes down (rockers tip in at the top) and stays down while the mouse button is.
        const down = pressed && (held || now < pressUntil) ? 1 : 0;
        depth += (down - depth) * Math.min(1, dt * (down ? 40 : 22));
        if (!down && depth < 0.01) {
          depth = 0;
          pressed = null;
        }
        (Object.keys(r.keys) as RemoteButton[]).forEach((b) => {
          const k = r!.keys[b];
          const d = b === pressed ? depth : 0;
          k.mesh.position.z = k.z - k.travel * d;
          if (k.tilt) k.mesh.rotation.x = k.tilt * d;
        });
        // While it sends: the red light is on and the infrared window flickers faintly.
        r.ledMat.color.set(depth > 0.3 ? '#ff3b30' : '#4a1214');
        r.irMat.emissiveIntensity = depth > 0.3 ? 0.25 + Math.random() * 0.2 : 0;

        // Lean with the movement, breathe a little at rest, and give slightly under the thumb when pressing.
        vel.x *= Math.exp(-dt * 10);
        vel.y *= Math.exp(-dt * 10);
        const lean = Math.max(-0.35, Math.min(0.35, vel.x * 0.006));
        const tip = Math.max(-0.2, Math.min(0.2, vel.y * 0.004));
        r.roll.rotation.y = ROLL + (lean + Math.sin(t * 1.3) * 0.03) * s;
        r.pitch.rotation.x = LEAN_PITCH + (PITCH - LEAN_PITCH) * s + (tip - depth * 0.05 + Math.sin(t * 1.1) * 0.02) * s;
        r.renderer.render(r.scene, r.camera);
      }
      // Settled on the heading and nothing moving: stop drawing until a scroll or the pointer wakes it.
      if (!active && rest.ok && fly === 0 && shown > 0.995 && depth === 0 && Math.abs(rest.x + window.scrollX - parked.x) < 0.5 && Math.abs(rest.y + window.scrollY - parked.y) < 0.5) {
        raf = 0;
        return;
      }
      parked.x = rest.x + window.scrollX;
      parked.y = rest.y + window.scrollY;
      raf = requestAnimationFrame(loop);
    };
    const startLoop = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    return () => {
      cancelIdle();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('scroll', queueEval);
      document.documentElement.removeEventListener('mouseleave', onLeaveWindow);
      window.clearInterval(evalTimer);
      offPress();
      cancelAnimationFrame(raf);
      setRemoteActive(false);
      document.body.classList.remove('remote-cursor-on');
      canvas.removeEventListener('webglcontextlost', onLost);
      r?.dispose();
      r?.renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      // Shown at every width: on phones it rests on the "Work." heading.
      className="pointer-events-none fixed left-0 top-0 z-[10000]"
      style={{ width: SIZE, height: SIZE, opacity: 0, willChange: 'transform, opacity' }}
    />
  );
}
