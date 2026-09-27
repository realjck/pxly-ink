"use client";

import { useLoader, type ThreeEvent } from "@react-three/fiber";
import { useMemo, type Ref } from "react";
import type { Mesh } from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { mergeAvatar } from "@/lib/avatarGeometry";

const AVATAR_URL = "/models/ruth2/Ruth2v4.obj";

interface Props {
  ref?: Ref<Mesh>;
  onSurfaceClick: (event: ThreeEvent<MouseEvent>) => void;
}

/** Loads the Ruth2 base avatar as a single mesh with a neutral skin material. */
export default function Avatar({ ref, onSurfaceClick }: Props) {
  const obj = useLoader(OBJLoader, AVATAR_URL);
  const geometry = useMemo(() => mergeAvatar(obj), [obj]);

  return (
    <mesh ref={ref} geometry={geometry} onClick={onSurfaceClick}>
      <meshStandardMaterial color="#d9b8a0" roughness={0.8} />
    </mesh>
  );
}
