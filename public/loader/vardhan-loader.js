/* The loading screen's story: VARDHAN's signature intro.
 *
 * 1. The face draws itself in as one continuous thread (the outlines of the user's own portrait, chained into one
 *    line by scripts/make-loader-face.mjs → face.json).
 * 2. As the site really loads (window.__pl.target, raised by index.html at each milestone), the thread unwinds off
 *    the face and is pulled down onto the loading bar, which sits exactly where the wordmark's rule is. The face
 *    disappears as the bar fills.
 * 3. At 100% the face is gone and the bar is the rule: VARDHAN rises out of it letter by letter, SAI RAGHAVENDRA
 *    NEHRU settles in underneath, and the wordmark glides to the middle (CSS: .pl-name in index.html).
 * 4. index.html then opens the screen from the middle onto the site.
 *
 * The drawing runs on a background thread (loader-worker.js, an OffscreenCanvas), because the page's main thread is
 * busy starting the site while this screen is up and anything drawn there would stutter. This script only lays the
 * scene out, passes the real progress on, and switches to the wordmark at 100%. Browsers without OffscreenCanvas
 * get the still wordmark. index.html decides whether it plays (motion allowed) and never waits long for it.
 */
(function () {
  'use strict';
  var pl = window.__pl;
  var el = document.getElementById('preloader');
  if (!pl || !el || !pl.story || pl.finished) return;
  var canvas = el.querySelector('.pl-canvas');
  var brand = el.querySelector('.pl-brand');
  var rule = el.querySelector('.pl-rule');
  if (!canvas || !brand || !rule || !canvas.transferControlToOffscreen || !window.Worker) { pl.story = false; return; }

  var worker, off;
  try {
    worker = new Worker('/loader/loader-worker.js');
    off = canvas.transferControlToOffscreen();
  } catch (e) { pl.story = false; return; }
  pl.storyStarted = true;
  pl.storyStartedAt = Math.round(performance.now()); // (for timing checks)
  el.classList.add('pl-story');

  var NAME_DUR = 0.75; // from 100% to the story being complete: the letters rise (s)

  // Review aid: #pl-at=… pins one moment and keeps the screen up (index.html sees pl.pinned). 0–0.45: drawing in;
  // 0.45–1.45: unwound 0–100%; past that: the name.
  var pinMatch = /pl-at=([\d.]+)/.exec(location.hash);
  var PIN = pinMatch ? parseFloat(pinMatch[1]) : -1;

  // ---- layout (measured here, drawn there) ----
  var named = false, shift = 0;
  function layout() {
    var W = window.innerWidth, H = window.innerHeight;
    // The face, with the bar a little below it; the pair centred on the screen.
    var fh = Math.min(H * 0.44, (W * 0.66) / 0.808, 420), fw = fh * 0.808, gap = Math.max(18, fh * 0.08);
    var ruleY = H / 2 + (fh + gap) / 2;
    // Move the wordmark so its rule sits at ruleY (no transition for this, only for the glide back later).
    var r = rule.getBoundingClientRect();
    if (!named) {
      var base = r.top + r.height / 2 - shift;
      shift = ruleY - base;
      brand.style.transition = 'none';
      brand.style.setProperty('--pl-shift', shift.toFixed(1) + 'px');
      void brand.offsetWidth; // apply now
      brand.style.transition = '';
    }
    return {
      W: W, H: H, DPR: Math.min(2, window.devicePixelRatio || 1),
      FB: { x: W / 2 - fw / 2, y: ruleY - gap - fh, w: fw, h: fh },
      // The bar is drawn a touch heavier than the rule so it reads clearly, and thins to it (rt) as it fills.
      BAR: { x0: r.left, x1: r.right, y: ruleY, t: Math.max(2.5, r.height * 1.6), rt: Math.max(1, r.height) },
      LW: Math.max(1.5, fh / 220),
    };
  }

  function fail() {
    // The worker couldn't start: show the still wordmark instead.
    pl.story = false;
    el.classList.remove('pl-story');
    brand.style.setProperty('--pl-shift', '0px');
    if (pl.check) pl.check();
  }
  worker.onerror = fail;
  try {
    worker.postMessage({ type: 'init', canvas: off, dark: document.documentElement.classList.contains('dark'), pin: PIN, faceUrl: '/loader/face.json', layout: layout() }, [off]);
  } catch (e) { fail(); return; }
  window.addEventListener('resize', function () { if (!named) worker.postMessage({ type: 'layout', layout: layout() }); });

  // Pass the real progress on whenever it changes.
  var sent = '';
  var poll = setInterval(function () {
    var key = (pl.target || 0) + '|' + (pl.ready ? 1 : 0);
    if (key !== sent) { sent = key; worker.postMessage({ type: 'progress', target: (pl.target || 0) / 100, ready: !!pl.ready }); }
  }, 80);

  function showName() {
    if (named) return;
    named = true;
    clearInterval(poll);
    el.classList.add('pl-name'); // the wordmark's own rule appears where the bar is, and the letters rise
    // Glide the wordmark back to the middle as the letters rise.
    brand.style.setProperty('--pl-shift', '0px');
    // Let the canvas go a frame later, once the rule is on screen.
    requestAnimationFrame(function () { worker.postMessage({ type: 'clear' }); });
  }
  function done() {
    if (pl.storyDone) return;
    pl.storyDone = true;
    pl.storyDoneAt = Math.round(performance.now()); // (for timing checks)
    window.removeEventListener('pointerdown', skip);
    window.removeEventListener('keydown', skip);
    if (pl.check) pl.check();
  }
  worker.onmessage = function (e) {
    if (e.data && e.data.type === 'full') {
      showName();
      if (PIN < 0) setTimeout(done, NAME_DUR * 1000);
    }
  };
  // Once the site is ready, a click, tap or key skips to the end.
  function skip() {
    if (!pl.ready || pl.storyDone || PIN >= 0) return;
    worker.postMessage({ type: 'skip' });
    showName();
    done();
  }
  window.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', skip);

  window.addEventListener('pl:finish', function () {
    clearInterval(poll);
    setTimeout(function () { worker.postMessage({ type: 'stop' }); worker.terminate(); }, 1200);
  }, { once: true });
})();
