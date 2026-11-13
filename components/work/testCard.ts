// What a channel shows until its video is added: a TV test card in the site's palette (colour bars in the three
// pastel swatches and their inks), with the programme's name and "Video coming soon". The 3D TV paints it onto its
// screen with drawTestCard; the flat TV and the channel guide build the same card in HTML (TestCard in projects.tsx).
// Once a project has a videoUrl (or an imageUrl), that plays instead.

/** The bars, left to right: white, Limencello, Summer Green, Soft Lavender, then the lavender, green and brown inks. */
export const TEST_BARS = ['#FFFFFF', '#FED141', '#B1E4E3', '#EBDEFC', '#743BBE', '#08746B', '#3F260C'];
/** The thin strip under the bars (like a test card's second row). */
export const TEST_STRIP = ['#3F260C', '#14101b', '#08746B', '#14101b', '#743BBE', '#14101b', '#FFFFFF'];
/** The dark band along the bottom, and the label box. */
export const TEST_BASE = '#14101b';
export const TEST_LABEL = 'Video coming soon';
/** Heights of the bars and the strip, as fractions of the card. */
export const TEST_BAR_H = 0.67;
export const TEST_STRIP_H = 0.08;

const DISPLAY = "Anton, Impact, 'Arial Narrow', sans-serif";
const MONO = "'Geist Mono', ui-monospace, Consolas, monospace";

/**
 * Paints the card on a canvas (any size, 16:9 suits the TV). `channel` adds a "CH 01" tag. Paint it again once the
 * web fonts have loaded (the first paint may use the fallback fonts).
 */
export function drawTestCard(canvas: HTMLCanvasElement, name: string, channel?: number) {
  const g = canvas.getContext('2d');
  if (!g) return;
  const w = canvas.width;
  const h = canvas.height;
  const col = w / TEST_BARS.length;
  const barH = h * TEST_BAR_H;
  const stripH = h * TEST_STRIP_H;
  g.clearRect(0, 0, w, h);
  TEST_BARS.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(Math.floor(i * col), 0, Math.ceil(col) + 1, barH);
  });
  TEST_STRIP.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(Math.floor(i * col), barH, Math.ceil(col) + 1, stripH);
  });
  g.fillStyle = TEST_BASE;
  g.fillRect(0, barH + stripH, w, h - barH - stripH);

  // The label box in the middle.
  const bw = w * 0.72;
  const bh = h * 0.32;
  const bx = (w - bw) / 2;
  const by = h * 0.5 - bh * 0.62;
  g.fillStyle = 'rgba(20,16,27,0.9)';
  g.beginPath();
  if (typeof g.roundRect === 'function') g.roundRect(bx, by, bw, bh, h * 0.03);
  else g.rect(bx, by, bw, bh);
  g.fill();

  // The programme's name, as big as fits.
  const label = name.toUpperCase();
  let size = h * 0.14;
  g.font = `${size}px ${DISPLAY}`;
  const fit = (bw * 0.86) / Math.max(1, g.measureText(label).width);
  if (fit < 1) {
    size *= fit;
    g.font = `${size}px ${DISPLAY}`;
  }
  g.fillStyle = '#FFFFFF';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillText(label, w / 2, by + bh * 0.58);

  // "VIDEO COMING SOON", letter-spaced where the browser can.
  g.font = `600 ${Math.round(h * 0.04)}px ${MONO}`;
  g.fillStyle = '#FED141';
  const spaced = g as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in spaced) spaced.letterSpacing = `${Math.round(h * 0.012)}px`;
  g.fillText(TEST_LABEL.toUpperCase(), w / 2, by + bh * 0.84);
  if ('letterSpacing' in spaced) spaced.letterSpacing = '0px';

  if (channel) {
    g.font = `600 ${Math.round(h * 0.035)}px ${MONO}`;
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.textAlign = 'left';
    g.fillText(`CH ${String(channel).padStart(2, '0')}`, w * 0.04, h * 0.93);
  }
}
