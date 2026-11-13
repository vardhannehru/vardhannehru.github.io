// Artwork for the traffic light (trafficLightScene.ts), drawn once into canvases and used as textures: the lens
// faces, the warning stripes on the pole, the VN sign, the die-cut tool stickers, a soft glow and a fine grain for
// the powder-coated metal. Nothing here knows about three.js.
//
// The three lamps tell a little story (my own take on the poster):
//   red    'stop'  a sleeping face: the page is resting
//   yellow 'look'  two eyes; their pupils are separate meshes that turn towards your cursor
//   green  'go'    chevrons flowing with the scroll: down when scrolling down, up when scrolling up

export type LampKind = 'stop' | 'look' | 'go';

/** Top to bottom on the light. */
export const LAMP_ORDER: LampKind[] = ['stop', 'look', 'go'];

/** Each lamp's light, and the colour of its glass when it's off. Warm and soft, not neon. */
export const LAMP_COLORS: Record<LampKind, { on: string; off: string; rgb: string }> = {
  stop: { on: '#ff4a36', off: '#4a0f0b', rgb: '255,86,64' },
  look: { on: '#ffbd2e', off: '#4a3207', rgb: '255,192,64' },
  go: { on: '#2fd98e', off: '#083a23', rgb: '60,220,150' },
};

/** The eyes on the yellow lamp, in units of the lens radius (centre 0,0; +y up). */
export const EYES = { dx: 0.36, y: 0.02, rx: 0.24, ry: 0.3, pupil: 0.12, travel: 0.11 };

/** The pastel theme's ink and Limencello (index.html), for the sign and stripes. */
const LIMENCELLO = '#FED141';
const LIMENCELLO_INK = '#3F260C';
const STRIPE_DARK = '#16130f';

const LENS_PX = 256;

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

/** Lens units (-1..1, +y up) to canvas px. */
const lx = (u: number) => LENS_PX / 2 + (u * LENS_PX) / 2;
const ly = (v: number) => LENS_PX / 2 - (v * LENS_PX) / 2;
const lr = (r: number) => (r * LENS_PX) / 2;

function chevron(g: CanvasRenderingContext2D, cy: number) {
  // cy in lens units; points down.
  g.beginPath();
  g.moveTo(lx(-0.4), ly(cy + 0.17));
  g.lineTo(lx(0), ly(cy - 0.17));
  g.lineTo(lx(0.4), ly(cy + 0.17));
  g.stroke();
}

/** The lamp's picture, in one colour. For 'go', `tile` draws the chevrons for a texture that repeats vertically. */
function drawGlyph(g: CanvasRenderingContext2D, kind: LampKind, style: string, tile = false) {
  g.save();
  g.strokeStyle = style;
  g.fillStyle = style;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (kind === 'stop') {
    // Closed eyes (two soft arcs), a little round mouth, and a "z".
    g.lineWidth = lr(0.11);
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(lx(s * 0.34), ly(0.14), lr(0.19), 0.12 * Math.PI, 0.88 * Math.PI);
      g.stroke();
    }
    g.beginPath();
    g.ellipse(lx(0), ly(-0.36), lr(0.09), lr(0.075), 0, 0, Math.PI * 2);
    g.fill();
    g.font = `800 ${Math.round(lr(0.34))}px Geist, Inter, Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('z', lx(0.5), ly(0.6));
  } else if (kind === 'look') {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(lx(s * EYES.dx), ly(EYES.y), lr(EYES.rx), lr(EYES.ry), 0, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    g.lineWidth = lr(0.14);
    // Two chevrons half a lens apart, so the tile repeats seamlessly.
    if (tile) {
      chevron(g, 0.5);
      chevron(g, -0.5);
    } else {
      chevron(g, 0.3);
      chevron(g, -0.2);
    }
  }
  g.restore();
}

/** The glass when it's off: deep tinted, a little lighter in the middle, shaded under the hood, with faint
 *  Fresnel rings and the picture just visible in it. */
export function paintLensBase(kind: LampKind) {
  const { c, g } = canvas(LENS_PX, LENS_PX);
  const off = LAMP_COLORS[kind].off;
  g.fillStyle = off;
  g.fillRect(0, 0, LENS_PX, LENS_PX);
  const body = g.createRadialGradient(lx(-0.2), ly(0.15), 0, lx(0), ly(0), lr(1.05));
  body.addColorStop(0, 'rgba(255,255,255,0.16)');
  body.addColorStop(0.55, 'rgba(255,255,255,0.03)');
  body.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = body;
  g.fillRect(0, 0, LENS_PX, LENS_PX);
  // The hood keeps light off the top of the glass.
  const hood = g.createLinearGradient(0, 0, 0, LENS_PX);
  hood.addColorStop(0, 'rgba(0,0,0,0.45)');
  hood.addColorStop(0.35, 'rgba(0,0,0,0)');
  g.fillStyle = hood;
  g.fillRect(0, 0, LENS_PX, LENS_PX);
  g.strokeStyle = 'rgba(255,255,255,0.05)';
  g.lineWidth = 1.5;
  for (let r = 0.14; r < 1; r += 0.09) {
    g.beginPath();
    g.arc(lx(0), ly(0), lr(r), 0, Math.PI * 2);
    g.stroke();
  }
  drawGlyph(g, kind, 'rgba(255,255,255,0.14)');
  return c;
}

/** What lights up: the diffuser glows softly all over and the picture glows brightest. Used as an emissive map,
 *  so it's in greys. The 'go' one repeats vertically, so its chevrons can flow. */
export function paintLensGlow(kind: LampKind) {
  const { c, g } = canvas(LENS_PX, LENS_PX);
  g.fillStyle = '#000';
  g.fillRect(0, 0, LENS_PX, LENS_PX);
  if (kind === 'go') {
    g.fillStyle = 'rgb(58,58,58)';
    g.fillRect(0, 0, LENS_PX, LENS_PX);
  } else {
    const d = g.createRadialGradient(lx(0), ly(0), 0, lx(0), ly(0), lr(1));
    d.addColorStop(0, 'rgb(92,92,92)');
    d.addColorStop(1, 'rgb(40,40,40)');
    g.fillStyle = d;
    g.fillRect(0, 0, LENS_PX, LENS_PX);
  }
  // A soft bloom around the picture, then the picture itself.
  g.save();
  g.shadowColor = 'rgba(255,255,255,0.8)';
  g.shadowBlur = 14;
  drawGlyph(g, kind, 'rgb(235,235,235)', kind === 'go');
  g.restore();
  drawGlyph(g, kind, '#fff', kind === 'go');
  return c;
}

/** Black and yellow warning stripes at 45°, a square tile that repeats both ways, with a little wear. */
export function paintStripes() {
  const S = 256;
  const P = S / 2; // one yellow + one black band
  const { c, g } = canvas(S, S);
  const img = g.createImageData(S, S);
  const yellow = [0xfe, 0xd1, 0x41];
  const dark = [0x16, 0x13, 0x0f];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const t = (x + y) % P;
      // Distance to the nearest band edge, for a 1px soft edge.
      const e = Math.min(t, Math.abs(t - P / 2), P - t) / Math.SQRT2;
      const inYellow = t < P / 2;
      const k = Math.min(1, e / 1.2); // 0 at an edge, 1 inside
      const a = inYellow ? 0.5 + 0.5 * k : 0.5 - 0.5 * k; // share of yellow
      const wear = 1 - Math.random() * 0.07;
      const i = (y * S + x) * 4;
      img.data[i] = (yellow[0] * a + dark[0] * (1 - a)) * wear;
      img.data[i + 1] = (yellow[1] * a + dark[1] * (1 - a)) * wear;
      img.data[i + 2] = (yellow[2] * a + dark[2] * (1 - a)) * wear;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Fine grain for the powder coat (roughness and bump). */
export function paintGrain() {
  const S = 128;
  const { c, g } = canvas(S, S);
  const img = g.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + Math.random() * 34;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** The small lit sign beside the pole (the arrow box in the poster): my VN badge in Limencello. Redraw it once
 *  the fonts are in. */
export function paintSign(c?: HTMLCanvasElement) {
  const S = 128;
  const target = c ?? canvas(S, S).c;
  const g = target.getContext('2d')!;
  g.clearRect(0, 0, S, S);
  g.fillStyle = LIMENCELLO;
  roundRect(g, 0, 0, S, S, 18);
  g.fill();
  // A pale bevel along the top, a deeper one along the bottom.
  const bevel = g.createLinearGradient(0, 0, 0, S);
  bevel.addColorStop(0, 'rgba(255,255,255,0.4)');
  bevel.addColorStop(0.18, 'rgba(255,255,255,0)');
  bevel.addColorStop(0.85, 'rgba(120,70,0,0)');
  bevel.addColorStop(1, 'rgba(120,70,0,0.25)');
  g.fillStyle = bevel;
  roundRect(g, 0, 0, S, S, 18);
  g.fill();
  g.strokeStyle = 'rgba(63,38,12,0.35)';
  g.lineWidth = 4;
  roundRect(g, 9, 9, S - 18, S - 18, 12);
  g.stroke();
  g.fillStyle = LIMENCELLO_INK;
  g.font = `800 62px Geist, Inter, Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('VN', S / 2, S / 2 + 3);
  return target;
}

/** A die-cut sticker: a white backing traced round the art, with the art on it. `art` is a brand logo, or a word. */
export function paintSticker(art: HTMLImageElement | { text: string; bg: string; ink: string }) {
  const S = 160;
  const { c, g } = canvas(S, S);
  const R = S / 2 - 6;
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.25)';
  g.shadowBlur = 4;
  g.fillStyle = '#fff';
  if (art instanceof HTMLImageElement) {
    g.beginPath();
    g.arc(S / 2, S / 2, R, 0, Math.PI * 2);
    g.fill();
  } else {
    roundRect(g, 6, S * 0.2, S - 12, S * 0.6, 26);
    g.fill();
  }
  g.restore();
  if (art instanceof HTMLImageElement) {
    const iw = art.naturalWidth || 1;
    const ih = art.naturalHeight || 1;
    const fit = (R * 1.25) / Math.max(iw, ih);
    const w = iw * fit;
    const h = ih * fit;
    g.drawImage(art, S / 2 - w / 2, S / 2 - h / 2, w, h);
  } else {
    g.fillStyle = art.bg;
    roundRect(g, 16, S * 0.2 + 10, S - 32, S * 0.6 - 20, 18);
    g.fill();
    g.fillStyle = art.ink;
    g.font = `800 50px Geist, Inter, Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(art.text, S / 2, S / 2 + 2);
  }
  return c;
}

/** A long tag sticker that runs along the pole: a word printed sideways, on a die-cut white backing. */
export function paintTag(text: string, bg: string, ink: string) {
  const W = 96;
  const H = 320;
  const { c, g } = canvas(W, H);
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.22)';
  g.shadowBlur = 4;
  g.fillStyle = '#fff';
  roundRect(g, 6, 6, W - 12, H - 12, 30);
  g.fill();
  g.restore();
  g.fillStyle = bg;
  roundRect(g, 16, 16, W - 32, H - 32, 22);
  g.fill();
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(-Math.PI / 2);
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // As big as fits along the tag.
  let size = 50;
  g.font = `800 ${size}px Geist, Inter, Arial, sans-serif`;
  const room = H - 70;
  const wText = g.measureText(text).width;
  if (wText > room) {
    size = Math.floor((size * room) / wText);
    g.font = `800 ${size}px Geist, Inter, Arial, sans-serif`;
  }
  g.fillText(text, 0, 3);
  g.restore();
  return c;
}

/** A die-cut shape sticker: a five-point star or a four-point sparkle, in one colour with a white border. */
export function paintShape(shape: 'star' | 'sparkle', fill: string) {
  const S = 160;
  const { c, g } = canvas(S, S);
  const path = (r: number) => {
    g.beginPath();
    const points = shape === 'star' ? 5 : 4;
    const inner = shape === 'star' ? 0.45 : 0.3;
    for (let i = 0; i < points * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / points;
      const rr = i % 2 === 0 ? r : r * inner;
      const x = S / 2 + Math.cos(a) * rr;
      const y = S / 2 + Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
  };
  g.save();
  g.lineJoin = 'round';
  g.shadowColor = 'rgba(0,0,0,0.22)';
  g.shadowBlur = 4;
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  g.lineWidth = 18;
  path(S * 0.4);
  g.fill();
  g.stroke();
  g.restore();
  g.fillStyle = fill;
  path(S * 0.4);
  g.fill();
  // A soft highlight across the top.
  const hi = g.createLinearGradient(0, 0, 0, S);
  hi.addColorStop(0, 'rgba(255,255,255,0.35)');
  hi.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.fillStyle = hi;
  path(S * 0.4);
  g.fill();
  return c;
}

/** A soft round glow, white (tinted by the material). */
export function paintGlow() {
  const S = 128;
  const { c, g } = canvas(S, S);
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  return c;
}

export const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

export { LIMENCELLO, LIMENCELLO_INK, STRIPE_DARK };
