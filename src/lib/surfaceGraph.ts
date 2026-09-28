import { BufferAttribute, BufferGeometry, Vector3 } from "three";

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
  const positions: Vector3[] = [];
  const normals: Vector3[] = [];

  for (let corner = 0; corner < position.count; corner++) {
    const p = new Vector3().fromBufferAttribute(position, corner);
    const key = `${Math.round(p.x * 1e5)},${Math.round(p.y * 1e5)},${Math.round(p.z * 1e5)}`;
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
    positions,
    normals,
    neighbors,
    baseUv: geometry.attributes.uv as BufferAttribute,
    triangleMap,
  };
}
