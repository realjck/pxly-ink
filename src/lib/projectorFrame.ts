import { Object3D, Vector3 } from "three";
import type { Placement } from "@/types";

/**
 * Object whose +Z axis follows the surface normal at the placement point and
 * whose +Y stays as close to world up as possible (image "up").
 */
export function projectorFrame({ position, normal }: Placement): Object3D {
  const center = new Vector3(...position);
  const frame = new Object3D();
  frame.position.copy(center);
  frame.lookAt(center.clone().add(new Vector3(...normal)));
  frame.updateMatrixWorld();
  return frame;
}
