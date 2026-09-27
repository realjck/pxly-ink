"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useState } from "react";
import type { Mesh } from "three";
import type { Placement, Stencil } from "@/types";
import Avatar from "./Avatar";
import StencilDecal from "./StencilDecal";

/** Pointer travel (px) above which a click is treated as an orbit drag. */
const DRAG_THRESHOLD = 3;

interface Props {
  stencils: Stencil[];
  activeId: string | null;
  onPlace: (id: string, placement: Placement) => void;
}

/** Full-screen 3D scene: avatar, projected stencils and orbit controls. */
export default function Viewer({ stencils, activeId, onPlace }: Props) {
  const [avatar, setAvatar] = useState<Mesh | null>(null);

  function handleSurfaceClick(event: ThreeEvent<MouseEvent>) {
    if (!activeId || !event.face || event.delta > DRAG_THRESHOLD) return;
    const normal = event.face.normal.clone().transformDirection(event.object.matrixWorld);
    onPlace(activeId, { position: event.point.toArray(), normal: normal.toArray() });
  }

  return (
    <Canvas camera={{ position: [0, 1.2, 3.2], fov: 40 }}>
      <color attach="background" args={["#1e1e22"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1.5} />
      <directionalLight position={[-2, 2, -2]} intensity={0.5} />
      <Suspense fallback={null}>
        <Avatar ref={setAvatar} onSurfaceClick={handleSurfaceClick} />
      </Suspense>
      {avatar &&
        stencils.map(
          (stencil, index) =>
            stencil.placement && (
              <Suspense key={stencil.id} fallback={null}>
                <StencilDecal
                  mesh={avatar}
                  url={stencil.url}
                  placement={stencil.placement}
                  renderOrder={index + 1}
                />
              </Suspense>
            ),
        )}
      <OrbitControls target={[0, 1.1, 0]} makeDefault />
    </Canvas>
  );
}
