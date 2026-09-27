import { BufferGeometry, Group, Mesh } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Merges all OBJ parts into a single geometry (one group per part) so decals
 * can span several parts. SL avatars face +X, so it is turned to face +Z.
 */
export function mergeAvatar(obj: Group): BufferGeometry {
  const parts: BufferGeometry[] = [];
  obj.traverse((child) => {
    if (child instanceof Mesh) parts.push(child.geometry);
  });
  const merged = mergeGeometries(parts, true);
  if (!merged) throw new Error("Avatar parts have incompatible attributes");
  merged.rotateY(-Math.PI / 2);
  return merged;
}
