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
