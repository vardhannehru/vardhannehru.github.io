import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { floorClipPlane, floorMatrix, stageCamera } from "./nameStage3d";
import type { NameStage } from "./nameStage";

// A real keychain hooked through a hole in the last letter: a chrome split ring through the hole and
// clear acrylic charms on jump rings. A short physics simulation (gravity, friction, resting on the
// floor or the letters) settles the charms hanging from the ring. After that they only move when the
// page is scrolled: they swing, settle back to hanging down, and freeze again.
// Rendered with the same camera as the CSS letters, so it lines up with them.

/** Direction the split ring leaves its hole across the floor (radians from +x toward the viewer). */
export const RING_DIR = (40 * Math.PI) / 180;

const PAD_X = 0.3;
const PAD_Y = 0.7;
// How far the ring has flopped back over the letter from upright (radians).
const RING_LEAN = -0.7;
// The way the charms hang down from the ring across the floor (radians from +x toward the viewer).
// They all hang the same way, stacked one on another, and always settle back pointing this way.
const HANG_DIR = 1.45;
// How strongly a charm swings back to hang its way after it's been moved.
const HANG_PULL = 0.02;
// Scrolling sways the charms a little around their holes, like inertia: the lean follows the scroll
// speed (radians per px/s, up to SWAY_MAX), on a soft spring that settles with a small overshoot.
const SWAY_PER_SPEED = 0.00008;
const SWAY_MAX = 0.1;
const SWAY_STIFFNESS = 40;
const SWAY_DAMPING = 8;
// Physics: fixed time step, gravity (letter heights / s²), air drag, bounce and floor friction.
const STEP = 1 / 120;
const GRAVITY = 26;
const AIR = 0.997;
const BOUNCE = 0.3;
const FRICTION = 0.3;
const ITERATIONS = 6;

type Hole = { x: number; y: number; r: number; wall: number; edge: number };
type Props = {
  W: number;
  H: number;
  stage: NameStage;
  /** Index of the letter the hole is drilled in. */
  letter: number;
  /** Hole centre on the floor (px from the name's left and far edges), radius, solid wall around it,
   *  and how far the letter continues past it in RING_DIR. */
  hole: Hole;
  slab: number;
};

type Icons = { claude: HTMLImageElement | null; openai: HTMLImageElement | null; gemini: HTMLImageElement | null };
type CharmDef = { shape: "disc" | "tag" | "tile"; w: number; h: number; paint: (g: CanvasRenderingContext2D, w: number, h: number, icons: Icons) => void };

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

function drawClaude(g: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, cy: number, size: number) {
  if (img) {
    g.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    return;
  }
  // Simplified starburst until the official symbol is in public/brand/.
  g.fillStyle = "#D97757";
  g.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const len = [0.5, 0.41, 0.47, 0.38, 0.5, 0.42, 0.45, 0.39, 0.5, 0.41, 0.44, 0.38][i] * size;
    g.moveTo(cx + Math.cos(a - 0.15) * size * 0.06, cy + Math.sin(a - 0.15) * size * 0.06);
    g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    g.lineTo(cx + Math.cos(a + 0.15) * size * 0.06, cy + Math.sin(a + 0.15) * size * 0.06);
  }
  g.fill();
}

function drawOpenAI(g: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, cy: number, size: number, white: boolean) {
  if (img) {
    g.save();
    if (white) g.filter = "invert(1)";
    g.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    g.restore();
    return;
  }
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = white ? "#fff" : "#000";
  g.lineWidth = size * 0.06;
  const u = size / 60;
  for (let i = 0; i < 6; i++) {
    g.save();
    g.rotate((i * Math.PI) / 3);
    g.translate(3 * u, -9 * u);
    g.beginPath();
    g.roundRect(-5 * u, -7 * u, 22 * u, 14 * u, 7 * u);
    g.stroke();
    g.restore();
  }
  g.restore();
}

function drawGemini(g: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, cy: number, size: number) {
  if (img) {
    g.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    return;
  }
  // Simplified four-pointed Gemini sparkle until the official symbol is in public/brand/.
  const r = size / 2;
  const gr = g.createLinearGradient(cx - r, cy + r, cx + r, cy - r);
  gr.addColorStop(0, "#1C7DFF");
  gr.addColorStop(0.55, "#8E6CF0");
  gr.addColorStop(1, "#E86A8C");
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(cx, cy - r);
  g.quadraticCurveTo(cx, cy, cx + r, cy);
  g.quadraticCurveTo(cx, cy, cx, cy + r);
  g.quadraticCurveTo(cx, cy, cx - r, cy);
  g.quadraticCurveTo(cx, cy, cx, cy - r);
  g.fill();
}

const text = (g: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string) => {
  g.font = font;
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(s, x, y);
};

// The keychain's charms: VN, OpenAI, Gemini and Claude. Sizes are fractions of the letter height.
const CHARMS: CharmDef[] = [
  {
    shape: "tile",
    w: 0.36,
    h: 0.36,
    paint: (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, "#d8caff");
      gr.addColorStop(1, "#9d86e9");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      text(g, "VN", w / 2, h * 0.6, `${h * 0.42}px Anton, sans-serif`, "#170f2e");
    },
  },
  { shape: "disc", w: 0.36, h: 0.36, paint: (g, w, h, i) => ((g.fillStyle = "#000"), g.fillRect(0, 0, w, h), drawOpenAI(g, i.openai, w / 2, h * 0.56, w * 0.5, true)) },
  { shape: "disc", w: 0.36, h: 0.36, paint: (g, w, h, i) => ((g.fillStyle = "#F8F9FC"), g.fillRect(0, 0, w, h), drawGemini(g, i.gemini, w / 2, h * 0.56, w * 0.56)) },
  { shape: "disc", w: 0.36, h: 0.36, paint: (g, w, h, i) => ((g.fillStyle = "#F0EEE6"), g.fillRect(0, 0, w, h), drawClaude(g, i.claude, w / 2, h * 0.56, w * 0.56)) },
];

function outline(shape: CharmDef["shape"], w: number, h: number) {
  const s = new THREE.Shape();
  if (shape === "disc") {
    s.absarc(0, 0, w / 2, 0, Math.PI * 2, false);
    return s;
  }
  const r = Math.min(w, h) * (shape === "tile" ? 0.22 : 0.18);
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

// Soft round shadow texture, shared by everything that casts a shadow on the floor.
function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(0,0,0,0.75)");
  gr.addColorStop(0.55, "rgba(0,0,0,0.35)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Barycentric weights of (px, py) in the triangle a, b, c (x/y only).
function barycentric(px: number, py: number, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
  const v0x = b.x - a.x;
  const v0y = b.y - a.y;
  const v1x = c.x - a.x;
  const v1y = c.y - a.y;
  const v2x = px - a.x;
  const v2y = py - a.y;
  const den = v0x * v1y - v1x * v0y;
  const v = (v2x * v1y - v1x * v2y) / den;
  const w = (v0x * v2y - v2x * v0y) / den;
  return [1 - v - w, v, w];
}

// A point of the simulation: position and previous position (Verlet).
type Pt = { p: THREE.Vector3; q: THREE.Vector3 };

type Charm = {
  group: THREE.Group;
  body: THREE.Mesh;
  jump: THREE.Mesh;
  shadow: THREE.Mesh;
  mats: { caps: THREE.MeshPhysicalMaterial; sides: THREE.MeshPhysicalMaterial; art: THREE.MeshBasicMaterial; shadow: THREE.MeshBasicMaterial };
  owned: { dispose: () => void }[];
  /** Hole, bottom-left and bottom-right points: a rigid triangle that carries the charm. */
  pts: Pt[];
  local: THREE.Vector3[];
  rest: number[];
  centreWeights: number[];
  localCentroid: THREE.Vector3;
  w: number;
  h: number;
  half: number;
  /** The way it hangs, and how far its bottom is from its hole. */
  dir: THREE.Vector3;
  reach: number;
  /** Stacking order: 0 lies on the floor, higher ones on top of it. */
  layer: number;
  anchor: THREE.Vector3;
  e1: THREE.Vector3;
  e2: THREE.Vector3;
  n: THREE.Vector3;
};

const PAIRS = [
  [0, 1, 0],
  [0, 2, 1],
  [1, 2, 2],
] as const;

export default function KeychainLayer({ W, H, stage, letter, hole, slab }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || W === 0) return;
    const Wc = Math.round(W * (1 + 2 * PAD_X));
    const Hc = Math.round(H * (1 + 2 * PAD_Y));
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    // Render a little above screen resolution so the chrome and acrylic edges stay crisp.
    renderer.setPixelRatio(Math.min(2, Math.max(1.5, window.devicePixelRatio || 1)));
    renderer.setSize(Wc, Hc, false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.clippingPlanes = [floorClipPlane(H)];
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromScene(new RoomEnvironment(), 0.04);
    pm.dispose();

    const scene = new THREE.Scene();
    scene.environment = env.texture;
    const camera = stageCamera(W, H, PAD_X, PAD_Y);
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-0.5, 1.2, 1.4);
    const rim = new THREE.DirectionalLight(0xc8b6ff, 2);
    rim.position.set(1.4, 0.6, -1);
    scene.add(key, rim);

    // Everything below is placed in floor coordinates: (x, -v, height).
    const floor = new THREE.Group();
    floor.matrixAutoUpdate = false;
    floor.matrix.copy(floorMatrix(H));
    scene.add(floor);
    // Follows the name as it slides away along the floor while the hero is scrolled.
    let recede = 0;
    const followRecede = () => {
      if (stage.recede === recede) return false;
      recede = stage.recede;
      floor.matrix.copy(floorMatrix(H)).multiply(new THREE.Matrix4().makeTranslation(0, recede, 0));
      return true;
    };

    const disposables: { dispose: () => void }[] = [env];
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    const shadowTex = track(shadowTexture());
    const shadowMat = track(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }));
    const unitPlane = track(new THREE.PlaneGeometry(1, 1));
    const metal = track(
      new THREE.MeshPhysicalMaterial({ color: 0xe4e7ee, metalness: 1, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 1.5 })
    );
    // Clear acrylic: faint faces, brighter polished edges.
    const capsBase = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.14,
        roughness: 0.03,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        ior: 1.5,
        specularIntensity: 1,
        envMapIntensity: 1.6,
        depthWrite: false,
      })
    );
    const sidesBase = track(capsBase.clone());
    sidesBase.opacity = 0.5;
    sidesBase.color.set(0xf5f2ff);

    // ---- The drilled letter and the split ring through it: they move together when it's pressed ----
    const letterGroup = new THREE.Group();
    letterGroup.matrixAutoUpdate = false;
    floor.add(letterGroup);

    // Invisible stand-in for the letter around the hole: hides the ring where it passes inside the slab.
    const occShape = new THREE.Shape();
    occShape.absarc(hole.x, -hole.y, hole.wall * 1.1, 0, Math.PI * 2, false);
    const occHole = new THREE.Path();
    occHole.absarc(hole.x, -hole.y, hole.r, 0, Math.PI * 2, true);
    occShape.holes.push(occHole);
    const occluder = new THREE.Mesh(
      track(new THREE.ExtrudeGeometry(occShape, { depth: 1, bevelEnabled: false, curveSegments: 40 })),
      track(new THREE.MeshBasicMaterial({ colorWrite: false }))
    );
    occluder.renderOrder = -1;
    letterGroup.add(occluder);

    // Make the ring big enough to clear the letter's corner past the hole.
    const ink = stage.ink[letter];
    const toBox = ink
      ? Math.min(
          (ink.x1 - hole.x) / Math.max(0.05, Math.cos(RING_DIR)),
          (ink.y1 - hole.y) / Math.max(0.05, Math.sin(RING_DIR))
        )
      : hole.edge;
    const tube = Math.max(1.2, Math.min(hole.r * 0.42, H * 0.011));
    const R = Math.max(Math.max(hole.edge, toBox) / 2 + tube * 3 + H * 0.015, slab * 0.95, hole.r * 2.4);
    const L = H * 0.07; // jump ring span
    const ringDir = new THREE.Vector3(Math.cos(RING_DIR), -Math.sin(RING_DIR), 0);
    const side = new THREE.Vector3().crossVectors(ringDir, new THREE.Vector3(0, 0, 1));
    const ringUp = new THREE.Vector3(0, 0, Math.cos(RING_LEAN)).addScaledVector(side, Math.sin(RING_LEAN));
    const ringNormal = new THREE.Vector3().crossVectors(ringDir, ringUp);
    const ringGeo = track(new THREE.TorusGeometry(R, tube, 20, 160));
    // A split ring is two turns of wire lying against each other.
    const coils = [0, 1].map(() => {
      const m = new THREE.Mesh(ringGeo, metal);
      m.matrixAutoUpdate = false;
      letterGroup.add(m);
      return m;
    });
    const ringShadowMat = track(shadowMat.clone());
    const ringShadow = new THREE.Mesh(unitPlane, ringShadowMat);
    ringShadow.matrixAutoUpdate = false;
    floor.add(ringShadow);
    const jumpGeo = track(new THREE.TorusGeometry(L / 2, tube * 0.65, 12, 48));

    const V = () => new THREE.Vector3();
    const tmpA = V();
    const tmpB = V();
    const tmpC = V();
    const tmpS = V();
    const tmpY = V();
    const tmpZ = V();
    const tmpM = new THREE.Matrix4();
    const tmpM2 = new THREE.Matrix4();
    const euler = new THREE.Euler();
    const letterMat = new THREE.Matrix4();
    const ringCentreLocal = V();
    // The ring in floor coordinates, after the letter's press: centre, in-plane axes, lowest reachable angle.
    const ring = { centre: V(), dir: V(), up: V(), tLo: 0 };

    const updateLetter = () => {
      const pose = stage.pose(letter);
      euler.set(-pose.b, pose.a, 0, "XYZ");
      letterMat
        .makeTranslation(pose.cx, -pose.cy, 0)
        .multiply(tmpM.makeRotationFromEuler(euler))
        .multiply(tmpM2.makeTranslation(-pose.cx, pose.cy, 0));
      letterGroup.matrix.copy(letterMat);
      letterGroup.visible = pose.rise > 0.02;
      occluder.scale.z = Math.max(0.001, pose.top);
      ringCentreLocal.set(hole.x, -hole.y, pose.top / 2).addScaledVector(ringDir, R);
      coils.forEach((m, k) => {
        m.matrix
          .makeBasis(ringDir, ringUp, ringNormal)
          .scale(tmpS.setScalar(1 - k * 0.012))
          .setPosition(tmpA.copy(ringCentreLocal).addScaledVector(ringNormal, tube * 2.05 * k));
      });
      ring.centre.copy(ringCentreLocal).applyMatrix4(letterMat);
      ring.dir.copy(ringDir).transformDirection(letterMat);
      ring.up.copy(ringUp).transformDirection(letterMat);
      // Where the ring meets the floor outside the letter: the lowest the jump rings can slide to.
      ring.tLo = Math.asin(Math.max(-1, Math.min(1, (tube - ring.centre.z) / (R * Math.max(0.2, ring.up.z)))));
      // Soft shadow under the ring.
      ringShadow.matrix
        .makeRotationZ(Math.atan2(ring.dir.y, ring.dir.x))
        .scale(tmpS.set(R * 2.3, R * 1.6, 1))
        .setPosition(ring.centre.x - ring.up.x * R * 0.3, ring.centre.y - ring.up.y * R * 0.3, 0.25);
      ringShadowMat.opacity = 0.4 * clamp01(pose.rise);
      ringShadow.visible = letterGroup.visible;
      return pose;
    };

    const ringPoint = (t: number, out: THREE.Vector3) =>
      out.copy(ring.centre).addScaledVector(ring.dir, R * Math.cos(t)).addScaledVector(ring.up, R * Math.sin(t));
    // Jump rings slide along the split ring: the nearest point of its outer arc, above the floor.
    const anchorFor = (p: THREE.Vector3, out: THREE.Vector3) => {
      tmpC.subVectors(p, ring.centre);
      const t = Math.atan2(tmpC.dot(ring.up), tmpC.dot(ring.dir));
      return ringPoint(Math.max(ring.tLo, Math.min(Math.PI / 2, t)), out);
    };

    let icons: Icons = { claude: null, openai: null, gemini: null };
    let iconsReady = false;
    const textures = new Map<string, THREE.Texture>();
    const artTexture = (i: number, def: CharmDef, wPx: number, hPx: number) => {
      const keyName = String(i);
      const cached = textures.get(keyName);
      if (cached) return cached;
      const scale = 512 / Math.max(wPx, hPx);
      const c = document.createElement("canvas");
      c.width = Math.round(wPx * scale);
      c.height = Math.round(hPx * scale);
      def.paint(c.getContext("2d")!, c.width, c.height, icons);
      const t = track(new THREE.CanvasTexture(c));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      textures.set(keyName, t);
      return t;
    };

    const charms: Charm[] = [];
    // When the charms were hung (sim time), for their fade-in; -1 until then.
    let hungAt = -1;
    // Current lean of the charms from their hanging direction, in radians (set by scrolling).
    let sway = 0;
    let simTime = 0;

    const buildCharm = (i: number, def: CharmDef) => {
      const owned: { dispose: () => void }[] = [];
      const own = <T extends { dispose: () => void }>(x: T) => (owned.push(x), x);
      const w = def.w * H;
      const h = def.h * H;
      const t = Math.max(2, H * 0.026);
      const bevel = t * 0.3;
      const holeR = Math.min(w, h) * 0.07;
      const holeY = h / 2 - holeR * 2.2;
      const shape = outline(def.shape, w, h);
      const hp = new THREE.Path();
      hp.absarc(0, holeY, holeR, 0, Math.PI * 2, true);
      shape.holes.push(hp);

      const geo = own(
        new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 48 })
      );
      geo.translate(0, 0, -t / 2);
      const caps = own(capsBase.clone());
      const sides = own(sidesBase.clone());
      const body = new THREE.Mesh(geo, [caps, sides]);
      body.renderOrder = 2;

      // Printed art sealed inside the acrylic, readable from both sides.
      const artShape = outline(def.shape, w * 0.9, h * 0.9);
      const ahp = new THREE.Path();
      ahp.absarc(0, holeY, holeR * 1.35, 0, Math.PI * 2, true);
      artShape.holes.push(ahp);
      const artGeo = own(new THREE.ShapeGeometry(artShape, 48));
      const pos = artGeo.attributes.position as THREE.BufferAttribute;
      const uv = new Float32Array(pos.count * 2);
      for (let k = 0; k < pos.count; k++) {
        uv[k * 2] = pos.getX(k) / w + 0.5;
        uv[k * 2 + 1] = pos.getY(k) / h + 0.5;
      }
      artGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      const art = own(new THREE.MeshBasicMaterial({ map: artTexture(i, def, w, h), transparent: true, toneMapped: false }));
      const front = new THREE.Mesh(artGeo, art);
      front.position.z = t * 0.12;
      front.renderOrder = 1;
      const back = new THREE.Mesh(artGeo, art);
      back.rotation.y = Math.PI;
      back.position.z = -t * 0.12;
      back.renderOrder = 1;

      const group = new THREE.Group();
      group.matrixAutoUpdate = false;
      group.visible = false;
      group.add(front, back, body);
      const jump = new THREE.Mesh(jumpGeo, metal);
      jump.matrixAutoUpdate = false;
      jump.visible = false;
      const shadowM = own(shadowMat.clone());
      const shadow = new THREE.Mesh(unitPlane, shadowM);
      shadow.matrixAutoUpdate = false;
      shadow.visible = false;
      floor.add(shadow, group, jump);

      const local = [new THREE.Vector3(0, holeY, 0), new THREE.Vector3(-0.32 * w, -0.32 * h, 0), new THREE.Vector3(0.32 * w, -0.32 * h, 0)];
      const half = t / 2 + bevel;

      // Lying flat on the floor, hanging down from the ring toward the viewer: the hole by the ring,
      // the art's top toward it, so it reads upright.
      const dv = new THREE.Vector3(Math.cos(HANG_DIR), -Math.sin(HANG_DIR), 0);
      const hole0 = ringPoint(ring.tLo, V()).addScaledVector(dv, L * 0.5).setZ(half);
      const e2 = dv.clone().negate();
      const e1 = new THREE.Vector3().crossVectors(e2, new THREE.Vector3(0, 0, 1));
      const pts = local.map((l) => {
        const p = hole0
          .clone()
          .addScaledVector(e1, l.x - local[0].x)
          .addScaledVector(e2, l.y - local[0].y);
        return { p, q: p.clone() };
      });

      charms.push({
        group,
        body,
        jump,
        shadow,
        mats: { caps, sides, art, shadow: shadowM },
        owned,
        pts,
        local,
        rest: [local[0].distanceTo(local[1]), local[0].distanceTo(local[2]), local[1].distanceTo(local[2])],
        centreWeights: barycentric(0, 0, local[0], local[1], local[2]),
        localCentroid: local[0].clone().add(local[1]).add(local[2]).multiplyScalar(1 / 3),
        w,
        h,
        half,
        dir: dv,
        reach: holeY + 0.32 * h,
        // The first charm (VN) lies on top of the pile.
        layer: CHARMS.length - 1 - i,
        anchor: V(),
        e1: V(),
        e2: V(),
        n: V(),
      });
    };

    // Hang the charms once, settled into place by the physics, then they stay exactly there.
    const hang = () => {
      CHARMS.forEach((def, i) => buildCharm(i, def));
      for (let k = 0; k < 240; k++) step();
      hungAt = simTime;
    };

    // ---- Physics ----
    const centre = (c: Charm, out: THREE.Vector3) => {
      out.set(0, 0, 0);
      c.pts.forEach((pt, k) => out.addScaledVector(pt.p, c.centreWeights[k]));
      return out;
    };
    const rigid = (c: Charm) => {
      for (const [a, b, r] of PAIRS) {
        const pa = c.pts[a].p;
        const pb = c.pts[b].p;
        tmpA.subVectors(pb, pa);
        const d = tmpA.length();
        if (d < 1e-6) continue;
        const k = ((d - c.rest[r]) / d) * 0.5;
        pa.addScaledVector(tmpA, k);
        pb.addScaledVector(tmpA, -k);
      }
    };
    // The jump ring: the charm's hole can't get further than its span from the split ring.
    const tether = (c: Charm) => {
      const p = c.pts[0].p;
      anchorFor(p, c.anchor);
      tmpA.subVectors(p, c.anchor);
      const d = tmpA.length();
      if (d > L) p.copy(c.anchor).addScaledVector(tmpA, L / d);
    };
    // Out of a letter's side, if it's been pushed into one.
    const pushOut = (p: THREE.Vector3, half: number) => {
      const v = -p.y;
      const b = stage.ink[stage.letterIndexAt(p.x, v, true)];
      if (!b) return;
      const dl = p.x - b.x0;
      const dr = b.x1 - p.x;
      const df = v - b.y0;
      const dn = b.y1 - v;
      const m = Math.min(dl, dr, df, dn);
      if (m === dl) p.x = b.x0 - half;
      else if (m === dr) p.x = b.x1 + half;
      else if (m === df) p.y = -(b.y0 - half);
      else p.y = -(b.y1 + half);
    };
    // Gravity increases when hovering (pulls charms down more)
    const getGStep = () => GRAVITY * H * STEP * STEP * (1 + hoverPull * 1.5);

    // Rest on the floor or on top of a letter (which moves when pressed); bounce and friction on contact.
    const collide = (pt: Pt, c: Charm, velocity: boolean, gStep: number) => {
      const half = c.half * (1 + c.layer * 1.2);
      const p = pt.p;
      let ground = 0;
      const s = stage.heightAt(p.x, -p.y, true);
      if (s && p.z < s.z + half) {
        if (pt.q.z >= s.z + half * 0.3) ground = s.z;
        else pushOut(p, half);
      }
      if (p.z >= ground + half) return;
      if (!velocity) {
        p.z = ground + half;
        return;
      }
      const vz = p.z - pt.q.z;
      p.z = ground + half;
      pt.q.z = vz < -gStep * 3 ? p.z + vz * BOUNCE : p.z;
      pt.q.x = p.x - (p.x - pt.q.x) * (1 - FRICTION);
      pt.q.y = p.y - (p.y - pt.q.y) * (1 - FRICTION);
    };
    const step = () => {
      simTime += STEP;
      const gStep = getGStep();
      for (const c of charms) {
        for (const pt of c.pts) {
          const vx = (pt.p.x - pt.q.x) * AIR;
          const vy = (pt.p.y - pt.q.y) * AIR;
          const vz = (pt.p.z - pt.q.z) * AIR;
          pt.q.copy(pt.p);
          pt.p.x += vx;
          pt.p.y += vy;
          pt.p.z += vz - gStep;
        }
        // Hang its way (leaning by the current sway): ease the bottom toward that direction from the
        // hole. Moves position only, so it follows smoothly instead of bouncing.
        const [top, bl, br] = c.pts;
        const a = sway * (0.7 + 0.3 * (c.layer / Math.max(1, charms.length - 1)));
        const dx = c.dir.x * Math.cos(a) - c.dir.y * Math.sin(a);
        const dy = c.dir.x * Math.sin(a) + c.dir.y * Math.cos(a);
        const tx = (top.p.x + dx * c.reach - (bl.p.x + br.p.x) / 2) * HANG_PULL;
        const ty = (top.p.y + dy * c.reach - (bl.p.y + br.p.y) / 2) * HANG_PULL;
        for (const pt of [bl, br]) {
          pt.p.x += tx;
          pt.p.y += ty;
          pt.q.x += tx;
          pt.q.y += ty;
        }
      }
      for (let it = 0; it < ITERATIONS; it++) {
        for (const c of charms) {
          rigid(c);
          tether(c);
          for (const pt of c.pts) collide(pt, c, false, gStep);
        }
      }
      for (const c of charms) for (const pt of c.pts) collide(pt, c, true, gStep);
    };

    // Places a charm's meshes from its simulated points.
    const syncCharm = (c: Charm) => {
      const [a, b, d] = c.pts.map((pt) => pt.p);
      c.e1.subVectors(d, b).normalize();
      tmpA.addVectors(b, d).multiplyScalar(0.5);
      c.e2.subVectors(a, tmpA);
      c.e2.addScaledVector(c.e1, -c.e2.dot(c.e1)).normalize();
      c.n.crossVectors(c.e1, c.e2);
      tmpB
        .copy(a)
        .add(b)
        .add(d)
        .multiplyScalar(1 / 3)
        .addScaledVector(c.e1, -c.localCentroid.x)
        .addScaledVector(c.e2, -c.localCentroid.y);
      c.group.matrix.makeBasis(c.e1, c.e2, c.n).setPosition(tmpB);

      // Fades in once, after the letter has risen.
      const o = hungAt < 0 ? 0 : smoothstep(hungAt, hungAt + 0.5, simTime);
      c.group.visible = o > 0.01;
      c.mats.caps.opacity = 0.14 * o;
      c.mats.sides.opacity = 0.5 * o;
      c.mats.art.opacity = o;

      // Jump ring: from the split ring to the charm's hole.
      tmpC.copy(c.anchor);
      tmpA.subVectors(a, tmpC);
      if (tmpA.lengthSq() < 1e-6) tmpA.copy(c.e2).negate();
      tmpA.normalize();
      const zAxis = tmpZ.crossVectors(tmpA, c.n);
      if (zAxis.lengthSq() < 1e-6) zAxis.crossVectors(tmpA, c.e1);
      zAxis.normalize();
      const yAxis = tmpY.crossVectors(zAxis, tmpA);
      c.jump.matrix.makeBasis(tmpA, yAxis, zAxis).setPosition(tmpC.addScaledVector(tmpA, L / 2));
      c.jump.visible = c.group.visible && o > 0.4;

      // Soft shadow on the floor: its footprint, fading and spreading as the charm is lifted.
      centre(c, tmpC);
      const lift = clamp01((tmpC.z - c.half) / (H * 0.9));
      const spread = 1.15 + lift * 0.6;
      c.shadow.matrix
        .makeRotationZ(Math.atan2(c.e1.y, c.e1.x))
        .scale(tmpS.set(c.w * Math.max(0.3, Math.hypot(c.e1.x, c.e1.y)) * spread, c.h * Math.max(0.3, Math.hypot(c.e2.x, c.e2.y)) * spread, 1))
        .setPosition(tmpC.x, tmpC.y, 0.25);
      c.mats.shadow.opacity = 0.5 * (1 - lift) * o;
      c.shadow.visible = c.group.visible;
    };

    // ---- Scrolling and hovering move the charms: they lean a little with the scroll speed and
    // sway back to hanging straight when it stops; hovering pulls them down. ----
    let awakeUntil = -1;
    let lastScroll = window.scrollY;
    let lastScrollAt = performance.now();
    let scrollSpeed = 0;
    let swayVel = 0;
    let isHoveringKeychain = false;
    let hoverPull = 0; // Downward pull from hovering (0 = off, 1 = full)

    const onScroll = () => {
      const now = performance.now();
      const v = (window.scrollY - lastScroll) / Math.max(0.008, (now - lastScrollAt) / 1000);
      lastScroll = window.scrollY;
      lastScrollAt = now;
      if (hungAt < 0) return;
      scrollSpeed += (v - scrollSpeed) * 0.35;
      awakeUntil = simTime + 2;
    };

    // Eases the sway toward the lean the scroll speed asks for.
    const updateSway = (dt: number) => {
      scrollSpeed *= Math.exp(-dt * 6);
      const target = Math.max(-SWAY_MAX, Math.min(SWAY_MAX, scrollSpeed * SWAY_PER_SPEED));
      swayVel += (target - sway) * SWAY_STIFFNESS * dt;
      swayVel *= Math.exp(-SWAY_DAMPING * dt);
      sway += swayVel * dt;
      if (Math.abs(sway) > 1e-3 || Math.abs(swayVel) > 1e-3) awakeUntil = Math.max(awakeUntil, simTime + 0.5);
    };

    // Apply hover pull when charms are hovered
    const updateHoverPull = (dt: number) => {
      const targetPull = isHoveringKeychain ? 1 : 0;
      hoverPull += (targetPull - hoverPull) * Math.min(1, dt * 8); // Smooth transition
      if (Math.abs(hoverPull) > 1e-3) awakeUntil = Math.max(awakeUntil, simTime + 0.5);
    };

    const onCanvasPointerMove = (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      isHoveringKeychain = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };

    const onCanvasPointerLeave = () => {
      isHoveringKeychain = false;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    if (canvasRef.current) {
      canvasRef.current.addEventListener("pointermove", onCanvasPointerMove);
      canvasRef.current.addEventListener("pointerleave", onCanvasPointerLeave);
    }

    // Wait for the brand icons and fonts before painting the charm art.
    Promise.all([loadImage("/brand/claude-symbol.svg"), loadImage("/brand/openai-symbol.svg"), loadImage("/brand/gemini-symbol.svg"), document.fonts?.ready]).then(([claude, openai, gemini]) => {
      if (disposed) return;
      icons = { claude, openai, gemini };
      iconsReady = true;
    });

    let raf = 0;
    let last = performance.now();
    let calm = 0;
    let acc = 0;
    let lastKey = "";
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const pose = updateLetter();
      // Hang the charms once the letter has risen out of the floor.
      if (hungAt < 0 && iconsReady && pose.rise > 0.97) hang();

      // Frozen unless a scroll has woken them; otherwise only the fade-in clock runs.
      if (hungAt >= 0) {
        updateSway(dt);
        updateHoverPull(dt);
      }
      if (simTime < awakeUntil) {
        acc += dt;
        for (let n = 0; acc >= STEP && n < 8; n++) {
          step();
          acc -= STEP;
        }
        acc = Math.min(acc, STEP);
      } else if (hungAt >= 0) simTime += dt;

      // Only redraw while something is moving.
      let activity = 0;
      for (const c of charms) syncCharm(c);
      // Still fading in.
      if (hungAt >= 0 && simTime < hungAt + 0.6) activity += 1;
      if (simTime < awakeUntil) activity += 1;
      if (followRecede()) activity += 1;
      const key = `${pose.top.toFixed(2)} ${pose.a.toFixed(4)} ${pose.b.toFixed(4)} ${pose.rise.toFixed(3)}`;
      if (key !== lastKey) {
        lastKey = key;
        activity += 1;
      }
      calm = activity < 0.01 * (charms.length + 1) ? calm + 1 : 0;
      if (calm < 20) renderer.render(scene, camera);
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      frame(now);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      if (canvasRef.current) {
        canvasRef.current.removeEventListener("pointermove", onCanvasPointerMove);
        canvasRef.current.removeEventListener("pointerleave", onCanvasPointerLeave);
      }
      for (const c of charms) for (const d of c.owned) d.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
    };
  }, [W, H, stage, letter, hole.x, hole.y, hole.r, hole.wall, hole.edge, slab]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute z-[4]"
      style={{ left: -W * PAD_X, top: -H * PAD_Y, width: W * (1 + 2 * PAD_X), height: H * (1 + 2 * PAD_Y) }}
    />
  );
}
