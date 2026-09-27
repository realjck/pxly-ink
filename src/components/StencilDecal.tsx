"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { BufferGeometry, Mesh, SRGBColorSpace, Vector3 } from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { projectorFrame } from "@/lib/projectorFrame";
import { buildSticker } from "@/lib/stickerGeometry";
import { getSurfaceGraph } from "@/lib/surfaceGraph";
import type { Placement } from "@/types";

const DEFAULT_SIZE = 0.15;

interface Props {
  mesh: Mesh;
  url: string;
  placement: Placement;
  projection: boolean;
  renderOrder: number;
}

/** Planar projection along the surface normal (stretches on curved areas). */
function buildProjection(mesh: Mesh, placement: Placement, size: number): BufferGeometry {
  const frame = projectorFrame(placement);
  return new DecalGeometry(mesh, frame.position, frame.rotation, new Vector3(size, size, size));
}

/** Applies a stencil image onto the avatar mesh, as a sticker or a projection. */
export default function StencilDecal({ mesh, url, placement, projection, renderOrder }: Props) {
  const texture = useTexture(url, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
  });
  const geometry = useMemo(
    () =>
      projection
        ? buildProjection(mesh, placement, DEFAULT_SIZE)
        : buildSticker(getSurfaceGraph(mesh.geometry), placement, DEFAULT_SIZE),
    [mesh, placement, projection],
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
