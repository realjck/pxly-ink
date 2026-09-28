"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { Mesh, SRGBColorSpace } from "three";
import { buildStencilGeometry } from "@/lib/stencil";
import { getSurfaceGraph } from "@/lib/surfaceGraph";
import type { Stencil } from "@/types";

interface Props {
  mesh: Mesh;
  stencil: Stencil;
  renderOrder: number;
}

/** Applies a stencil image onto the avatar mesh, as a sticker or a projection. */
export default function StencilDecal({ mesh, stencil, renderOrder }: Props) {
  const texture = useTexture(stencil.url, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
  });
  const geometry = useMemo(
    () => buildStencilGeometry(getSurfaceGraph(mesh.geometry), stencil),
    [mesh, stencil],
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
