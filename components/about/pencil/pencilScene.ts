import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// The pencil's three.js scene (no React here; PencilCursor.tsx drives it), built like the TV remote cursor
// (RemoteCursor.tsx): one function makes everything and hands back what moves, plus dispose().
//
// After the reference: a long hexagonal pencil in satin lacquer with a brushed-silver end cap and a small foil
// emblem, sharpened to a cone of bare cedar with a scalloped paint line and a graphite point. In the site's colours:
// the lavender ink (#743BBE) deepened to an indigo violet, with silver.
//
// Model space: the graphite point is at the origin and the pencil runs up +y to its cap (length LENGTH). The page
// is the plane z = 0 and the camera looks straight down at it; a shadow-catcher on that plane gives the pencil a
// soft real shadow on whatever is underneath (the portrait, the paper), which spreads as it lifts.

/** The pencil's length and its body's radius (across the corners of the hexagon). */
export const LENGTH = 4.8;
export const BODY_R = 0.17;
/** Across the flats: what it rests on when lying down. */
export const BODY_IN = BODY_R * Math.cos(Math.PI / 6);
const TIP_LEN = 0.2; // the graphite
const CONE_TOP = 0.95; // where the sharpened cone meets the painted body
const CAP_FROM = 4.25; // where the silver cap starts

/** CSS px per scene unit at the page plane (set by setSize). */
export const VIEW_UNITS = 6.8;

/** Deeper than it looks on screen: the studio light and the tone mapping lift it to the lavender ink. */
const LACQUER = '#35168a';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

/** The sharpened cone: cedar with fine grain along its length, the paint running down in six scallops (one per
 *  face of the hexagon), and the wood darkening towards the graphite. u goes round, v runs from point (0) to body (1). */
function paintCone() {
  const W = 512;
  const H = 256;
  const { c, g } = canvas(W, H);
  const img = g.createImageData(W, H);
  const paint = [0x4b, 0x2a, 0xa8];
  for (let y = 0; y < H; y++) {
    const v = 1 - y / H; // canvas top = body end (flipY)
    for (let x = 0; x < W; x++) {
      const u = x / W;
      // Six scallops: the paint line dips between the hexagon's corners.
      const s = Math.abs(Math.sin(u * Math.PI * 6));
      const edge = 0.8 + 0.14 * (1 - s);
      const i = (y * W + x) * 4;
      if (v > edge) {
        // A thin pale lip where the blade cut through the lacquer.
        const lip = v - edge < 0.02 ? 1.25 : 1;
        img.data[i] = Math.min(255, paint[0] * lip);
        img.data[i + 1] = Math.min(255, paint[1] * lip);
        img.data[i + 2] = Math.min(255, paint[2] * lip);
      } else {
        const grain = 0.9 + 0.1 * Math.sin(u * 220 + Math.sin(u * 37) * 3) + (Math.random() - 0.5) * 0.06;
        const dark = 0.72 + 0.28 * Math.min(1, v / 0.7); // darker near the point
        img.data[i] = 232 * grain * dark;
        img.data[i + 1] = 192 * grain * dark;
        img.data[i + 2] = 146 * grain * dark;
      }
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** The foil emblem: a small sparkle over "VN", laid along the pencil (reads from point to cap). */
function paintEmblem() {
  const W = 128;
  const H = 384;
  const { c, g } = canvas(W, H);
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#fff';
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(-Math.PI / 2);
  g.font = '800 92px Geist, Inter, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('VN', 34, 4);
  // A four-point sparkle before the letters.
  g.beginPath();
  const sx = -96;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const r = i % 2 === 0 ? 40 : 11;
    const x = sx + Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  g.restore();
  return c;
}

/** Fine brushed lines round the cap. */
function paintBrushed() {
  const { c, g } = canvas(256, 64);
  const img = g.createImageData(256, 64);
  for (let y = 0; y < 64; y++) {
    const row = 0.75 + Math.random() * 0.25;
    for (let x = 0; x < 256; x++) {
      const v = 255 * (row * 0.85 + Math.random() * 0.15);
      const i = (y * 256 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** A hexagon with softly rounded corners (a corner at 0°, so a flat faces down in the shape's -y). */
function roundedHex(r: number, round: number) {
  const s = new THREE.Shape();
  const pts: THREE.Vector2[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  for (let k = 0; k < 6; k++) {
    const p = pts[k];
    const prev = pts[(k + 5) % 6];
    const next = pts[(k + 1) % 6];
    const a = new THREE.Vector2().subVectors(prev, p).normalize().multiplyScalar(round).add(p);
    const b = new THREE.Vector2().subVectors(next, p).normalize().multiplyScalar(round).add(p);
    if (k === 0) s.moveTo(a.x, a.y);
    else s.lineTo(a.x, a.y);
    s.quadraticCurveTo(p.x, p.y, b.x, b.y);
  }
  s.closePath();
  return s;
}

export type PencilScene = ReturnType<typeof buildPencil>;

export function buildPencil(canvasEl: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
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
  scene.environmentIntensity = 0.9;

  // Straight down at the page; setSize() sets how much of it shows.
  const CAM_Z = 12;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight(0xfff4e8, 2.4);
  key.position.set(-3.5, 4.5, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  {
    const c = key.shadow.camera;
    c.left = -5;
    c.right = 5;
    c.top = 5;
    c.bottom = -5;
    c.near = 1;
    c.far = 25;
    c.updateProjectionMatrix();
  }
  const fill = new THREE.DirectionalLight(0xdfe7ff, 0.5);
  fill.position.set(4, -2, 6);
  const rim = new THREE.DirectionalLight(0xc8b6ff, 1.3);
  rim.position.set(3, 4, -3);
  scene.add(key, fill, rim);

  const disposables: { dispose: () => void }[] = [envTex];
  const own = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);
  const tex = (c: HTMLCanvasElement, color = true) => {
    const t = own(new THREE.CanvasTexture(c));
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  };

  // The page: catches the pencil's shadow, invisible otherwise.
  const shadowMat = own(new THREE.ShadowMaterial({ opacity: 0.3 }));
  // (No depth: the point pressing down onto it mustn't be cut off.)
  shadowMat.depthWrite = false;
  const page = new THREE.Mesh(own(new THREE.PlaneGeometry(30, 30)), shadowMat);
  page.receiveShadow = true;
  scene.add(page);

  // ---- The pencil. `pencil` is placed and turned by the component; `spin` turns it about its own length.
  const pencil = new THREE.Group();
  scene.add(pencil);
  const spin = new THREE.Group();
  pencil.add(spin);
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const m = new THREE.Mesh(own(geo), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    spin.add(m);
    return m;
  };

  // Satin lacquer over wood: deep colour, a soft clear coat.
  const lacquer = own(
    new THREE.MeshPhysicalMaterial({ color: LACQUER, roughness: 0.42, metalness: 0, clearcoat: 0.75, clearcoatRoughness: 0.22, sheen: 0.2, sheenColor: new THREE.Color('#b9a2ff') })
  );
  const coneMat = own(new THREE.MeshStandardMaterial({ map: tex(paintCone()), roughness: 0.78, metalness: 0 }));
  const graphite = own(new THREE.MeshPhysicalMaterial({ color: '#2a2a30', metalness: 0.55, roughness: 0.32, clearcoat: 0.3, clearcoatRoughness: 0.3 }));
  const brushed = tex(paintBrushed(), false);
  brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping;
  const silver = own(
    new THREE.MeshPhysicalMaterial({ color: '#d9dce3', metalness: 1, roughness: 0.3, roughnessMap: brushed, clearcoat: 0.25, clearcoatRoughness: 0.25, envMapIntensity: 1.4 })
  );
  const foilTex = tex(paintEmblem());
  const foil = own(new THREE.MeshPhysicalMaterial({ color: '#eef0f6', map: foilTex, alphaMap: foilTex, transparent: true, metalness: 1, roughness: 0.22, polygonOffset: true, polygonOffsetFactor: -2 }));

  // Body: a rounded hexagon extruded along y, from the cone to the cap.
  {
    const body = new THREE.ExtrudeGeometry(roundedHex(BODY_R, 0.028), { depth: CAP_FROM - CONE_TOP, bevelEnabled: false, curveSegments: 6 });
    body.rotateX(-Math.PI / 2); // extrusion (z) -> +y; the shape's -y (a flat) -> +z, facing the camera
    body.translate(0, CONE_TOP, 0);
    body.computeVertexNormals();
    part(body, lacquer);
  }
  // The sharpened cone and the graphite point (lathed: radius along x, height along y).
  {
    const cone: THREE.Vector2[] = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      // A slightly hollow-ground cone, like a real sharpener leaves.
      const r = 0.048 + (BODY_R * 0.97 - 0.048) * Math.pow(t, 0.92);
      cone.push(new THREE.Vector2(r, TIP_LEN + (CONE_TOP - TIP_LEN) * t));
    }
    part(new THREE.LatheGeometry(cone, 48), coneMat);
    const lead: THREE.Vector2[] = [new THREE.Vector2(0.0001, 0), new THREE.Vector2(0.012, 0.012)];
    for (let k = 1; k <= 8; k++) {
      const t = k / 8;
      lead.push(new THREE.Vector2(0.012 + (0.048 - 0.012) * t, 0.012 + (TIP_LEN - 0.012) * t));
    }
    part(new THREE.LatheGeometry(lead, 32), graphite);
  }
  // The brushed-silver cap: a crimped collar, then a plain sleeve to a softly rounded end.
  {
    const capLen = LENGTH - CAP_FROM;
    const sleeve = part(new THREE.CylinderGeometry(BODY_R * 1.03, BODY_R * 1.03, capLen - 0.04, 48), silver);
    sleeve.position.y = CAP_FROM + (capLen - 0.04) / 2;
    const end = part(new THREE.CylinderGeometry(BODY_R * 0.92, BODY_R * 1.03, 0.04, 48), silver);
    end.position.y = LENGTH - 0.02;
    for (const y of [CAP_FROM + 0.06, CAP_FROM + 0.12]) {
      const ring = part(new THREE.TorusGeometry(BODY_R * 1.03, 0.007, 8, 48), silver);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
    }
  }
  // The foil emblem on the face towards the camera, just below the cap.
  {
    const e = part(new THREE.PlaneGeometry(BODY_IN * 0.78, 0.62), foil);
    e.position.set(0, CAP_FROM - 0.42, BODY_IN + 0.0015);
    e.castShadow = false;
  }

  // ---- Updates (no allocation in here)
  const basis = new THREE.Matrix4();
  const ax = new THREE.Vector3();
  const ay = new THREE.Vector3();
  const az = new THREE.Vector3();
  const qA = new THREE.Quaternion();
  const qB = new THREE.Quaternion();
  const CAM = new THREE.Vector3(0, 0, 1);

  /** The turn that points the pencil (point to cap) along `dir`, with its emblem face as close to the camera as it
   *  can be. */
  const orient = (dir: THREE.Vector3, out: THREE.Quaternion) => {
    ay.copy(dir).normalize();
    az.copy(CAM).addScaledVector(ay, -ay.dot(CAM));
    if (az.lengthSq() < 1e-6) az.set(0, -1, 0);
    az.normalize();
    ax.crossVectors(ay, az);
    basis.makeBasis(ax, ay, az);
    return out.setFromRotationMatrix(basis);
  };

  /**
   * Places the pencil between two poses: `t` 0 is lying on the card (centred on the canvas), 1 is held as the
   * cursor (its point on the canvas centre). Each pose gives a direction (point to cap), a scale and an offset of
   * the pencil's centre (rest) or point (cursor) from the canvas centre, in scene units.
   */
  const setPose = (
    t: number,
    rest: { dir: THREE.Vector3; scale: number; lift: number },
    held: { dir: THREE.Vector3; scale: number; lift: number },
    roll: number
  ) => {
    orient(rest.dir, qA);
    orient(held.dir, qB);
    pencil.quaternion.slerpQuaternions(qA, qB, t);
    const s = rest.scale + (held.scale - rest.scale) * t;
    pencil.scale.setScalar(s);
    // Where the point goes. Lying: half a pencil back from the centre along its length, raised by the flat it lies
    // on. Held: on the centre, `lift` off the page. In between, a blend of the two.
    ay.set(0, 1, 0).applyQuaternion(pencil.quaternion);
    const half = (LENGTH / 2) * s;
    const rx = -ay.x * half;
    const ry = -ay.y * half;
    const rz = -ay.z * half + BODY_IN * s + rest.lift;
    pencil.position.set(rx * (1 - t), ry * (1 - t), rz * (1 - t) + held.lift * t);
    spin.rotation.y = roll;
  };

  let viewUnits = VIEW_UNITS;
  const setSize = (w: number, h: number, dpr: number, units: number) => {
    viewUnits = units;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(units / 2 / CAM_Z));
    camera.updateProjectionMatrix();
  };

  const render = () => renderer.render(scene, camera);

  const dispose = () => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    key.shadow.map?.dispose();
    for (const d of disposables) d.dispose();
    renderer.dispose();
  };

  return { renderer, render, setSize, setPose, dispose, get viewUnits() { return viewUnits; } };
}
