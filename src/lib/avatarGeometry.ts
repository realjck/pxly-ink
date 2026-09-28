import { BufferGeometry, Group, Material, Mesh } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** The three Second Life body textures. */
export const SL_MAPS = ["head", "upper", "lower"] as const;
export type SlMap = (typeof SL_MAPS)[number];

/** SL texture used by each Ruth2 OBJ material. */
const PART_MAP: Record<string, SlMap> = {
  mat_head: "head",
  mat_neck: "upper",
  mat_tank: "upper",
  mat_sleeves: "upper",
  mat_hands: "upper",
  mat_shorts: "lower",
  mat_stockings: "lower",
};

/**
 * Merges all OBJ parts into a single geometry so decals can span several parts.
 * Each group's materialIndex is the index of its SL texture in SL_MAPS.
 * SL avatars face +X, so it is turned to face +Z.
 */
export function mergeAvatar(obj: Group): BufferGeometry {
  // One usemtl per OBJ group, so each part has a single material.
  const parts: Mesh<BufferGeometry, Material>[] = [];
  obj.traverse((child) => {
    if (child instanceof Mesh) parts.push(child);
  });
  const merged = mergeGeometries(
    parts.map((part) => part.geometry),
    true,
  );
  if (!merged) throw new Error("Avatar parts have incompatible attributes");
  merged.groups.forEach((group, i) => {
    group.materialIndex = SL_MAPS.indexOf(PART_MAP[parts[i].material.name]);
  });
  merged.rotateY(-Math.PI / 2);
  return merged;
}
