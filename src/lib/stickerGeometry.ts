import { BufferGeometry, Float32BufferAttribute, MathUtils, Vector2, Vector3 } from "three";
import type { Placement, StencilTransform } from "@/types";
import { projectorFrame } from "./projectorFrame";
import type { SurfaceGraph } from "./surfaceGraph";

interface Corner {
  position: Vector3;
  normal: Vector3;
  uv: Vector2;
}

/** Geodesic reach, relative to the image size (half diagonal is ~0.71). */
const REACH = 0.8;

/** Half-planes of the unit UV square, as signed distances (inside >= 0). */
const CLIP_PLANES: ((uv: Vector2) => number)[] = [
  (uv) => uv.x,
  (uv) => 1 - uv.x,
  (uv) => uv.y,
  (uv) => 1 - uv.y,
];

/**
 * Surface-following decal: the image is laid flat along the skin using a
 * discrete exponential map around the placement point, then clipped to its square.
 */
export function buildSticker(
  graph: SurfaceGraph,
  placement: Placement,
  transform: StencilTransform,
): BufferGeometry {
  const { size, rotation, offsetX, offsetY } = transform;
  const reach = Math.hypot(offsetX, offsetY) + size * REACH;
  const uvs = computeExpMap(graph, placement, reach);
  const center = new Vector2(offsetX, offsetY);
  const angle = -MathUtils.degToRad(rotation);
  const toImage = (mapped: Vector2) =>
    mapped.clone().rotateAround(center, angle).sub(center).divideScalar(size).addScalar(0.5);
  return triangulate(graph, uvs, toImage);
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

function lerpCorner(a: Corner, b: Corner, t: number): Corner {
  return {
    position: a.position.clone().lerp(b.position, t),
    normal: a.normal.clone().lerp(b.normal, t).normalize(),
    uv: a.uv.clone().lerp(b.uv, t),
  };
}

/** Sutherland-Hodgman clip of a convex polygon against one UV half-plane. */
function clip(polygon: Corner[], inside: (uv: Vector2) => number): Corner[] {
  const out: Corner[] = [];
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const da = inside(a.uv);
    const db = inside(b.uv);
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) out.push(lerpCorner(a, b, da / (da - db)));
  });
  return out;
}

/** Keeps mapped triangles, clipped to the image square, as a new geometry. */
function triangulate(
  graph: SurfaceGraph,
  uvs: Map<number, Vector2>,
  toImage: (mapped: Vector2) => Vector2,
): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvOut: number[] = [];

  for (let corner = 0; corner < graph.cornerToVertex.length; corner += 3) {
    const ids = Array.from(graph.cornerToVertex.subarray(corner, corner + 3));
    if (!ids.every((id) => uvs.has(id))) continue;

    let polygon: Corner[] = ids.map((id) => ({
      position: graph.positions[id],
      normal: graph.normals[id],
      uv: toImage(uvs.get(id)!),
    }));
    for (const plane of CLIP_PLANES) polygon = clip(polygon, plane);

    for (let i = 1; i + 1 < polygon.length; i++) {
      for (const c of [polygon[0], polygon[i], polygon[i + 1]]) {
        positions.push(...c.position.toArray());
        normals.push(...c.normal.toArray());
        uvOut.push(...c.uv.toArray());
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvOut, 2));
  return geometry;
}
