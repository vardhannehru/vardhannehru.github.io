import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const input = path.resolve(__dirname, '../public/rangoli/rangoli.png');
const output = path.resolve(__dirname, '../public/rangoli/rangoli-transparent.png');

const img = sharp(input);
const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

// Remove dark background with a soft edge to avoid halos.
// Anything darker than `blackCut` becomes fully transparent.
// Between blackCut..blackSoft, alpha is reduced smoothly.
const blackCut = 40; // 0..255
const blackSoft = 90; // 0..255

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  // perceived luminance
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  if (lum <= blackCut) {
    data[i + 3] = 0;
  } else if (lum < blackSoft) {
    const t = (lum - blackCut) / (blackSoft - blackCut); // 0..1
    // keep only the "non-background" portion
    data[i + 3] = Math.round(data[i + 3] * t);
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(output);

console.log('Wrote', output);
