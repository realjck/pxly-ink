"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { Mesh, Object3D, SRGBColorSpace, Vector3 } from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import type { Placement } from "@/types";

const DEFAULT_SIZE = 0.15;

interface Props {
  mesh: Mesh;
  url: string;
  placement: Placement;
  renderOrder: number;
}

/** Builds a DecalGeometry oriented along the surface normal at the placement point. */
function buildDecal(mesh: Mesh, { position, normal }: Placement): DecalGeometry {
  const center = new Vector3(...position);
  const projector = new Object3D();
  projector.position.copy(center);
  projector.lookAt(center.clone().add(new Vector3(...normal)));
  const size = new Vector3(DEFAULT_SIZE, DEFAULT_SIZE, DEFAULT_SIZE);
  return new DecalGeometry(mesh, center, projector.rotation, size);
}

/** Projects a stencil image onto the avatar mesh. */
export default function StencilDecal({ mesh, url, placement, renderOrder }: Props) {
  const texture = useTexture(url, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
  });
  const geometry = useMemo(() => buildDecal(mesh, placement), [mesh, placement]);

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
