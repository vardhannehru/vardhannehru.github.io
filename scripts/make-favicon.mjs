// Builds the tab icon (favicon) and app icons from the face portrait: no wording, just the face.
// Run from the project root:  node scripts/make-favicon.mjs
//
// The portrait is white face + black line art on transparency. On its own it vanishes on a white tab
// (white face) and on a dark tab (black hair), so it sits on a violet badge (--accent, #743BBE).
//
// Writes:
//   public/favicon.ico                    16 / 32 / 48, PNG-in-ICO (browsers ask for /favicon.ico on their own)
//   public/favicon/favicon-{16,32,48}.png round badge, tab sizes (slightly sharpened so the eyes survive)
//   public/favicon/favicon-{192,512}.png  round badge, for the web manifest
//   public/favicon/maskable-512.png       full-bleed square, face inside the 80% safe zone (Android crops it)
//   public/favicon/apple-touch-icon.png   180, full-bleed square (iOS rounds the corners itself; no transparency)
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const SRC = 'logo/svg/vardhan-portrait-transparent.svg';
const OUT = 'public/favicon';
const VIOLET = '#743BBE';
const M = 1024; // master size everything is drawn at, then scaled down

await mkdir(OUT, { recursive: true });

// The face, rendered big from the vector source and trimmed to its own edges.
const face = await sharp(SRC, { density: 300 }).resize(2048, 2048, { fit: 'inside' }).trim().png().toBuffer();

/** A master image: `shape` 'circle' or 'square' in violet, the face scaled to `scale` of the side. */
async function master(shape, scale) {
  const bg = shape === 'circle'
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${M}" height="${M}"><circle cx="${M / 2}" cy="${M / 2}" r="${M / 2}" fill="${VIOLET}"/></svg>`
    : shape === 'none'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${M}" height="${M}"/>` // transparent: the face alone
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${M}" height="${M}"><rect width="${M}" height="${M}" fill="${VIOLET}"/></svg>`;
  const side = Math.round(M * scale);
  const f = await sharp(face).resize(side, side, { fit: 'inside' }).png().toBuffer();
  const { width, height } = await sharp(f).metadata();
  if (shape === 'none' && (width > M || height > M)) {
    // Larger than the canvas: crop the middle square, so the face fills it and the top of the hair and the beard are cut off.
    const left = Math.max(0, Math.round((width - M) / 2)), top = Math.max(0, Math.round((height - M) / 2));
    return sharp(f).extract({ left, top, width: Math.min(M, width), height: Math.min(M, height) }).resize(M, M).png().toBuffer();
  }
  return sharp(Buffer.from(bg))
    .composite([{ input: f, left: Math.round((M - width) / 2), top: Math.round((M - height) / 2 + M * 0.01) }])
    .png()
    .toBuffer();
}

/** Scale a master down to `size`; tab sizes get a light sharpen so the eyes and beard don't smear. */
async function at(buf, size) {
  let img = sharp(buf).resize(size, size, { kernel: 'lanczos3' });
  if (size <= 48) img = img.sharpen({ sigma: 0.5 });
  return img.png({ compressionLevel: 9 }).toBuffer();
}

const round = await master('none', 1.25); // face only, no badge; >1 crops the hair and beard to make the face bigger
const square = await master('square', 0.96);
const maskable = await master('square', 0.66);

const tab = {};
for (const s of [16, 32, 48]) {
  tab[s] = await at(round, s);
  await writeFile(`${OUT}/favicon-${s}.png`, tab[s]);
}
for (const s of [192, 512]) await writeFile(`${OUT}/favicon-${s}.png`, await at(round, s));
await writeFile(`${OUT}/maskable-512.png`, await at(maskable, 512));
await writeFile(`${OUT}/apple-touch-icon.png`, await at(square, 180));

// favicon.ico: an ICO header + directory, then the PNGs as they are (supported by every current browser).
const sizes = [16, 32, 48];
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e); // width
  header.writeUInt8(s, e + 1); // height
  header.writeUInt8(0, e + 2); // palette
  header.writeUInt8(0, e + 3); // reserved
  header.writeUInt16LE(1, e + 4); // colour planes
  header.writeUInt16LE(32, e + 6); // bits per pixel
  header.writeUInt32LE(tab[s].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += tab[s].length;
});
await writeFile('public/favicon.ico', Buffer.concat([header, ...sizes.map((s) => tab[s])]));

console.log('favicon set written to public/favicon.ico and public/favicon/');
