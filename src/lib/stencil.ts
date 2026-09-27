import type { Stencil, StencilTransform } from "@/types";

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
