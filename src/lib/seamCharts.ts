import { Vector2 } from "three";
import type { SurfaceGraph } from "./surfaceGraph";

/** Flattened positions (meters) of a triangle's three corners: one copy of it in the image. */
export type Chart = Vector2[];

/** At most one copy per side of a seam. */
const MAX_CHARTS = 2;
/** Shortest turn around a limb (meters, about a wrist); seam copies closer than this are one tear. */
export const MIN_TURN = 0.1;

const cornerIds = (graph: SurfaceGraph, first: number) => Array.from(graph.cornerToVertex.subarray(first, first + 3));

/**
 * Charts a triangle from a charted neighbor sharing the edge (a, b): the
 * third corner is laid at its 3D distances from the edge, on the side away
 * from the neighbor.
 */
function unfold(graph: SurfaceGraph, ids: number[], placed: Map<number, Vector2>, away: Vector2): Chart {
  const [a, b] = ids.filter((id) => placed.has(id));
  const c = ids.find((id) => !placed.has(id))!;
  const edge3 = graph.positions[b].clone().sub(graph.positions[a]);
  const toC = graph.positions[c].clone().sub(graph.positions[a]);
  const along = toC.dot(edge3) / edge3.lengthSq();
  const height = toC.clone().addScaledVector(edge3, -along).length();

  const pa = placed.get(a)!;
  const edge2 = placed.get(b)!.clone().sub(pa);
  const normal = new Vector2(-edge2.y, edge2.x).normalize();
  const side = normal.dot(away.clone().sub(pa)) > 0 ? -1 : 1;
  const scale = edge2.length() / edge3.length();
  const pc = pa.clone().addScaledVector(edge2, along).addScaledVector(normal, side * height * scale);
  return ids.map((id) => (id === c ? pc : placed.get(id)!));
}

function centroid(chart: Chart): Vector2 {
  return chart[0].clone().add(chart[1]).add(chart[2]).divideScalar(3);
}

/** Copies of a triangle less than half a limb turn apart are the same copy. */
function isNew(charts: Chart[], chart: Chart): boolean {
  const center = centroid(chart);
  return charts.every((other) => centroid(other).distanceTo(center) >= MIN_TURN / 2);
}

/** Triangles sharing an edge, over the given triangles (first corner indices). */
function edgeNeighbors(graph: SurfaceGraph, triangles: number[]): Map<number, number[]> {
  const byEdge = new Map<string, number[]>();
  const keys = (first: number) =>
    cornerIds(graph, first).map((a, k, ids) => {
      const b = ids[(k + 1) % 3];
      return a < b ? `${a},${b}` : `${b},${a}`;
    });
  for (const first of triangles) for (const key of keys(first)) byEdge.set(key, [...(byEdge.get(key) ?? []), first]);
  return new Map(triangles.map((first) => [first, keys(first).flatMap((key) => byEdge.get(key)!.filter((t) => t !== first))]));
}

/**
 * Charts the seam triangles, whose corners come from walks that went around a
 * limb on both sides and do not fit together: each one is unfolded from its
 * charted neighbors across shared edges, spreading through the seam from both
 * sides, so it gets one copy per side (a single one on a mere tear).
 */
export function unfoldSeams(graph: SurfaceGraph, charts: Map<number, Chart[]>, seams: number[]) {
  const neighbors = edgeNeighbors(graph, [...charts.keys(), ...seams]);
  const seamSet = new Set(seams);
  const queue = [...seams];
  for (let next = 0; next < queue.length; next++) {
    const first = queue[next];
    const ids = cornerIds(graph, first);
    const own = charts.get(first) ?? [];
    for (const neighbor of neighbors.get(first)!) {
      const neighborIds = cornerIds(graph, neighbor);
      const shared = ids.filter((id) => neighborIds.includes(id));
      for (const chart of charts.get(neighbor) ?? []) {
        if (own.length >= MAX_CHARTS) break;
        const placed = new Map(shared.map((id) => [id, chart[neighborIds.indexOf(id)]]));
        const away = chart[neighborIds.findIndex((id) => !shared.includes(id))];
        const unfolded = unfold(graph, ids, placed, away);
        if (!isNew(own, unfolded)) continue;
        own.push(unfolded);
        charts.set(first, own);
        queue.push(...neighbors.get(first)!.filter((t) => seamSet.has(t)));
      }
    }
  }
}
