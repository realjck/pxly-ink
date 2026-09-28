import {
  BufferGeometry,
  Camera,
  DoubleSide,
  FloatType,
  GLSL3,
  Mesh,
  RawShaderMaterial,
  Scene,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { dilate } from "./dilate";

export const BAKE_SIZE = 1024;
/** Pixels grown past UV island borders to hide seams. */
const SEAM_PADDING = 16;

export interface BakeLayer {
  geometry: BufferGeometry;
  image: HTMLImageElement;
}

/** Places each vertex at its avatar texture coordinate (clip space). */
const vertexShader = /* glsl */ `
in vec2 uv;
in vec2 baseUv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(baseUv * 2.0 - 1.0, 0.0, 1.0);
}`;

/** Raw texture sample: no color space conversion, so PNG colors are kept as-is. */
const decalFragmentShader = /* glsl */ `
precision highp float;
uniform sampler2D map;
in vec2 vUv;
out vec4 color;
void main() {
  color = texture(map, vUv);
}`;

const maskFragmentShader = /* glsl */ `
precision highp float;
out vec4 color;
void main() {
  color = vec4(1.0);
}`;

/** Geometry drawing one range of the source triangles, sharing its attributes. */
function subset(uv: BufferGeometry["attributes"][string], baseUv: typeof uv, start: number, count: number) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("uv", uv);
  geometry.setAttribute("baseUv", baseUv);
  geometry.setDrawRange(start, count);
  return geometry;
}

function uvSpaceMesh(geometry: BufferGeometry, material: RawShaderMaterial, order = 0): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = order;
  mesh.frustumCulled = false;
  return mesh;
}

/** Avatar triangles of one SL texture, drawn opaque: the UV islands. */
function islandMeshes(avatar: BufferGeometry, mapIndex: number): Mesh[] {
  const material = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader,
    fragmentShader: maskFragmentShader,
    side: DoubleSide,
  });
  const uv = avatar.attributes.uv;
  return avatar.groups
    .filter((group) => group.materialIndex === mapIndex)
    .map((group) => uvSpaceMesh(subset(uv, uv, group.start, group.count), material));
}

/** Stencil decals of one SL texture, alpha-blended bottom to top. */
function decalMeshes(layers: BakeLayer[], mapIndex: number): Mesh[] {
  return layers.map(({ geometry, image }, order) => {
    const texture = new Texture(image);
    texture.needsUpdate = true;
    const material = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader,
      fragmentShader: decalFragmentShader,
      uniforms: { map: { value: texture } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });
    const group = geometry.groups.find((g) => g.materialIndex === mapIndex)!;
    const range = subset(geometry.attributes.uv, geometry.attributes.baseUv, group.start, group.count);
    return uvSpaceMesh(range, material, order);
  });
}

/** Renders meshes into the target and reads back bottom-up RGBA floats. */
function renderPixels(renderer: WebGLRenderer, target: WebGLRenderTarget, meshes: Mesh[]): Float32Array {
  const scene = new Scene();
  scene.add(...meshes);
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, new Camera());
  const pixels = new Float32Array(BAKE_SIZE * BAKE_SIZE * 4);
  renderer.readRenderTargetPixels(target, 0, 0, BAKE_SIZE, BAKE_SIZE, pixels);
  return pixels;
}

function dispose(meshes: Mesh[]) {
  for (const mesh of meshes) {
    const material = mesh.material as RawShaderMaterial;
    mesh.geometry.dispose();
    material.uniforms.map?.value.dispose();
    material.dispose();
  }
}

/**
 * Converts bottom-up premultiplied float pixels to a top-down straight-alpha
 * canvas, scaling alpha by the export opacity (0..1).
 */
function toCanvas(pixels: Float32Array, opacity: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = BAKE_SIZE;
  const context = canvas.getContext("2d")!;
  const image = context.createImageData(BAKE_SIZE, BAKE_SIZE);
  for (let y = 0; y < BAKE_SIZE; y++) {
    for (let x = 0; x < BAKE_SIZE; x++) {
      const src = ((BAKE_SIZE - 1 - y) * BAKE_SIZE + x) * 4;
      const dst = (y * BAKE_SIZE + x) * 4;
      const alpha = pixels[src + 3];
      if (alpha <= 0) continue;
      for (let k = 0; k < 3; k++) image.data[dst + k] = Math.round((pixels[src + k] / alpha) * 255);
      image.data[dst + 3] = Math.round(alpha * opacity * 255);
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

/**
 * Renders the layers (bottom to top) into the UV space of one SL texture, pads
 * them past the UV island borders, and returns a BAKE_SIZE canvas that is
 * transparent wherever no decal is present. Opacity (0..1) applies to the result.
 */
export function bakeMap(
  layers: BakeLayer[],
  avatar: BufferGeometry,
  mapIndex: number,
  opacity: number,
): HTMLCanvasElement {
  const renderer = new WebGLRenderer({ alpha: true });
  const target = new WebGLRenderTarget(BAKE_SIZE, BAKE_SIZE, { type: FloatType });

  const islands = islandMeshes(avatar, mapIndex);
  const maskPixels = renderPixels(renderer, target, islands);
  const decals = decalMeshes(layers, mapIndex);
  const pixels = renderPixels(renderer, target, decals);

  dispose([...islands, ...decals]);
  target.dispose();
  renderer.dispose();
  renderer.forceContextLoss();

  const mask = new Uint8Array(BAKE_SIZE * BAKE_SIZE);
  for (let i = 0; i < mask.length; i++) mask[i] = maskPixels[i * 4 + 3] > 0 ? 1 : 0;
  dilate(pixels, mask, BAKE_SIZE, SEAM_PADDING);
  return toCanvas(pixels, opacity);
}
