"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { BufferGeometry, Mesh, SRGBColorSpace, Vector3 } from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { transformedFrame } from "@/lib/projectorFrame";
import { buildSticker } from "@/lib/stickerGeometry";
import { getSurfaceGraph } from "@/lib/surfaceGraph";
import type { Placement, StencilTransform } from "@/types";

interface Props {
  mesh: Mesh;
  url: string;
  placement: Placement;
  transform: StencilTransform;
  projection: boolean;
  renderOrder: number;
}

/** Planar projection along the surface normal (stretches on curved areas). */
function buildProjection(mesh: Mesh, placement: Placement, transform: StencilTransform): BufferGeometry {
  const frame = transformedFrame(placement, transform);
  const size = new Vector3(transform.size, transform.size, transform.size);
  return new DecalGeometry(mesh, frame.position, frame.rotation, size);
}

/** Applies a stencil image onto the avatar mesh, as a sticker or a projection. */
export default function StencilDecal({ mesh, url, placement, transform, projection, renderOrder }: Props) {
  const texture = useTexture(url, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
  });
  const geometry = useMemo(
    () =>
      projection
        ? buildProjection(mesh, placement, transform)
        : buildSticker(getSurfaceGraph(mesh.geometry), placement, transform),
    [mesh, placement, transform, projection],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} renderOrder={renderOrder}>
      <meshStandardMaterial
        map={texture}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-4}
      />
    </mesh>
  );
}
