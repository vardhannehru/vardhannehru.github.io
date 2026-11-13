import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { canvasDpr, PHONE_DPR } from '../ui/device';
import { compileShaders } from '../ui/compileShaders';

// The certificate drawer (CertificateDrawer.tsx): a green enamel steel filing cabinet seen from above, its top drawer
// pulled out towards you, a block of paper inside with the certificates lying on top. One number drives it all
// (setProgress, 0..1, from the scroll): the drawer slides out, then the certificates lift out one by one and land,
// overlapping, on the cabinet top, while the camera follows from the drawer to the cabinet top. Built like the other
// scenes here (trafficLightScene.ts, pencilScene.ts): one function makes everything and hands back what moves, plus
// dispose(). It only renders when something has changed.
//
// World units: x across, y up, z towards the viewer. The cabinet's front face is at z = 0, its top at y = 0.

export type DrawerCert = { src: string; aspect: number };

export type DrawerScene = {
  setProgress(t: number): void;
  resize(w: number, h: number): void;
  /** The certificate under a point on the canvas (CSS px from its top-left), or -1. Only landed ones count. */
  pick(x: number, y: number): number;
  setHover(i: number): void;
  /** Where the pointer is on the canvas (CSS px): the certificate being pointed at tips a little towards it. */
  setPointer(x: number, y: number): void;
  setActive(on: boolean): void;
  dispose(): void;
};

// ---- Timing, as fractions of the whole scroll ----------------------------------------------------------------------
// The camera starts in front of the cabinet and swings up over it to look down (SWING), while the drawer slides out
// (OPEN); then the certificates come out one by one (CARD).
const SWING_START = 0.04;
const SWING_END = 0.24;
const OPEN_START = 0.08;
const OPEN_END = 0.27;
const CARD_START = 0.28;
const CARD_STEP = 0.085;
const CARD_DUR = 0.15;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** How far the drawer is open (0..1) at scroll progress t. */
export const drawerOpen = (t: number) => smoother(clamp01((t - OPEN_START) / (OPEN_END - OPEN_START)));
/** Where the drawer actually is (in drawer-lengths): it runs a hair past its stop and settles back, like a real runner. */
const drawerSlide = (t: number) => {
  const u = clamp01((t - OPEN_START) / (OPEN_END - OPEN_START));
  return smoother(u) + 0.012 * Math.sin(Math.PI * clamp01((u - 0.8) / 0.2));
};
/** How hard the drawer is being pulled (0..1): loose things inside lag behind by this much. */
const drawerPull = (t: number) => {
  const u = clamp01((t - OPEN_START) / (OPEN_END - OPEN_START));
  return (30 * u * u * (1 - u) * (1 - u)) / 1.875;
};
/** How far certificate i has come out (0 = in the drawer, 1 = landed on the cabinet top) at scroll progress t. */
export const certOut = (t: number, i: number) => clamp01((t - (CARD_START + i * CARD_STEP)) / CARD_DUR);

// ---- Sizes ---------------------------------------------------------------------------------------------------------
const CAB_W = 4.4;
const CAB_D = 4.2;
const CAB_H = 4.0;
const TRAVEL = 3.3; // how far the drawer slides out
const TRAY_W = 4.0;
const TRAY_D = 3.55;
const FLOOR_Y = -0.84;
const WALL_TOP = -0.13;
const CARD_W = 1.55;
const CARD_T = 0.012;
const CARD_GAP = 0.015; // between one certificate and the next in a pile
const BLOCK = { w: 2.5, h: 0.13, d: 1.85, z: -1.85 }; // the blank paper in the drawer (z from the drawer's front)

// Where each certificate lands on the cabinet top, overlapping its neighbours, with a little twist.
type Spot = { x: number; z: number; yaw: number };
const YAW = [-0.07, 0.05, -0.04, 0.08, -0.06, 0.04, -0.05, 0.06];
/** How much bigger a certificate is once it has landed (they're spread out large across the top, overhanging it). */
const LAND_SCALE = { desktop: 1.38, phone: 1.12 };
/** Pointed at, a landed certificate rises towards you and grows by this much on top. */
const HOVER_GROW = 0.04;
/** ...and comes this far of the way up towards the camera, and this far towards the middle of the screen, turning to
 *  face you, so it can be read. */
const HOVER_RISE = 0.34;
const HOVER_CENTRE = 0.2;
function landingSpots(n: number, phone: boolean): Spot[] {
  const spots: Spot[] = [];
  for (let i = 0; i < n; i++) {
    let x: number;
    let z: number;
    if (phone) {
      // Two columns, top to bottom; an odd last one in the middle.
      const row = Math.floor(i / 2);
      const lastAlone = i === n - 1 && n % 2 === 1;
      x = lastAlone ? 0 : i % 2 === 0 ? -0.84 : 0.84;
      z = -3.75 + row * 1.05;
    } else {
      // Four across the back, the rest across the front, slightly overlapping.
      const back = Math.min(4, n);
      if (i < back) {
        x = (i - (back - 1) / 2) * 1.8;
        z = -3.2;
      } else {
        const front = n - back;
        x = (i - back - (front - 1) / 2) * 1.8;
        z = -1.62;
      }
    }
    spots.push({ x: x + Math.sin(i * 7.3) * 0.05, z: z + Math.cos(i * 5.1) * 0.05, yaw: YAW[i % YAW.length] });
  }
  return spots;
}

// The front view: the camera faces the cabinet's front, a little above it, framing the whole cabinet.
// (It starts from above and in front, 40° up, so the whole move to the top view is a gentle tip forward, never a
// swing round from eye level: the view is from above all the way through.)
const FRONT = { target: new THREE.Vector3(0, -1.25, -1.2), elevation: THREE.MathUtils.degToRad(40), hx: 2.75, hy: 3.05 };

// What the camera frames from above: a centre (z) and the half-width and half-depth to fit, at each stage.
type Frame = { cz: number; hx: number; hz: number };
/** The camera's angle once the certificates have landed: looking down from above, as through the rest of it. */
const LANDED_ELEV = Math.atan2(1, 0.16);
const FRAMES = {
  // (The landed frame leaves room at the top for the site's navigation bar.)
  desktop: { closed: { cz: -0.6, hx: 3.0, hz: 2.9 }, open: { cz: 0.85, hx: 2.7, hz: 3.3 }, landed: { cz: -2.5, hx: 2.95, hz: 2.1 } },
  phone: { closed: { cz: -0.6, hx: 2.45, hz: 3.0 }, open: { cz: 0.85, hx: 2.45, hz: 3.35 }, landed: { cz: -2.25, hx: 1.95, hz: 2.45 } },
};

// Fine lines for the edges of the paper block, like a stack of sheets.
function paperEdgeTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4f2ee';
  g.fillRect(0, 0, 4, 128);
  for (let y = 0; y < 128; y += 4) {
    g.fillStyle = y % 8 ? '#dedad3' : '#e8e5df';
    g.fillRect(0, y, 4, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/** Grey noise, `cells` across, smoothed up to `size`: the orange-peel of sprayed enamel, or the tooth of paper. */
function grainTexture(size: number, cells: number, lo: number, hi: number) {
  const small = makeCanvas(cells, cells);
  const sg = small.getContext('2d')!;
  const img = sg.createImageData(cells, cells);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = lo + Math.random() * (hi - lo);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  sg.putImageData(img, 0, 0);
  const c = makeCanvas(size, size);
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = true;
  g.drawImage(small, 0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Darkness gathering along the edges of a floor (`edges`) or at the foot of a wall: painted-in ambient occlusion. */
function occlusionTexture(kind: 'edges' | 'foot') {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d')!;
  const fade = (x0: number, y0: number, x1: number, y1: number, a: number) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, `rgba(0,12,4,${a})`);
    gr.addColorStop(1, 'rgba(0,12,4,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  };
  if (kind === 'edges') {
    fade(0, 0, 46, 0, 0.6);
    fade(256, 0, 210, 0, 0.6);
    fade(0, 0, 0, 46, 0.6);
    fade(0, 256, 0, 200, 0.7);
  } else {
    fade(0, 256, 0, 90, 0.62);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A soft dark rectangle: the shadow right under a sheet of paper. */
function blobTexture() {
  const c = makeCanvas(160, 160);
  const g = c.getContext('2d')!;
  g.shadowColor = 'rgba(0,0,0,0.95)';
  g.shadowBlur = 26;
  g.fillStyle = 'rgba(0,0,0,0.9)';
  g.fillRect(34, 34, 92, 92);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A sticky note or tab label: a few handwritten lines on coloured paper, a little darker towards the bottom. */
function noteTexture(lines: string[], bg: string, ink: string, size = 54) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0.16)');
  gr.addColorStop(1, 'rgba(0,0,0,0.1)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = ink;
  g.font = `italic 600 ${size}px 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const gap = size * 1.25;
  lines.forEach((l, k) => g.fillText(l, 128, 128 + (k - (lines.length - 1) / 2) * gap, 226));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** The printed card in a label holder: a big title and a small line under it, on cream paper. */
function labelTexture(title: string, sub: string, onReady: () => void) {
  const c = makeCanvas(1024, 276);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const draw = () => {
    const g = c.getContext('2d')!;
    g.fillStyle = '#f3eee2';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(20,70,40,0.08)';
    g.lineWidth = 2;
    for (let y = 46; y < c.height; y += 46) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(c.width, y);
      g.stroke();
    }
    g.textAlign = 'center';
    g.fillStyle = '#123d22';
    g.font = "150px Anton, 'Arial Narrow', sans-serif";
    g.fillText(title, c.width / 2, 172, c.width - 90);
    g.fillStyle = '#3f5c48';
    g.font = "600 38px 'Geist Mono', ui-monospace, monospace";
    g.fillText(sub, c.width / 2, 238, c.width - 90);
    tex.needsUpdate = true;
    onReady();
  };
  draw();
  // Redraw once the display font has loaded (the page loads it; the canvas only sees it when ready).
  document.fonts?.load("150px Anton").then(draw, () => undefined);
  return tex;
}

/** Words as a sticker: white Anton letters on a lavender-ink pill. */
async function textArt(text: string) {
  await document.fonts?.load('120px Anton').catch(() => undefined);
  const font = "120px Anton, 'Arial Narrow', sans-serif";
  const probe = makeCanvas(8, 8).getContext('2d')!;
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width) + 110;
  const h = 190;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d')!;
  g.fillStyle = '#743BBE';
  g.beginPath();
  g.roundRect(0, 0, w, h, h / 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 6);
  return c;
}

/**
 * A die-cut sticker: the image (or `text:WORDS`) with a thick white border following its outline and a soft shadow,
 * as a texture, plus its width/height.
 */
async function stickerTexture(src: string): Promise<{ tex: THREE.CanvasTexture; aspect: number } | null> {
  let art: CanvasImageSource;
  let w: number;
  let h: number;
  if (src.startsWith('text:')) {
    const c = await textArt(src.slice(5));
    art = c;
    w = c.width;
    h = c.height;
  } else {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    try {
      await img.decode();
    } catch {
      return null;
    }
    art = img;
    w = img.naturalWidth;
    h = img.naturalHeight;
  }
  const s = Math.min(1, 560 / Math.max(w, h));
  const aw = Math.round(w * s);
  const ah = Math.round(h * s);
  const border = Math.round(Math.max(aw, ah) * 0.032) + 5;
  const pad = border + 16;
  const W = aw + pad * 2;
  const H = ah + pad * 2;
  // The art's silhouette, in white...
  const sil = makeCanvas(W, H);
  const sg = sil.getContext('2d')!;
  sg.drawImage(art, pad, pad, aw, ah);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = '#ffffff';
  sg.fillRect(0, 0, W, H);
  // ...stamped round in a circle to make the border...
  const outline = makeCanvas(W, H);
  const og = outline.getContext('2d')!;
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    og.drawImage(sil, Math.cos(a) * border, Math.sin(a) * border);
  }
  og.drawImage(sil, 0, 0);
  // ...then the border with its shadow, and the art on top.
  const c = makeCanvas(W, H);
  const g = c.getContext('2d')!;
  g.save();
  g.shadowColor = 'rgba(10,30,15,0.35)';
  g.shadowBlur = 12;
  g.shadowOffsetY = 5;
  g.drawImage(outline, 0, 0);
  g.restore();
  g.drawImage(art, pad, pad, aw, ah);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, aspect: W / H };
}

/** A chrome wire handle: a U standing out from a drawer front at height y, with two little mounting plates. */
function makeHandle(chrome: THREE.Material, y: number, z0: number, screw?: THREE.Material) {
  const g = new THREE.Group();
  const pts = [
    new THREE.Vector3(-0.55, y, z0),
    new THREE.Vector3(-0.55, y, z0 + 0.14),
    new THREE.Vector3(-0.49, y, z0 + 0.2),
    new THREE.Vector3(0.49, y, z0 + 0.2),
    new THREE.Vector3(0.55, y, z0 + 0.14),
    new THREE.Vector3(0.55, y, z0),
  ];
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 48, 0.024, 10, false), chrome);
  tube.castShadow = true;
  g.add(tube);
  for (const x of [-0.55, 0.55]) {
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.17, 0.025, 2, 0.008), chrome);
    plate.position.set(x, y, z0 + 0.012);
    plate.castShadow = true;
    g.add(plate);
    // A screw head above and below the wire.
    if (screw) {
      for (const dy of [-0.055, 0.055]) {
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 14), screw);
        head.rotation.x = Math.PI / 2;
        head.position.set(x, y + dy, z0 + 0.028);
        g.add(head);
      }
    }
  }
  return g;
}

export function createDrawerScene(canvas: HTMLCanvasElement, certs: DrawerCert[], opts: { phone: boolean }): DrawerScene {
  let phone = opts.phone;
  const n = certs.length;
  let disposed = false;
  // Set whenever something changes; the next frame redraws (declared first: textures can ask for a redraw while the
  // scene is still being built).
  let dirty = true;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  pmrem.dispose();
  scene.environment = envTex;
  scene.environmentIntensity = 0.42;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // Light: a soft key from the upper left, casting the shadows, and a little fill.
  const key = new THREE.DirectionalLight(0xfff6ea, 2.1);
  key.position.set(-4.5, 11, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  key.target.position.set(0, -1, 0);
  scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight(0xfdfbff, 0x2f4034, 0.32));
  // A cool light from behind and low on the right picks out edges, rims and the chrome; a faint warm one from the
  // front lifts the drawer fronts. Neither casts shadows.
  const rim = new THREE.DirectionalLight(0xcfd8ff, 0.9);
  rim.position.set(6, 3.5, -7);
  const front = new THREE.DirectionalLight(0xffe9d2, 0.35);
  front.position.set(1.5, 2, 9);
  scene.add(rim, front);

  const disposables: { dispose(): void }[] = [envTex];
  const track = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  // ---- Materials ---------------------------------------------------------------------------------------------------
  // Sprayed enamel: a soft orange-peel in the surface and uneven gloss, so highlights break up like real paint.
  const peel = track(grainTexture(256, 48, 96, 160));
  peel.repeat.set(5, 5);
  const enamel = track(
    new THREE.MeshPhysicalMaterial({
      color: '#16702f',
      roughness: 0.68,
      roughnessMap: peel,
      bumpMap: peel,
      bumpScale: 0.12,
      metalness: 0.2,
      clearcoat: 0.9,
      clearcoatRoughness: 0.2,
    })
  );
  const enamelInside = track(
    new THREE.MeshPhysicalMaterial({
      color: '#13612a',
      roughness: 0.95,
      roughnessMap: peel,
      bumpMap: peel,
      bumpScale: 0.18,
      metalness: 0.14,
      clearcoat: 0.4,
      clearcoatRoughness: 0.36,
    })
  );
  const chrome = track(new THREE.MeshStandardMaterial({ color: '#dfe3e8', metalness: 1, roughness: 0.16 }));
  const steel = track(new THREE.MeshStandardMaterial({ color: '#aeb4bd', metalness: 0.95, roughness: 0.38 }));
  const screwMat = track(new THREE.MeshStandardMaterial({ color: '#7d838c', metalness: 1, roughness: 0.42 }));
  const edgeTex = track(paperEdgeTexture());
  const tooth = track(grainTexture(256, 256, 104, 152)); // the tooth of paper
  tooth.repeat.set(3, 3);
  const paperEdge = track(new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.92 }));
  const paperTop = track(new THREE.MeshStandardMaterial({ color: '#f7f5f1', roughness: 0.9, bumpMap: tooth, bumpScale: 0.25 }));
  const paperBack = track(new THREE.MeshStandardMaterial({ color: '#f1efea', roughness: 0.92 }));
  const paper = (color: string) => track(new THREE.MeshStandardMaterial({ color, roughness: 0.88, bumpMap: tooth, bumpScale: 0.3 }));

  const solid = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number) => {
    const m = new THREE.Mesh(track(geo), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // ---- The cabinet (stays put) -------------------------------------------------------------------------------------
  const cabinet = new THREE.Group();
  cabinet.add(solid(new RoundedBoxGeometry(CAB_W, 0.08, CAB_D, 3, 0.025), enamel, 0, -0.04, -CAB_D / 2)); // top
  for (const s of [-1, 1]) cabinet.add(solid(new RoundedBoxGeometry(0.07, CAB_H, CAB_D, 2, 0.02), enamel, s * (CAB_W / 2 - 0.035), -CAB_H / 2, -CAB_D / 2));
  cabinet.add(solid(new THREE.BoxGeometry(CAB_W, CAB_H, 0.06), enamel, 0, -CAB_H / 2, -CAB_D + 0.03)); // back
  // The lower drawer's front, closed, with its own handle.
  cabinet.add(solid(new RoundedBoxGeometry(CAB_W - 0.1, CAB_H - 1.12, 0.07, 3, 0.02), enamel, 0, -1.1 - (CAB_H - 1.12) / 2, 0.035));
  cabinet.add(makeHandle(chrome, -1.65, 0.07, screwMat));
  // A chrome trim along the top's front edge, and the dark inside of the cabinet behind the drawer.
  cabinet.add(solid(new RoundedBoxGeometry(CAB_W - 0.02, 0.022, 0.03, 2, 0.008), chrome, 0, -0.085, 0.012));
  const cavity = track(new THREE.MeshStandardMaterial({ color: '#07160c', roughness: 1 }));
  cabinet.add(solid(new THREE.BoxGeometry(CAB_W - 0.16, 0.02, CAB_D - 0.1), cavity, 0, -1.08, -CAB_D / 2)); // the shelf under the drawer
  // The runners: a steel channel fixed inside each cabinet wall, and a middle section that telescopes out at half
  // the drawer's speed (the third section rides on the drawer).
  const midRails: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    cabinet.add(solid(new THREE.BoxGeometry(0.035, 0.11, CAB_D - 0.5), steel, s * (CAB_W / 2 - 0.09), -0.52, -CAB_D / 2));
    const mid = solid(new THREE.BoxGeometry(0.028, 0.075, TRAY_D - 0.3), steel, s * (TRAY_W / 2 + 0.062), -0.52, -TRAY_D / 2);
    midRails.push(mid);
    scene.add(mid);
  }
  scene.add(cabinet);

  // The floor: invisible, it only catches shadows (the page shows through).
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(60, 60)), track(new THREE.ShadowMaterial({ opacity: 0.28 })));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -CAB_H;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---- The drawer (slides along z) ---------------------------------------------------------------------------------
  const drawer = new THREE.Group();
  const wallH = WALL_TOP - FLOOR_Y;
  const wallY = (WALL_TOP + FLOOR_Y) / 2;
  drawer.add(solid(new THREE.BoxGeometry(TRAY_W, 0.04, TRAY_D), enamelInside, 0, FLOOR_Y, -TRAY_D / 2)); // floor
  for (const s of [-1, 1]) {
    drawer.add(solid(new THREE.BoxGeometry(0.05, wallH, TRAY_D), enamelInside, s * (TRAY_W / 2 - 0.025), wallY, -TRAY_D / 2)); // side wall
    drawer.add(solid(new RoundedBoxGeometry(0.13, 0.03, TRAY_D, 2, 0.012), enamel, s * (TRAY_W / 2 - 0.065), WALL_TOP, -TRAY_D / 2)); // its rolled-in lip
  }
  drawer.add(solid(new THREE.BoxGeometry(TRAY_W, wallH, 0.05), enamelInside, 0, wallY, -TRAY_D + 0.025)); // back wall
  // The front: a panel a little wider than the tray, its inner lip, and the handle.
  drawer.add(solid(new RoundedBoxGeometry(CAB_W - 0.1, 0.95, 0.07, 3, 0.022), enamel, 0, -0.555, 0.035));
  drawer.add(solid(new RoundedBoxGeometry(TRAY_W, 0.03, 0.12, 2, 0.012), enamel, 0, -0.1, -0.06));
  drawer.add(makeHandle(chrome, -0.5, 0.07, screwMat));
  // More of the drawer's make: a rolled lip along the back, the runner section fixed to each side, a row of rivets
  // along the side lips, and corner brackets inside.
  drawer.add(solid(new RoundedBoxGeometry(TRAY_W, 0.03, 0.12, 2, 0.012), enamel, 0, WALL_TOP, -TRAY_D + 0.06));
  const rivetGeo = track(new THREE.SphereGeometry(0.02, 12, 8));
  for (const s of [-1, 1]) {
    drawer.add(solid(new THREE.BoxGeometry(0.022, 0.05, TRAY_D - 0.1), steel, s * (TRAY_W / 2 + 0.03), -0.52, -TRAY_D / 2));
    for (let k = 0; k < 6; k++) {
      const r = new THREE.Mesh(rivetGeo, chrome);
      r.scale.y = 0.45;
      r.position.set(s * (TRAY_W / 2 - 0.065), WALL_TOP + 0.016, -0.3 - k * 0.59);
      drawer.add(r);
    }
    for (const z of [-0.09, -TRAY_D + 0.09]) drawer.add(solid(new THREE.BoxGeometry(0.09, wallH - 0.06, 0.09), enamelInside, s * (TRAY_W / 2 - 0.09), wallY, z));
  }
  // Painted-in ambient occlusion: the floor darkens towards the walls, and the walls towards the floor.
  const F = FLOOR_Y + 0.02; // the top of the drawer's floor
  const shade = (tex: THREE.Texture, opacity = 1) =>
    track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  const edgesAO = track(occlusionTexture('edges'));
  const footAO = track(occlusionTexture('foot'));
  const blob = track(blobTexture());
  const floorAO = new THREE.Mesh(track(new THREE.PlaneGeometry(TRAY_W - 0.1, TRAY_D - 0.05)), shade(edgesAO));
  floorAO.rotation.x = -Math.PI / 2;
  floorAO.position.set(0, F + 0.0015, -TRAY_D / 2);
  floorAO.renderOrder = 1;
  drawer.add(floorAO);
  const wallAO = shade(footAO);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(track(new THREE.PlaneGeometry(TRAY_D - 0.05, wallH)), wallAO);
    w.rotation.y = -s * (Math.PI / 2);
    w.position.set(s * (TRAY_W / 2 - 0.052), wallY, -TRAY_D / 2);
    w.renderOrder = 1;
    drawer.add(w);
  }
  const backAO = new THREE.Mesh(track(new THREE.PlaneGeometry(TRAY_W - 0.1, wallH)), wallAO);
  backAO.position.set(0, wallY, -TRAY_D + 0.052);
  backAO.renderOrder = 1;
  drawer.add(backAO);
  /** A soft shadow lying on the drawer floor under something w × d. */
  const floorShadow = (x: number, z: number, w: number, d: number, opacity = 0.55, yaw = 0) => {
    const m = new THREE.Mesh(track(new THREE.PlaneGeometry(w * 1.5, d * 1.5)), shade(blob, opacity));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = yaw;
    m.position.set(x, F + 0.003, z);
    m.renderOrder = 1;
    drawer.add(m);
  };

  // The block of blank paper, a couple of loose sheets lying askew on it, and its shadow.
  floorShadow(0, BLOCK.z, BLOCK.w, BLOCK.d, 0.6);
  drawer.add(solid(new THREE.BoxGeometry(BLOCK.w, BLOCK.h, BLOCK.d), [paperEdge, paperEdge, paperTop, paperBack, paperEdge, paperEdge], 0, F + BLOCK.h / 2, BLOCK.z));
  const blockTop = F + BLOCK.h;
  [
    { x: 0.05, z: 0.04, yaw: 0.045 },
    { x: -0.06, z: -0.03, yaw: -0.03 },
  ].forEach((s, k) => {
    const sheet = solid(new THREE.BoxGeometry(BLOCK.w - 0.08, 0.004, BLOCK.d - 0.06), [paperBack, paperBack, paperTop, paperBack, paperBack, paperBack], s.x, blockTop + 0.003 + k * 0.005, BLOCK.z + s.z);
    sheet.rotation.y = s.yaw;
    drawer.add(sheet);
  });
  const pileBase = blockTop + 0.014; // where the certificates' pile starts

  // ---- The rest of what's in the drawer ----------------------------------------------------------------------------
  // So it isn't only certificates in there: hanging files across the back, flat folders down the left, a notebook
  // and pencil down the right, and sticky notes, stickers and paper clips along the front. The small loose things
  // (`loose`) slide back a touch when the drawer is pulled.
  const loose = new THREE.Group();
  drawer.add(loose);
  const kraft = paper('#d2ad74');
  const pastel = ['#c9b3f5', '#9fd8d6', '#f6cf55', '#f2a7b8'].map(paper);
  const labelWhite = paper('#fbfaf6');
  /** A flat thing lying on the drawer floor (or at height y), with its shadow. */
  const lay = (parent: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x: number, z: number, yaw = 0, y = F) => {
    const m = solid(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z);
    m.rotation.y = yaw;
    parent.add(m);
    return m;
  };
  const topped = (top: THREE.Material, side: THREE.Material) => [side, side, top, side, side, side];

  // Hanging files across the back, leaning, each with a labelled tab.
  const fileMats = [kraft, pastel[0], pastel[1], kraft, pastel[2]];
  fileMats.forEach((mat, k) => {
    const file = new THREE.Group();
    file.add(solid(new THREE.BoxGeometry(3.66, 0.56, 0.02), mat, 0, 0.28, 0));
    const tabX = -1.35 + k * 0.66;
    file.add(solid(new THREE.BoxGeometry(0.56, 0.09, 0.024), mat, tabX, 0.6, 0));
    const label = new THREE.Mesh(track(new THREE.PlaneGeometry(0.46, 0.06)), labelWhite);
    label.position.set(tabX, 0.6, 0.0135);
    file.add(label);
    // The steel hanging rod along the top.
    file.add(solid(new THREE.BoxGeometry(3.74, 0.014, 0.012), steel, 0, 0.565, -0.012));
    file.position.set(0, F, -2.92 - k * 0.095);
    file.rotation.x = -0.2 + k * 0.03;
    drawer.add(file);
  });
  floorShadow(0, -3.2, 3.5, 0.5, 0.5);

  // Flat folders down the left, a little askew, the top one stamped.
  floorShadow(-1.6, -1.85, 0.6, 1.7, 0.5);
  [kraft, pastel[1], pastel[0]].forEach((mat, k) => {
    lay(drawer, 0.58, 0.014, 1.66, mat, -1.6 + Math.sin(k * 2.1) * 0.025, -1.85 + Math.cos(k * 1.7) * 0.04, Math.sin(k * 3.3) * 0.035, F + k * 0.015);
  });
  lay(drawer, 0.2, 0.014, 0.07, pastel[0], -1.42, -1.0, 0, F + 0.03); // its tab

  // A notebook down the right, with an elastic band, and a pencil beside it.
  floorShadow(1.6, -1.55, 0.56, 0.86, 0.55);
  const cover = track(new THREE.MeshStandardMaterial({ color: '#3b2a78', roughness: 0.7, bumpMap: peel, bumpScale: 0.2 }));
  lay(drawer, 0.52, 0.01, 0.8, paperEdge, 1.6, -1.55, 0.03, F);
  lay(drawer, 0.56, 0.05, 0.84, [cover, paperEdge, cover, cover, paperEdge, paperEdge], 1.6, -1.55, 0.03, F + 0.004);
  lay(drawer, 0.03, 0.006, 0.845, track(new THREE.MeshStandardMaterial({ color: '#141021', roughness: 0.8 })), 1.76, -1.55, 0.03, F + 0.054);
  const pencil = new THREE.Group();
  const lacquer = track(new THREE.MeshPhysicalMaterial({ color: '#743BBE', roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.2 }));
  const cedar = track(new THREE.MeshStandardMaterial({ color: '#e0b88a', roughness: 0.8 }));
  const graphite = track(new THREE.MeshStandardMaterial({ color: '#2b2b30', roughness: 0.4, metalness: 0.5 }));
  const rubber = track(new THREE.MeshStandardMaterial({ color: '#f29bb0', roughness: 0.85 }));
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => {
    const m = new THREE.Mesh(track(geo), mat);
    m.position.y = y;
    m.castShadow = true;
    pencil.add(m);
  };
  part(new THREE.CylinderGeometry(0.03, 0.03, 0.86, 6), lacquer, 0);
  part(new THREE.CylinderGeometry(0.004, 0.03, 0.1, 6), cedar, 0.48);
  part(new THREE.CylinderGeometry(0.001, 0.012, 0.04, 6), graphite, 0.515);
  part(new THREE.CylinderGeometry(0.032, 0.032, 0.07, 12), chrome, -0.46);
  part(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), rubber, -0.52);
  pencil.rotation.order = 'YXZ';
  pencil.rotation.set(Math.PI / 2, 1.25, 0);
  pencil.position.set(1.52, F + 0.03, -2.42);
  loose.add(pencil);
  floorShadow(1.52, -2.42, 0.6, 0.08, 0.45, 1.25);

  // Along the front: a pad of sticky notes with a note on it, a loose note, and paper clips.
  const noteMat = (lines: string[], bg: string, ink: string, size?: number) =>
    track(new THREE.MeshStandardMaterial({ map: track(noteTexture(lines, bg, ink, size)), roughness: 0.85, bumpMap: tooth, bumpScale: 0.2 }));
  const padSide = paper('#e9bf3c');
  floorShadow(-1.3, -0.5, 0.5, 0.5, 0.55, 0.08);
  lay(loose, 0.5, 0.06, 0.5, topped(noteMat(['7 certs', 'in here ↑'], '#FED141', '#3F260C'), padSide), -1.3, -0.5, 0.08);
  floorShadow(-0.6, -0.46, 0.42, 0.42, 0.4, -0.16);
  lay(loose, 0.42, 0.004, 0.42, topped(noteMat(['keep', 'learning ✦'], '#EBDEFC', '#743BBE'), labelWhite), -0.6, -0.46, -0.16);
  // One more note stuck to the paper block, beside the certificates.
  lay(drawer, 0.36, 0.004, 0.36, topped(noteMat(['✓ verified'], '#B1E4E3', '#08746B', 46), labelWhite), 1.03, BLOCK.z + 0.55, 0.1, blockTop + 0.013);
  const clipGeo = track(new THREE.TorusGeometry(0.05, 0.007, 8, 28));
  [
    { x: -0.12, z: -0.3, yaw: 0.5 },
    { x: 0.02, z: -0.62, yaw: -0.9 },
    { x: -1.12, z: BLOCK.z - 0.55, yaw: 0.2, y: blockTop + 0.016 },
  ].forEach((c) => {
    const clip = new THREE.Mesh(clipGeo, chrome);
    clip.rotation.set(-Math.PI / 2, 0, c.yaw);
    clip.scale.set(0.55, 1.5, 1);
    clip.position.set(c.x, (c.y ?? F) + 0.008, c.z);
    clip.castShadow = true;
    (c.y ? drawer : loose).add(clip);
  });
  scene.add(drawer);

  // ---- Labels and stickers -----------------------------------------------------------------------------------------
  // A chrome label holder with a printed paper card on each drawer front, like a real filing cabinet, and die-cut
  // stickers (the site's own art, with a white border) on the drawer fronts and the cabinet top's front strip.
  const decalMat = (map: THREE.Texture) =>
    track(
      new THREE.MeshStandardMaterial({
        map,
        transparent: true,
        roughness: 0.45,
        toneMapped: false,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
  /** A label holder: a chrome frame with a printed card, `w` wide, centred at (x, y) on a front face at z. */
  const labelHolder = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, title: string, sub: string) => {
    const h = w * 0.27;
    parent.add(solid(new RoundedBoxGeometry(w + 0.06, h + 0.06, 0.025, 2, 0.012), chrome, x, y, z + 0.012));
    const tex = track(labelTexture(title, sub, requestRender));
    const card = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), decalMat(tex));
    card.position.set(x, y, z + 0.026);
    parent.add(card);
  };
  /** A sticker of the image at `src`, `size` tall (or wide, whichever is longer), turned by `turn` radians. */
  const sticker = (parent: THREE.Object3D, src: string, size: number, place: (m: THREE.Mesh) => void, turn = 0) => {
    const mesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.Material>(track(new THREE.PlaneGeometry(1, 1)), track(new THREE.MeshBasicMaterial({ visible: false })));
    place(mesh);
    mesh.rotateZ(turn);
    mesh.visible = false;
    parent.add(mesh);
    stickerTexture(src).then((made) => {
      if (!made || disposed) return;
      track(made.tex);
      mesh.material = decalMat(made.tex);
      const long = Math.max(made.aspect, 1);
      mesh.scale.set((size * made.aspect) / long, size / long, 1);
      mesh.visible = true;
      requestRender();
    });
  };
  const onFront = (x: number, y: number, z: number) => (m: THREE.Mesh) => m.position.set(x, y, z);
  const onTop = (x: number, z: number) => (m: THREE.Mesh) => {
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.003, z);
  };
  const onFloor = (x: number, z: number) => (m: THREE.Mesh) => {
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, F + 0.005, z);
    m.renderOrder = 2;
  };
  // Loose stickers lying in the front of the drawer.
  sticker(loose, '/certificates/flowers/light-crocus.webp', 0.56, onFloor(0.62, -0.47), 0.3);
  sticker(loose, '/certificates/mandala/light-lotus.webp', 0.5, onFloor(1.2, -0.42), -0.2);
  sticker(loose, 'text:VN', 0.46, onFloor(1.68, -0.6), 1.35);
  sticker(drawer, '/certificates/stamp-verified.webp', 0.46, (m) => {
    m.rotation.x = -Math.PI / 2;
    m.position.set(-1.6, F + 0.05, -2.1);
    m.renderOrder = 2;
  }, 0.5);
  // The top drawer's front (rides out with the drawer).
  const DF = 0.072;
  labelHolder(drawer, 0, -0.24, 0.07, 1.05, 'CERTIFICATES', '07 FILES · VERIFIED');
  sticker(drawer, '/certificates/stamp-verified.webp', 0.62, onFront(1.5, -0.55, DF), -0.2);
  sticker(drawer, '/certificates/flowers/light-lotus.webp', 0.7, onFront(-1.55, -0.56, DF), 0.12);
  // The lower drawer's front.
  labelHolder(cabinet, 0, -1.36, 0.07, 1.05, 'ARCHIVE', '2021 — 2026 · AI & ML');
  sticker(cabinet, '/certificates/art-peacock.webp', 1.45, onFront(-1.3, -2.75, DF), 0.08);
  sticker(cabinet, '/certificates/mandala/light-iris.webp', 1.05, onFront(1.3, -2.95, DF), 0.3);
  sticker(cabinet, '/certificates/flowers/light-marigold.webp', 0.85, onFront(0.15, -3.35, DF), -0.18);
  sticker(cabinet, 'text:AI ENGINEER', 1.15, onFront(1.35, -2.0, DF), -0.1);
  // The cabinet top's front strip, in front of where the certificates land.
  sticker(cabinet, '/certificates/mandala/light-hibiscus.webp', 0.8, onTop(-1.6, -0.55), 0.4);
  sticker(cabinet, '/certificates/flowers/light-jasmine.webp', 0.85, onTop(1.65, -0.58), -0.5);
  sticker(cabinet, 'text:HELLO, I BUILD AI', 1.2, onTop(0.05, -0.45), 0.06);

  // ---- The certificates --------------------------------------------------------------------------------------------
  const loader = new THREE.TextureLoader();
  const blank = track(new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1));
  blank.colorSpace = THREE.SRGBColorSpace;
  blank.needsUpdate = true;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const cards = certs.map((c, i) => {
    const d = CARD_W / c.aspect;
    // Printed paper: not tone-mapped, so the certificate keeps its own contrast and colours under the lights.
    // (It starts with a plain white map, so the shader already expects one and doesn't have to be rebuilt, freezing a
    // frame, when the picture arrives; the picture is sent to the graphics card as soon as it loads, not on first sight.)
    const face = track(new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: 0.8, toneMapped: false, bumpMap: tooth, bumpScale: 0.18, map: blank }));
    const tex = loader.load(c.src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAniso;
      if (!disposed) renderer.initTexture(t);
      face.map = t;
      requestRender();
    });
    track(tex);
    // A sheet with some give in it: enough segments to bend as it's lifted (see bend()).
    const geo = track(new THREE.BoxGeometry(CARD_W, CARD_T, d, 12, 1, 8));
    const mesh = new THREE.Mesh(geo, [paperEdge, paperEdge, face, paperBack, paperEdge, paperEdge]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.index = i;
    scene.add(mesh);
    // The soft shadow right under it once it's on the cabinet top.
    const under = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), shade(blob, 0));
    under.rotation.x = -Math.PI / 2;
    under.visible = false;
    scene.add(under);
    // Lying in the drawer, the first one on top, each a touch askew.
    const pile = { x: Math.sin(i * 3.7) * 0.06, z: BLOCK.z + Math.cos(i * 2.3) * 0.05, y: pileBase + CARD_T / 2 + (n - 1 - i) * CARD_GAP, yaw: Math.sin(i * 1.9) * 0.06 };
    return { mesh, geo, base: Float32Array.from(geo.attributes.position.array as ArrayLike<number>), d, under, face, pile, hover: 0, lift: 0, sag: 0 };
  });
  /** Bends a sheet: `lift` raises its front edge (it's being picked up by it), `sag` lets its sides droop or cup. */
  const bend = (card: (typeof cards)[number], lift: number, sag: number) => {
    if (Math.abs(lift - card.lift) < 0.0005 && Math.abs(sag - card.sag) < 0.0005) return;
    card.lift = lift;
    card.sag = sag;
    const p = card.geo.attributes.position;
    const b = card.base;
    for (let k = 0; k < p.count; k++) {
      const u = b[k * 3 + 2] / card.d + 0.5; // 0 at the back edge .. 1 at the front
      const v = b[k * 3] / (CARD_W / 2);
      p.setY(k, b[k * 3 + 1] + lift * u * u + sag * v * v);
    }
    p.needsUpdate = true;
    card.geo.computeVertexNormals();
  };
  // (Raised and facing the key light it catches more light, so its own colour comes down a touch to keep the print.)
  const faceLit = new THREE.Color('#e4e4e4');
  const faceRest = new THREE.Color('#f4f4f4');
  const faceDim = new THREE.Color('#c4c4cc');

  let spots = landingSpots(n, phone);
  let progress = 0;
  let hovered = -1;
  let dim = 0; // how far the certificates not being pointed at have fallen back (0..1)
  const pointer = new THREE.Vector2();
  const probe = new THREE.Vector3();
  let W = 1;
  let H = 1;

  // ---- Placing everything for the current progress -----------------------------------------------------------------
  const frameLerp = (a: Frame, b: Frame, t: number): Frame => ({ cz: lerp(a.cz, b.cz, t), hx: lerp(a.hx, b.hx, t), hz: lerp(a.hz, b.hz, t) });

  function place() {
    const open = drawerOpen(progress);
    const dz = drawerSlide(progress) * TRAVEL;
    drawer.position.z = dz;
    // The middle runner sections come out at half speed; loose things in the drawer lag a touch while it's pulled.
    for (const rail of midRails) rail.position.z = -TRAY_D / 2 + dz * 0.5;
    const lag = drawerPull(progress) * 0.045;
    loose.position.z = -lag;

    cards.forEach((card, i) => {
      const t = certOut(progress, i);
      const m = card.mesh;
      const p = card.pile;
      const s = spots[i];
      const px = p.x;
      const pz = dz + p.z - lag * 0.5;
      // Rising straight up out of the drawer, front edge lifting first...
      const rise = smooth(clamp01(t / 0.3));
      const liftY = 0.75 + i * 0.02;
      // ...then gliding over to its spot on the cabinet top and settling flat.
      const go = smoother(clamp01((t - 0.3) / 0.7));
      const restY = CARD_T / 2 + 0.002 + i * CARD_GAP;
      const hop = Math.sin(Math.PI * go) * 0.45;
      const x = lerp(px, s.x, go);
      const z = lerp(pz, s.z, go);
      const y = t <= 0.3 ? lerp(p.y, liftY, rise) : lerp(liftY, restY, go) + hop;
      const h = card.hover;
      m.position.set(x, y + h * 0.15, z);
      // Pointed at, it tips a little towards the pointer.
      let tipX = 0;
      let tipZ = 0;
      if (h > 0.001) {
        probe.set(x, y, z).project(camera);
        tipZ = -Math.max(-1, Math.min(1, (pointer.x - probe.x) * 4)) * 0.07 * h;
        tipX = -Math.max(-1, Math.min(1, (pointer.y - probe.y) * 4)) * 0.07 * h - 0.04 * h;
      }
      m.rotation.set(
        -0.16 * Math.sin(Math.PI * rise) * (1 - go) + Math.sin(Math.PI * go) * 0.05 + tipX,
        lerp(p.yaw, s.yaw, go) * (1 - h * 0.7),
        Math.sin(Math.PI * go) * 0.06 * (i % 2 ? 1 : -1) + tipZ
      );
      // Growing to its landed size on the way over; pointed at, it grows a little more.
      const grow = lerp(1, phone ? LAND_SCALE.phone : LAND_SCALE.desktop, go);
      m.scale.setScalar(grow * (1 + h * HOVER_GROW));
      // Still in the drawer and not yet moving: only the top one shows anyway.
      m.visible = t > 0 || i === 0 || open > 0.05;
      // The paper gives: its front edge curls up as it's picked out of the drawer, its sides droop in the air, and
      // it settles flat (cupping very slightly when pointed at).
      bend(card, 0.16 * Math.sin(Math.PI * rise) * (1 - go), -0.05 * Math.sin(Math.PI * go) + 0.012 * h);
      // Its soft shadow on the cabinet top: tight when it lies there, wider and fainter as it lifts.
      const down = smooth(clamp01((go - 0.5) / 0.45));
      const air = clamp01((y + h * 0.9 - restY) / 0.6);
      card.under.visible = down > 0.01;
      if (card.under.visible) {
        card.under.position.set(x + 0.03 + air * 0.12, restY - CARD_T / 2 - 0.0015, z + 0.03 + air * 0.1);
        card.under.rotation.z = m.rotation.y;
        card.under.scale.set(CARD_W * grow * (1.42 + air * 0.5), card.d * grow * (1.46 + air * 0.5), 1);
        (card.under.material as THREE.MeshBasicMaterial).opacity = down * (0.6 - air * 0.28);
      }
      // Pointing at one brings it into the light and lets the others fall back.
      if (i === hovered) card.face.color.copy(faceRest).lerp(faceLit, h);
      else card.face.color.copy(faceRest).lerp(faceDim, dim * (1 - h));
    });

    // The camera. From above: from the cabinet's front edge, to the open drawer, to the certificates on the cabinet top.
    const f = phone ? FRAMES.phone : FRAMES.desktop;
    const toLanded = smooth(clamp01((progress - CARD_START - CARD_STEP) / 0.32));
    // (The move to the final view is done below, by fitView, so the open drawer stays whole all the way.)
    const frame = frameLerp(f.closed, f.open, open);
    const aspect = W / H;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const topDist = Math.max(frame.hz / tanH, frame.hx / (tanH * aspect)) * 1.04 * Math.hypot(1, 0.16);
    const topElev = Math.atan2(1, 0.16);
    const topTarget = new THREE.Vector3(0, -0.3, frame.cz);
    // From the front: facing the cabinet, the whole of it in view.
    const frontDist = Math.max(FRONT.hy / tanH, FRONT.hx / (tanH * aspect)) * 1.06;
    // The swing: the camera arcs up and over, from in front to above, moving its aim from the cabinet's front to the
    // drawer, and its distance to suit.
    const swing = smoother(clamp01((progress - SWING_START) / (SWING_END - SWING_START)));
    const elev = lerp(FRONT.elevation, topElev, swing);
    const dist = lerp(frontDist, topDist, swing);
    const target = FRONT.target.clone().lerp(topTarget, swing);
    // As the certificates land, the camera tips back from straight overhead to a three-quarter view from above and in
    // front, pulled back far enough to show the whole cabinet: its top with the certificates, the drawer standing
    // open with everything in it, and the front. (Straight down on the cabinet top alone it read as a green board.)
    const view = { elev: lerp(elev, LANDED_ELEV, toLanded), dist: 0, target: target.clone() };
    if (toLanded > 0) {
      const fit = fitView(LANDED_ELEV, phone);
      view.target.lerp(fit.target, toLanded);
      view.dist = lerp(dist, fit.dist, toLanded);
    } else view.dist = dist;
    camera.position.set(view.target.x, view.target.y + Math.sin(view.elev) * view.dist, view.target.z + Math.cos(view.elev) * view.dist);
    camera.lookAt(view.target);

    // The certificate being pointed at rises up towards the camera and a little towards the middle of the screen,
    // turning to face you, big enough to read.
    cards.forEach((card) => {
      const h = smooth(card.hover);
      const m = card.mesh;
      m.renderOrder = h < 0.001 ? 0 : 3;
      if (h < 0.001) return;
      m.position.lerp(camera.position, HOVER_RISE * h);
      m.position.addScaledVector(toCentre.copy(view.target).sub(m.position), HOVER_CENTRE * h);
      m.rotation.x += h * (Math.PI / 2 - view.elev) * 0.85;
      m.renderOrder = 3;
    });
  }
  const toCentre = new THREE.Vector3();

  // The overview: what must be in frame (the cabinet top, the open drawer's front top and bottom, the cabinet's
  // front at the floor), and how far back the camera stands to fit it with room for the site's navigation at the top.
  const fitCache = { key: '', target: new THREE.Vector3(), dist: 0 };
  const fitPt = new THREE.Vector3();
  function fitView(elevation: number, onPhone: boolean) {
    const key = `${W}x${H}:${onPhone}`;
    if (fitCache.key === key) return fitCache;
    const hx = CAB_W / 2;
    const front = TRAVEL + 0.07;
    // The certificates' spread on the cabinet top, the whole width of the cabinet, and the whole open drawer down to
    // its front and handle, so it reads as a cabinet with its drawer pulled out and nothing is cut off at the edge.
    // The camera comes as close as that allows, so the certificates are as big as they can be.
    let sx = hx;
    let sz0 = 0;
    const ls = onPhone ? LAND_SCALE.phone : LAND_SCALE.desktop;
    spots.forEach((s, i) => {
      sx = Math.max(sx, Math.abs(s.x) + (CARD_W * ls) / 2);
      sz0 = Math.min(sz0, s.z - (cards[i].d * ls) / 2);
    });
    const pts = [
      [-sx, 0.1, sz0],
      [sx, 0.1, sz0],
      [-hx - 0.15, 0, 0],
      [hx + 0.15, 0, 0],
      // The drawer front with its handle: all of it on screen, never cut off by the edge.
      [-hx, 0, front],
      [hx, 0, front],
      [-hx, -1.05, front + 0.22],
      [hx, -1.05, front + 0.22],
    ];
    const target = new THREE.Vector3(0, -1.1, (-CAB_D + front) / 2 - 0.15);
    // Where the frame may reach: a little in from the sides, below the nav bar at the top, above the hint at the
    // bottom (in -1..1 screen units).
    const lim = { x: onPhone ? 0.96 : 0.92, top: onPhone ? 0.66 : 0.76, bottom: onPhone ? -0.9 : -0.92 };
    let lo = 2;
    let hi = 80;
    for (let k = 0; k < 24; k++) {
      const d = (lo + hi) / 2;
      camera.position.set(target.x, target.y + Math.sin(elevation) * d, target.z + Math.cos(elevation) * d);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      let ok = true;
      let top = -Infinity;
      let bottom = Infinity;
      for (const p of pts) {
        fitPt.set(p[0], p[1], p[2]).project(camera);
        if (Math.abs(fitPt.x) > lim.x) ok = false;
        top = Math.max(top, fitPt.y);
        bottom = Math.min(bottom, fitPt.y);
      }
      if (top - bottom > lim.top - lim.bottom) ok = false;
      if (ok) hi = d;
      else lo = d;
    }
    // Centre the picture between the allowed top and bottom.
    const d = hi;
    camera.position.set(target.x, target.y + Math.sin(elevation) * d, target.z + Math.cos(elevation) * d);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    let top = -Infinity;
    let bottom = Infinity;
    for (const p of pts) {
      fitPt.set(p[0], p[1], p[2]).project(camera);
      top = Math.max(top, fitPt.y);
      bottom = Math.min(bottom, fitPt.y);
    }
    const shift = (top + bottom) / 2 - (lim.top + lim.bottom) / 2; // in screen units; move the aim to match
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const up = new THREE.Vector3(0, Math.cos(elevation), -Math.sin(elevation)); // the camera's up, in world space
    target.addScaledVector(up, shift * tanH * d);
    Object.assign(fitCache, { key, target, dist: d });
    return fitCache;
  }

  // ---- Rendering only when needed ----------------------------------------------------------------------------------
  let active = true;
  let raf = 0;
  // Compile the shaders in the background first (the scene is built before it scrolls into view), so the first frame
  // doesn't stall the page.
  let ready = false;
  place();
  compileShaders(renderer, scene, camera, () => !disposed)
    .catch(() => undefined)
    .then(() => {
      if (disposed) return;
      ready = true;
      requestRender();
    });
  function requestRender() {
    dirty = true;
  }
  function tick() {
    raf = requestAnimationFrame(tick);
    if (!ready || !active || document.hidden) return;
    // Ease the hover lifts.
    let easing = false;
    cards.forEach((c, i) => {
      const goal = i === hovered ? 1 : 0;
      if (Math.abs(c.hover - goal) > 0.002) {
        c.hover += (goal - c.hover) * 0.2;
        easing = true;
      } else c.hover = goal;
    });
    const dimGoal = hovered >= 0 ? 1 : 0;
    if (Math.abs(dim - dimGoal) > 0.002) {
      dim += (dimGoal - dim) * 0.14;
      easing = true;
    } else dim = dimGoal;
    if (!dirty && !easing) return;
    dirty = false;
    place();
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(tick);

  const raycaster = new THREE.Raycaster();
  // An unrendered sheet moved to where each certificate lies, for picking.
  const restProxy = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), track(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })));
  const ndc = new THREE.Vector2();

  return {
    setProgress(t) {
      progress = clamp01(t);
      requestRender();
    },
    resize(w, h) {
      W = Math.max(1, w);
      H = Math.max(1, h);
      const nowPhone = W < 768 || W / H < 0.8;
      if (nowPhone !== phone) {
        phone = nowPhone;
        spots = landingSpots(n, phone);
      }
      renderer.setPixelRatio(phone ? canvasDpr(PHONE_DPR, PHONE_DPR, W, H) : canvasDpr(2, PHONE_DPR, W, H));
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      requestRender();
    },
    pick(x, y) {
      ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      // The raised certificate keeps the pointer while it's over it; otherwise, whichever one lies there (tested at
      // where it lies, so a raised one moving doesn't make the pointer flick between neighbours).
      if (hovered >= 0 && raycaster.intersectObject(cards[hovered].mesh, false).length) return hovered;
      const landed = cards
        .map((c, i) => ({ c, i }))
        .filter(({ i }) => certOut(progress, i) >= 0.98)
        .map(({ c, i }) => {
          const s = spots[i];
          const ls = phone ? LAND_SCALE.phone : LAND_SCALE.desktop;
          restProxy.position.set(s.x, CARD_T + i * CARD_GAP, s.z);
          restProxy.rotation.set(-Math.PI / 2, 0, s.yaw);
          restProxy.scale.set(CARD_W * ls, c.d * ls, 1);
          restProxy.updateMatrixWorld();
          const hit = raycaster.intersectObject(restProxy, false)[0];
          return hit ? { i, y: CARD_T + i * CARD_GAP } : null;
        })
        .filter((v): v is { i: number; y: number } => !!v);
      // Several overlap: the one lying on top (they're stacked in order).
      if (!landed.length) return -1;
      return landed.reduce((a, b) => (b.y > a.y ? b : a)).i;
    },
    setHover(i) {
      hovered = i;
      requestRender();
    },
    setPointer(x, y) {
      pointer.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
      if (hovered >= 0) requestRender();
    },
    setActive(on) {
      active = on;
      if (on) requestRender();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      key.shadow.map?.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
    },
  };
}
