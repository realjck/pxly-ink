import { BufferAttribute, BufferGeometry, Vector2, Vector3 } from "three";

/** Welded vertex topology of a non-indexed triangle mesh. */
export interface SurfaceGraph {
  /** Welded vertex id for each triangle corner. */
  cornerToVertex: Int32Array;
  positions: Vector3[];
  normals: Vector3[];
  neighbors: Set<number>[];
  /** Original texture coordinates, per corner. */
  baseUv: BufferAttribute;
  /** SL texture index (see SL_MAPS) of each triangle. */
  triangleMap: Uint8Array;
  /** 1 when the mirror-image triangle (x -> -x) has the same texture coordinates (SL arms). */
  sharesUv: Uint8Array;
}

const cache = new WeakMap<BufferGeometry, SurfaceGraph>();

/** Returns the (cached) surface graph of a geometry, welding corners by position. */
export function getSurfaceGraph(geometry: BufferGeometry): SurfaceGraph {
  let graph = cache.get(geometry);
  if (!graph) {
    graph = buildSurfaceGraph(geometry);
    cache.set(geometry, graph);
  }
  return graph;
}

function buildSurfaceGraph(geometry: BufferGeometry): SurfaceGraph {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const cornerToVertex = new Int32Array(position.count);
  const ids = new Map<string, number>();
  const keyOf = (x: number, y: number, z: number) =>
    `${Math.round(x * 1e5)},${Math.round(y * 1e5)},${Math.round(z * 1e5)}`;
  const positions: Vector3[] = [];
  const normals: Vector3[] = [];

  for (let corner = 0; corner < position.count; corner++) {
    const p = new Vector3().fromBufferAttribute(position, corner);
    const key = keyOf(p.x, p.y, p.z);
    let id = ids.get(key);
    if (id === undefined) {
      id = positions.length;
      ids.set(key, id);
      positions.push(p);
      normals.push(new Vector3());
    }
    normals[id].add(new Vector3().fromBufferAttribute(normal, corner));
    cornerToVertex[corner] = id;
  }
  normals.forEach((n) => n.normalize());

  const neighbors = positions.map(() => new Set<number>());
  for (let corner = 0; corner < position.count; corner += 3) {
    const [a, b, c] = cornerToVertex.subarray(corner, corner + 3);
    neighbors[a].add(b).add(c);
    neighbors[b].add(a).add(c);
    neighbors[c].add(a).add(b);
  }

  const triangleMap = new Uint8Array(position.count / 3);
  for (const group of geometry.groups) {
    triangleMap.fill(group.materialIndex ?? 0, group.start / 3, (group.start + group.count) / 3);
  }

  return {
    cornerToVertex,
    sharesUv: findSharedUv(geometry, keyOf),
    positions,
    normals,
    neighbors,
    baseUv: geometry.attributes.uv as BufferAttribute,
    triangleMap,
  };
}

/** UVs closer than this match: the Ruth2 OBJ has 1e-6 differences between mirrored corners. */
const UV_TOLERANCE = 1e-4;

/** Flags triangles whose mirror image across x = 0 uses the same texture coordinates. */
function findSharedUv(geometry: BufferGeometry, keyOf: (x: number, y: number, z: number) => string): Uint8Array {
  const { position, uv } = geometry.attributes;
  const uvsAt = new Map<string, Vector2[]>();
  for (let corner = 0; corner < position.count; corner++) {
    const key = keyOf(position.getX(corner), position.getY(corner), position.getZ(corner));
    const uvs = uvsAt.get(key) ?? uvsAt.set(key, []).get(key)!;
    uvs.push(new Vector2(uv.getX(corner), uv.getY(corner)));
  }
  const mirrorMatches = (corner: number) => {
    const own = new Vector2(uv.getX(corner), uv.getY(corner));
    const twins = uvsAt.get(keyOf(-position.getX(corner), position.getY(corner), position.getZ(corner))) ?? [];
    return twins.some((twin) => twin.distanceTo(own) < UV_TOLERANCE);
  };

  const shared = new Uint8Array(position.count / 3);
  for (let triangle = 0; triangle < shared.length; triangle++) {
    const first = triangle * 3;
    shared[triangle] = [first, first + 1, first + 2].every(mirrorMatches) ? 1 : 0;
  }
  return shared;
}
