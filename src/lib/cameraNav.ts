import { MathUtils, Spherical, Vector3 } from "three";
import type { OrbitControls } from "three-stdlib";

const MIN_POLAR = 0.05;
const MAX_POLAR = Math.PI - 0.05;
const MIN_DISTANCE = 0.4;
const MAX_DISTANCE = 8;

/** Camera offset from the orbit target. */
function offsetOf(controls: OrbitControls) {
  return controls.object.position.clone().sub(controls.target);
}

function applyOffset(controls: OrbitControls, offset: Vector3) {
  controls.object.position.copy(controls.target).add(offset);
  controls.update();
}

/** Orbits around the target: `theta` turns around the vertical axis, `phi` tilts over it (radians). */
export function orbit(controls: OrbitControls, theta: number, phi: number) {
  const offset = offsetOf(controls);
  const spherical = new Spherical().setFromVector3(offset);
  spherical.theta += theta;
  spherical.phi = MathUtils.clamp(spherical.phi + phi, MIN_POLAR, MAX_POLAR);
  applyOffset(controls, offset.setFromSpherical(spherical));
}

/** Moves camera and target in the screen plane, by fractions of the viewing distance. */
export function pan(controls: OrbitControls, x: number, y: number) {
  const camera = controls.object;
  const distance = offsetOf(controls).length();
  const shift = new Vector3()
    .setFromMatrixColumn(camera.matrix, 0)
    .multiplyScalar(x * distance)
    .add(new Vector3().setFromMatrixColumn(camera.matrix, 1).multiplyScalar(y * distance));
  camera.position.add(shift);
  controls.target.add(shift);
  controls.update();
}

/** Scales the viewing distance; a factor below 1 moves closer. */
export function zoom(controls: OrbitControls, factor: number) {
  const offset = offsetOf(controls);
  const distance = MathUtils.clamp(offset.length() * factor, MIN_DISTANCE, MAX_DISTANCE);
  applyOffset(controls, offset.setLength(distance));
}
