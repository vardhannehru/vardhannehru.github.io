/* Draws the loading screen's story on a background thread (an OffscreenCanvas handed over by vardhan-loader.js),
 * so it stays smooth while the page's main thread is busy starting the site (the app and its 3D scenes set
 * themselves up behind the loading screen, with frames of a few hundred ms there).
 *
 * The face draws itself in as one thread; the thread then unwinds off the face onto the loading bar as the site
 * really loads (progress messages from the page). The bar eases towards the progress (critically damped, so it
 * never jumps or overshoots between milestones), thins to the wordmark's rule as it fills, and at 100% tells the
 * page ('full'), which shows the wordmark's own rule and raises the name; then it's told to 'clear'.
 *
 * Messages in: init { canvas, dark, pin, faceUrl, layout }, layout { layout }, progress { target, ready },
 * skip, clear, stop. Messages out: full.
 */
'use strict';

var DRAW = 0.45;        // the face draws itself in (s)
var MIN_UNWIND = 0.7;   // the whole face never unwinds faster than this (s): the bar's top speed
var JUMP = 0.3;         // hops between the face's outlines count as this much of their length (thread out of sight)

var canvas = null, ctx = null, INK = '42,22,80', ACC = '116,59,190', PIN = -1;
var L = { W: 1, H: 1, DPR: 1, FB: { x: 0, y: 0, w: 1, h: 1 }, BAR: { x0: 0, x1: 1, y: 0, t: 2.5, rt: 1.5 }, LW: 1.5 };
var target = 0.06, ready = false, cleared = false, stopped = false, full = false;
var st = 0, shown = 0, vel = 0, last = 0;

function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function lerp(a, b, t) { return a + (b - a) * t; }

// ---- the thread ----
var face = null, X = [], Y = [], PEN = [], CUM = [0], TOTAL = 0;
function useFace(data) {
  if (!data || !data.lines || !data.lines.length) return;
  data.lines.forEach(function (pts) {
    for (var i = 0; i < pts.length; i += 2) {
      var first = i === 0;
      if (X.length) {
        var d = Math.hypot(pts[i] - X[X.length - 1], pts[i + 1] - Y[Y.length - 1]) * (first ? JUMP : 1);
        TOTAL += d;
        CUM.push(TOTAL);
        PEN.push(first ? 0 : 1); // a hop to the next outline isn't drawn
      }
      X.push(pts[i]); Y.push(pts[i + 1]);
    }
  });
  PEN.unshift(0); // (index i: the segment ending at point i)
  face = { w: data.w, h: data.h };
}
/** The segment containing length s, and the point there. */
function at(s) {
  var lo = 1, hi = CUM.length - 1;
  while (lo < hi) { var mid = (lo + hi) >> 1; if (CUM[mid] < s) lo = mid + 1; else hi = mid; }
  var seg = CUM[lo] - CUM[lo - 1] || 1, t = clamp((s - CUM[lo - 1]) / seg);
  return { i: lo, x: X[lo - 1] + (X[lo] - X[lo - 1]) * t, y: Y[lo - 1] + (Y[lo] - Y[lo - 1]) * t };
}

/** Critically damped follow (Unity's SmoothDamp): eases in and out of every change of target, never overshoots. */
function smoothDamp(cur, to, smoothTime, maxSpeed, dt) {
  var omega = 2 / smoothTime, x = omega * dt;
  var exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  var change = cur - to, orig = to, maxChange = maxSpeed * smoothTime;
  change = Math.max(-maxChange, Math.min(maxChange, change));
  to = cur - change;
  var temp = (vel + omega * change) * dt;
  vel = (vel - omega * temp) * exp;
  var out = to + (change + temp) * exp;
  if ((orig - cur > 0) === (out > orig)) { out = orig; vel = 0; }
  return out;
}

function setLayout(l) {
  L = l;
  if (canvas) { canvas.width = Math.round(l.W * l.DPR); canvas.height = Math.round(l.H * l.DPR); }
}

var raf = self.requestAnimationFrame
  ? function (f) { self.requestAnimationFrame(f); }
  : function (f) { setTimeout(function () { f(performance.now()); }, 16); };

function frame(now) {
  if (stopped) return;
  // Real time, capped at a second so a tab coming back from the background doesn't leap far.
  var dt = last ? Math.min(1, (now - last) / 1000) : 0;
  last = now;
  if (PIN >= 0) {
    st = Math.min(PIN, DRAW);
    shown = clamp(PIN - DRAW);
    if (PIN > DRAW + 1 && !full) { full = true; postMessage({ type: 'full' }); }
  } else if (!full) {
    st += dt;
    if (st >= DRAW && dt > 0) {
      // Follow the real progress; a slow creep keeps it moving between milestones (never past 90% before the site
      // is ready). Quicker to settle once the site is ready.
      var creep = Math.min(0.9, 0.1 + (st - DRAW) * 0.14);
      var goal = ready ? 1 : Math.max(Math.min(0.99, target), creep);
      shown = smoothDamp(shown, goal, ready ? 0.22 : 0.4, 1 / MIN_UNWIND, dt);
      if (ready && 1 - shown < 0.002) {
        shown = 1;
        full = true;
        postMessage({ type: 'full' });
      }
    }
  }
  draw();
  if (!cleared) raf(frame);
}

function draw() {
  var W = L.W, H = L.H, B = L.BAR, FB = L.FB;
  ctx.setTransform(L.DPR, 0, 0, L.DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (cleared) return; // the wordmark (SVG) has taken over
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // In the last tenth the bar thins to the rule's weight, and its leading point and percentage fade, so at 100% it
  // is exactly the rule the wordmark takes over with.
  var endK = ease(clamp((shown - 0.9) / 0.1));
  var barT = lerp(B.t, B.rt, endK);

  // the track: a faint hairline where the rule will be
  var tIn = ease(clamp(st / 0.4));
  ctx.lineWidth = barT;
  ctx.strokeStyle = 'rgba(' + INK + ',' + (0.2 * tIn * (1 - endK)).toFixed(3) + ')';
  ctx.beginPath(); ctx.moveTo(B.x0, B.y); ctx.lineTo(B.x1, B.y); ctx.stroke();

  var headX = B.x0 + (B.x1 - B.x0) * shown;
  if (shown > 0) {
    ctx.strokeStyle = 'rgb(' + INK + ')';
    ctx.beginPath(); ctx.moveTo(B.x0, B.y); ctx.lineTo(headX, B.y); ctx.stroke();
  }

  if (face && TOTAL > 0) {
    var sx = FB.w / face.w, sy = FB.h / face.h;
    var from = shown * TOTAL;                   // unwound so far
    var to = ease(clamp(st / DRAW)) * TOTAL;    // drawn in so far
    if (to > from) {
      ctx.lineWidth = L.LW;
      ctx.strokeStyle = 'rgb(' + INK + ')';
      ctx.beginPath();
      var a = at(from), b = at(to);
      ctx.moveTo(FB.x + a.x * sx, FB.y + a.y * sy);
      for (var i = a.i; i < b.i; i++) {
        if (PEN[i]) ctx.lineTo(FB.x + X[i] * sx, FB.y + Y[i] * sy);
        else ctx.moveTo(FB.x + X[i] * sx, FB.y + Y[i] * sy);
      }
      if (PEN[b.i]) ctx.lineTo(FB.x + b.x * sx, FB.y + b.y * sy);
      ctx.stroke();
    }
    // the thread being pulled off the face onto the bar's leading point
    if (shown > 0 && shown < 1) {
      var p = at(from), px = FB.x + p.x * sx, py = FB.y + p.y * sy;
      ctx.lineWidth = Math.max(1.2, L.LW * 0.85);
      ctx.strokeStyle = 'rgba(' + INK + ',' + (0.8 * (1 - endK)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.bezierCurveTo(px, py + (B.y - py) * 0.6, headX + (px - headX) * 0.15, B.y, headX, B.y);
      ctx.stroke();
    }
  }

  // the leading point, and the percentage at the end of the bar
  var a2 = ease(clamp((st - DRAW * 0.6) / 0.35)) * (1 - endK);
  if (a2 > 0.005) {
    ctx.fillStyle = 'rgba(' + ACC + ',' + a2.toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(headX, B.y, Math.max(3.5, B.t * 1.5), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(' + INK + ',' + (0.85 * a2).toFixed(3) + ')';
    ctx.font = '600 14px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(Math.round(shown * 100)).padStart(2, '0') + '%', B.x1, B.y - 12);
  }
}

self.onmessage = function (e) {
  var m = e.data || {};
  if (m.type === 'init') {
    canvas = m.canvas;
    ctx = canvas.getContext('2d');
    if (m.dark) { INK = '237,231,255'; ACC = '182,157,248'; }
    PIN = typeof m.pin === 'number' ? m.pin : -1;
    setLayout(m.layout);
    fetch(m.faceUrl).then(function (r) { return r.ok ? r.json() : null; }).then(useFace).catch(function () {});
    raf(frame);
  } else if (m.type === 'layout') {
    setLayout(m.layout);
  } else if (m.type === 'progress') {
    target = m.target;
    ready = !!m.ready;
  } else if (m.type === 'skip') {
    shown = 1; full = true;
  } else if (m.type === 'clear') {
    cleared = true;
    if (ctx) draw();
  } else if (m.type === 'stop') {
    stopped = true;
  }
};
