# Work log: what was done (Nov 13–14, 2026)

A plain record of the changes made to this portfolio in these sessions. The technical detail lives in
`docs/HANDOVER.md`; this is the short version.

## Safety net

- **Git (local only):** the project is now a git repository. Nothing is pushed anywhere, and `.env.local`
  (the API key) is not in it. Snapshots so far:
  1. `Initial commit: portfolio as of 2026-11-14`
  2. `Match the home-screen icons to the face tab icon`
  3. `Split the big libraries into their own build files`
- **Full backup:** `C:\Users\vardh\Desktop\portfolio main - Copy` (every file, including git history).

## Tab icon and app icons

- The browser tab icon is your face portrait alone (no wording), in `public/favicon/` and `public/favicon.ico`.
  The old link to a missing `/vite.svg` was removed.
- iPhone and Android home-screen icons show the same face on the site's soft lavender.
- `scripts/make-favicon.mjs` rebuilds exactly this set.

## Loading screen

- Your face appears as one continuous thread, which unwinds onto a loading bar as the site really loads. At 100%
  the face is gone, the bar becomes the line of your VARDHAN wordmark, and the letters rise out of it. Then the
  screen opens from the middle onto the site.
- It follows real loading progress (not a fake timer), plays on every full page load, and shows the still
  wordmark for people with "reduce motion" on. If the site fails to start in 8 seconds, it offers a Reload button.
- It draws on a background thread, so it stays smooth while the site starts up.
- Files: `public/loader/` (`vardhan-loader.js`, `loader-worker.js`, `face.json`), the `#preloader` part of
  `index.html`, and `scripts/make-loader-face.mjs` (rebuilds the face thread from your portrait).

## Contact section (pastel theme)

- Tried your face as the Pac-Man player (a pixel version, then the exact portrait with a chomping jaw). At your
  request the classic yellow Pac-Man is back. The face versions are kept in the code, switched off
  (`PLAYER` in `components/contact/PixelContact.tsx`).

## Removed

- The flying dragon (it never had a 3D model) and the snake, deleted from the hero.
- The old copy at `C:\Users\vardh\Downloads\portfolio main`, moved to the Recycle Bin.

## Performance

- The site's own code file went from 1,489 KB to 289 KB. The big libraries (three.js, React, animation, routing)
  are now separate files that download side by side and stay cached. The same code runs; checked in a
  production build.

## Security

- Checked: no key or password in git, its history or the built site; every link that opens a new tab is protected.
- Router library updated (7.13.0 to 7.18.5) to close its 3 known problems. Nothing else in the lock file changed
  except one small helper it uses.
- Removed the unused lines in `vite.config.ts` that would have copied the Gemini key into the site's code.
- Left as is: `sharp` (used only by the local icon scripts; its fix is a breaking upgrade) and Tailwind from its
  outside server (see below).

## Not done

- **3D icons:** dropped at your request. Higgsfield had too few credits.
- **Moving Tailwind into the build:** not started. A style baseline of every page, both themes, desktop and phone,
  is recorded in the preview browser to check it against.
- **Small stutters** (hero letters rising, About page first scroll): fixing them would change how things look, so
  they wait for your go-ahead.
- **Real-phone testing:** only checked at simulated phone sizes.
- Project videos for 7 of the 9 projects, and the unused logos in `logo/`, are still open.
