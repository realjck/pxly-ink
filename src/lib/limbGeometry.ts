import { BufferGeometry, Vector2, Vector3 } from "three";
import type { Limb, StencilTransform } from "@/types";
import { buildDecalGeometry } from "./decalGeometry";
import type { SurfaceGraph } from "./surfaceGraph";

/** Height below which the legs are apart (meters, viewer space): just under the Ruth2 crotch (0.96). */
const CROTCH = 0.95;

/** Below the groin line, rising from the crotch toward the hips. */
const belowGroin = (p: Vector3) => p.y < CROTCH + 0.6 * Math.abs(p.x);

interface Region {
  contains: (p: Vector3) => boolean;
  /** Rough direction toward the trunk (image up). */
  up: Vector3;
  /** Side shown in the middle of the image (the seam is opposite). */
  front: Vector3;
  /** Use `up` as the axis instead of the principal direction of the vertices. */
  upright?: boolean;
}

/**
 * Vertices of each limb, in viewer space (the avatar faces +Z, its right is
 * -X). "arms" is the right arm: SL shares one UV layout between both arms.
 * The torso stays upright: breasts and buttocks would tilt its principal axis.
 */
const REGIONS: Record<Limb, Region> = {
  arms: { contains: (p) => p.x < -0.2 && p.x > -0.63 && p.y > 1.3, up: new Vector3(1, 0, 0), front: new Vector3(0, 1, 0) },
  torso: {
    contains: (p) => p.y > CROTCH + 0.05 && p.y < 1.6 && Math.abs(p.x) < 0.2,
    up: new Vector3(0, 1, 0),
    front: new Vector3(0, 0, 1),
    upright: true,
  },
  rightLeg: { contains: (p) => p.x < 0 && belowGroin(p), up: new Vector3(0, 1, 0), front: new Vector3(0, 0, 1) },
  leftLeg: { contains: (p) => p.x > 0 && belowGroin(p), up: new Vector3(0, 1, 0), front: new Vector3(0, 0, 1) },
};

/** Cylinder frame of a limb: axis through its vertices, from the far end toward the trunk. */
export interface LimbFrame {
  triangles: number[];
  origin: Vector3;
  axis: Vector3;
  front: Vector3;
  right: Vector3;
  /** Axis coordinate range of the limb vertices (meters from origin). */
  min: number;
  max: number;
}

const cache = new WeakMap<SurfaceGraph, Map<Limb, LimbFrame>>();

/** Principal direction of a point set (power iteration on its covariance). */
function principalAxis(points: Vector3[], origin: Vector3, guess: Vector3): Vector3 {
  const axis = guess.clone();
  for (let iteration = 0; iteration < 50; iteration++) {
    const next = new Vector3();
    for (const p of points) {
      const d = p.clone().sub(origin);
      next.addScaledVector(d, d.dot(axis));
    }
    axis.copy(next.normalize());
  }
  return axis.dot(guess) < 0 ? axis.negate() : axis;
}

function buildFrame(graph: SurfaceGraph, limb: Limb): LimbFrame {
  const { contains, up, front, upright } = REGIONS[limb];
  const triangles: number[] = [];
  const ids = new Set<number>();
  for (let first = 0; first < graph.cornerToVertex.length; first += 3) {
    const corners = Array.from(graph.cornerToVertex.subarray(first, first + 3));
    if (!corners.some((id) => contains(graph.positions[id]))) continue;
    triangles.push(first);
    corners.forEach((id) => ids.add(id));
  }
  const points = [...ids].map((id) => graph.positions[id]);
  const origin = points.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(points.length);
  const axis = upright ? up.clone() : principalAxis(points, origin, up);
  const frontAxis = front.clone().projectOnPlane(axis).normalize();
  const along = points.map((p) => p.clone().sub(origin).dot(axis));
  return {
    triangles,
    origin,
    axis,
    front: frontAxis,
    right: new Vector3().crossVectors(axis, frontAxis),
    min: Math.min(...along),
    max: Math.max(...along),
  };
}

export function getLimbFrame(graph: SurfaceGraph, limb: Limb): LimbFrame {
  let frames = cache.get(graph);
  if (!frames) cache.set(graph, (frames = new Map()));
  if (!frames.has(limb)) frames.set(limb, buildFrame(graph, limb));
  return frames.get(limb)!;
}

/** Axis coordinate and angle (radians, 0 in front, growing to the right) of a point. */
function cylinderCoordinates(frame: LimbFrame, p: Vector3): [number, number] {
  const d = p.clone().sub(frame.origin);
  return [d.dot(frame.axis), Math.atan2(d.dot(frame.right), d.dot(frame.front))];
}

/** Perimeter (meters) of the limb cross-section at the image center: the length of the plane cut through its triangles. */
export function limbCircumference(graph: SurfaceGraph, limb: Limb, offsetY = 0): number {
  const frame = getLimbFrame(graph, limb);
  const center = (frame.min + frame.max) / 2 + offsetY;
  let perimeter = 0;
  for (const first of frame.triangles) {
    const points = Array.from(graph.cornerToVertex.subarray(first, first + 3)).map((id) => graph.positions[id]);
    const heights = points.map((p) => p.clone().sub(frame.origin).dot(frame.axis) - center);
    const cut: Vector3[] = [];
    heights.forEach((h, k) => {
      const hn = heights[(k + 1) % 3];
      if (h < 0 !== hn < 0) cut.push(points[k].clone().lerp(points[(k + 1) % 3], h / (h - hn)));
    });
    if (cut.length === 2) perimeter += cut[0].distanceTo(cut[1]);
  }
  return perimeter;
}

/**
 * Wraps the image once around a limb: x goes around (the limb front in the
 * middle, the seam behind), y runs along the limb axis over `transform.size`
 * meters. `transform.rotation` turns the image around the limb.
 */
export function buildLimbWrap(graph: SurfaceGraph, limb: Limb, transform: StencilTransform): BufferGeometry {
  const frame = getLimbFrame(graph, limb);
  const center = (frame.min + frame.max) / 2 + transform.offsetY;
  const turn = (transform.rotation * Math.PI) / 180;
  const inLimb = new Set(frame.triangles);

  return buildDecalGeometry(graph, (first) => {
    if (!inLimb.has(first)) return [];
    const uvs = Array.from(graph.cornerToVertex.subarray(first, first + 3)).map((id) => {
      const [along, angle] = cylinderCoordinates(frame, graph.positions[id]);
      const x = (((angle - turn) / (2 * Math.PI) + 0.5) % 1 + 1) % 1;
      return new Vector2(x, (along - center) / transform.size + 0.5);
    });
    // A triangle across the seam spans both image ends: draw it once on each side.
    if (Math.max(...uvs.map((uv) => uv.x)) - Math.min(...uvs.map((uv) => uv.x)) < 0.5) return [uvs];
    const joined = uvs.map((uv) => new Vector2(uv.x < 0.5 ? uv.x + 1 : uv.x, uv.y));
    return [joined, joined.map((uv) => new Vector2(uv.x - 1, uv.y))];
  });
}
