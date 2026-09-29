export type Vec3 = [number, number, number];

/** Where a stencil hits the avatar surface, in world space. */
export interface Placement {
  position: Vec3;
  normal: Vec3;
  faceIndex: number;
}

/** User adjustments relative to the placement point (meters, degrees). */
export interface StencilTransform {
  size: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
}

/** Limbs an image can be wrapped around; "arms" covers both, as SL shares their texture. */
export type Limb = "arms" | "torso" | "rightLeg" | "leftLeg";

/** A 2D image the user uploaded, to be projected onto the avatar. */
export interface Stencil {
  id: string;
  name: string;
  url: string;
  /** Image width / height. */
  aspect: number;
  /** Planar projection instead of the default surface-following sticker. */
  projection: boolean;
  transform: StencilTransform;
  placement?: Placement;
  /** Wrapped once around this limb instead of placed at a point (transform.size is then the image height). */
  limb?: Limb;
}
