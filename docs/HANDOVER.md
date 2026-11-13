# Handover: Vardhan Nehru portfolio

Personal portfolio for **Vardhan Nehru**, positioned as an **AI Engineer** (B.Tech CSE, AI & ML).
This note is for picking the work up in a new chat. Last updated 2026-11-09.

## Where things are

- **Working copy:** `C:\Users\vardh\Desktop\portfolio main`. All recent work is here.
- The old, stale copy at `C:\Users\vardh\Downloads\portfolio main` was moved to the Recycle Bin on Nov 14, 2026 at the user's request. This Desktop folder is the only copy; open sessions here.
- **No git repository.** There's no history to restore from. Ask the user before running `git init`.
- **Run the site:** `npm run dev` (Vite), which serves `http://localhost:3000`.
- **Build:** `npm run build`. It passes; the main JavaScript file is about 413 KB compressed.
- **Type-check:** `npx tsc --noEmit -p .`. It passes with no errors (the old ones were in files deleted in the Nov 11, 2026 cleanup).
- **Folders (reorganised Nov 11, 2026):** `components/` is grouped by part of the site:
  - `layout/`: the navs (`GlowNav`, `HeroNav`, the off `Navbar`), the menu button, the theme switch, `navPerch`.
  - `hero/`: the hero name, its stage, stickers, butterflies, keychain, sounds and melody, and the off `Avatar`.
  - `about/`: `AboutSection`, `AboutCollage`, the ASCII and particle portraits, the glasses; `about/pencil/` is the pencil cursor.
  - `certificates/`: the certificate list and the drawer (`CertificateDrawer`, `drawerScene`), plus the stack and folder layouts.
  - `work/`: `WorkSection`, `projects`, the 3D TV and the remote cursor.
  - `contact/`: `ContactSection` and its fluorescent tube (`TubeLight.tsx`, `contactLight.css`). The fixture is a photograph per theme (`public/contact/*.webp`, made with Higgsfield GPT Image 2.6; full-size sources in `assets-src/contact/`), screen-blended so its black surround drops out: an aged T12 batten, as two pixel-aligned frames (tube off under, tube on over it at opacity `--tube`), so the flicker dims the tube and the wall together. That's the dark theme only (black, edge to edge: `.contact-band` on the home page's wrapper). The pastel theme instead renders `PixelContact.tsx` (`pixelContact.css`): a pixel arcade on a graph-paper grid (after a pixel-art cherry the user pinned, dgrees.studio), all centred: a Press Start 2P "CONTACT ME", a lane of pellets where a pixel Pac-Man (SVG pixel maps, ink outline drawn automatically; the user's face as the player, exact portrait with a puppet jaw or hand-drawn in pixels, was tried on Nov 14, 2026 and switched off at their request: `PLAYER` in `PixelContact.tsx`, 'pacman' / 'face' / 'pixel', with `public/contact/face.svg` and `FACE_FRAMES` kept) follows the pointer/tap, eats pellets (back after 4.5s) and a cherry (the lavender ghost trailing him turns blue and runs for 4s), does one lap on his own after a quiet spell, and turns round when clicked (no sound); then pixel buttons for the resume's email, LinkedIn and GitHub (no Dribbble). rAF only while something moves and the section is on screen; reduced motion: no chomp/laps, he jumps straight to the pointer. A wall switch (`LightSwitch`; `switch-off.webp` is the on photo with only the rocker patched in from the off photo, so the plate never moves) turns the tube off and on; it re-runs the start-up strike each time it comes on. Sounds (`tubeSounds.ts`, Web Audio, follows the `chimes.ts` mute): the switch's clack, and a buzz/crackle/starter tick only while the tube flickers, silent when steady. While the section is under the fixed header, `<html>` gets `.over-contact`: the theme switch fades out (dark theme only). Styled in `contactLight.css`, not in `index.html`.
  - `signal/`: the traffic-light scrollbar.
  - `cursor/`: the dot cursor, click sparks and the funny eyes.
  - `icons/`: the contact icons.
  - `ui/`: shared helpers (`Reveal`, `SmoothScroll`, `TiltedCard`, `theme`, `siteReady`).
  - `pages/`: the routes.
  - Docs are in `docs/` (this file and `CONTENT.md`).
- **Gotcha:** Vite sometimes caches a file as empty or truncated after it's written from a shell heredoc. Running `touch <file>` fixes it. Long inline Python in bash heredocs also breaks; write the script to a file and run it instead.

## Working with this user

- **Don't make changes they didn't ask for.** They notice, and they often reverse decisions. Switched-off features stay in the code behind a constant (`SHOW_…`, `HOVER_LENS`, `STICKER_SOUNDS`) instead of being deleted.
- **Only real work and claims.** No made-up projects, skills or numbers. Don't overwrite the resume text.
- **Style they like:** aesthetic, Pinterest-like, plain and premium (not neon). Pastel theme by default, with the original dark theme kept as an alternative.
- **Explain in simple words.** They ask "what does it mean / what will be the problem" when something is technical.

## Tech stack

- Vite 6, React 19, TypeScript, react-router-dom 7
- framer-motion 11, three 0.181, `@react-three/fiber` / `drei`, Lenis (smooth scroll). GSAP is installed but not used by live components.
- **Tailwind comes from the CDN script in `index.html`, not from a build step.** Global custom CSS (theme variables, keyframes, `.cap-*`, `.hero-fill-*`, `.diecut`, the loading screen) is in the `<style>` block of `index.html`, as are the Google Fonts links.
- **Fonts:** Anton for display text, Inter for body text, Newsreader for stickers, Geist Mono for small labels.

## Themes (pastel is the default)

- The switch is `components/layout/ThemeSwitch.tsx`; state lives in `components/ui/theme.ts` (`useTheme` / `setTheme`).
  - localStorage key `theme-v2`; `'light'` = pastel (default), `'dark'` = the original dark site.
  - The `dark` class sits on `<html>`. The init script at the top of `index.html` applies it before first paint.
  - Dynamically importing `theme.ts` from the console creates a separate copy that React doesn't see. Test with the real switch.
- **Pastel palette (exact Pantone swatches the user gave):**
  - Soft Lavender 7443 C `#EBDEFC` (main), ink `#743BBE`
  - Summer Green 317 C `#B1E4E3` (second), ink `#08746B`
  - Limencello 122 C `#FED141` (third), ink `#3F260C`
  - Body text `#2A1650`
- **How it's built:** the site was made dark, so the pastel block in `index.html` (`html:not(.dark) { … }`) defines `--p-*`, `--accent`, `--hn-*` (hero letters), `--st-*` (stickers) and `--tape-*` variables and remaps classes like `text-white` and `bg-[#07040f]`. Components read the variables with dark fallbacks: `var(--x, darkValue)`.
  - Helper classes: `.pastel-green`, `.pastel-heading`, `.pastel-only`.
  - `GlowNav.tsx` has per-button pastel tones (lavender / green / yellow).
- **Dark palette:** background `#07040f`; lavender `#c8b6ff`, `#b69df8`, `#9d86e9`.

## Page structure

- **`App.tsx`:**
  - routes: `/` and `/about` (inside `SiteLayout`), `/work` and `/hero` (both lazy-loaded)
  - holds the contact info and the skills marquee list
  - wraps the page with `ClickSpark`, `SmoothScroll`, `SmoothCursor`, `RemoteCursor` and `FunnyEyes`
  - renders `HeroNav`, `GlowNav` (the main bottom nav) and the footer. `SHOW_NAVBAR = false` hides the old floating navbar.
  - fires `app:mounted` for the loading screen.
- **`components/pages/SiteLayout.tsx`:** the hero on every route. On `/` the Work section lives inside the hero, so the name stays at the top while the work scrolls up. Hash links (`/#work`) scroll through Lenis.
- **`components/pages/HomeBelowHero.tsx`:** skills marquee (`ScrollVelocity`), `AboutSection`, `ContactSection`.
- **`components/pages/AboutBelowHero.tsx`:** header, `AboutSection` rendered full width (so the tape band spans the screen), contact.
- **`components/pages/WorkPage.tsx`:** the full write-up of every project, with an index that scrolls through Lenis.

## Scrolling and loading (latest work)

- **Performance fixes (Nov 11, 2026):** the lag came from 3D layers drawing far more than needed, and from 3D scenes being set up the moment they were first seen.
  - **Frame caps:** the hero creature (`hero/creature/CreatureLayer.tsx`) and butterflies (`hero/ButterflyLayer.tsx`) draw at most 60 fps, which matters on 120–144 Hz screens. Each TV (`work/TV3D.tsx`) draws at about 30 fps when nobody is pointing at it, and every frame while it's being used.
  - **Resolution:** pixel ratio is capped at 1.5 for the TVs and the creature.
  - **Built while idle:** the pencil, the TV remote and the certificate drawer are built and drawn once while the browser is idle after load (`whenIdle` in `ui/siteReady.ts`), not on first sight.
  - **Certificate textures:** each certificate texture goes to the graphics card as soon as it loads, starting from a white placeholder so the shader isn't rebuilt.
  - **Start-up (later the same day):** the home page stuttered as it opened, because the 3D setup landed in the intro.
    - **Behind the loading screen:** heavy setup now runs while the loading screen is up. The screen waits for `holdLoader(promise)` entries (`ui/siteReady.ts`), at most 1.6 s (`HOLD_MAX` in `index.html`). The `whenIdle` queue holds it until it's empty.
    - **The traffic light:** it builds behind the loading screen and prepares its shaders (`warm()` in `signal/trafficLightScene.ts`). It also loads its stickers and draws once there, and plays its opening when the screen lifts.
    - **Its lamp light:** this is now dimmed to 0 instead of hidden. In three.js, adding or removing a light makes every material switch shaders.
    - **Measured:** in the production build, 3–7 s after the reveal went from five slow frames (up to 236 ms) to none, and the loading screen stays up about 0.7 s longer. The last traffic-light hitch (about 115 ms when its opening began) came from parts drawn for the first time (the heads folded out of view, the pole stickers). `prime()` now draws everything with frustum culling off behind the loading screen. Final run: no long frames after the reveal, worst frame 70 ms.
  - **Phones (Nov 12, 2026):** on a real phone the hero lagged and briefly showed a blank white patch while loading, a sign of the graphics chip falling behind.
    - **Resolution:** `ui/device.ts` (`isLowPower`, `canvasDpr`) caps the canvases' pixel ratio on phones and tablets. It was 1 for the creature and butterflies, 1.25 for the traffic light, drawer and TVs and 1.5 for the pencil, which the user found blurry on a real phone. Since Nov 12, 2026 all of them use `PHONE_DPR = 2` (sharp on 2–3× screens, about half the work of 3×). Lower `PHONE_DPR` if a phone lags again.
    - **Pinch-zoom:** a pinch only magnifies what a canvas already drew, so the 3D objects looked blocky when zoomed. `canvasDpr(desktop, phone, w, h)` now multiplies by `visualViewport.scale` (capped at 4× and 4 million pixels per canvas), and `onPinchZoom(fn)` (both in `ui/device.ts`) calls back once a zoom settles; the TV, traffic light, certificate drawer, pencil and butterflies redraw at the new resolution then, and drop back when zoomed out. Tested by faking `visualViewport.scale` in a phone-sized preview (×2 → ×4, the drawer ×3.6 from the pixel limit); not yet on a real phone. The creature (no model yet) doesn't do this.
    - **Creature:** it flies around the top word only (`flyer` prop on `HeroName`), without its CSS drop-shadow filters. It and the butterflies draw at 30 fps on phones.
    - **Result:** the phone-size page went from 4.1 to 1.9 megapixels of 3D canvas, with no filters.
    - **Phone scrolling (Nov 12, 2026, later):** touch scrolling stays native (Lenis `syncTouch: false`, as on Framer sites); the fixes take work off it. (1) The address bar sliding in and out changes the window height mid-scroll: the traffic light is now `100lvh` tall on phones (it was pinned top and bottom, so its canvas was rebuilt on every change) and skips rebuilding when nothing changed; the Work channel step comes from the svh-sized track instead of `window.innerHeight` (it could flip channels); the hero's slide-back uses `screenHeight()` (`document.documentElement.clientHeight`, in `nameStage.ts` with `RECEDE_SCREENS`). (2) The hero name's slide-back runs on a `ScrollTimeline` (WAAPI, `HeroName.tsx`) where supported, so the browser moves it in step with the scroll instead of JavaScript a frame late; `stage.recede` is still kept from the motion value; older browsers use the old path. (3) The letters' moving light pauses while scrolling. (4) The pencil only wakes on scroll when its card is within half a screen (IntersectionObserver), not on every scroll anywhere. Measured per frame in a phone-sized preview: traffic light 0.9 ms, Lenis 0.8 ms (wheel only; idle on touch), TV 0.6 ms, the pencil's 0.6 ms gone. Not yet tried on a real phone.
    - **Page wider than a phone (fixed same day):** the TV glow gradient (which spreads 140 px past the TV area) made the home page 449 px wide on a 375 px phone, so phones shrank the whole page to fit. `#work` now has `overflow-x: clip` (not `hidden`, which would break the pinned TV). Checked at 375 px: `/`, `/about` and `/work` are exactly 375 wide with nothing sticking out. To check again: compare `document.documentElement.scrollWidth` with `clientWidth` in a phone-sized preview after scrolling the whole page.
    - **Testing on a phone:** use `npx vite preview --host` (the built site), not the dev server. The dev server sends hundreds of unbundled files over Wi-Fi and is much slower.
  - **Hero on reload (Nov 12, 2026):** reloading on the hero stuttered while the name rose.
    - **Creature:** `CreatureLayer` now loads the model first and only then builds its two WebGL canvases (hidden until then). With no `creature.glb` it used to build two renderers and two environment maps and redraw two big empty canvases with CSS drop-shadows every frame. (Vite answers the missing `.glb` with `index.html`, so the loader fails to parse it and nothing is built.)
    - **Butterflies:** `ButterflyLayer` compiles its shaders and uploads the wing textures at setup (behind the loading screen) by drawing one frame and clearing it. Before, the first butterfly's arrival froze a frame for 130–350 ms during the rise.
    - **Measuring:** `index.html` marks `performance.mark('site-ready')` when the curtain lifts, so long frames can be timed from the reveal.
    - **Fast scrolling up and down jittered (same day):** the moving light on the letters (`MOVING_LIGHT`) wrote `--sx/--sy/--fx` on the name's plane about 30 times a second, so all ~300 slab layers inherited the change and were restyled and repainted. They're now written only on the top faces and the floor (`data-lit`). Measured on a fast wheel test: frames over 25 ms went from 31–41 to 4–9, p95 from 27.8 to 20.8 ms. Testing showed the cost is in the letters only (hiding them gave 144 fps); the butterflies, traffic light, blurred shadows and the plane's slide made no difference. Fewer slab layers per letter would help further but changes the look.
    - **Full frame rate (same day):** the hero ran at about 70 fps on a 144 Hz screen, even standing still, because of the letters' ~300 CSS 3D layers (Chrome depth-sorts and draws every one on every frame anything on the page changes; measured on an RTX 3050 Ti, so it isn't a software-rendering artifact). Fps went with layer count: 306 → 70, 153 → 121, ~77 → 146. Now each letter has about 6 slab copies 4 px apart (`SLAB_STEP` in `HeroName.tsx`) instead of ~20 at 1.2 px, and each copy carries `text-shadow`s (`slabFill`) that fill the gap down to the copy below, offset by the exact camera maths from `nameStage.ts` and scaled by `--rise` and the squash, so the sides still look solid, also when pressed and while the name slides back. `SLAB_FILL = false` restores the old build. Result in dev mode: about 100–120 fps while scrolling fast (median frame 7 ms = 144 Hz, no frames over 25 ms), against 74 before; the remaining gap to an empty page is within the noise of the test. The blurred contact shadows and the top faces' `brightness` filter made no measurable difference.
    - **Whole site (same day):** a scroll sweep of every page, frame rate per screen height, on a 144 Hz screen. Home: hero ~120–144, Work section ~100–123 on the first pass and ~117–144 once painted, About and Contact 142–144. /work: 144 throughout. /about: 134–144, with one 68–76 ms hitch around screen 3 on the first scroll after loading (no script in it, not found yet). Changes: the TV glow in `WorkSection.tsx` is now a radial gradient (colour in the registered `--tv-glow` property in `index.html`, so it still fades between channels) instead of a `blur(80px)` box that sat under the TV canvas and was re-blurred on the GPU every frame; the tuner needle moves with a transform instead of `left` (layout every scroll frame). Neither moved the numbers measurably in the pane's noise. Checked and ruled out in Work: the TV draws (0.6 ms each), the remote cursor, the TV's backdrop-blur chip. The traffic light's 21 ms at the first scroll start is a one-time warm-up.
    - **Testing in the preview pane:** it throttles animation frames to 1–5 fps whenever it isn't getting input, even while shown; scroll it (or dispatch wheel events in the test itself) right before measuring, and re-run a baseline each time, since the machine's load moves results by ±15 fps.
    - **Still there:** about 60–140 ms frames during the rise with no script in them: the letters' ~20 CSS 3D layers each, restyled every frame. (The `checkMaterialsReady … isReady` console error once listed here is fixed: see the note on `components/ui/compileShaders.ts`.)
    - **2026-11-12, `components/ui/compileShaders.ts`:** three's `renderer.compileAsync` polls materials on a timer and throws an uncaught `Cannot read properties of undefined (reading 'isReady')` once a scene is disposed mid-poll (dev double-mount, route change). `drawerScene.ts` and `trafficLightScene.ts` now call `compileShaders(renderer, scene, camera, () => !disposed)` instead, which skips disposed materials and stops when the scene is gone. Don't use `compileAsync` in new scenes. Remaining console noise is harmless: three's `texImage3D: FLIP_Y…` WebGL warning, framer-motion's dev-only "non-static position" warning, and the Tailwind CDN notice.
  - **Result:** on a 1440×820, 144 Hz screen in dev mode, the Work section went from about 48 fps to 144 fps while still. The freezes of 100–830 ms during the scroll are gone. One hitch of about 150 ms is left right when scrolling starts.

- **`components/ui/SmoothScroll.tsx`:** one Lenis instance for the whole site. `lerp 0.1`, `wheelMultiplier 1`, touch scrolls natively, `allowNestedScroll`, a ResizeObserver keeps the page height current. It stays stopped while the loading screen is up.
  - **Page transition (2026-11-12, `components/layout/PageTransition.tsx`):** a click on a link to another page (or a nav button that goes elsewhere on this page, like Contact from Home) is taken in the capture phase, ahead of React Router. Three panels rise (pastel: green, yellow, lavender; dark: violets) with the page's name, the route changes and jumps underneath, then the panels lift off the top. Web Animations on transforms only, so it keeps moving while the new page mounts. ~1.3–1.6 s in all. Timings: `IN_MS`, `OUT_MS`, `STAGGER`. Reduced motion: a quick fade. New-tab, external, mail and download links, and links within the same page, are left alone.
  - **Opening /work (2026-11-12):** the first press of Work froze the page for ~3 s: every project's `TV3D` (9 of them) made a WebGL context, lighting and shaders the moment the page mounted, and drew at once (compiling every shader synchronously). Now each TV builds only within a screen of view, or one at a time in idle moments (`whenIdle`) once the page is open, and compiles its shaders in the background (`compileShaders`) before its first frame. The home page's channel TV is exempt (built behind the loading screen). `App.tsx` also fetches the Work page's code in the background ~4 s after the site is ready. Built site, measured: first Work press ~1 frame, all 9 TVs built within ~6 s at ~80 ms each, then scrolling the page has no frame over 40 ms. Production builds also skip three's shader error-log readback (`checkShaderErrors`), set in `compileShaders`.
  - **Nav presses jump, they don't scroll (2026-11-12):** `SiteLayout.tsx` and `WorkPage.tsx` move to the top or to the `#section` with `immediate: true`, on every navigation (`location.key`), so pressing the page you're already on works too. Only the first page load waits for the loading screen. When testing, scroll with real wheel input: `window.scrollTo` bypasses Lenis, which then measures from a stale position.
  - Use `smoothScrollTo(numberOrElement, { offset, immediate })` for any programmatic scroll, never `scrollIntoView({behavior:'smooth'})` or `window.scrollTo` with smooth (they fight Lenis).
  - `index.html` sets `html.lenis { scroll-behavior: auto !important }`. The old `html { scroll-behavior: smooth }` was causing the stutter.
- **Loading screen (signature intro, Nov 13, 2026):** `#preloader` in `index.html` (markup, CSS and the lifecycle script, so it shows before any JavaScript arrives) plus the story in `public/loader/vardhan-loader.js` (plain script, loaded `async`) drawn by `public/loader/loader-worker.js` (see Smoothness).
  - **What the user asked for:** their face as one thread that unwinds into the loading bar as the site loads; at 100% the face is gone and only the name remains. Text motion, their own logo, nothing overdone. An earlier particle version (dots orbiting, forming the face, then a custom "Vardhan." lettering) was dropped at their request.
  - **The story (every full page load; moving between pages inside the site never shows this screen):** the face draws itself in as one thread (0.45 s); it then unwinds off the face onto a hairline bar with a percentage, following **real progress** (`__pl.target`: 22 DOMContentLoaded, 50 page load, 66 `app:mounted`, 82 fonts, 100 when the 3D holds settle; a slow creep in between, never past 90% before ready; never faster than 0.7 s for the whole face). At 100% the bar *is* the wordmark's rule: VARDHAN rises out of it letter by letter (clipped just above the rule), SAI RAGHAVENDRA NEHRU settles under it, and the wordmark glides to the middle (`.pl-name`, `--pl-shift`). Then the screen opens from the middle (a radial mask, `--pl-r`, a registered `@property`; browsers without it fade).
  - **Smoothness (Nov 14, 2026, "make loading smooth"):** the drawing runs on a background thread: `public/loader/loader-worker.js` owns an `OffscreenCanvas` handed over by `vardhan-loader.js` (which only lays the scene out, passes `__pl.target`/`ready` on every 80 ms, and switches to the wordmark when the worker says `full`). The main thread is busy starting the app and 3D scenes while the screen is up; measured in one load: main thread 5 frames (worst gap 1007 ms) while the worker drew 678 (worst 35 ms, none over 50 ms). The bar follows progress with a critically damped ease (SmoothDamp, no jumps or overshoot between milestones), and over its last tenth thins to the rule's weight while its point and percentage fade, so the hand-off to the SVG rule doesn't snap. Browsers without `OffscreenCanvas` (or if the worker fails) get the still wordmark. The percentage uses the system monospace font (web fonts aren't loaded in the worker).
  - **Assets:** the face thread is `public/loader/face.json` (13 KB, preloaded), made by `node scripts/make-loader-face.mjs` from `logo/svg/vardhan-portrait-transparent.svg` (outlines simplified and chained nearest-first from the bottom-left). The wordmark is inline SVG in `index.html`, split from `logo/svg/vardhan-wordmark-transparent.svg` (one path per letter, the rule, the subtitle). Colours: graphite on lavender (pastel), silver on `#07040f` (dark), violet leading point.
  - **When it plays:** every full load (it used to be the first visit of a session only, which the user couldn't see after their first look). Reduced motion gets the still wordmark and opens as soon as the site is ready. The screen waits for the story, at most 2.6 s past ready (`STORY_AFTER`), and doesn't wait for the story script if it hasn't started within 1.5 s. Once ready, a click/tap/key skips to the end.
  - **Measured (dev server):** sped up Nov 14, 2026 at the user's request ("faster and clear"): screen opens ≈ 3.7 s in the preview pane (was ≈ 5.3 s); the name rises in ~0.75 s after 100% and the opening takes 0.85 s. Lines are heavier for clarity (thread ≥ 1.5 px, bar ≥ 2.5 px, 14 px percentage). The story's clock is real time with a 1 s cap per frame, so a throttled tab (about one frame a second when loading behind other windows) still finishes it instead of hitting the fallback. The rest of the wait is the site's own readiness (fonts and 3D setup holds, `HOLD_MAX`), left as it is so the page doesn't stutter after opening.
  - **Failure:** if the app hasn't mounted after 8 s, "This is taking longer than usual." with a Reload button shows under the wordmark (it carries on by itself if the app turns up).
  - **Review aid:** `#pl-at=<n>` in the address pins one moment and keeps the screen up (0–0.45 drawing in, 0.45–1.45 unwound 0–100%, above that the name). Reload without it to play normally.
  - On opening it sets `window.__siteReady`, marks `performance.mark('site-ready')` and fires `pl:finish`, then `site:ready` 280 ms later.
- **`components/ui/siteReady.ts`:** `useSiteReady()`, `isSiteReady()`, `onSiteReady()`. `HeroName` waits for it, so the letters rise and the stickers land just as the curtain lifts.
- The unused avatar (`components/hero/Avatar.tsx`) is now lazy-loaded, so its 2.9 MB model is no longer downloaded on every visit.
- **Not verified:** real scrolling frame rates (the preview browser was hidden while testing). The user should scroll it themselves.

## Work section and projects

- **Data:** `components/work/projects.tsx`, 9 projects in this order:
  1. `tomandjerry`: TomandJerry.ai (internship at ReveloSoft)
  2. `revelosoft-rag`: ReveloSoft Enterprise RAG Chatbot (internship)
  3. `asha`, `harvey`, `vimanone`, `futurespark`, `ev-cost`, `news-digital-agency`, `shivaji-vidya-peeth`
  - The kind `'intern'` shows as "Internship · ReveloSoft".
- **`components/work/WorkSection.tsx`:** a 3D retro TV (`components/work/TV3D.tsx`) with a channel guide; each project is a channel. Over this section the cursor becomes a TV remote (`RemoteCursor.tsx`).
  - Projects with no video or poster show a drawn test card (`components/work/testCard.ts`, `TestCard` in `projects.tsx`).
- **Internship videos** (made with HyperFrames, silent, loop on the muted TV):
  - `public/projects/tomandjerry-reel.mp4` (16s) and `public/projects/revelosoft-reel.mp4` (16.6s), with thumbnails `tomandjerry-thumb.jpg` and `revelosoft-thumb.jpg`.
  - Sources: `video-projects/tomandjerry-film` and `video-projects/revelosoft-film` (each has `BRIEF.md`, `SPEC.md`, `REVIEW.md`, `index.html`, `compositions/`). Site captures used are in `video-projects/captures`.
  - To edit: `npm run dev` in a film folder opens the HyperFrames Studio. Re-render with `npx hyperframes render -o ../../public/projects/<name>-reel.mp4 --keyframe-interval 1 --max-bitrate 6M`.
  - The user said they may add their own videos later for other projects.

## About page

- `components/about/AboutCollage.tsx`: a collage with a tape band, notes in Caveat, and the portrait.
- **Portrait** (`components/about/ParticlePortrait.tsx`): particles assemble into the photo, which becomes a die-cut sticker you can peel (hover peels a corner, drag pulls it, release springs back). `HOVER_LENS = false` turned off the old hover lens.
- **Glasses** (`components/about/FlyingGlasses.tsx`): a pair flies onto the portrait once it forms; click to swap pairs.

## The hero

### `components/hero/portfolio-hero.tsx`
- `NAME = "VARDHAN NEHRU"`
- `SHOW_AVATAR = false`: a spinning 3D avatar (`components/hero/Avatar.tsx`, model `public/models/avatar.glb`). Keep it for later.

### `components/hero/HeroName.tsx`: the 3D name
- **Lying flat on a floor** with real CSS 3D. Tilt, slab thickness and camera come from `components/hero/nameStage.ts`.
- **Each letter is a slab** (layered copies plus a gradient top face). In pastel the letters are purple ink (`--hn-*` variables).
- **Entrance:** the letters rise out of the floor one by one, after the loading screen lifts.
- **Pressing:** hovering presses the slab at the cursor; clicking presses harder. Clicking the name plays notes (`chimes.ts`, `melody.ts`). **Sounds play only on the name.**
- **Switches:** `SCENE_IN_LETTERS = false`, `SHOW_SNAKE = false`.

### Stickers: `PeelSticker.tsx`, `IconSticker.tsx`, `HeroStickers.tsx`, `Sticker.tsx` (in `components/ui/`)
- Die-cut icon stickers (Claude, OpenAI, Python and others) and text stickers (AI Engineer, Human in the loop, Ship it, RAG). Pastel colours come from `--st-*` variables.
- They appear upright, then tip over and slap flat after the name has risen. Hover peels a corner; drag peels it off to stick elsewhere.
- `STICKER_SOUNDS = false` in `Sticker.tsx`: sticker clicks are silent, at the user's request.

### Keychain: `components/hero/KeychainLayer.tsx` (WebGL)
- A chrome split ring through a hole drilled in the U of NEHRU, with acrylic charms (VN, OpenAI, Gemini, Claude). Same camera as the CSS letters (`nameStage3d.ts`). Only scrolling swings them.

## Traffic-light scrollbar: `components/signal/` (WebGL + GSAP)

- A 3D traffic light on the right edge of every page that **replaces the browser's scrollbar**: while it's on, `TrafficLight.tsx` puts `signal-scrollbar` on `<html>` and `index.html` hides the native scrollbar (it comes back if WebGL fails or the light is switched off). The striped pole sits right at the screen's edge, runs the full height and never moves (the track); the three heads hang off its left side and slide along it as the thumb. They pop out of the pole when the page first shows. Drag the heads to scroll, or press the pole to jump (and keep dragging). It's green while the page scrolls, yellow while the mouse moves (or a finger is on the screen) without scrolling, and red at rest. Switched on with `SHOW_TRAFFIC_LIGHT` in `App.tsx`; lazy-loaded (about 40 KB gzip including GSAP, which only this uses; three.js is already in the main bundle).
- **One head or three:** while scrolling, and every 0.7s, it samples what's beside the heads on each side of the pole: text, links, buttons, images, the TV, the nav, a modal (`role="dialog"`), or anything marked `data-signal-avoid`. If anything's there, two heads fold back into their clamps and the head on the clearer side slides to the middle and shows the live colour by itself. The VN sign folds away too. Once the spot has been clear for 0.5s, they all fold back out.
- **Mechanical movement:** each head turns on its own joint just off the pole. Scrolling tips the heads in the direction of travel on a damped spring; fast movement along the pole and grabbing them swing them back a little; they settle to neutral when you stop. The heads also turn slightly towards the cursor round the pole. Lamp changes, folding and the opening swing are GSAP tweens that only write numbers; the render loop draws them.
- **Placement:** a column flush with the right edge: 108px wide on desktop, 54px on phones ≤767px (`LAYOUT` in `TrafficLight.tsx`). Since Nov 12, 2026 the pole touches the screen's edge like a real scrollbar track: its centre is one pole radius in (9.5px desktop, 4.5px phones; it was 13 / 8, which left a ~3.5px gap), and it runs the full height with no fade at the top and bottom (the mask was removed). On phones the column is `100lvh` tall. Heads are kept 18px from the top and 64px from the bottom on desktop (above FunnyEyes), 64 / 104px on phones (above the nav). Only the pole strip (at least 18px wide, 22px on phones, so it's easy to grab) and the heads take the pointer; the rest of the column lets clicks through.
- (The earlier version was a small floating light with no scrollbar; this replaced it.)
- **Files:**
  - `signalState.ts`: decides the state from the real scroll position and real mouse movement, not wheel events. All timings and thresholds are in `SIGNAL_TIMING`.
  - `signalArt.ts`: canvas artwork (lens faces, stripes, VN sign, stickers).
  - `trafficLightScene.ts`: the three.js scene, built like `RemoteCursor.tsx`.
  - `TrafficLight.tsx`: placement, animation loop and cleanup.
- **The lamps:** red = a sleeping face, yellow = two eyes whose pupils follow the cursor, green = chevrons that flow faster while you scroll. The VN sign and stickers (Claude, OpenAI, Python from `public/brand`, plus an "AI" sticker) are decoration.
- **Layering:** `z-[45]`: under HeroNav (60), GlowNav (61), the menu (50), the certificate modal (95) and the cursors. `data-signal-avoid` is on the channel guide (`WorkSection.tsx`) and the Work page's side panel (`WorkPage.tsx`).
- **Drawing only when needed:** it draws only while something changes (a lamp, the heads moving or turning, the chevrons on green). At rest on red it stops drawing. The pixel ratio is capped at 1.75 (the canvas is the full screen height). Real shadows from the key light, which follows the heads. If the browser drops the 3D graphics it rebuilds on a fresh canvas, up to 5 times. Without WebGL it shows nothing (the browser's own scrollbar is untouched either way).
- **Reduced motion:** the lamps still change and the heads still track the scroll position, but there's no turning, tipping, swinging, opening swing or chevron flow, and folding is instant.

### Removed: the snake and the flying creature (Nov 14, 2026)
- The user didn't want them, so they were deleted rather than switched off: `SnakeLayer.tsx`, `hero/creature/` (`CreatureLayer`, its `?edit` editor and config; it never had a model, the planned dragon) and their wiring in `HeroName.tsx` (`SHOW_SNAKE`, the `flyer` prop). The main bundle went from 1,546 to 1,489 KB. Notes above that mention the creature are history.

## Other files

- **Cleanup (Nov 11, 2026):** the 49 source files nothing imported were deleted (old sections such as the websites showcase, capabilities and featured strip, and unused UI pieces such as `ScrollStack`, `GsapTextReveal`, `StarBorder`, `LiquidOrb`, the 3D robot), along with unreferenced `public` files (the two ambience `.wav` files, `public/websites/`, `public/rangoli/`), old root notes, `graphify-out/`, and the packages `@react-three/rapier`, `@splinetool/react-spline`, `meshline` and `ogl`. Switched-off features behind constants were kept.
- **Content:** `CONTENT.md` lists what the site says (about text, experience, projects, certificates, contact), dated Nov 11, 2026. It replaced the out-of-date `PORTFOLIO_CONTENT.md`.
- **Logo and tab icon (Nov 13, 2026):** `logo/` holds the brand set (crest, logo, monogram, portrait, wordmark; `svg/` and `png/`, each in dark, light, transparent and reverse versions; Higgsfield concepts in `source-higgsfield/`). The user wants the **face (portrait) as the tab icon, no wording**. `scripts/make-favicon.mjs` builds it from `logo/svg/vardhan-portrait-transparent.svg` on a violet (`--accent`, #743BBE) badge, since the bare portrait vanishes on white tabs (white face) and dark tabs (black hair). The script writes `public/favicon.ico`, `public/favicon/` (16/32/48/192/512 round, `apple-touch-icon.png`, `maskable-512.png`) and `index.html` links them plus `public/site.webmanifest`. `logo/favicon/` is an older set that isn't used. The other logos aren't placed on the site yet.

## Possible next steps

1. **Move Tailwind from the CDN to a build step** (offered, the user asked what it means and what could go wrong, not yet approved). It would remove the runtime CSS compile and the console warning. Risks are low: no Tailwind classes are built from pieces in code; check that the pastel overrides in `index.html` still win, and compare screenshots of every page in both themes before and after.
2. Further split the main bundle (for example lazy-load `TV3D` / three.js) if load time still feels slow.
3. Add the user's own videos for the other projects when they send them.
4. Ask the user about `git init`, so there's history to undo from.
