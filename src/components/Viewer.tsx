"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useRef } from "react";
import type { Mesh, PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { isPlaced } from "@/lib/stencil";
import type { Placement, Stencil, Vec3 } from "@/types";
import Avatar from "./Avatar";
import StencilDecal from "./StencilDecal";
import NavHud from "./ui/NavHud";

/** Pointer travel (px) above which a click is treated as an orbit drag. */
const DRAG_THRESHOLD = 3;
const CAMERA_POSITION: Vec3 = [0, 1.2, 3.2];
const CAMERA_TARGET: Vec3 = [0, 1.1, 0];

interface Props {
  avatar: Mesh | null;
  onAvatarLoad: (mesh: Mesh | null) => void;
  stencils: Stencil[];
  activeId: string | null;
  onPlace: (id: string, placement: Placement) => void;
  /** Width (px) of the panel floating over the left of the scene. */
  leftInset: number;
}

/** Moves the projection center right by `shift` px, keeping the scene centered beside the panel. */
function ViewShift({ shift }: { shift: number }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const { width, height } = useThree((state) => state.size);
  useLayoutEffect(() => {
    camera.setViewOffset(width, height, -shift, 0, width, height);
    return () => camera.clearViewOffset();
  }, [camera, width, height, shift]);
  return null;
}

/** Full-screen 3D scene: avatar, projected stencils and orbit controls, centered beside the panel. */
export default function Viewer({ avatar, onAvatarLoad, stencils, activeId, onPlace, leftInset }: Props) {
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
          <Avatar ref={onAvatarLoad} onSurfaceClick={handleSurfaceClick} />
        </Suspense>
        {avatar &&
          stencils.map(
            (stencil, index) =>
              isPlaced(stencil) && (
                <Suspense key={stencil.id} fallback={null}>
                  <StencilDecal
                    mesh={avatar}
                    stencil={stencil}
                    renderOrder={index + 1}
                  />
                </Suspense>
              ),
          )}
        <OrbitControls ref={controls} target={CAMERA_TARGET} makeDefault />
        <ViewShift shift={leftInset / 2} />
      </Canvas>
      {/* Overlays centered on the visible area, beside the panel. */}
      <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: leftInset }}>
        {!avatar && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-zinc-300">
            <div className="size-10 animate-spin rounded-full border-4 border-zinc-600 border-t-zinc-100" />
            Loading avatar...
          </div>
        )}
        <NavHud controls={controls} onReset={resetCamera} />
      </div>
    </div>
  );
}
