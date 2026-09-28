import { BufferGeometry, MathUtils, Vector2, Vector3 } from "three";
import type { Placement, StencilTransform } from "@/types";
import { buildDecalGeometry } from "./decalGeometry";
import { projectorFrame } from "./projectorFrame";
import type { SurfaceGraph } from "./surfaceGraph";

/** Geodesic reach, relative to the image size (half diagonal is ~0.71). */
const REACH = 0.8;

/**
 * Surface-following decal: the image is laid flat along the skin using a
 * discrete exponential map around the placement point.
 */
export function buildSticker(
  graph: SurfaceGraph,
  placement: Placement,
  transform: StencilTransform,
): BufferGeometry {
  const { size, rotation, offsetX, offsetY } = transform;
  const reach = Math.hypot(offsetX, offsetY) + size * REACH;
  const mapped = computeExpMap(graph, placement, reach);
  const center = new Vector2(offsetX, offsetY);
  const angle = -MathUtils.degToRad(rotation);

  return buildDecalGeometry(graph, (first) => {
    const ids = Array.from(graph.cornerToVertex.subarray(first, first + 3));
    if (!ids.every((id) => mapped.has(id))) return null;
    return ids.map((id) =>
      mapped.get(id)!.clone().rotateAround(center, angle).sub(center).divideScalar(size).addScalar(0.5),
    );
  });
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
 * Dijkstra walk over the surface from the clicked triangle. Each vertex gets
 * 2D coordinates = parent coordinates + the edge flattened into a tangent frame
 * carried along the walk.
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
    done.add(u);
    if (dist.get(u)! > radius) continue;

    const normal = graph.normals[u];
    const tangent = tangents.get(u)!;
    const bitangent = new Vector3().crossVectors(normal, tangent);
    for (const v of graph.neighbors[u]) {
      if (done.has(v)) continue;
      const edge = graph.positions[v].clone().sub(graph.positions[u]);
      const d = dist.get(u)! + edge.length();
      if (d >= (dist.get(v) ?? Infinity)) continue;
      const flat = edge.clone().projectOnPlane(normal).setLength(edge.length());
      uvs.set(v, uvs.get(u)!.clone().add(new Vector2(flat.dot(tangent), flat.dot(bitangent))));
      tangents.set(v, transport(tangent, graph.normals[v]));
      dist.set(v, d);
      open.add(v);
    }
  }
  return uvs;
}
