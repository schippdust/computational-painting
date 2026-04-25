import P5 from 'p5';
import { PerspectiveCamera, Vector3 } from 'three';
import { Camera3D } from '@/classes/Core/Camera3D';

/**
 * Conversion and construction helpers for bridging this project's p5-based
 * math (P5.Vector, Camera3D) with the three.js primitives used by the mesh
 * subsystem. All three.js usage is confined to src/classes/Mesh/; these helpers
 * are the one place that crosses the boundary.
 *
 * World-up convention: the rest of the app uses +Z up, so every three.js camera
 * we build must call up.set(0, 0, 1) *before* lookAt(), otherwise the resulting
 * basis differs from Camera3D's.
 */

/**
 * Converts a P5.Vector (or {x, y, z} object) to a new THREE.Vector3.
 * @param v The source vector; only x/y/z are read.
 * @returns A new Vector3 with the same components.
 */
export function toVector3(v: P5.Vector | { x: number; y: number; z: number }): Vector3 {
  return new Vector3(v.x, v.y, v.z ?? 0);
}

/**
 * Converts a THREE.Vector3 to a new P5.Vector.
 * @param v The source Vector3.
 * @returns A new P5.Vector with the same components.
 */
export function toP5Vector(v: Vector3): P5.Vector {
  return new P5.Vector(v.x, v.y, v.z);
}

/**
 * Builds a THREE.PerspectiveCamera whose view basis, FOV, aspect, and near
 * plane match the given Camera3D. Forces up = (0, 0, 1) before lookAt() so the
 * basis aligns with Camera3D's +Z-up convention. matrixWorld and
 * projectionMatrix are updated so the returned camera is immediately usable
 * for Raycaster.setFromCamera() and manual projection.
 *
 * Three.js PerspectiveCamera requires a finite far plane; since Camera3D has
 * none, we pass a very large default and let callers override if needed.
 *
 * @param camera The source Camera3D.
 * @param far Optional far clip distance for the PerspectiveCamera (default: 1e7).
 * @returns A fresh PerspectiveCamera matching camera's configuration.
 */
export function buildPerspectiveCamera(
  camera: Camera3D,
  far: number = 1e7,
): PerspectiveCamera {
  const aspect =
    camera.getCanvasWidth() / Math.max(camera.getCanvasHeight(), 1);
  const three = new PerspectiveCamera(
    camera.getFovDegrees(),
    aspect,
    camera.getNear(),
    far,
  );
  // Must set up BEFORE lookAt — lookAt uses the current up to derive the basis.
  const up = camera.getUp();
  three.up.set(up.x, up.y, up.z);
  three.position.set(camera.pos.x, camera.pos.y, camera.pos.z);
  const focus = camera.getFocus();
  three.lookAt(focus.x, focus.y, focus.z);
  three.updateMatrixWorld(true);
  three.updateProjectionMatrix();
  return three;
}
