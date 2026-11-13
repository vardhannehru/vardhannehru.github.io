// Builds the tab icon (favicon) and app icons from the face portrait: no wording, just the face.
// Run from the project root:  node scripts/make-favicon.mjs
//
//   Tab icon (browsers): the face alone on a transparent background, cropped square with a little room round it.
//     public/favicon.ico                    16 / 32 / 48, PNG-in-ICO (browsers ask for /favicon.ico on their own)
//     public/favicon/favicon-{16,32,48}.png tab sizes
//     public/favicon/favicon-{192,512}.png  for the web manifest
//   Home-screen icons (phones need a solid square, no transparency): the same face, large, on the site's soft lavender.
//     public/favicon/apple-touch-icon.png   180, full-bleed (iOS rounds the corners itself)
//     public/favicon/maskable-512.png       full-bleed, face inside the 80% safe zone (Android crops it to a shape)
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const SRC = 'logo/png/vardhan-portrait-transparent.png';
const OUT = 'public/favicon';
const LAVENDER = '#EBDEFC'; // the site's Soft Lavender (pastel theme background)

await mkdir(OUT, { recursive: true });

// The face trimmed to its own edges.
const { data, info } = await sharp(SRC).ensureAlpha().trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
const face = data;
const long = Math.max(info.width, info.height);

/** The face centred in a square of `long / scale` px, on `bg` ('transparent' or a colour). */
async function square(scale, bg) {
  const side = Math.round(long / scale);
  const background = bg === 'transparent' ? { r: 0, g: 0, b: 0, alpha: 0 } : bg;
  return sharp({ create: { width: side, height: side, channels: 4, background } })
    .composite([{ input: face, left: Math.round((side - info.width) / 2), top: Math.round((side - info.height) / 2) }])
    .png()
    .toBuffer();
}
const png = (buf, size) => sharp(buf).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();

// Tab icon: transparent, with 6% of room each side.
const tab = await square(1 / 1.12, 'transparent');
const tabSizes = {};
for (const s of [16, 32, 48, 192, 512]) {
  tabSizes[s] = await png(tab, s);
  await writeFile(`${OUT}/favicon-${s}.png`, tabSizes[s]);
}

// Home-screen icons: lavender, the face filling most of the square (maskable: inside the safe zone).
await writeFile(`${OUT}/apple-touch-icon.png`, await png(await square(0.9, LAVENDER), 180));
await writeFile(`${OUT}/maskable-512.png`, await png(await square(0.66, LAVENDER), 512));

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
  header.writeUInt32LE(tabSizes[s].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += tabSizes[s].length;
});
await writeFile('public/favicon.ico', Buffer.concat([header, ...sizes.map((s) => tabSizes[s])]));

console.log('favicon set written to public/favicon.ico and public/favicon/');
