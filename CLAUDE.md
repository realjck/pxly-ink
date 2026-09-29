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
- Viewer space (after `mergeAvatar`): the avatar faces +Z, its right is -X, up is
  +Y. The Ruth2 crotch is at y ~0.96 (measured by raycast); limb regions in
  `src/lib/limbGeometry.ts` rely on these numbers.
- Both SL arms (and hands) share one UV layout: `sharesUv` in `surfaceGraph.ts`
  flags them (mirror triangle with the same UVs; the OBJ has 1e-6 UV differences
  between sides, so match with a tolerance). Decals on them get a mirrored copy in
  `MIRROR_GROUP`, shown in the viewer only: the bake draws only the SL_MAPS groups.
- A stencil's `size` is the longest image side (`aspect` = width / height); in limb
  mode (`stencil.limb`) it is the image height and the width goes once around.

## Sticker pipeline (`src/lib/stickerGeometry.ts`)

- Exponential map (Dijkstra) with upwind averaging: a vertex averages its placed
  neighbors' predictions, except those a limb turn (`MIN_TURN`) away, which come
  from the other side of a limb (averaging them left garbage on the seam).
- ARAP relaxation (`arap.ts`) over the triangles near the image rectangle only: a
  disk-shaped patch let breast or hip curvature leak into the image.
- Seam triangles (walks around a limb meet) are unfolded from their neighbors and
  get one copy per side (`seamCharts.ts`); `buildDecalGeometry` takes several image
  copies per triangle.
- A sticker wider than the limb it wraps overlaps itself with a stepped edge.
  Extending each end under the other (turn shift, rigid fit, edge-by-edge
  unfolding) was tried and drifts 10-30 cm on curved skin: use the limb wrap mode.

## Verification

- Geometry and bake logic can be checked headless: `npx tsx script.ts`
  (tsconfig `@/` paths work), loading `docs/assets/Ruth2v4.obj` with OBJLoader,
  then `mergeAvatar` + `getSurfaceGraph`; raycast the mesh to get a placement.
  To reach private helpers, copy the module with `sed 's/^function /export function /'`.
  Delete scratch files afterwards: `tsc` also checks root-level `.ts` files.
- Measure before and after a geometry change (dropped triangles, edge stretch
  distribution, timing) rather than judging screenshots only.
- In a hidden Chrome tab, rAF and ResizeObserver are paused: the canvas stays
  black and R3F does not resize. Check `document.visibilityState` before debugging.
- Add a test layer without a file dialog: build a PNG on a canvas, put it in a
  `DataTransfer` and assign it to the file input's `files`, then dispatch `change`.
- Set a slider from script with the native `value` setter of
  `HTMLInputElement.prototype`, then dispatch `input`. Limb buttons are SVG
  `g[aria-label="Right leg"]`: dispatch a click on them (element refs go stale).
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
