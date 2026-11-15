import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { animate } from 'framer-motion';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { tvClick, tvPower, tvRemoteOn, tvStatic, type ClickKind } from './tvSounds';
import { drawTestCard } from './testCard';
import { canvasDpr, onPinchZoom, PHONE_DPR } from '../ui/device';
import { compileShaders } from '../ui/compileShaders';
import { isSiteReady, whenIdle } from '../ui/siteReady';
import {
  controlsUsed,
  isRemoteActive,
  markControlsUsed,
  nextAutoOnDelay,
  onControlsUsed,
  onRemoteActive,
  pressRemote,
  registerTV,
  type RemoteButton,
} from './remote';

// A realistic 3D tube TV (three.js) playing a project's video. Satin plastic with a fine grain, a tapered picture
// tube at the back, knurled aluminium knobs, a perforated speaker grille, a lavender power button in a metal ring,
// and real soft shadows. The video fills the whole screen edge to edge, and none of it is cut off.
// It turns toward the cursor and sways a little on its own. The controls work: the lavender button is the power
// switch (the picture collapses to a line, then a dot, like an old CRT), the large knob and the buttons change
// channel (a burst of static), and the small knob is the volume. A control presses in when clicked.
// Clicking (or tapping) the TV itself works it like the remote would: off, it turns on; on, it changes channel.
// It never opens a link; the card has its own button for that.
// Signs that the remote works: the TV's red light flickers as it receives, and the screen shows the channel
// number or a volume bar in green, like an old on-screen display.
// It starts switched off. When the cursor (as the 3D remote, see RemoteCursor.tsx) is in the Work section and the
// TV is in view, the remote presses its power button and the TV comes on; on phones it comes on as it scrolls into
// view, and on its own after a moment otherwise. Until someone tries it, a small label under it says it works.

const MONO_FONT = "'Geist Mono', ui-monospace, monospace";

type Finish = 'graphite' | 'white';

/** One channel: a project's video (or image), and the name the on-screen display shows. */
export type TVChannel = { videoUrl?: string; imageUrl?: string; name?: string };

type Props = {
  title: string;
  videoUrl?: string;
  imageUrl?: string;
  /**
   * Channel mode (the home page's single TV): one channel per project. `channel` picks the one on screen; when
   * someone changes channel on the TV or with the remote, `onChannelChange` asks for the next one instead of the
   * TV switching by itself, so the page can scroll to it and the two stay in step.
   */
  channels?: TVChannel[];
  channel?: number;
  onChannelChange?: (next: number) => void;
  finish?: Finish;
  /** Shown instead if the browser can't do WebGL. */
  fallback: React.ReactNode;
};

// Sizes in scene units.
const W = 4.6;
const H = 3.8;
const D = 2.2;
const FRONT = D / 2;
const SCREEN_Y = 0.4;
// The screen takes up almost the whole front of the TV. It is 16:9 like the reels and the picture fills it
// edge to edge, so the whole video shows with no bars and nothing cut off.
const GW = 3.9;
const GH = (GW * 9) / 16;
const BULGE = 0.07;
// Control positions were laid out for a narrower set; this spreads them across the wider front.
const SX = 1.1;
// The resting pose: turned a little, so the side and the tube at the back show.
const BASE_RY = -0.3;
const BASE_RX = 0.06;

const PALETTE: Record<
  Finish,
  { body: string; bezel: string; button: string; slot: string; groove: string; rubber: string }
> = {
  graphite: { body: '#2b2e33', bezel: '#141518', button: '#3b3e44', slot: '#0e0f11', groove: '#1c1e22', rubber: '#121314' },
  white: { body: '#e6e3ec', bezel: '#2a2b30', button: '#f4f2f8', slot: '#1a1b1f', groove: '#c9c5d3', rubber: '#3a3a40' },
};

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  return new THREE.CanvasTexture(c);
}

/** A rounded rectangle with soft, slightly squarish corners, like a picture tube. */
function tubePath(g: CanvasRenderingContext2D, w: number, h: number, rxf = 0.06, ryf = 0.1) {
  const rx = w * rxf;
  const ry = h * ryf;
  g.beginPath();
  g.moveTo(rx, 0);
  g.lineTo(w - rx, 0);
  g.quadraticCurveTo(w, 0, w, ry);
  g.lineTo(w, h - ry);
  g.quadraticCurveTo(w, h, w - rx, h);
  g.lineTo(rx, h);
  g.quadraticCurveTo(0, h, 0, h - ry);
  g.lineTo(0, ry);
  g.quadraticCurveTo(0, 0, rx, 0);
  g.closePath();
}

/** A plane that bulges out in the middle, like the front of a picture tube. */
function bulgedPlane(w: number, h: number, bulge: number) {
  const g = new THREE.PlaneGeometry(w, h, 40, 24);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const nx = p.getX(i) / (w / 2);
    const ny = p.getY(i) / (h / 2);
    p.setZ(i, bulge * (1 - nx * nx) * (1 - ny * ny));
  }
  g.computeVertexNormals();
  return g;
}

/** A knob with real knurled ridges around its side, facing the viewer. */
function knurledKnob(r: number, depth: number, ridges: number) {
  const g = new THREE.CylinderGeometry(r, r * 1.04, depth, ridges * 4, 1, false);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const rad = Math.hypot(x, z);
    if (rad < r * 0.6) continue; // cap centres
    const a = Math.atan2(z, x);
    const k = Math.cos(a * ridges) > 0 ? 1 : 0.93;
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  g.rotateX(Math.PI / 2);
  return g;
}

let webglOk: boolean | null = null;
function canUseWebGL() {
  if (webglOk !== null) return webglOk;
  try {
    const c = document.createElement('canvas');
    webglOk = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    webglOk = false;
  }
  return webglOk;
}

export default function TV3D({ title, videoUrl, imageUrl, channels, channel = 0, onChannelChange, finish = 'graphite', fallback }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // The scene is built once per set of channels; these let it read the latest props without rebuilding.
  const sources: TVChannel[] = channels?.length ? channels : [{ videoUrl, imageUrl, name: title }];
  const sourcesKey = sources.map((s) => s.videoUrl ?? s.imageUrl ?? '').join('|');
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;
  const channelRef = useRef(channel);
  channelRef.current = channel;
  const onChannelRef = useRef(onChannelChange);
  onChannelRef.current = onChannelChange;
  const channelMode = !!channels?.length;
  const [failed, setFailed] = useState(() => typeof window !== 'undefined' && !canUseWebGL());
  const [on, setOn] = useState(false);
  const [used, setUsed] = useState(controlsUsed);
  useEffect(() => onControlsUsed(() => setUsed(true)), []);
  const touch = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none)').matches;
  // Lets the screen-reader buttons below (and channel changes from the page) drive the scene.
  const api = useRef<{ power: () => void; channel: () => void; tune: (i: number) => void } | null>(null);
  useEffect(() => {
    api.current?.tune(channel);
  }, [channel]);

  // The scene is built only once the TV comes within a screen or so of view. The Work page has a TV for every
  // project, and building them all the moment it opened (a WebGL context, lighting and shaders each) froze it.
  // (The home page's channel TV is the only one there, built behind the loading screen: no waiting for it.)
  const [near, setNear] = useState(channelMode);
  // The rest are built one at a time in the browser's idle moments (whenIdle), so they're usually ready before you
  // scroll to them: built mid-scroll, each one cost a ~100 ms hitch.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (near || !wrap) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setNear(true);
      },
      { rootMargin: '100% 0px' }
    );
    io.observe(wrap);
    const cancelIdle = isSiteReady() ? whenIdle(() => setNear(true)) : () => {};
    return () => {
      io.disconnect();
      cancelIdle();
    };
  }, [near]);

  useEffect(() => {
    if (failed || !near) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    // A fresh canvas every time: the old one's WebGL context is given back on cleanup (see the end), and a
    // canvas can't get a new context once its old one is gone. (React's dev mode mounts everything twice.)
    const canvas = document.createElement('canvas');
    canvas.className = 'absolute inset-0 h-full w-full';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${title} demo on a 3D TV`);
    wrap.prepend(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      canvas.remove();
      setFailed(true);
      return;
    }
    // (Capped at 1.5: several TVs can be on screen at once, each a large canvas, and above 1.5 the extra pixels
    // cost a lot of graphics work for little visible gain.)
    renderer.setPixelRatio(canvasDpr(1.5, PHONE_DPR));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.85;

    const camera = new THREE.PerspectiveCamera(22, 1.25, 0.1, 100);
    camera.position.set(0, 0.4, 14);
    camera.lookAt(0, -0.1, 0);

    // Studio lighting: a soft key that casts the shadow, a cool fill and a lavender rim from behind.
    const key = new THREE.DirectionalLight(0xfff6ee, 1.7);
    key.position.set(1.5, 10, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 10;
    key.shadow.bias = -0.0004;
    const sc = key.shadow.camera as THREE.OrthographicCamera;
    sc.left = -5;
    sc.right = 5;
    sc.top = 5;
    sc.bottom = -5;
    sc.near = 1;
    sc.far = 25;
    const fill = new THREE.DirectionalLight(0xdfe6ff, 0.45);
    fill.position.set(-6, 2, 5);
    const rim = new THREE.DirectionalLight(0xc8b6ff, 1.1);
    rim.position.set(-5, 4, -6);
    scene.add(key, fill, rim);

    const C = PALETTE[finish];
    const textures: THREE.Texture[] = [];
    const track = <T extends THREE.Texture>(t: T) => (textures.push(t), t);

    // ---- Surface detail: a fine, even grain for the plastic (roughness and bump).
    const grain = track(
      canvasTexture(256, 256, (g, w, h) => {
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
    grain.repeat.set(6, 6);

    // ---- Materials
    const plastic = (color: string, roughness: number, clearcoat = 0.3) =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness,
        roughnessMap: grain,
        bumpMap: grain,
        bumpScale: 0.35,
        clearcoat,
        clearcoatRoughness: 0.45,
      });
    const bodyMat = plastic(C.body, 0.52, 0.35);
    const bezelMat = plastic(C.bezel, 0.6, 0.15);
    const buttonMat = plastic(C.button, 0.42, 0.5);
    const slotMat = new THREE.MeshStandardMaterial({ color: C.slot, roughness: 0.8 });
    const grooveMat = new THREE.MeshStandardMaterial({ color: C.groove, roughness: 0.7 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: C.rubber, roughness: 0.95 });
    const aluminium = new THREE.MeshPhysicalMaterial({ color: '#c9ccd2', metalness: 0.95, roughness: 0.32, clearcoat: 0.3 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: '#2a2c30', metalness: 0.6, roughness: 0.5 });
    const powerMat = new THREE.MeshPhysicalMaterial({
      color: '#bba6ff',
      emissive: '#6f4dff',
      emissiveIntensity: 0.7,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });
    const ledMat = new THREE.MeshBasicMaterial({ color: '#ff3b30', toneMapped: false });

    // ---- The TV
    const tv = new THREE.Group();
    scene.add(tv);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = tv) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    add(new RoundedBoxGeometry(W, H, D, 10, 0.3), bodyMat, 0, 0, 0);

    // The picture tube at the back, narrowing toward the rear.
    const tubeGeo = new RoundedBoxGeometry(W * 0.8, H * 0.8, 1.6, 8, 0.5);
    {
      const p = tubeGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const t = (p.getZ(i) + 0.8) / 1.6; // 0 at the back, 1 at the front
        const s = 0.72 + 0.28 * t;
        p.setX(i, p.getX(i) * s);
        p.setY(i, p.getY(i) * s);
      }
      tubeGeo.computeVertexNormals();
    }
    add(tubeGeo, bodyMat, 0, 0.1, -(FRONT + 0.6));

    // Rubber feet
    for (const x of [-1.5, 1.5]) add(new RoundedBoxGeometry(0.6, 0.12, 1.4, 4, 0.05), rubberMat, x, -H / 2 - 0.05, 0);

    // A slim bezel around the glass, sitting slightly proud of the body
    add(new RoundedBoxGeometry(GW + 0.2, GH + 0.2, 0.12, 6, 0.1), bezelMat, 0, SCREEN_Y, FRONT + 0.01);

    // ---- The screen, in layers: a dark backing, the picture (with scanlines and static on top, all scaled
    // together for the switch-off), then curved glass that catches reflections over it.
    const gz = FRONT + 0.075;
    const glassMask = track(
      canvasTexture(1024, 576, (g, w, h) => {
        g.fillStyle = '#000';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff';
        // Barely rounded corners: they take off a sliver of the picture's very corners, like a real tube.
        tubePath(g, w, h, 0.012, 0.021);
        g.fill();
      })
    );
    const backing = add(
      new THREE.PlaneGeometry(GW, GH),
      new THREE.MeshStandardMaterial({ color: '#07080a', roughness: 0.4, alphaMap: glassMask, alphaTest: 0.5 }),
      0,
      SCREEN_Y,
      gz
    );
    backing.castShadow = false;

    const screen = new THREE.Group();
    screen.position.set(0, SCREEN_Y, gz + 0.006);
    tv.add(screen);
    // The picture fills the whole glass and follows its curve, so the video reads as the TV's screen.
    const PW = GW;
    const PH = GH;
    const PICTURE_BULGE = 0.055;
    const pictureMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, alphaMap: glassMask, alphaTest: 0.5 });
    screen.add(new THREE.Mesh(bulgedPlane(PW, PH, PICTURE_BULGE), pictureMat));
    // Only a touch darker at the very edges. No scanline pattern: it shimmered over the video and dulled it.
    const scan = track(
      canvasTexture(512, 288, (g, w, h) => {
        const v = g.createRadialGradient(w / 2, h / 2, h * 0.55, w / 2, h / 2, w * 0.62);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,0.1)');
        g.fillStyle = v;
        g.fillRect(0, 0, w, h);
      })
    );
    const scanMesh = new THREE.Mesh(
      bulgedPlane(PW, PH, PICTURE_BULGE),
      new THREE.MeshBasicMaterial({ map: scan, alphaMap: glassMask, transparent: true, depthWrite: false, toneMapped: false })
    );
    scanMesh.position.z = 0.002;
    screen.add(scanMesh);

    const noise = track(
      canvasTexture(128, 128, (g, w, h) => {
        const img = g.createImageData(w, h);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.random() * 255;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
      })
    );
    noise.wrapS = noise.wrapT = THREE.RepeatWrapping;
    noise.repeat.set(3, 2);
    const staticMat = new THREE.MeshBasicMaterial({ map: noise, alphaMap: glassMask, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const staticMesh = new THREE.Mesh(bulgedPlane(PW, PH, PICTURE_BULGE), staticMat);
    staticMesh.position.z = 0.004;
    screen.add(staticMesh);

    // On-screen display: the channel number, or a volume bar, in green, like an old TV.
    const osdCanvas = document.createElement('canvas');
    osdCanvas.width = 1024;
    osdCanvas.height = 576;
    const osdTex = track(new THREE.CanvasTexture(osdCanvas));
    osdTex.colorSpace = THREE.SRGBColorSpace;
    const osdMat = new THREE.MeshBasicMaterial({ map: osdTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const osdMesh = new THREE.Mesh(bulgedPlane(PW, PH, PICTURE_BULGE), osdMat);
    osdMesh.position.z = 0.003;
    screen.add(osdMesh);

    // Curved glass: clear, with reflections of the room and a soft highlight.
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.05,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      transparent: true,
      opacity: 0.05,
      alphaMap: glassMask,
      depthWrite: false,
      envMapIntensity: 1.2,
    });
    const glass = add(bulgedPlane(GW, GH, BULGE), glassMat, 0, SCREEN_Y, gz + 0.012);
    glass.castShadow = false;
    glass.receiveShadow = false;

    // The last dot of light after switching off.
    const dotTex = track(
      canvasTexture(64, 64, (g, w, h) => {
        const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        r.addColorStop(0, 'rgba(255,255,255,1)');
        r.addColorStop(0.3, 'rgba(255,255,255,0.7)');
        r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r;
        g.fillRect(0, 0, w, h);
      })
    );
    const dotMat = new THREE.MeshBasicMaterial({ map: dotTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const dot = add(new THREE.PlaneGeometry(0.34, 0.34), dotMat, 0, SCREEN_Y, gz + BULGE + 0.03);
    dot.castShadow = false;

    // ---- Control panel
    const row1 = -1.12;
    const row2 = -1.47;
    const controls: THREE.Object3D[] = [];
    // Invisible but clickable: makes the small controls easier to hit.
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
    // Each control's resting depth, and how far into a click's press-in it is (1 = just clicked).
    const pressables: { root: THREE.Object3D; z: number; press: number }[] = [];
    const control = (obj: THREE.Object3D, action: string, pad = 0.08, sound?: ClickKind) => {
      obj.updateMatrixWorld(true);
      obj.traverse((o) => {
        o.userData.action = action;
        o.userData.sound = sound;
        o.userData.root = obj;
      });
      controls.push(obj);
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x + pad * 2, size.y + pad * 2, size.z + pad), hitMat);
      hit.position.copy(center);
      hit.userData.action = action;
      hit.userData.sound = sound;
      hit.userData.root = obj;
      tv.add(hit);
      controls.push(hit);
      pressables.push({ root: obj, z: obj.position.z, press: 0 });
      return obj;
    };

    // A soft engraved line between the screen and the controls.
    add(new THREE.BoxGeometry(W - 0.6, 0.014, 0.012), grooveMat, 0, -0.87, FRONT + 0.001);

    control(add(new RoundedBoxGeometry(0.34, 0.13, 0.09, 4, 0.035), buttonMat, -1.52 * SX, row1, FRONT + 0.03), 'channel', 0.08, 'button');
    control(add(new RoundedBoxGeometry(0.4, 0.13, 0.09, 4, 0.035), buttonMat, -0.98 * SX, row1, FRONT + 0.03), 'channel', 0.08, 'button');
    control(add(new RoundedBoxGeometry(0.4, 0.13, 0.09, 4, 0.035), buttonMat, 0.68 * SX, row1, FRONT + 0.03), 'channel', 0.08, 'button');
    // Tape slot with three keys
    add(new RoundedBoxGeometry(1.0 * SX, 0.22, 0.05, 4, 0.05), slotMat, -0.15 * SX, row1, FRONT + 0.006);
    for (const x of [-0.47, -0.15, 0.17])
      control(add(new RoundedBoxGeometry(0.2, 0.08, 0.05, 3, 0.02), aluminium, x * SX, row1, FRONT + 0.03), 'channel', 0.08, 'key');

    const knob = (x: number, y: number, r: number, action: string, sound: ClickKind) => {
      const g = new THREE.Group();
      g.position.set(x, y, FRONT + 0.07);
      const body = new THREE.Mesh(knurledKnob(r, 0.14, 22), aluminium);
      body.castShadow = true;
      g.add(body);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.74, 0.03, 40), darkMetal);
      cap.rotation.x = Math.PI / 2;
      cap.position.z = 0.08;
      g.add(cap);
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.02, r * 0.5, 0.01), aluminium);
      mark.position.set(0, r * 0.38, 0.097);
      g.add(mark);
      tv.add(g);
      control(g, action, 0.08, sound);
      return g;
    };
    const channelKnob = knob(1.2 * SX, row1, 0.19, 'channel', 'knob');
    const volumeKnob = knob(-1.58 * SX, row2, 0.12, 'volume', 'tick');

    // Power: a lavender button in a metal ring.
    add(new THREE.TorusGeometry(0.15, 0.03, 16, 48), aluminium, 1.68 * SX, row1, FRONT + 0.03);
    const power = add(new THREE.SphereGeometry(0.14, 40, 20), powerMat, 1.68 * SX, row1, FRONT + 0.03);
    power.scale.z = 0.45;
    control(power, 'power', 0.1);

    // Perforated speaker grille: rows of small holes.
    const holes = track(
      canvasTexture(1024, 128, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = 'rgba(0,0,0,0.9)';
        for (let y = 10; y < h - 6; y += 14) {
          for (let x = 8 + ((y / 14) % 2) * 7; x < w - 6; x += 14) {
            g.beginPath();
            g.arc(x, y, 3.6, 0, Math.PI * 2);
            g.fill();
          }
        }
      })
    );
    holes.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const grille = add(
      new THREE.PlaneGeometry(2.4 * SX, 0.3),
      new THREE.MeshStandardMaterial({ map: holes, transparent: true, roughness: 0.8, depthWrite: false }),
      -0.12 * SX,
      row2,
      FRONT + 0.002
    );
    grille.castShadow = false;

    // Small metal badge and the power light
    const badge = track(
      canvasTexture(256, 64, (g, w, h) => {
        const m = g.createLinearGradient(0, 0, 0, h);
        m.addColorStop(0, '#e9ebef');
        m.addColorStop(0.5, '#a9adb5');
        m.addColorStop(1, '#d7dae0');
        g.fillStyle = m;
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#2a2c31';
        g.font = '700 30px Inter, Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('VN · 01', w / 2, h / 2 + 1);
      })
    );
    badge.colorSpace = THREE.SRGBColorSpace;
    badge.anisotropy = renderer.capabilities.getMaxAnisotropy();
    add(new RoundedBoxGeometry(0.42, 0.1, 0.012, 2, 0.006), new THREE.MeshStandardMaterial({ map: badge, metalness: 0.7, roughness: 0.35 }), 1.32 * SX, row2, FRONT + 0.006);
    add(new THREE.SphereGeometry(0.03, 16, 8), ledMat, 1.7 * SX, row2, FRONT + 0.02);

    // ---- Floor: a soft shadow from the light, plus a little contact darkening right under the TV.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.ShadowMaterial({ opacity: 0.22 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -H / 2 - 0.11;
    floor.receiveShadow = true;
    scene.add(floor);
    const contact = track(
      canvasTexture(256, 128, (g, w, h) => {
        // An ellipse that fades to nothing well inside the texture, so there is no visible edge.
        g.save();
        g.translate(w / 2, h / 2);
        g.scale(1, h / w);
        const r = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.45);
        r.addColorStop(0, 'rgba(0,0,0,0.5)');
        r.addColorStop(0.6, 'rgba(0,0,0,0.18)');
        r.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = r;
        g.fillRect(-w, -w, w * 2, w * 2);
        g.restore();
      })
    );
    const contactMesh = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.8),new THREE.MeshBasicMaterial({ map: contact, transparent: true, depthWrite: false }));
    contactMesh.rotation.x = -Math.PI / 2;
    contactMesh.position.set(0, -H / 2 - 0.1, -0.3);
    scene.add(contactMesh);

    // ---- What plays on the screen: one feed per channel, each set up the first time it's needed.
    const sources = sourcesRef.current;
    const n = sources.length;
    let current = Math.min(Math.max(channelRef.current, 0), n - 1);
    type Feed = { video?: HTMLVideoElement; tex?: THREE.Texture; started?: boolean };
    const feeds: Feed[] = sources.map(() => ({}));
    // Black until a channel's picture is ready.
    const blank = track(new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1));
    blank.needsUpdate = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const showFeed = () => {
      pictureMat.map = feeds[current].tex ?? blank;
      pictureMat.needsUpdate = true;
    };
    const feed = (i: number) => {
      const f = feeds[i];
      const s = sources[i];
      if (f.started) return f;
      f.started = true;
      if (s.videoUrl) {
        const v = document.createElement('video');
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.preload = 'none';
        v.src = s.videoUrl;
        const vt = track(new THREE.VideoTexture(v));
        vt.colorSpace = THREE.SRGBColorSpace;
        // The 1080p video is drawn much smaller than its size: mipmaps keep it smooth and sharp instead of
        // grainy and jagged (text in the recordings especially).
        vt.generateMipmaps = true;
        vt.minFilter = THREE.LinearMipmapLinearFilter;
        vt.magFilter = THREE.LinearFilter;
        vt.anisotropy = renderer.capabilities.getMaxAnisotropy();
        f.video = v;
        f.tex = vt;
      } else if (s.imageUrl) {
        loader.load(s.imageUrl, (t) => {
          track(t);
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = renderer.capabilities.getMaxAnisotropy();
          // Fill the 16:9 picture without stretching.
          const ia = t.image.width / t.image.height;
          const sa = PW / PH;
          if (ia > sa) {
            t.repeat.set(sa / ia, 1);
            t.offset.set((1 - sa / ia) / 2, 0);
          } else {
            t.repeat.set(1, ia / sa);
            t.offset.set(0, (1 - ia / sa) / 2);
          }
          f.tex = t;
          if (i === current) showFeed();
        });
      } else {
        // No video yet: a test card with the programme's name (testCard.ts), painted again once the fonts are in.
        const card = document.createElement('canvas');
        card.width = 1280;
        card.height = 720;
        const paint = () => drawTestCard(card, s.name ?? title, channelMode ? i + 1 : undefined);
        paint();
        const ct = track(new THREE.CanvasTexture(card));
        ct.colorSpace = THREE.SRGBColorSpace;
        ct.anisotropy = renderer.capabilities.getMaxAnisotropy();
        f.tex = ct;
        document.fonts
          ?.load('100px Anton')
          .then(() => document.fonts.load("600 20px 'Geist Mono'"))
          .then(() => {
            paint();
            ct.needsUpdate = true;
          })
          .catch(() => {});
      }
      return f;
    };
    // Load the channel on screen, and get the next one ready so switching to it is quick.
    const warm = () => {
      for (const i of n > 1 ? [current, (current + 1) % n] : [current]) {
        const v = feed(i).video;
        if (v && v.preload !== 'auto') v.preload = 'auto';
      }
    };
    // Every time you change channel, the programme starts again from the beginning.
    const restart = (v: HTMLVideoElement) => {
      const go = () => {
        v.currentTime = 0;
      };
      if (v.readyState >= 1) go();
      else v.addEventListener('loadedmetadata', go, { once: true });
    };
    feed(current);
    showFeed();

    // ---- State: it starts switched off, with a dark screen.
    let visible = false;
    let powered = false;
    let busy = false;
    const setPowerLook = (isOn: boolean) => {
      powerMat.emissiveIntensity = isOn ? 0.7 : 0;
      powerMat.color.set(isOn ? '#bba6ff' : '#5f5c6b');
      ledMat.color.set(isOn ? '#ff3b30' : '#3a1715');
    };
    setPowerLook(false);
    screen.visible = false;
    let staticLevel = 0;
    let staticTimer = 0;
    // Only the channel on screen plays, and only while the TV is on and in view.
    const syncVideo = () => {
      feeds.forEach((f, i) => {
        if (!f.video) return;
        if (visible && powered && i === current) f.video.play().catch(() => {});
        else f.video.pause();
      });
    };
    const burst = (ms: number) => {
      staticLevel = 0.85;
      window.clearTimeout(staticTimer);
      staticTimer = window.setTimeout(() => (staticLevel = 0), ms);
    };
    const tween = (from: number, to: number, duration: number, onUpdate: (v: number) => void, ease: any = 'easeInOut') =>
      animate(from, to, { duration, ease, onUpdate });

    // `remote`: turned on by the remote cursor (no switch clunk, just the tube warming up).
    const togglePower = async (source: 'button' | 'remote' = 'button') => {
      if (busy) return;
      busy = true;
      if (powered) {
        powered = false;
        setOn(false);
        tvPower(false);
        syncVideo();
        // Squash to a bright line, shrink to a dot, then the dot fades.
        await Promise.all([
          tween(1, 0.012, 0.16, (v) => (screen.scale.y = v), [0.6, 0, 0.9, 0.4]),
          tween(1, 2.6, 0.16, (v) => pictureMat.color.setScalar(v)),
        ]);
        dotMat.opacity = 1;
        await tween(1, 0, 0.14, (v) => (screen.scale.x = Math.max(v, 0.0001)), 'easeIn');
        screen.visible = false;
        void tween(1, 0, 0.7, (v) => {
          dotMat.opacity = v;
          dot.scale.setScalar(0.2 + v * 0.8);
        }, 'easeOut');
        setPowerLook(false);
      } else {
        powered = true;
        setOn(true);
        if (source === 'remote') tvRemoteOn();
        else tvPower(true);
        setPowerLook(true);
        screen.visible = true;
        screen.scale.set(0.0001, 0.012, 1);
        pictureMat.color.setScalar(2.6);
        syncVideo();
        burst(420);
        await tween(0.0001, 1, 0.14, (v) => (screen.scale.x = v), 'easeOut');
        await Promise.all([
          tween(0.012, 1, 0.3, (v) => (screen.scale.y = v), [0.2, 0.8, 0.2, 1]),
          tween(2.6, 1, 0.3, (v) => pictureMat.color.setScalar(v)),
        ]);
        // Like a real set, it shows which channel it's on as the picture comes up.
        if (powered) showOSD('ch');
      }
      busy = false;
    };

    // ---- Channel, volume, and the on-screen display
    let channel = 1;
    let volume = 4;
    let osdLeft = 0;
    const showOSD = (kind: 'ch' | 'vol') => {
      const g = osdCanvas.getContext('2d')!;
      const w = osdCanvas.width;
      const h = osdCanvas.height;
      g.clearRect(0, 0, w, h);
      g.shadowColor = 'rgba(0,0,0,0.85)';
      g.shadowOffsetX = 4;
      g.shadowOffsetY = 4;
      g.fillStyle = '#62ff8a';
      g.textBaseline = 'top';
      if (kind === 'ch') {
        g.font = `700 64px ${MONO_FONT}`;
        g.textAlign = 'right';
        g.fillText(`CH ${String(channelMode ? current + 1 : channel).padStart(2, '0')}`, w - 64, 48);
        // In channel mode, the channel's name too (the project), like a station name.
        const name = channelMode ? sources[current].name : undefined;
        if (name) {
          g.font = `700 32px ${MONO_FONT}`;
          g.fillText(name.toUpperCase(), w - 64, 128);
        }
      } else {
        g.font = `700 40px ${MONO_FONT}`;
        g.textAlign = 'left';
        g.fillText('VOLUME', 96, h - 156);
        for (let i = 0; i < 10; i++) {
          g.fillStyle = i < volume ? '#62ff8a' : 'rgba(98,255,138,0.22)';
          g.fillRect(96 + i * 56, h - 96, 42, 40);
        }
      }
      osdTex.needsUpdate = true;
      osdLeft = 1.8;
    };
    let channelTurns = 0;
    let volumeTurns = 0;
    // `sound`: the TV control that was used (it clicks, and the knob turns), or null when the remote changed it.
    // Nothing changes on screen while the TV is off. In channel mode the page is asked for the next channel (it
    // scrolls there, and `tune` below does the switch); otherwise the TV just flips to a new channel number.
    const changeChannel = (sound: ClickKind | null = 'knob') => {
      if (sound) {
        channelTurns++;
        tvClick(sound);
      }
      if (!powered) return;
      if (channelMode && onChannelRef.current) {
        onChannelRef.current((current + 1) % n);
        return;
      }
      channel = (channel % 12) + 1;
      burst(380);
      tvStatic(0.38, 0.2, 0.04);
      showOSD('ch');
    };
    // Switches to channel `i` (channel mode): a burst of static, then its picture, picked up where it would be
    // if it had been playing all along. While the TV is off, it just remembers the channel.
    let tuneTimer = 0;
    const tune = (i: number) => {
      const next = ((i % n) + n) % n;
      if (next === current) return;
      current = next;
      warm();
      if (!powered) {
        showFeed();
        return;
      }
      burst(420);
      tvStatic(0.4, 0.18);
      showOSD('ch');
      const v = feeds[current].video;
      if (v) restart(v);
      window.clearTimeout(tuneTimer);
      tuneTimer = window.setTimeout(() => {
        showFeed();
        syncVideo();
      }, 140);
    };
    const changeVolume = () => {
      volumeTurns++;
      tvClick('tick');
      if (powered) {
        volume = volume >= 10 ? 0 : volume + 1;
        showOSD('vol');
      }
    };
    // The red light flickers as the TV receives a signal from the remote.
    let ledBlink = 0;
    const receive = () => {
      ledBlink = 0.32;
    };
    // ---- Turning on by itself: when the remote is out and the TV is well in view (on phones, just in view),
    // or after a moment in view otherwise. Only once, and never after someone has used the power button.
    const coarse = !!window.matchMedia?.('(hover: none)').matches;
    let inView = false;
    let autoOnDone = false;
    let fallbackTimer = 0;
    const autoTimers: number[] = [];
    const autoOn = (viaRemote: boolean) => {
      if (autoOnDone || powered) return;
      autoOnDone = true;
      window.clearTimeout(fallbackTimer);
      const wait = nextAutoOnDelay();
      // The remote presses its power button, and a beat later the TV responds.
      if (viaRemote) autoTimers.push(window.setTimeout(() => pressRemote('power'), wait));
      autoTimers.push(
        window.setTimeout(() => {
          if (powered) return;
          if (viaRemote) receive();
          void togglePower('remote');
        }, wait + (viaRemote ? 160 : 0))
      );
    };
    const considerAutoOn = () => {
      if (autoOnDone || !inView) return;
      if (isRemoteActive()) autoOn(true);
      else if (coarse) autoOn(false);
      else {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = window.setTimeout(() => autoOn(false), 2500);
      }
    };
    const offRemote = onRemoteActive(considerAutoOn);
    const viewIO = new IntersectionObserver(
      ([e]) => {
        inView = e.intersectionRatio >= 0.4;
        if (inView) considerAutoOn();
        else window.clearTimeout(fallbackTimer);
      },
      { threshold: [0, 0.4] }
    );
    viewIO.observe(wrap);

    // Someone used the TV themselves.
    const markUsed = () => {
      autoOnDone = true;
      window.clearTimeout(fallbackTimer);
      markControlsUsed();
    };
    api.current = {
      power: () => {
        markUsed();
        void togglePower();
      },
      channel: () => {
        markUsed();
        changeChannel();
      },
      tune,
    };

    // ---- Pointer: turn toward it, and click the TV and its controls.
    const pointer = { x: 0, y: 0, inside: false, overControl: false };
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    /** The control at (x, y) on the page, if any. Leaves the raycaster aimed there. */
    const hitControl = (x: number, y: number) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(controls, true)[0];
      if (!hit?.object.userData.action) return null;
      return hit.object.userData as { action: string; sound?: ClickKind; root: THREE.Object3D };
    };
    const onTV = () => raycaster.intersectObject(tv, true).length > 0;
    // Tells the remote cursor which of its buttons a click here presses.
    const unregister = registerTV({
      el: wrap,
      peek: (x, y): RemoteButton | null => {
        const r = canvas.getBoundingClientRect();
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
        const hit = hitControl(x, y);
        if (hit) return hit.action === 'power' ? 'power' : hit.action === 'volume' ? 'vol' : 'ch';
        if (onTV()) return powered ? 'ch' : 'power';
        return null;
      },
    });
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      // Over a control the TV holds still, so it doesn't turn away from the cursor.
      pointer.overControl = !!hitControl(e.clientX, e.clientY);
      if (pointer.overControl) return;
      const r = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      pointer.inside = true;
    };
    const onLeave = () => {
      pointer.inside = false;
      pointer.overControl = false;
    };
    const onClick = (e: MouseEvent) => {
      const hit = hitControl(e.clientX, e.clientY);
      if (!hit && !onTV()) return; // empty space around the TV
      e.preventDefault();
      e.stopPropagation();
      markUsed();
      receive();
      if (!hit) {
        // The screen or the body: like pressing the remote. Off, it turns on; on, it changes channel.
        if (powered) changeChannel(null);
        else void togglePower('remote');
        return;
      }
      // The control presses in.
      const p = pressables.find((x) => x.root === hit.root);
      if (p) p.press = 1;
      if (hit.action === 'power') void togglePower();
      else if (hit.action === 'channel') changeChannel(hit.sound ?? 'knob');
      else if (hit.action === 'volume') changeVolume();
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('click', onClick);

    // ---- Size
    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    // Pinch-zoomed on a phone: redraw at the zoomed resolution, so the TV stays sharp instead of blocky.
    const offZoom = onPinchZoom(() => {
      renderer.setPixelRatio(canvasDpr(1.5, PHONE_DPR, wrap.clientWidth, wrap.clientHeight));
      resize();
      renderer.render(scene, camera);
    });

    // ---- Loop: only while on screen.
    let raf = 0;
    let last = performance.now();
    const start = performance.now();
    // Left alone, the TV only sways gently and plays its video (30 fps), so it's drawn at about 30 fps; while it's
    // being pointed at, or a control, the static or the on-screen display is moving, it's drawn every frame.
    // (Drawing every TV on screen at full rate was what made the Work section lag.)
    const IDLE_FRAME_MS = 1000 / 30;
    const lively = () => pointer.inside || pointer.overControl || staticLevel > 0 || staticMat.opacity > 0.01 || osdLeft > 0 || ledBlink > 0 || pressables.some((p) => p.press > 0);
    const loop = (now: number) => {
      if (!lively() && now - last < IDLE_FRAME_MS - 2) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;
      const k = 1 - Math.exp(-dt * 5);
      if (!pointer.overControl) {
        const ry = BASE_RY + Math.sin(t * 0.5) * 0.04 + (pointer.inside ? pointer.x * 0.32 : 0);
        const rx = BASE_RX + (pointer.inside ? pointer.y * 0.12 : 0);
        tv.rotation.y += (ry - tv.rotation.y) * k;
        tv.rotation.x += (rx - tv.rotation.x) * k;
      }
      channelKnob.rotation.z += (-channelTurns * 0.7 - channelKnob.rotation.z) * k;
      volumeKnob.rotation.z += (-volumeTurns * 0.9 - volumeKnob.rotation.z) * k;
      // A clicked control goes in quickly and springs back out.
      for (const p of pressables) {
        if (p.press <= 0) continue;
        p.press = Math.max(0, p.press - dt * 5);
        const depth = p.press > 0.75 ? (1 - p.press) / 0.25 : p.press / 0.75;
        p.root.position.z = p.z - 0.035 * depth;
      }
      osdLeft = Math.max(0, osdLeft - dt);
      osdMat.opacity = Math.min(1, osdLeft * 5);
      if (ledBlink > 0) {
        ledBlink -= dt;
        const flash = ledBlink > 0 && Math.floor(ledBlink * 24) % 2 === 0;
        ledMat.color.set(flash ? '#ffb4ad' : powered ? '#ff3b30' : '#3a1715');
      }
      staticMat.opacity += (staticLevel - staticMat.opacity) * Math.min(1, dt * 20);
      if (staticMat.opacity > 0.01) noise.offset.set(Math.random(), Math.random());
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) warm();
        syncVideo();
        cancelAnimationFrame(raf);
        if (visible) {
          last = performance.now();
          raf = requestAnimationFrame(loop);
        }
      },
      { rootMargin: '150px 0px' }
    );
    // Build the shaders in the background first (drawing straight away compiled them all at once and froze the
    // page, once per TV), then show the first frame and start drawing while on screen.
    let dead = false;
    compileShaders(renderer, scene, camera, () => !dead)
      .catch(() => undefined)
      .then(() => {
        if (dead) return;
        renderer.render(scene, camera);
        io.observe(wrap);
      });

    return () => {
      dead = true;
      io.disconnect();
      viewIO.disconnect();
      ro.disconnect();
      offZoom();
      offRemote();
      unregister();
      cancelAnimationFrame(raf);
      window.clearTimeout(staticTimer);
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(tuneTimer);
      autoTimers.forEach((id) => window.clearTimeout(id));
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
      api.current = null;
      for (const f of feeds) {
        if (!f.video) continue;
        f.video.pause();
        f.video.removeAttribute('src');
        f.video.load();
      }
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
      // Give the WebGL context back now rather than whenever the browser gets to it: browsers only allow a
      // handful at once and drop the oldest (which would be the remote cursor's) when there are too many.
      renderer.forceContextLoss();
      canvas.remove();
    };
    // Rebuilt only when the set of channels changes; switching channel is handled by `tune`.
  }, [failed, near, sourcesKey, channelMode, finish, title]);

  if (failed) return <>{fallback}</>;

  return (
    <div ref={wrapRef} className="relative aspect-[5/4] w-full">
      {/* The 3D canvas goes here (made in the effect above). */}
      {/* Says it's a working TV, until someone has tried it. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-[2%] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap pill pill-lav rounded-full px-3.5 py-1.5 text-[12px] font-semibold leading-tight tracking-[-0.01em] shadow-[0_2px_0_rgba(52,21,95,0.25)] transition-all duration-500 md:text-[13px] ${
          !used ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
        {!on
          ? `${touch ? 'Tap' : 'Click'} the TV to turn it on`
          : channelMode
            ? `Scroll or ${touch ? 'tap' : 'click'} · change channel`
            : `Working TV · ${touch ? 'tap' : 'click'} it`}
      </div>
      {/* For keyboards and screen readers: the TV's two main controls. */}
      <div className="sr-only">
        <button
          type="button"
          aria-pressed={on}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            api.current?.power();
          }}
        >
          {on ? 'Turn the TV off' : 'Turn the TV on'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            api.current?.channel();
          }}
        >
          Change channel
        </button>
      </div>
    </div>
  );
}
