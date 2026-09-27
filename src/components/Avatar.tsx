"use client";

import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import { Mesh, MeshStandardMaterial } from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const AVATAR_URL = "/models/ruth2/Ruth2v4.obj";

/** Loads the Ruth2 base avatar and renders it with a neutral skin material. */
export default function Avatar() {
  const obj = useLoader(OBJLoader, AVATAR_URL);

  useMemo(() => {
    const skin = new MeshStandardMaterial({ color: "#d9b8a0", roughness: 0.8 });
    obj.traverse((child) => {
      if (child instanceof Mesh) child.material = skin;
    });
  }, [obj]);

  // SL avatars face +X; turn to face the camera (+Z).
  return <primitive object={obj} rotation={[0, -Math.PI / 2, 0]} />;
}
