import type { Mesh } from "three";
import type { Stencil } from "@/types";
import { SL_MAPS, type SlMap } from "./avatarGeometry";
import { bakeMap, type BakeSize } from "./bake";
import { buildStencilGeometry } from "./stencil";
import { getSurfaceGraph } from "./surfaceGraph";

async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

function downloadPng(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}

/**
 * Bakes the placed stencils (array order = bottom to top) into one SL texture
 * at the given opacity (0..1) and size, and downloads it.
 */
export async function exportMap(avatar: Mesh, stencils: Stencil[], map: SlMap, opacity: number, size: BakeSize) {
  const graph = getSurfaceGraph(avatar.geometry);
  const layers = await Promise.all(
    stencils
      .filter((stencil) => stencil.placement)
      .map(async ({ placement, transform, projection, url }) => ({
        geometry: buildStencilGeometry(graph, placement!, transform, projection),
        image: await loadImage(url),
      })),
  );
  const canvas = bakeMap(layers, avatar.geometry, SL_MAPS.indexOf(map), opacity, size);
  layers.forEach(({ geometry }) => geometry.dispose());
  downloadPng(canvas, `pxly-ink-${map}.png`);
}
