# PXLY INK (ink.pxly.fr)

A Web tool for making Tattoos for Second Life Avatars

## ROLE & CONTEXT
Act as an expert Senior Full-Stack Developer specializing in React, Next.js (App Router), TypeScript, Tailwind CSS, WebGL, Three.js, and React Three Fiber (R3F). 

You are building a web-based 3D Texture Projection and Baking tool tailored for virtual world creators. The app shows users a standard 3D Second Life human mesh (he can choosse between Male / Female (for now we start with only female)), then project multiple 2D transparent PNGs (like a tattoo) onto the 3D body (each png has its z-index), adjust their placements (with sliders : x, y, rotation, scale, ...), and finally "bake" and export the result as a flat 1024x1024 UV map PNG.

## CORE TECH STACK
- Framework: Next.js (App Router) + React
- Language: TypeScript
- Styling: Tailwind CSS
- 3D Engine: Three.js + React Three Fiber (@react-three/fiber, @react-three/drei)
- Projection Logic: THREE.DecalGeometry

## IMPLEMENTATION PHASES (Execute sequentially, confirming after each step)

### Phase 1: 3D Viewer & Environment Setup
1. Initialize a basic Next.js page with a full-screen R3F `<Canvas>`.
2. Add basic lighting (`ambientLight`, `directionalLight`) and `<OrbitControls>`.
3. Create a component to load and display a generic base avatar mesh (e.g., `.obj` or `.gltf`). Use a placeholder geometry (like a `Cylinder` or a downloaded basic torso mesh) if a custom asset is not yet provided in the public folder.

### Phase 2: Stencil Projection System (DecalGeometry)
1. Implement a 2D image uploader with drag and drop for the user to select a transparent PNG (the tattoo/stencil).
2. Use `useThree` and raycasting to detect mouse clicks on the 3D mesh.
3. Upon clicking, instantiate a `DecalGeometry` at the intersection point. Apply the uploaded 2D image as the texture for this decal.
4. Build a basic React UI overlay with sliders to control the Decal's:
   - Scale
   - Rotation (Z-axis)
   - Position offset

## Phase 3: Texture Baking & UV Export (The Core Engine)
1. Write a custom WebGL/Three.js render function to perform texture baking.
2. The logic must capture only the pixels from the applied `DecalGeometry` and map them back to the original 2D UV coordinates of the base mesh.
3. Render this unwrapped texture into an off-screen HTML5 `<canvas>` (1024x1024 resolution).
4. Provide an "Export to PNG" button that triggers `canvas.toDataURL('image/png')` and initiates a file download of the transparent baked UV map.

# CONSTRAINTS & BEST PRACTICES
- Strictly type all components and Three.js references with TypeScript.
- Ensure the exported PNG is strictly 1024x1024 and maintains transparency (alpha channel) everywhere the decal is not present.
- Keep the UI modular and separate from the 3D canvas logic.
