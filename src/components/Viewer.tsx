"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useRef, useState } from "react";
import type { Mesh } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Placement, Stencil, Vec3 } from "@/types";
import Avatar from "./Avatar";
import StencilDecal from "./StencilDecal";

/** Pointer travel (px) above which a click is treated as an orbit drag. */
const DRAG_THRESHOLD = 3;
const CAMERA_POSITION: Vec3 = [0, 1.2, 3.2];
const CAMERA_TARGET: Vec3 = [0, 1.1, 0];

interface Props {
  stencils: Stencil[];
  activeId: string | null;
  onPlace: (id: string, placement: Placement) => void;
}

/** Full-screen 3D scene: avatar, projected stencils and orbit controls. */
export default function Viewer({ stencils, activeId, onPlace }: Props) {
  const [avatar, setAvatar] = useState<Mesh | null>(null);
  const controls = useRef<OrbitControlsImpl>(null);

  function handleSurfaceClick(event: ThreeEvent<MouseEvent>) {
    if (!activeId || !event.face || event.faceIndex == null) return;
    if (event.delta > DRAG_THRESHOLD) return;
    const normal = event.face.normal.clone().transformDirection(event.object.matrixWorld);
    onPlace(activeId, {
      position: event.point.toArray(),
      normal: normal.toArray(),
      faceIndex: event.faceIndex,
    });
  }

  function resetCamera() {
    if (!controls.current) return;
    controls.current.object.position.set(...CAMERA_POSITION);
    controls.current.target.set(...CAMERA_TARGET);
    controls.current.update();
  }

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: CAMERA_POSITION, fov: 40 }}>
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
                    projection={stencil.projection}
                    renderOrder={index + 1}
                  />
                </Suspense>
              ),
          )}
        <OrbitControls ref={controls} target={CAMERA_TARGET} makeDefault />
      </Canvas>
      <button
        onClick={resetCamera}
        className="absolute right-4 bottom-4 rounded bg-zinc-800/80 px-3 py-1.5 text-sm text-zinc-100 hover:bg-zinc-700"
      >
        Reset camera
      </button>
    </div>
  );
}
