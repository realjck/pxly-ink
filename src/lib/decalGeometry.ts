import { BufferGeometry, Float32BufferAttribute, Vector2, Vector3 } from "three";
import { SL_MAPS } from "./avatarGeometry";
import type { SurfaceGraph } from "./surfaceGraph";

/**
 * Group of the mirror copies of decal triangles on shared-UV areas (SL arms):
 * shown in the viewer as SL will show them, never baked (bake only draws SL_MAPS groups).
 */
export const MIRROR_GROUP = SL_MAPS.length;

/** Image coordinates of a triangle's three corners, once per copy of it in the image (none to skip it). */
export type TriangleImageUvs = (firstCorner: number) => Vector2[][];

interface Corner {
  position: Vector3;
  normal: Vector3;
  uv: Vector2;
  baseUv: Vector2;
}

/** Half-planes of the unit image square, as signed distances (inside >= 0). */
const CLIP_PLANES: ((uv: Vector2) => number)[] = [
  (uv) => uv.x,
  (uv) => 1 - uv.x,
  (uv) => uv.y,
  (uv) => 1 - uv.y,
];

/** Mirror image across x = 0: flips positions and normals, keeps texture coordinates. */
function mirrorCorner(c: Corner): Corner {
  const flip = (v: Vector3) => v.clone().setX(-v.x);
  return { ...c, position: flip(c.position), normal: flip(c.normal) };
}

function lerpCorner(a: Corner, b: Corner, t: number): Corner {
  return {
    position: a.position.clone().lerp(b.position, t),
    normal: a.normal.clone().lerp(b.normal, t).normalize(),
    uv: a.uv.clone().lerp(b.uv, t),
    baseUv: a.baseUv.clone().lerp(b.baseUv, t),
  };
}

/** Sutherland-Hodgman clip of a convex polygon against one image half-plane. */
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

/**
 * Builds the decal mesh: avatar triangles mapped into the image, clipped to its
 * square. Attributes: uv (image) and baseUv (avatar texture). One group per SL
 * texture, then MIRROR_GROUP.
 */
export function buildDecalGeometry(graph: SurfaceGraph, imageUvs: TriangleImageUvs): BufferGeometry {
  const buckets = [...SL_MAPS, "mirror"].map(() => ({
    position: [] as number[],
    normal: [] as number[],
    uv: [] as number[],
    baseUv: [] as number[],
  }));
  const push = (bucket: (typeof buckets)[number], corners: Corner[]) => {
    for (const c of corners) {
      bucket.position.push(...c.position.toArray());
      bucket.normal.push(...c.normal.toArray());
      bucket.uv.push(...c.uv.toArray());
      bucket.baseUv.push(...c.baseUv.toArray());
    }
  };

  for (let first = 0; first < graph.cornerToVertex.length; first += 3) {
    for (const uvs of imageUvs(first)) {
      let polygon: Corner[] = uvs.map((uv, k) => {
        const id = graph.cornerToVertex[first + k];
        return {
          position: graph.positions[id],
          normal: graph.normals[id],
          uv,
          baseUv: new Vector2().fromBufferAttribute(graph.baseUv, first + k),
        };
      });
      for (const plane of CLIP_PLANES) polygon = clip(polygon, plane);

      const shared = graph.sharesUv[first / 3];
      for (let i = 1; i + 1 < polygon.length; i++) {
        push(buckets[graph.triangleMap[first / 3]], [polygon[0], polygon[i], polygon[i + 1]]);
        // Reversed winding keeps the mirror copy front-facing.
        if (shared) push(buckets[MIRROR_GROUP], [polygon[0], polygon[i + 1], polygon[i]].map(mirrorCorner));
      }
    }
  }

  const geometry = new BufferGeometry();
  let start = 0;
  buckets.forEach((bucket, map) => {
    const count = bucket.position.length / 3;
    geometry.addGroup(start, count, map);
    start += count;
  });
  for (const name of ["position", "normal", "uv", "baseUv"] as const) {
    const itemSize = name === "position" || name === "normal" ? 3 : 2;
    geometry.setAttribute(name, new Float32BufferAttribute(buckets.flatMap((b) => b[name]), itemSize));
  }
  return geometry;
}
