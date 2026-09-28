import { Vector2, type Vector3 } from "three";

const ITERATIONS = 10;
const CG_ITERATIONS = 20;

/** Patch triangles over local vertex indices, with their flattened 3D rest shape. */
interface Patch {
  /** Local vertex index of each triangle corner. */
  corners: Int32Array;
  /** Rest edge (corner k to k + 1) of each triangle, as x, y pairs. */
  edges: Float64Array;
  /** Cotangent weight of each rest edge. */
  weights: Float64Array;
}

/** Index of the corner after corner `e` in its triangle. */
const nextCorner = (e: number) => e - (e % 3) + ((e + 1) % 3);

/** Flattens each triangle isometrically and computes its cotangent weights. */
function buildPatch(positions: Vector3[], triangles: number[][], local: Map<number, number>): Patch {
  const corners = new Int32Array(triangles.length * 3);
  const edges = new Float64Array(triangles.length * 6);
  const weights = new Float64Array(triangles.length * 3);
  triangles.forEach((ids, t) => {
    const [a, b, c] = ids.map((id) => positions[id]);
    const ab = b.clone().sub(a);
    const ac = c.clone().sub(a);
    const x = ab.length();
    const cx = ac.dot(ab) / x;
    const rest = [new Vector2(0, 0), new Vector2(x, 0), new Vector2(cx, Math.sqrt(Math.max(ac.lengthSq() - cx * cx, 0)))];
    for (let k = 0; k < 3; k++) {
      const next = rest[(k + 1) % 3];
      const opposite = rest[(k + 2) % 3];
      const e1 = rest[k].clone().sub(opposite);
      const e2 = next.clone().sub(opposite);
      corners[t * 3 + k] = local.get(ids[k])!;
      edges[t * 6 + k * 2] = rest[k].x - next.x;
      edges[t * 6 + k * 2 + 1] = rest[k].y - next.y;
      weights[t * 3 + k] = e1.dot(e2) / Math.abs(e1.cross(e2)) / 2;
    }
  });
  return { corners, edges, weights };
}

/** Cotangent Laplacian in CSR form, with the rows of pinned vertices left empty. */
function buildLaplacian({ corners, weights }: Patch, count: number, pinned: Uint8Array) {
  const rows = Array.from({ length: count }, () => new Map<number, number>());
  const add = (i: number, j: number, w: number) => {
    if (!pinned[i]) rows[i].set(j, (rows[i].get(j) ?? 0) + w);
  };
  for (let e = 0; e < weights.length; e++) {
    const i = corners[e];
    const j = corners[nextCorner(e)];
    add(i, i, weights[e]);
    add(j, j, weights[e]);
    add(i, j, -weights[e]);
    add(j, i, -weights[e]);
  }
  const start = new Int32Array(count + 1);
  rows.forEach((row, i) => (start[i + 1] = start[i] + row.size));
  const columns = new Int32Array(start[count]);
  const values = new Float64Array(start[count]);
  rows.forEach((row, i) => {
    let n = start[i];
    for (const [j, w] of row) {
      columns[n] = j;
      values[n++] = w;
    }
  });
  return { start, columns, values };
}

type Laplacian = ReturnType<typeof buildLaplacian>;

/** out = L x, for interleaved 2D vectors. */
function multiply({ start, columns, values }: Laplacian, x: Float64Array, out: Float64Array) {
  for (let i = 0; i + 1 < start.length; i++) {
    let sx = 0;
    let sy = 0;
    for (let n = start[i]; n < start[i + 1]; n++) {
      sx += values[n] * x[columns[n] * 2];
      sy += values[n] * x[columns[n] * 2 + 1];
    }
    out[i * 2] = sx;
    out[i * 2 + 1] = sy;
  }
}

/** Local step: angle of the rotation closest to the map from rest edges to current edges of triangle `t`. */
function bestAngle({ corners, edges, weights }: Patch, uv: Float64Array, t: number): number {
  let s00 = 0, s01 = 0, s10 = 0, s11 = 0;
  for (let e = t * 3; e < t * 3 + 3; e++) {
    const i = corners[e];
    const j = corners[nextCorner(e)];
    const ux = weights[e] * (uv[i * 2] - uv[j * 2]);
    const uy = weights[e] * (uv[i * 2 + 1] - uv[j * 2 + 1]);
    s00 += ux * edges[e * 2];
    s01 += ux * edges[e * 2 + 1];
    s10 += uy * edges[e * 2];
    s11 += uy * edges[e * 2 + 1];
  }
  return Math.atan2(s10 - s01, s00 + s11);
}

/** Global step right-hand side: rest edges turned by their triangle's best rotation. */
function buildRhs(patch: Patch, uv: Float64Array): Float64Array {
  const { corners, edges, weights } = patch;
  const rhs = new Float64Array(uv.length);
  for (let t = 0; t < weights.length / 3; t++) {
    const angle = bestAngle(patch, uv, t);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let e = t * 3; e < t * 3 + 3; e++) {
      const i = corners[e];
      const j = corners[nextCorner(e)];
      const rx = weights[e] * (cos * edges[e * 2] - sin * edges[e * 2 + 1]);
      const ry = weights[e] * (sin * edges[e * 2] + cos * edges[e * 2 + 1]);
      rhs[i * 2] += rx;
      rhs[i * 2 + 1] += ry;
      rhs[j * 2] -= rx;
      rhs[j * 2 + 1] -= ry;
    }
  }
  return rhs;
}

function dot(a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let n = 0; n < a.length; n++) sum += a[n] * b[n];
  return sum;
}

/**
 * A few conjugate gradient steps on L uv = rhs over the free vertices,
 * warm-started from `uv` (updated in place). The residual of pinned vertices
 * is zeroed, so they never move.
 */
function solve(laplacian: Laplacian, rhs: Float64Array, uv: Float64Array, pinned: Uint8Array) {
  const r = new Float64Array(uv.length);
  multiply(laplacian, uv, r);
  for (let n = 0; n < r.length; n++) r[n] = pinned[n >> 1] ? 0 : rhs[n] - r[n];
  const p = r.slice();
  const ap = new Float64Array(uv.length);
  let rr = dot(r, r);
  for (let k = 0; k < CG_ITERATIONS && rr > 0; k++) {
    multiply(laplacian, p, ap);
    const alpha = rr / dot(p, ap);
    for (let n = 0; n < uv.length; n++) {
      uv[n] += alpha * p[n];
      r[n] -= alpha * ap[n];
    }
    const next = dot(r, r);
    for (let n = 0; n < p.length; n++) p[n] = r[n] + (next / rr) * p[n];
    rr = next;
  }
}

/**
 * As-rigid-as-possible flattening (Liu et al. 2008) of a triangle patch,
 * starting from `initial` and keeping `pinned` vertices fixed. Returns new uvs.
 */
export function relaxArap(
  positions: Vector3[],
  triangles: number[][],
  initial: Map<number, Vector2>,
  pinned: Set<number>,
): Map<number, Vector2> {
  const local = new Map<number, number>();
  for (const ids of triangles) for (const id of ids) if (!local.has(id)) local.set(id, local.size);
  const ids = [...local.keys()];
  const uv = new Float64Array(ids.length * 2);
  const isPinned = new Uint8Array(ids.length);
  ids.forEach((id, i) => {
    uv[i * 2] = initial.get(id)!.x;
    uv[i * 2 + 1] = initial.get(id)!.y;
    isPinned[i] = pinned.has(id) ? 1 : 0;
  });

  const patch = buildPatch(positions, triangles, local);
  const laplacian = buildLaplacian(patch, ids.length, isPinned);
  for (let iteration = 0; iteration < ITERATIONS; iteration++) {
    solve(laplacian, buildRhs(patch, uv), uv, isPinned);
  }
  return new Map(ids.map((id, i) => [id, new Vector2(uv[i * 2], uv[i * 2 + 1])]));
}
