export type Vec3 = [number, number, number];

/** Where a stencil hits the avatar surface, in world space. */
export interface Placement {
  position: Vec3;
  normal: Vec3;
  faceIndex: number;
}

/** A 2D image the user uploaded, to be projected onto the avatar. */
export interface Stencil {
  id: string;
  name: string;
  url: string;
  /** Planar projection instead of the default surface-following sticker. */
  projection: boolean;
  placement?: Placement;
}
