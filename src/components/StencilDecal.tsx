"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { Mesh, SRGBColorSpace } from "three";
import { buildStencilGeometry } from "@/lib/stencil";
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

/** Applies a stencil image onto the avatar mesh, as a sticker or a projection. */
export default function StencilDecal({ mesh, url, placement, transform, projection, renderOrder }: Props) {
  const texture = useTexture(url, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
  });
  const geometry = useMemo(
    () => buildStencilGeometry(getSurfaceGraph(mesh.geometry), placement, transform, projection),
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
