import type { BufferGeometry } from "three";
import type { Placement, Stencil, StencilTransform } from "@/types";
import { buildProjection } from "./projectionGeometry";
import { buildSticker } from "./stickerGeometry";
import type { SurfaceGraph } from "./surfaceGraph";

export const DEFAULT_TRANSFORM: StencilTransform = { size: 0.15, rotation: 0, offsetX: 0, offsetY: 0 };

/** Creates an unplaced sticker-mode stencil from an image file. */
export function createStencil(file: File): Stencil {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    url: URL.createObjectURL(file),
    projection: false,
    transform: DEFAULT_TRANSFORM,
  };
}

/** Moves stencil `fromId` to the slot currently held by `toId`. */
export function moveStencil(stencils: Stencil[], fromId: string, toId: string): Stencil[] {
  const moved = stencils.find((stencil) => stencil.id === fromId)!;
  const target = stencils.findIndex((stencil) => stencil.id === toId);
  const rest = stencils.filter((stencil) => stencil.id !== fromId);
  rest.splice(target, 0, moved);
  return rest;
}

/** Decal geometry of a placed stencil, in its current mode. */
export function buildStencilGeometry(
  graph: SurfaceGraph,
  placement: Placement,
  transform: StencilTransform,
  projection: boolean,
): BufferGeometry {
  return (projection ? buildProjection : buildSticker)(graph, placement, transform);
}
