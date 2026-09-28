import { BufferGeometry, MathUtils, Vector2, Vector3 } from "three";
import type { Placement, StencilTransform } from "@/types";
import { relaxArap } from "./arap";
import { buildDecalGeometry } from "./decalGeometry";
import { type Chart, MIN_TURN, unfoldSeams } from "./seamCharts";
import { projectorFrame } from "./projectorFrame";
import type { SurfaceGraph } from "./surfaceGraph";

/** Geodesic reach, relative to the image size (half diagonal is ~0.71). */
const REACH = 0.8;
/** Triangles stretched more than this in the flattened map are dropped. */
const MAX_STRETCH = 2;
/** Triangles stretched more than this by the exponential map are left out of the relaxation (cuts). */
const SEAM_STRETCH = 5;
/** Margin around the image kept in the relaxation, in image coordinates. */
const FOOTPRINT_MARGIN = 0.1;

/**
 * Surface-following decal: the image, of the given extent (meters), is laid flat along the skin using a
 * discrete exponential map around the placement point.
 */
export function buildSticker(
  graph: SurfaceGraph,
  placement: Placement,
  transform: StencilTransform,
  extent: Vector2,
): BufferGeometry {
  const { size, rotation, offsetX, offsetY } = transform;
  const reach = Math.hypot(offsetX, offsetY) + size * REACH;
  const center = new Vector2(offsetX, offsetY);
  const angle = -MathUtils.degToRad(rotation);
  const toImage = (uv: Vector2) => uv.clone().rotateAround(center, angle).sub(center).divide(extent).addScalar(0.5);
  const expMap = computeExpMap(graph, placement, reach);
  const { patch, seams } = splitFootprint(graph, expMap, toImage);
  const flat = relax(graph, expMap, patch, toImage);

  const charts = new Map<number, Chart[]>();
  for (const first of patch) {
    const ids = cornerIds(graph, first);
    if (stretch(graph, flat, ids) <= MAX_STRETCH) charts.set(first, [ids.map((id) => flat.get(id)!)]);
    else seams.push(first);
  }
  unfoldSeams(graph, charts, seams);
  // Where an image wrapped around a limb overlaps itself, its right end goes on top.
  const imageCharts = (first: number) =>
    (charts.get(first) ?? [])
      .map((chart) => chart.map(toImage))
      .sort((a, b) => a[0].x + a[1].x + a[2].x - (b[0].x + b[1].x + b[2].x));
  return buildDecalGeometry(graph, imageCharts);
}

const cornerIds = (graph: SurfaceGraph, first: number) => Array.from(graph.cornerToVertex.subarray(first, first + 3));

/**
 * Triangles on or near the image (first corner indices): those that flatten
 * well enough to relax (patch), and the seams where walks around a limb meet.
 */
function splitFootprint(graph: SurfaceGraph, expMap: Map<number, Vector2>, toImage: (uv: Vector2) => Vector2) {
  const near = (id: number) => {
    const { x, y } = toImage(expMap.get(id)!).subScalar(0.5);
    return Math.max(Math.abs(x), Math.abs(y)) <= 0.5 + FOOTPRINT_MARGIN;
  };
  const patch: number[] = [];
  const seams: number[] = [];
  for (let first = 0; first < graph.cornerToVertex.length; first += 3) {
    const ids = cornerIds(graph, first);
    if (!ids.every((id) => expMap.has(id)) || !ids.some(near)) continue;
    (stretch(graph, expMap, ids) <= SEAM_STRETCH ? patch : seams).push(first);
  }
  return { patch, seams };
}

/** Relaxes the exponential map with ARAP over the patch, pinning the vertex closest to the image center and its neighbors. */
function relax(
  graph: SurfaceGraph,
  expMap: Map<number, Vector2>,
  patch: number[],
  toImage: (uv: Vector2) => Vector2,
): Map<number, Vector2> {
  const triangles = patch.map((first) => cornerIds(graph, first));
  const offCenter = (id: number) => toImage(expMap.get(id)!).subScalar(0.5).length();
  const pivot = triangles.flat().reduce((best, id) => (offCenter(id) < offCenter(best) ? id : best));
  const pinned = new Set([pivot, ...graph.neighbors[pivot]]);
  return relaxArap(graph.positions, triangles, expMap, pinned);
}

/**
 * Largest ratio of flattened to 3D edge length in a triangle (1 = undistorted).
 * High on triangles where walks around a limb meet from both sides.
 */
function stretch(graph: SurfaceGraph, mapped: Map<number, Vector2>, ids: number[]): number {
  return Math.max(
    ...ids.map((a, k) => {
      const b = ids[(k + 1) % 3];
      return mapped.get(a)!.distanceTo(mapped.get(b)!) / graph.positions[a].distanceTo(graph.positions[b]);
    }),
  );
}

/** Moves a tangent vector into the tangent plane of another normal. */
function transport(tangent: Vector3, normal: Vector3): Vector3 {
  return tangent.clone().projectOnPlane(normal).normalize();
}

function closest(open: Set<number>, dist: Map<number, number>): number {
  let best = -1;
  for (const id of open) if (best < 0 || dist.get(id)! < dist.get(best)!) best = id;
  return best;
}

/**
 * Places a vertex at the weighted average of the positions predicted by its
 * finalized neighbors (upwind averaging, Schmidt 2006): walks arriving from
 * both sides of a curved area blend instead of tearing apart. Predictions a
 * limb turn away from the closest neighbor's (Dijkstra parent) come from the
 * other side of the limb and are left out.
 */
function placeVertex(
  graph: SurfaceGraph,
  u: number,
  dist: Map<number, number>,
  done: Set<number>,
  uvs: Map<number, Vector2>,
  tangents: Map<number, Vector3>,
) {
  const predictions = [...graph.neighbors[u]]
    .filter((w) => done.has(w))
    .map((w) => {
      const normal = graph.normals[w];
      const wTangent = tangents.get(w)!;
      const bitangent = new Vector3().crossVectors(normal, wTangent);
      const edge = graph.positions[u].clone().sub(graph.positions[w]);
      const flat = edge.clone().projectOnPlane(normal).setLength(edge.length());
      return {
        uv: uvs.get(w)!.clone().add(new Vector2(flat.dot(wTangent), flat.dot(bitangent))),
        tangent: transport(wTangent, graph.normals[u]),
        weight: 1 / edge.lengthSq(),
        dist: dist.get(w)!,
      };
    });
  const parent = predictions.reduce((best, p) => (p.dist < best.dist ? p : best));
  const uv = new Vector2();
  const tangent = new Vector3();
  let total = 0;
  for (const p of predictions) {
    if (p.uv.distanceTo(parent.uv) >= MIN_TURN) continue;
    uv.addScaledVector(p.uv, p.weight);
    tangent.addScaledVector(p.tangent, p.weight);
    total += p.weight;
  }
  uvs.set(u, uv.divideScalar(total));
  tangents.set(u, transport(tangent, graph.normals[u]));
}

/**
 * Dijkstra walk over the surface from the clicked triangle. Each vertex gets
 * 2D coordinates from its already placed neighbors, flattening edges into
 * tangent frames carried along the walk.
 */
function computeExpMap(graph: SurfaceGraph, placement: Placement, radius: number): Map<number, Vector2> {
  const frame = projectorFrame(placement);
  const xAxis = new Vector3().setFromMatrixColumn(frame.matrixWorld, 0);
  const yAxis = new Vector3().setFromMatrixColumn(frame.matrixWorld, 1);
  const dist = new Map<number, number>();
  const uvs = new Map<number, Vector2>();
  const tangents = new Map<number, Vector3>();
  const open = new Set<number>();
  const done = new Set<number>();

  const seed = graph.cornerToVertex.subarray(placement.faceIndex * 3, placement.faceIndex * 3 + 3);
  for (const id of seed) {
    const offset = graph.positions[id].clone().sub(frame.position);
    dist.set(id, offset.length());
    uvs.set(id, new Vector2(offset.dot(xAxis), offset.dot(yAxis)));
    tangents.set(id, transport(xAxis, graph.normals[id]));
    open.add(id);
  }

  while (open.size > 0) {
    const u = closest(open, dist);
    open.delete(u);
    if (!uvs.has(u)) placeVertex(graph, u, dist, done, uvs, tangents);
    done.add(u);
    if (dist.get(u)! > radius) continue;

    for (const v of graph.neighbors[u]) {
      if (done.has(v)) continue;
      const d = dist.get(u)! + graph.positions[v].distanceTo(graph.positions[u]);
      if (d >= (dist.get(v) ?? Infinity)) continue;
      dist.set(v, d);
      open.add(v);
    }
  }
  return uvs;
}
