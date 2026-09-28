# PXLY INK

Web tool for making tattoos for Second Life avatars.

**Live:** https://realjck.github.io/pxly-ink/

Drop transparent PNGs, place them on a 3D Ruth2 avatar, adjust them, and export
the result as 1024×1024 PNG textures for the SL Head, Upper and Lower body layers.

## Features

- **Sticker mode** (default): the image follows the skin without stretching.
  **Projection mode** (option): planar projection along the surface normal.
- Per-layer size, rotation and offset sliders.
- Layer list: drag and drop to reorder (top of the list is drawn on top), delete.
- Export per SL texture, with global opacity. Colors are kept as-is and UV seams
  are padded so no line shows in-world.

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS, Three.js, React Three Fiber.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
```

Pushing to `master` deploys a static export to GitHub Pages
(`.github/workflows/deploy.yml`).

## How it works

- `src/lib/avatarGeometry.ts`: merges the OBJ parts into one mesh; each part is
  tagged with its SL texture (head / upper / lower).
- `src/lib/stickerGeometry.ts`: sticker decals via a discrete exponential map
  (geodesic walk from the clicked point) over `surfaceGraph.ts`.
- `src/lib/projectionGeometry.ts`: planar projection decals.
- `src/lib/decalGeometry.ts`: shared clipping; decals carry image UVs and the
  avatar's original UVs.
- `src/lib/bake.ts`: renders decals in UV space off-screen, then pads past the UV
  islands (`dilate.ts`) and writes a straight-alpha PNG.

UI components live in `src/components/ui`, the 3D scene in `src/components`.

## Assets

Ruth2 v4 mesh and UV guides: `public/models/ruth2/` (originals in `docs/assets/`).
The male avatar is not supported yet.

## License

[GNU AGPL-3.0](LICENSE). The Ruth2 mesh is AGPL-3.0 by the RuthAndRoth project
and its UV map is CC-BY Linden Lab: see
[public/models/ruth2/LICENSE.md](public/models/ruth2/LICENSE.md).
