import { BufferGeometry, Matrix4, Triangle, Vector2, Vector3 } from "three";
import type { Placement, StencilTransform } from "@/types";
import { buildDecalGeometry } from "./decalGeometry";
import { transformedFrame } from "./projectorFrame";
import type { SurfaceGraph } from "./surfaceGraph";

/**
 * Planar projection along the surface normal (stretches on curved areas).
 * Keeps triangles facing the projector and within its depth (half the size).
 */
export function buildProjection(
  graph: SurfaceGraph,
  placement: Placement,
  transform: StencilTransform,
): BufferGeometry {
  const frame = transformedFrame(placement, transform);
  const toLocal = new Matrix4().copy(frame.matrixWorld).invert();
  const direction = new Vector3().setFromMatrixColumn(frame.matrixWorld, 2);
  const halfDepth = transform.size / 2;
  const faceNormal = new Vector3();

  return buildDecalGeometry(graph, (first) => {
    const [a, b, c] = Array.from(graph.cornerToVertex.subarray(first, first + 3)).map(
      (id) => graph.positions[id],
    );
    if (Triangle.getNormal(a, b, c, faceNormal).dot(direction) <= 0) return null;
    const local = [a, b, c].map((p) => p.clone().applyMatrix4(toLocal));
    if (local.some((p) => Math.abs(p.z) > halfDepth)) return null;
    return local.map((p) => new Vector2(p.x, p.y).divideScalar(transform.size).addScalar(0.5));
  });
}
