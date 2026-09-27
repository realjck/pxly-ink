"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import Avatar from "./Avatar";

/** Full-screen 3D scene showing the avatar with orbit controls. */
export default function Viewer() {
  return (
    <Canvas camera={{ position: [0, 1.2, 3.2], fov: 40 }}>
      <color attach="background" args={["#1e1e22"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1.5} />
      <directionalLight position={[-2, 2, -2]} intensity={0.5} />
      <Suspense fallback={null}>
        <Avatar />
      </Suspense>
      <OrbitControls target={[0, 1.1, 0]} makeDefault />
    </Canvas>
  );
}
