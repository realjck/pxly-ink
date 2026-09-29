import { Vector2, type BufferGeometry } from "three";
import type { Limb, Stencil, StencilTransform } from "@/types";
import { buildLimbWrap, limbCircumference } from "./limbGeometry";
import { buildProjection } from "./projectionGeometry";
import { buildSticker } from "./stickerGeometry";
import type { SurfaceGraph } from "./surfaceGraph";

export const DEFAULT_TRANSFORM: StencilTransform = { size: 0.15, rotation: 0, offsetX: 0, offsetY: 0 };

/** Creates an unplaced sticker-mode stencil from an image file. */
export async function createStencil(file: File): Promise<Stencil> {
  const bitmap = await createImageBitmap(file);
  const aspect = bitmap.width / bitmap.height;
  bitmap.close();
  return {
    id: crypto.randomUUID(),
    name: file.name,
    url: URL.createObjectURL(file),
    aspect,
    projection: false,
    transform: DEFAULT_TRANSFORM,
  };
}

/** Whether the stencil shows on the avatar: placed at a point or wrapped around a limb. */
export function isPlaced(stencil: Stencil): boolean {
  return Boolean(stencil.placement || stencil.limb);
}

/** Changes that wrap a stencil around a limb, its height set so the image keeps its aspect. */
export function wrapAround(graph: SurfaceGraph, stencil: Stencil, limb: Limb): Partial<Stencil> {
  const size = Math.round((limbCircumference(graph, limb) / stencil.aspect) * 100) / 100;
  return { limb, placement: undefined, projection: false, transform: { ...DEFAULT_TRANSFORM, size } };
}

/** Moves stencil `fromId` to the slot currently held by `toId`. */
export function moveStencil(stencils: Stencil[], fromId: string, toId: string): Stencil[] {
  const moved = stencils.find((stencil) => stencil.id === fromId)!;
  const target = stencils.findIndex((stencil) => stencil.id === toId);
  const rest = stencils.filter((stencil) => stencil.id !== fromId);
  rest.splice(target, 0, moved);
  return rest;
}

/** Image width and height in meters: `size` is the longest side. */
export function imageExtent(size: number, aspect: number): Vector2 {
  return aspect >= 1 ? new Vector2(size, size / aspect) : new Vector2(size * aspect, size);
}

/** Decal geometry of a placed stencil, in its current mode. */
export function buildStencilGeometry(
  graph: SurfaceGraph,
  { placement, transform, projection, aspect, limb }: Stencil,
): BufferGeometry {
  if (limb) return buildLimbWrap(graph, limb, transform);
  const extent = imageExtent(transform.size, aspect);
  return (projection ? buildProjection : buildSticker)(graph, placement!, transform, extent);
}
