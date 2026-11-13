import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { compileShaders } from '../ui/compileShaders';
import {
  EYES,
  LAMP_COLORS,
  LAMP_ORDER,
  paintGlow,
  paintGrain,
  paintLensBase,
  paintLensGlow,
  paintSign,
  paintShape,
  paintSticker,
  paintStripes,
  paintTag,
} from './signalArt';

// The traffic light's three.js scene (no React here; TrafficLight.tsx drives it). Built the way the TV remote
// cursor is (RemoteCursor.tsx): one function makes everything and hands back what moves, plus dispose().
//
// A striped pole with three chunky heads in a zig-zag, like the poster: red upper right, yellow on the left,
// green lower right. Each head is a rounded, clear-coated metal housing with a door panel, a slanted visor (long
// at the top, short at the bottom), hinges, bolts, and two arms clamped round the pole.
//
// Each lamp has real depth: a lit plate with the lamp's picture sits at the back of a short barrel, and a clear
// glass dome sits in front of it. The glass only adds reflections (additive), so it shows the studio's highlights
// sliding over the lamp while the plate glows underneath, and the two shift against each other as the heads turn.
//
// Light: a soft studio environment, a warm key from the top left that casts real shadows (the visors shade their
// lenses, the heads shade the pole), a cool fill, a lavender rim from behind, and one small coloured light inside
// the visor of whichever lamp is on. Each lit lamp also has a soft glow sprite in front of it. No post-processing:
// bloom breaks a transparent canvas and costs too much here.
//
// Scene units: the pole runs along y through the origin; the lenses face +z.

export type SignalTheme = 'light' | 'dark';
/** The logos used for stickers, by file name in public/brand (without .svg). */
export const BRAND_FILES = ['claude-symbol', 'openai-symbol', 'python', 'langchain', 'docker', 'mcp', 'aws', 'elevenlabs'] as const;
export type BrandFile = (typeof BRAND_FILES)[number];
export type BrandImages = Partial<Record<BrandFile, HTMLImageElement | null>>;

type PoleSticker =
  | { kind: 'brand'; file: BrandFile }
  | { kind: 'tag'; text: string; bg: string; ink: string }
  | { kind: 'shape'; shape: 'star' | 'sparkle'; fill: string };

/** The stickers down the pole, top to bottom (the pattern repeats). Tools from the stack, the hero's words, and a
 *  couple of shapes in the site's three swatches. */
const POLE_STICKERS: PoleSticker[] = [
  { kind: 'brand', file: 'claude-symbol' },
  { kind: 'shape', shape: 'star', fill: '#FED141' },
  { kind: 'brand', file: 'langchain' },
  { kind: 'tag', text: 'RAG', bg: '#B1E4E3', ink: '#08746B' },
  { kind: 'brand', file: 'docker' },
  { kind: 'brand', file: 'openai-symbol' },
  { kind: 'shape', shape: 'sparkle', fill: '#743BBE' },
  { kind: 'brand', file: 'mcp' },
  { kind: 'tag', text: 'SHIP IT', bg: '#FED141', ink: '#3F260C' },
  { kind: 'brand', file: 'aws' },
  { kind: 'brand', file: 'python' },
  { kind: 'tag', text: 'AI ENGINEER', bg: '#EBDEFC', ink: '#743BBE' },
  { kind: 'brand', file: 'elevenlabs' },
];

/** The camera sits this far back for each unit of scene height on screen. Fixed, so the heads look the same
 *  size whatever the screen height, with a real (not flat telephoto) perspective: seen a little from below near
 *  the top of the screen and from above near the bottom, as they slide along the pole. */
const CAM_DIST_PER_H = 0.9;

const HEAD = { w: 0.42, h: 0.48, d: 0.34, r: 0.085 };
/** Thick enough to carry readable stickers and to grab as a scrollbar. */
const POLE_R = 0.082;
/** Heads: centre height, and which side of the pole (+1 right, -1 left). Top to bottom, as LAMP_ORDER. The pole
 *  is the page's scrollbar, right at the screen's edge, so the heads all hang off its left (page) side. */
const HEADS = [
  { y: 0.57, side: -1 },
  { y: 0, side: -1 },
  { y: -0.57, side: -1 },
];
const HEAD_X = POLE_R + HEAD.w / 2 + 0.018;
/** The lit plate's radius. */
const LENS_R = 0.15;
/** The front of the door panel: everything on the face is placed from here. */
const FRONT = HEAD.d / 2 + 0.01;
const BARREL_R = 0.166;
const BARREL_L = 0.055;
const PLATE_Z = FRONT + 0.006;
const GLASS_R = 0.16;
/** The glass is a shallow dome: a cap of a sphere this big. */
const DOME = 0.32;
const DOME_THETA = Math.asin(GLASS_R / DOME);
const DOME_BASE = DOME * Math.cos(DOME_THETA);
const VISOR = { ri: 0.184, ro: 0.2, top: 0.25, bottom: 0.06, flare: 1.05 };
/** The pole runs the whole height of the screen (and well past it). */
const POLE_HALF = 24;
/** The pole is made of sections joined by collars this far apart. */
const COLLAR_STEP = 2.6;
/** The VN sign hangs off the pole just above the red head. */
const SIGN = { x: -0.215, y: 0.95, s: 0.15, d: 0.045 };
/** How far a head moves forward when its lamp comes on. */
const PUSH = 0.03;
/** Each head turns on a joint at the end of its arms, just off the pole. The heads lean down a touch on their
 *  brackets, as real signal heads do, towards the people looking at them. */
const JOINT_X = POLE_R + 0.03;
const JOINT_Z = -0.03;
const BASE_TILT = 0.1;
/** A retracted head folds back round its joint by this much (radians) as it shrinks into its clamp. */
const FOLD = 1.35;

/** A lit lamp's emissive strength, its glow sprite's opacity, and the light it throws into its visor. */
const ON_INTENSITY = 2.7;
const HALO_OPACITY = 0.5;
const LAMP_LIGHT = 0.45;

const THEMES: Record<SignalTheme, { housing: string; key: number; fill: number; rim: number; rimColor: string; env: number }> = {
  // The pastel page is bright: a lighter slate, a gentler rim.
  light: { housing: '#2c313d', key: 2.4, fill: 0.5, rim: 1.1, rimColor: '#c8b6ff', env: 1.0 },
  dark: { housing: '#1d2029', key: 2.0, fill: 0.4, rim: 2.0, rimColor: '#b69df8', env: 0.85 },
};

/**
 * A visor: a tube round the lens cut at a slant, so it reaches far forward at the top and only a little at the
 * bottom. It has thickness (an outer wall, an inner wall and a front lip), and flares slightly towards the front.
 */
function visorGeometry(seg = 56) {
  const pos: number[] = [];
  const idx: number[] = [];
  // Three strips with their own vertices, so the lip's edges stay crisp: outer wall, front lip, inner wall.
  const ring = (r: number, front: boolean) => {
    const start = pos.length / 3;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const t = Math.pow((1 + Math.sin(a)) / 2, 1.4); // 1 at the top, 0 at the bottom
      const len = VISOR.bottom + (VISOR.top - VISOR.bottom) * t;
      const rr = front ? r * (1 + (VISOR.flare - 1) * (len / VISOR.top)) : r;
      pos.push(Math.cos(a) * rr, Math.sin(a) * rr, front ? len : 0);
    }
    return start;
  };
  const strip = (a0: number, b0: number, flip: boolean) => {
    for (let i = 0; i < seg; i++) {
      const a = a0 + i;
      const b = b0 + i;
      if (flip) idx.push(a, b, a + 1, a + 1, b, b + 1);
      else idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  };
  strip(ring(VISOR.ro, false), ring(VISOR.ro, true), false);
  strip(ring(VISOR.ro, true), ring(VISOR.ri, true), false);
  strip(ring(VISOR.ri, false), ring(VISOR.ri, true), true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Each ring's first and last vertices are the same point: give them the same normal, so no seam shows.
  const n = g.attributes.normal;
  for (let r = 0; r < 6; r++) {
    const a = r * (seg + 1);
    const b = a + seg;
    const x = n.getX(a) + n.getX(b);
    const y = n.getY(a) + n.getY(b);
    const z = n.getZ(a) + n.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l);
    n.setXYZ(b, x / l, y / l, z / l);
  }
  return g;
}

export type TrafficLightScene = ReturnType<typeof buildTrafficLight>;

export function buildTrafficLight(canvas: HTMLCanvasElement, theme: SignalTheme) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  pmrem.dispose();
  scene.environment = envTex;

  // Square on to the page; setSize() sets its distance and field of view from the canvas height.
  const camera = new THREE.PerspectiveCamera(58, 0.2, 0.1, 100);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);
  /** Scene units per CSS px (set by setSize), and the canvas height in px. */
  let unit = 1 / 114;
  let canvasH = 300;

  // The key light (and its shadow camera) follows the heads along the pole.
  const key = new THREE.DirectionalLight(0xfff3e6, 2.2);
  const KEY_OFFSET = new THREE.Vector3(-2.2, 4.2, 4.6);
  key.position.copy(KEY_OFFSET);
  scene.add(key.target);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.012;
  {
    const c = key.shadow.camera;
    c.left = -1.2;
    c.right = 1.2;
    c.top = 1.7;
    c.bottom = -1.7;
    c.near = 1;
    c.far = 14;
    c.updateProjectionMatrix();
  }
  const fill = new THREE.DirectionalLight(0xdfe7ff, 0.45);
  fill.position.set(3, -1.5, 4);
  const rim = new THREE.DirectionalLight(0xc8b6ff, 1.2);
  rim.position.set(2.5, 2.5, -4);
  scene.add(key, fill, rim);

  const disposables: { dispose: () => void }[] = [envTex];
  const own = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);
  const tex = (c: HTMLCanvasElement, color = true) => {
    const t = own(new THREE.CanvasTexture(c));
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  };

  // ---- Materials
  const grain = tex(paintGrain(), false);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(3, 3);
  // Cast metal under a satin clear coat: the coat gives the crisp highlights, the metal the deep reflections.
  const housingMat = own(
    new THREE.MeshPhysicalMaterial({
      color: THEMES[theme].housing,
      metalness: 0.78,
      roughness: 0.4,
      roughnessMap: grain,
      bumpMap: grain,
      bumpScale: 0.12,
      clearcoat: 0.85,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1.25,
    })
  );
  // The visor and barrel, seen from both sides (their insides catch the lamp's light).
  const visorMat = own(housingMat.clone());
  visorMat.side = THREE.DoubleSide;
  const doorMat = own(housingMat.clone());
  doorMat.roughness = 0.3;
  doorMat.clearcoatRoughness = 0.1;
  const trimMat = own(new THREE.MeshStandardMaterial({ color: '#2a2d33', metalness: 0.95, roughness: 0.26, side: THREE.DoubleSide }));
  const boltMat = own(new THREE.MeshStandardMaterial({ color: '#c3c7cf', metalness: 1, roughness: 0.28 }));
  const steelMat = own(new THREE.MeshPhysicalMaterial({ color: '#d2d5dc', metalness: 1, roughness: 0.2, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 1.4 }));

  const stripes = tex(paintStripes());
  stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
  // Wider bands read better at this size: stretch the tile along the pole.
  stripes.repeat.set(1, (POLE_HALF * 2) / (2 * Math.PI * POLE_R) / 1.6);
  // Glossy enamel over steel.
  const stripeMat = own(
    new THREE.MeshPhysicalMaterial({ map: stripes, metalness: 0.45, roughness: 0.36, clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 1.2 })
  );

  const glowTex = tex(paintGlow());
  // The lit plate at the back of each lamp.
  const plateMats = LAMP_ORDER.map((kind) => {
    const base = tex(paintLensBase(kind));
    const glow = tex(paintLensGlow(kind));
    if (kind === 'go') glow.wrapS = glow.wrapT = THREE.RepeatWrapping;
    return own(
      new THREE.MeshStandardMaterial({
        map: base,
        emissiveMap: glow,
        emissive: new THREE.Color(LAMP_COLORS[kind].on),
        emissiveIntensity: 0,
        roughness: 0.35,
        metalness: 0,
      })
    );
  });
  const chevronTex = plateMats[2].emissiveMap!;
  // The green lamp's pictures flip upside down (about their middle) when the page scrolls up, so the chevrons point,
  // and flow, the way the page is going (setChevronsUp).
  const chevronBase = plateMats[2].map!;
  chevronTex.center.set(0.5, 0.5);
  chevronBase.center.set(0.5, 0.5);
  // The glass in front of it: black, so it adds nothing but its reflections of the studio.
  const glassMat = own(
    new THREE.MeshPhysicalMaterial({
      color: 0x000000,
      roughness: 0.03,
      metalness: 0,
      ior: 1.52,
      clearcoatRoughness: 0.02,
      // Enough to see highlights slide over the lamp, not so much that an unlit lens looks milky.
      envMapIntensity: 0.85,
      clearcoat: 0.6,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  // ---- Geometry (shared between the heads)
  const housingGeo = own(new RoundedBoxGeometry(HEAD.w, HEAD.h, HEAD.d, 6, HEAD.r));
  const doorGeo = own(new RoundedBoxGeometry(HEAD.w - 0.05, HEAD.h - 0.05, 0.02, 4, 0.06));
  const capGeo = own(new RoundedBoxGeometry(HEAD.w * 0.6, 0.024, HEAD.d * 0.62, 2, 0.01));
  const plateGeo = own(new THREE.CircleGeometry(LENS_R, 56));
  const barrelGeo = own(new THREE.CylinderGeometry(BARREL_R, BARREL_R, BARREL_L, 48, 1, true));
  barrelGeo.rotateX(Math.PI / 2);
  const bezelGeo = own(new THREE.TorusGeometry(BARREL_R + 0.003, 0.011, 10, 56));
  // Glass dome: a spherical cap turned to face +z, its rim at z = 0.
  const glassGeo = own(new THREE.SphereGeometry(DOME, 48, 12, 0, Math.PI * 2, 0, DOME_THETA));
  glassGeo.rotateX(Math.PI / 2);
  glassGeo.translate(0, 0, -DOME_BASE);
  const visorGeo = own(visorGeometry());
  const boltGeo = own(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 6));
  boltGeo.rotateX(Math.PI / 2);
  const hingeGeo = own(new THREE.CylinderGeometry(0.015, 0.015, 0.075, 14));
  const armGeo = own(new RoundedBoxGeometry(0.06, 0.036, 0.07, 2, 0.008));
  const clampGeo = own(new THREE.CylinderGeometry(POLE_R * 1.24, POLE_R * 1.24, 0.048, 32));
  const clampBoltGeo = own(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 6));
  clampBoltGeo.rotateX(Math.PI / 2);
  const pupilGeo = own(new THREE.CircleGeometry(EYES.pupil * LENS_R, 24));
  const pupilMat = own(new THREE.MeshBasicMaterial({ color: '#1d1405' }));

  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, cast = false, receive = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
  };

  // ---- The pole (still)
  const pole = new THREE.Group();
  scene.add(pole);
  pole.add(mesh(own(new THREE.CylinderGeometry(POLE_R, POLE_R, POLE_HALF * 2, 40, 1, true)), stripeMat));
  // Collars where the pole sections are joined (a wide band with a thin ring each side).
  const collarGeo = own(new THREE.CylinderGeometry(POLE_R * 1.16, POLE_R * 1.16, 0.04, 36));
  for (let k = -Math.floor(POLE_HALF / COLLAR_STEP); k <= Math.floor(POLE_HALF / COLLAR_STEP); k++) {
    for (const dy of [0, 0.06, -0.06]) {
      const collar = mesh(collarGeo, steelMat);
      collar.position.y = k * COLLAR_STEP + 1.3 + dy;
      if (dy) collar.scale.set(0.95, 0.35, 0.95);
      pole.add(collar);
    }
  }

  // ---- The heads. `swivel` carries them along the pole (it's the scroll thumb) and turns them round it; each
  // head has a `mount` (its clamps, round the pole) and a `joint` it turns on, just off the pole.
  const swivel = new THREE.Group();
  scene.add(swivel);
  const mounts: THREE.Group[] = [];
  const heads: THREE.Group[] = [];
  const bodies: THREE.Group[] = [];
  const plates: THREE.Mesh[] = [];
  const halos: THREE.Sprite[] = [];

  HEADS.forEach(({ y, side }, i) => {
    const mount = new THREE.Group();
    mount.position.y = y;
    swivel.add(mount);
    mounts.push(mount);
    const joint = new THREE.Group();
    joint.position.set(side * JOINT_X, 0, JOINT_Z);
    mount.add(joint);
    heads.push(joint);
    // Everything that moves with the head, placed relative to the head's centre.
    const head = new THREE.Group();
    head.position.set(side * (HEAD_X - JOINT_X), 0, -JOINT_Z);
    joint.add(head);
    bodies.push(head);

    head.add(mesh(housingGeo, housingMat, true));
    const door = mesh(doorGeo, doorMat);
    door.position.z = HEAD.d / 2;
    head.add(door);
    const cap = mesh(capGeo, housingMat, true);
    cap.position.y = HEAD.h / 2 + 0.006;
    head.add(cap);

    // The lamp: plate at the back of the barrel, glass at its front, a bezel round the glass.
    const plate = mesh(plateGeo, plateMats[i]);
    plate.position.z = PLATE_Z;
    head.add(plate);
    plates.push(plate);
    const barrel = mesh(barrelGeo, trimMat);
    barrel.position.z = FRONT + BARREL_L / 2;
    head.add(barrel);
    const bezel = mesh(bezelGeo, steelMat);
    bezel.position.z = FRONT + BARREL_L;
    head.add(bezel);
    const glass = mesh(glassGeo, glassMat, false, false);
    glass.position.z = FRONT + BARREL_L - 0.006;
    glass.renderOrder = 2;
    head.add(glass);

    const visor = mesh(visorGeo, visorMat, true);
    visor.position.z = FRONT - 0.004;
    head.add(visor);

    for (const bx of [-1, 1])
      for (const by of [-1, 1]) {
        const b = mesh(boltGeo, boltMat);
        b.position.set(bx * (HEAD.w / 2 - 0.055), by * (HEAD.h / 2 - 0.055), FRONT + 0.004);
        head.add(b);
      }
    // The door's hinges, on the outer side.
    for (const hy of [-0.14, 0.14]) {
      const h = mesh(hingeGeo, boltMat);
      h.position.set(side * (HEAD.w / 2 + 0.003), hy, HEAD.d / 2 - 0.03);
      head.add(h);
    }

    // Two arms from the housing to its joint, and the clamps round the pole they hang from (the clamps stay
    // square on the pole; only the head turns).
    for (const ay of [-0.14, 0.14]) {
      const arm = mesh(armGeo, housingMat, true);
      arm.position.set(-side * (HEAD.w / 2 + 0.012), ay, -0.03);
      head.add(arm);
      // The pin the head turns on.
      const pin = mesh(hingeGeo, steelMat, true);
      pin.position.set(0, ay, 0);
      pin.scale.set(1.25, 0.65, 1.25);
      joint.add(pin);
      const clamp = mesh(clampGeo, steelMat);
      clamp.position.y = ay;
      mount.add(clamp);
      const cb = mesh(clampBoltGeo, boltMat);
      cb.position.set(0, ay, POLE_R * 1.24 + 0.008);
      mount.add(cb);
    }

    const halo = new THREE.Sprite(
      own(new THREE.SpriteMaterial({ map: glowTex, color: LAMP_COLORS[LAMP_ORDER[i]].on, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }))
    );
    halo.position.z = FRONT + BARREL_L + 0.06;
    halo.scale.setScalar(LENS_R * 4.6);
    halo.visible = false;
    halo.renderOrder = 3;
    head.add(halo);
    halos.push(halo);
  });

  // The yellow lamp's pupils, on its plate (they move to whichever head shows the yellow lamp).
  const pupilGroup = new THREE.Group();
  bodies[1].add(pupilGroup);
  const pupils = [-1, 1].map((s) => {
    const m = new THREE.Mesh(pupilGeo, pupilMat);
    m.position.set(s * EYES.dx * LENS_R, EYES.y * LENS_R, PLATE_Z + 0.003);
    pupilGroup.add(m);
    return m;
  });

  // The VN sign on its bracket, left of the pole beside the red head.
  const signCanvas = paintSign();
  const signTex = tex(signCanvas);
  const signMat = own(
    new THREE.MeshPhysicalMaterial({ map: signTex, emissiveMap: signTex, emissive: '#ffffff', emissiveIntensity: 0.3, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 })
  );
  // It folds away into its clamp like the heads do, so it hangs from a group centred on the pole.
  const signMount = new THREE.Group();
  signMount.position.y = SIGN.y;
  swivel.add(signMount);
  const signArm = new THREE.Group();
  signArm.rotation.order = 'YXZ';
  signMount.add(signArm);
  {
    const box = mesh(own(new RoundedBoxGeometry(SIGN.s, SIGN.s, SIGN.d, 3, 0.014)), housingMat, true);
    box.position.set(SIGN.x, 0, 0);
    signArm.add(box);
    const plate = mesh(own(new THREE.PlaneGeometry(SIGN.s * 0.86, SIGN.s * 0.86)), signMat);
    plate.position.set(SIGN.x, 0, SIGN.d / 2 + 0.002);
    signArm.add(plate);
    const inner = SIGN.x + SIGN.s / 2;
    const arm = mesh(own(new RoundedBoxGeometry(-inner - POLE_R + 0.01, 0.03, 0.03, 2, 0.006)), housingMat, true);
    arm.position.set((inner - POLE_R) / 2, 0, -0.005);
    signArm.add(arm);
    signMount.add(mesh(clampGeo, steelMat));
  }

  // ---- Stickers. Each stays hidden until its art is painted (the logos load from /brand).
  const stickerMat = (map: THREE.Texture) =>
    own(
      new THREE.MeshStandardMaterial({
        map,
        // Printed vinyl reflects less than the white of the canvas suggests: without this the key light and the
        // tone mapping wash the colours out to pastel.
        color: 0xa8a8a8,
        envMapIntensity: 0.55,
        transparent: true,
        alphaTest: 0.05,
        roughness: 0.55,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
  /** A sticker wrapped round the pole at height y, `w` wide and `h` tall, its middle facing `face` radians round
   *  from straight on (negative is towards the page). */
  const poleSticker = (y: number, w: number, h: number, face: number) => {
    const arc = w / POLE_R;
    const geo = own(new THREE.CylinderGeometry(POLE_R + 0.0015, POLE_R + 0.0015, h, 20, 1, true, face - arc / 2, arc));
    const m = new THREE.Mesh(geo);
    m.position.y = y;
    m.visible = false;
    m.receiveShadow = true;
    pole.add(m);
    return m;
  };
  /** A sticker on the outer side of a head. */
  const sideSticker = (head: number, y: number, size: number) => {
    const side = HEADS[head].side;
    const m = new THREE.Mesh(own(new THREE.PlaneGeometry(size, size)));
    m.position.set(side * (HEAD.w / 2 + 0.0015), y, -0.01);
    m.rotation.y = side * (Math.PI / 2);
    m.visible = false;
    m.receiveShadow = true;
    bodies[head].add(m);
    return m;
  };
  const stickers = {
    python: sideSticker(0, 0, 0.13),
    ai: sideSticker(2, 0, 0.13),
  };
  const showSticker = (m: THREE.Mesh, c: HTMLCanvasElement, tilt = 0) => {
    const t = tex(c);
    if (tilt) {
      t.center.set(0.5, 0.5);
      t.rotation = tilt;
    }
    m.material = stickerMat(t);
    m.visible = true;
  };
  showSticker(stickers.ai, paintSticker({ text: 'AI', bg: '#EBDEFC', ink: '#743BBE' }));

  // A run of stickers all the way along the pole, like a well-used street pole (it stays put; the heads slide past
  // them). The pattern repeats down the pole, each one turned and tilted a little differently. Logos wait for their
  // images; tags and shapes are painted straight away.
  const poleBrands: { mesh: THREE.Mesh; file: BrandFile; tilt: number }[] = [];
  {
    let y = 8;
    let k = 0;
    while (y > -8) {
      const s = POLE_STICKERS[k % POLE_STICKERS.length];
      // A slightly different angle and tilt for each, from a fixed sequence (so it's the same every visit).
      const face = -0.38 + Math.sin(k * 2.3) * 0.22;
      const tilt = Math.sin(k * 1.7 + 0.5) * 0.28;
      if (s.kind === 'tag') {
        const h = 0.42;
        const m = poleSticker(y - h / 2, 0.13, h, face);
        showSticker(m, paintTag(s.text, s.bg, s.ink));
        y -= h;
      } else if (s.kind === 'shape') {
        const m = poleSticker(y - 0.08, 0.16, 0.16, face);
        showSticker(m, paintShape(s.shape, s.fill), tilt);
        y -= 0.16;
      } else {
        const m = poleSticker(y - 0.085, 0.17, 0.17, face);
        poleBrands.push({ mesh: m, file: s.file, tilt });
        y -= 0.17;
      }
      y -= 0.4 + ((k * 7) % 3) * 0.08;
      k++;
    }
  }

  // ---- The light inside the lit lamp's visor (placed in world space, at whichever head shows the lit lamp)
  const lampLight = new THREE.PointLight(0xffffff, 0, 1.1, 2);
  scene.add(lampLight);

  // ---- Updates (no allocation in here: these run every frame while something moves)
  const tmpColor = new THREE.Color();
  const lampColors = LAMP_ORDER.map((k) => new THREE.Color(LAMP_COLORS[k].on));
  const tmpV = new THREE.Vector3();
  const tmpW = new THREE.Vector3();
  for (const j of heads) j.rotation.order = 'YXZ';

  /** Which lamp each head shows. Normally its own; with one head left, that head shows the live one. */
  const display = [0, 1, 2];
  /** How far each head is folded away (0 out .. 1 gone), from the last setPose. */
  const retracted = [0, 0, 0];

  const setDisplay = (next: ArrayLike<number>) => {
    let changed = false;
    for (let h = 0; h < 3; h++) {
      if (display[h] === next[h]) continue;
      display[h] = next[h];
      plates[h].material = plateMats[display[h]];
      (halos[h].material as THREE.SpriteMaterial).color.copy(lampColors[display[h]]);
      changed = true;
    }
    if (!changed) return;
    // The pupils go to the head showing the yellow lamp (the least folded one, if two do).
    let best = -1;
    for (let h = 0; h < 3; h++) if (display[h] === 1 && (best < 0 || retracted[h] < retracted[best])) best = h;
    if (best >= 0 && pupilGroup.parent !== bodies[best]) bodies[best].add(pupilGroup);
    pupilGroup.visible = best >= 0;
  };

  /** How lit each lamp is (0..1, a little over 1 while it flares on). */
  const setLevels = (levels: ArrayLike<number>) => {
    let sum = 0;
    tmpV.set(0, 0, 0);
    tmpColor.setRGB(0, 0, 0);
    for (let i = 0; i < 3; i++) plateMats[i].emissiveIntensity = ON_INTENSITY * levels[i];
    for (let h = 0; h < 3; h++) {
      const l = levels[display[h]] * (1 - retracted[h]);
      halos[h].visible = l > 0.003;
      (halos[h].material as THREE.SpriteMaterial).opacity = Math.min(0.8, HALO_OPACITY * l);
      if (l <= 0.003) continue;
      sum += l;
      plates[h].getWorldPosition(tmpW);
      tmpV.addScaledVector(tmpW, l);
      const c = lampColors[display[h]];
      tmpColor.r += c.r * l;
      tmpColor.g += c.g * l;
      tmpColor.b += c.b * l;
    }
    if (sum > 0.001) {
      lampLight.position.copy(tmpV.multiplyScalar(1 / sum));
      lampLight.position.z += 0.12;
      lampLight.position.y += 0.03;
      lampLight.color.copy(tmpColor.multiplyScalar(1 / sum));
    }
    // Always in the scene, just dimmed to nothing when no lamp is lit: in three.js a light appearing or
    // disappearing switches every material's shader, which froze a frame each time a lamp first lit.
    lampLight.intensity = sum > 0.003 ? LAMP_LIGHT * Math.min(1.2, sum) : 0;
  };

  /**
   * Everything that moves:
   * - thumb: where the heads sit on the pole, as the assembly's centre in canvas px from the top;
   * - yaw: the heads all turning round the pole together (towards the cursor);
   * - nod / swing: each head tipping and turning on its own joint (scrolling, dragging);
   * - push: each head clicking forward on its arms when its lamp comes on (0..1);
   * - retract: each head folding back into its clamp and shrinking away (0 out .. 1 gone);
   * - gather: each head sliding to the middle of the assembly (0..1; the one that stays when the others fold);
   * - sign: the VN sign folding away (0..1).
   */
  const setPose = (p: Pose) => {
    const y = (canvasH / 2 - p.thumb) * unit;
    swivel.position.y = y;
    swivel.rotation.y = p.yaw;
    key.target.position.set(0, y, 0);
    key.position.set(KEY_OFFSET.x, y + KEY_OFFSET.y, KEY_OFFSET.z);
    for (let i = 0; i < 3; i++) {
      const side = HEADS[i].side;
      const r = Math.min(1, Math.max(0, p.retract[i]));
      retracted[i] = r;
      mounts[i].position.y = HEADS[i].y * (1 - p.gather[i]);
      const joint = heads[i];
      // Folding away eases in: it turns most of the way back before it finally shrinks.
      joint.rotation.y = side * (p.swing[i] + r * FOLD);
      joint.rotation.x = BASE_TILT + p.nod[i];
      const s = 1 - r * r;
      bodies[i].scale.setScalar(Math.max(0.001, s));
      bodies[i].position.z = -JOINT_Z + p.push[i] * PUSH;
      joint.visible = s > 0.01;
    }
    const sr = Math.min(1, Math.max(0, p.sign));
    signArm.rotation.y = -sr * FOLD;
    signArm.scale.setScalar(Math.max(0.001, 1 - sr * sr));
    signArm.visible = sr < 0.99;
  };

  /** Where the yellow lamp's pupils look: x, y in -1..1 (+y up). */
  const setPupils = (x: number, y: number) => {
    for (let k = 0; k < 2; k++) {
      const s = k === 0 ? -1 : 1;
      pupils[k].position.x = (s * EYES.dx + x * EYES.travel) * LENS_R;
      pupils[k].position.y = (EYES.y + y * EYES.travel) * LENS_R;
    }
  };

  /** Moves the green lamp's chevrons along by `d` (in lens heights), the way they point. */
  const scrollChevrons = (d: number) => {
    chevronTex.offset.y = (chevronTex.offset.y + d) % 1;
  };

  /** Points the green lamp's chevrons up (the page is scrolling up) or down. */
  const setChevronsUp = (up: boolean) => {
    const r = up ? -1 : 1;
    if (chevronTex.repeat.y === r) return;
    chevronTex.repeat.y = r;
    chevronBase.repeat.y = r;
  };

  const setTheme = (t: SignalTheme) => {
    const c = THEMES[t];
    housingMat.color.set(c.housing);
    visorMat.color.set(c.housing);
    doorMat.color.set(c.housing);
    key.intensity = c.key;
    fill.intensity = c.fill;
    rim.intensity = c.rim;
    rim.color.set(c.rimColor);
    scene.environmentIntensity = c.env;
  };
  setTheme(theme);

  const setBrandImages = (imgs: BrandImages) => {
    const py = imgs.python;
    if (py && !stickers.python.visible) showSticker(stickers.python, paintSticker(py));
    // One painted sticker per logo, shared by every copy of it down the pole.
    const painted = new Map<BrandFile, HTMLCanvasElement>();
    for (const b of poleBrands) {
      const img = imgs[b.file];
      if (!img || b.mesh.visible) continue;
      let c = painted.get(b.file);
      if (!c) {
        c = paintSticker(img);
        painted.set(b.file, c);
      }
      showSticker(b.mesh, c, b.tilt);
    }
  };

  /** Redraws the VN sign (once its font has loaded). */
  const repaintSign = () => {
    paintSign(signCanvas);
    signTex.needsUpdate = true;
  };

  /** The canvas size (CSS px), pixel ratio, how big the light is drawn (CSS px per scene unit), and how far the
   *  pole's centre is from the canvas's right edge (CSS px). */
  const setSize = (w: number, h: number, dpr: number, pxPerUnit: number, poleInset: number) => {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    unit = 1 / pxPerUnit;
    canvasH = h;
    const worldH = h * unit;
    const dist = worldH * CAM_DIST_PER_H;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(worldH / 2 / dist));
    // Square on, but off to the left of the pole, so the pole lands near the canvas's right edge.
    camera.position.set((poleInset - w / 2) * unit, 0, dist);
    camera.far = dist * 4;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  /**
   * Where lamp i shows on the canvas (CSS px from its top-left), at whichever head shows it. Returns how visible
   * that head is (0 when no head shows that lamp). Valid after a render.
   */
  const lampOnCanvas = (i: number, w: number, h: number, out: { x: number; y: number }) => {
    let best = -1;
    for (let k = 0; k < 3; k++) if (display[k] === i && (best < 0 || retracted[k] < retracted[best])) best = k;
    if (best < 0) return 0;
    plates[best].getWorldPosition(tmpV).project(camera);
    out.x = ((tmpV.x + 1) / 2) * w;
    out.y = ((1 - tmpV.y) / 2) * h;
    return 1 - retracted[best];
  };

  /** The heads' half-height above and below the thumb centre, in CSS px (all three, or one gathered head). */
  const assemblyHalf = (gathered: boolean) =>
    (gathered ? HEAD.h / 2 + 0.06 : Math.max(SIGN.y + SIGN.s / 2, HEADS[0].y + HEAD.h / 2) + 0.06) / unit;

  const render = () => renderer.render(scene, camera);

  /**
   * Prepares every shader and texture in the background (while the loading screen is up), so the first frames
   * don't stall the page: three.js would otherwise build them the first time each part is drawn. Hidden parts are
   * shown for the moment it takes, since only visible things get prepared.
   */
  /** Runs `fn` with every part showing and drawn even if it's out of view (the heads start folded into the pole,
   *  the stickers run down the pole off the camera), then puts things back. */
  const allShowing = async (fn: () => void | Promise<void>) => {
    const hidden: THREE.Object3D[] = [];
    const culled: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
      if (o.frustumCulled) {
        culled.push(o);
        o.frustumCulled = false;
      }
    });
    try {
      await fn();
    } finally {
      for (const o of hidden) o.visible = false;
      for (const o of culled) o.frustumCulled = true;
    }
  };

  /**
   * Draws every part once, so each shape and texture is uploaded and each shader (the shadow pass too) is built
   * now, behind the loading screen, not on the opening's first frames. Call again after adding parts.
   */
  const prime = () =>
    allShowing(() => {
      renderer.render(scene, camera);
    });

  const warm = async () => {
    try {
      await allShowing(async () => {
        await compileShaders(renderer, scene, camera, () => !disposed);
        if (disposed) return;
        scene.traverse((o) => {
          const mats = (o as THREE.Mesh).material;
          for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
            for (const v of Object.values(m)) if (v && (v as THREE.Texture).isTexture) renderer.initTexture(v as THREE.Texture);
          }
        });
        renderer.render(scene, camera);
      });
    } catch {
      // Not ready in time: they're built on first use instead.
    }
  };

  let disposed = false;
  const dispose = () => {
    disposed = true;
    scene.traverse((o) => {
      // (Sprites share one geometry across the whole page: leave it.)
      if ((o as THREE.Sprite).isSprite) return;
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    key.shadow.map?.dispose();
    for (const d of disposables) d.dispose();
    renderer.dispose();
  };

  return {
    renderer,
    render,
    warm,
    prime,
    setSize,
    setLevels,
    setPose,
    setDisplay,
    setPupils,
    scrollChevrons,
    setChevronsUp,
    setTheme,
    setBrandImages,
    repaintSign,
    lampOnCanvas,
    assemblyHalf,
    dispose,
  };
}

/** The pose setPose() takes (see there). Reuse one object: it's read, never kept. */
export type Pose = {
  thumb: number;
  yaw: number;
  nod: number[];
  swing: number[];
  push: number[];
  retract: number[];
  gather: number[];
  sign: number;
};

/** Which heads sit on which side of the pole (+1 right, -1 left), top to bottom. */
export const HEAD_SIDES = HEADS.map((h) => h.side);
