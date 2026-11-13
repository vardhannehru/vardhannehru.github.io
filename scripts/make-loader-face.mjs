// Turns the face portrait (logo/svg/vardhan-portrait-transparent.svg, the user's own illustrated portrait) into
// the thread the loading screen draws its face with: the outline of every ink shape (hair, brows, eyes, nose,
// mouth, beard, jaw) as simplified polylines on a 0–1000 grid, chained into one thread (see below).
// Run from the project root:  node scripts/make-loader-face.mjs
// Writes public/loader/face.json, read by public/loader/vardhan-loader.js.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const SRC = 'logo/svg/vardhan-portrait-transparent.svg';
const svg = await readFile(SRC, 'utf8');
// The second path is the ink (#121016); the first is the white face fill.
const ink = [...svg.matchAll(/<path[^>]*fill="#121016"[^>]*\sd="([^"]+)"/g)][0][1];

/** Parse an absolute M/C/Z path into subpaths of cubic segments. */
function parse(d) {
  const toks = d.match(/[MCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
  const subs = [];
  let cur = null, i = 0, cmd = '', pen = [0, 0];
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/[MCZ]/i.test(toks[i])) cmd = toks[i++];
    if (cmd === 'M') { pen = [num(), num()]; cur = { start: pen, segs: [] }; subs.push(cur); cmd = 'C'; continue; }
    if (cmd === 'C') { const c1 = [num(), num()], c2 = [num(), num()], p = [num(), num()]; cur.segs.push([pen, c1, c2, p]); pen = p; continue; }
    if (cmd === 'Z') { cmd = ''; continue; }
  }
  return subs;
}
const bez = ([p0, p1, p2, p3], t) => {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
};
/** Ramer–Douglas–Peucker. */
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= eps) return [a, b];
  return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
}

const subs = parse(ink);
let polys = subs.map((s) => {
  const pts = [s.start];
  for (const seg of s.segs) {
    const len = Math.hypot(seg[3][0] - seg[0][0], seg[3][1] - seg[0][1]);
    const n = Math.max(2, Math.ceil(len / 6));
    for (let k = 1; k <= n; k++) pts.push(bez(seg, k / n));
  }
  // Closed outlines start and end at the same point, which the simplifier can't measure against: simplify the
  // two halves (split at the point farthest from the start) separately.
  let far = 0, fd = 0;
  pts.forEach((q, i) => { const d = Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]); if (d > fd) { fd = d; far = i; } });
  return rdp(pts.slice(0, far + 1), 2.2).slice(0, -1).concat(rdp(pts.slice(far), 2.2));
});
// Bounding box of the ink, then quantise to a 0–1000 grid keeping the aspect (y is the long side).
let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
for (const p of polys) for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
const S = 1000 / Math.max(x1 - x0, y1 - y0);
const W = Math.round((x1 - x0) * S), H = Math.round((y1 - y0) * S);
polys = polys
  .map((p) => p.map(([x, y]) => [Math.round((x - x0) * S), Math.round((y - y0) * S)]))
  .map((p) => p.filter((q, i) => i === 0 || q[0] !== p[i - 1][0] || q[1] !== p[i - 1][1]))
  .filter((p) => p.length >= 3);
// One thread: start at the outline point nearest the face's bottom-left (where the loading bar begins), then
// always hop to the nearest unused outline, entering it at its nearest point and going once round it. The
// loading screen treats the hops between outlines as thread that runs out of sight.
const thread = [];
let cur = [0, H];
const left = polys.slice();
while (left.length) {
  let bi = 0, bj = 0, bd = Infinity;
  left.forEach((p, i) => p.forEach((q, j) => { const d = Math.hypot(q[0] - cur[0], q[1] - cur[1]); if (d < bd) { bd = d; bi = i; bj = j; } }));
  const p = left.splice(bi, 1)[0];
  const ring = p.slice(bj).concat(p.slice(0, bj));
  ring.push(ring[0]); // closed: back to where it entered
  thread.push(ring);
  cur = ring[ring.length - 1];
}

await mkdir('public/loader', { recursive: true });
// Each outline as a flat [x, y, x, y, …] list, in thread order; each ends where it began.
const out = { w: W, h: H, lines: thread.map((p) => p.flat()) };
const json = JSON.stringify(out);
await writeFile('public/loader/face.json', json);
console.log(`${polys.length} outlines, ${polys.reduce((s, p) => s + p.length, 0)} points, ${json.length} bytes, ${W}x${H}`);
