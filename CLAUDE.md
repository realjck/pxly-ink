@AGENTS.md

## Project constraints

- Static export only (`output: "export"`, deployed to GitHub Pages on push to master):
  no route handlers, server actions, middleware or next/image optimization.
- Assets fetched by code (not next/link) must be prefixed with
  `process.env.NEXT_PUBLIC_BASE_PATH` (empty on ink.pxly.fr, set by the workflow).
- Local build with a base path from Git Bash needs `MSYS_NO_PATHCONV=1`,
  otherwise `/x` is rewritten to a Windows path.

## Domain notes

- SL uses 3 body textures (head / upper / lower); OBJ material -> texture mapping
  is `PART_MAP` in `src/lib/avatarGeometry.ts`. SL avatars face +X.
- Bake keeps colors raw (no color space conversion) and pads UV seams from the
  island mask, transparent pixels included: do not change either without
  checking seams in Second Life.
- Ruth2 is AGPL-3.0 with a CC-BY Linden Lab UV map: keep the credits in
  `public/models/ruth2/LICENSE.md` when adding or replacing avatar assets.

## Verification

- Geometry and bake logic can be checked headless: `npx tsx script.ts`
  (tsconfig `@/` paths work), loading `docs/assets/Ruth2v4.obj` with OBJLoader.
- In a hidden Chrome tab, rAF and ResizeObserver are paused: the canvas stays
  black and R3F does not resize. Check `document.visibilityState` before debugging.
- Add a test layer without a file dialog: build a PNG on a canvas, put it in a
  `DataTransfer` and assign it to the file input's `files`, then dispatch `change`.
- Check exact background colors by saving a screenshot and reading pixels
  (PowerShell `System.Drawing.Bitmap.GetPixel`).

## UI conventions

- Colors and surfaces are tokens in `globals.css`: `ink` (text), `skin` (accent,
  the avatar skin color), `well` (recess). `glass` is reserved for plates floating
  over the 3D scene (HUD); the sidebar sits on the scene color (`#1e1e22`) with a
  border only, so it does not look darker than the viewer.
- Anything `position: fixed` rendered from a panel is portaled to `document.body`
  (see `PlaceHint`): a `backdrop-filter` or `transform` on an ancestor would
  contain it.
- Camera moves from UI (`src/lib/cameraNav.ts`) set the camera position directly:
  drei's OrbitControls has damping on, which scales down `setAzimuthalAngle` steps.

## Dev server (Windows)

- Stopping a background `npm run dev` can leave `next dev` running on port 3000;
  stop it with `taskkill //PID <pid> //F //T` (the PID is in the port-in-use error).
- A new `@utility` in `globals.css` may not reach the served CSS until the dev
  server restarts (Turbopack cache). Compile the CSS with `@tailwindcss/postcss`
  to tell a cache issue from a Tailwind issue.

## Release

- `npm version X.Y.Z --no-git-tag-version`, commit "Release vX.Y.Z", tag `vX.Y.Z`,
  run `npm run build` first, push master and the tag, then `gh release create`
  with English notes (intro line with the live URL, then New / Fixes sections).
  The push deploys to GitHub Pages; check it with `gh run watch`.
