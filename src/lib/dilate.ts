const NEIGHBORS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

/**
 * Grows the UV islands (mask) outward by up to `passes` pixels: each outside
 * pixel takes the average of its already filled neighbors, transparent ones
 * included, so seams sample the same values as the island border.
 * Works in place on premultiplied RGBA floats.
 */
export function dilate(pixels: Float32Array, mask: Uint8Array, size: number, passes: number) {
  const filled = mask.slice();

  for (let pass = 0; pass < passes; pass++) {
    const grown: { index: number; rgba: number[] }[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = y * size + x;
        if (filled[index]) continue;
        const rgba = [0, 0, 0, 0];
        let count = 0;
        for (const [dx, dy] of NEIGHBORS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const neighbor = ny * size + nx;
          if (!filled[neighbor]) continue;
          for (let k = 0; k < 4; k++) rgba[k] += pixels[neighbor * 4 + k];
          count++;
        }
        if (count > 0) grown.push({ index, rgba: rgba.map((v) => v / count) });
      }
    }
    if (grown.length === 0) break;
    for (const { index, rgba } of grown) {
      pixels.set(rgba, index * 4);
      filled[index] = 1;
    }
  }
}
