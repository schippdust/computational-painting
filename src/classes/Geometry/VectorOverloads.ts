import p5 from 'p5';

/**
 * Standalone geometric transformation functions for p5.Vector.
 * Provides scatter (random perturbation) and 3D axis rotation functionality.
 *
 * These were previously prototype extensions on p5.Vector, but p5 v2's type system
 * (export default) does not support TypeScript module augmentation for nested namespace
 * members. Standalone functions provide the same functionality with full type safety.
 */

/**
 * Scatters a vector by rotating a copy by a random angle up to ratio * pi.
 * The rotation axis is randomly selected perpendicular to the vector,
 * unless the vector is nearly parallel to the random axis, in which case
 * a default axis (1, 0, 0) is used.
 *
 * Useful for adding directional jitter and creating variation in
 * computational art and generative geometry without changing magnitude.
 *
 * @param vec The vector to scatter (not mutated — operates on a copy)
 * @param ratio Scatter intensity from 0 to 1, where 1 = +-pi radians (maximum perturbation)
 * @returns A new scattered vector
 */
export function scatter(vec: p5.Vector, ratio: number): p5.Vector {
  if (ratio <= 0) return vec.copy();
  if (ratio > 1) ratio = 1;
  const maxAngle = ratio * Math.PI;
  // Pick a random angle between 0 and maxAngle
  const angle = Math.random() * maxAngle;
  // Pick a random axis perpendicular to this vector
  let axis = p5.Vector.random3D();
  // If this vector is zero magnitude, return a random direction
  if (vec.mag() === 0) return p5.Vector.random3D().mult(0);
  axis = axis.cross(vec).normalize();
  // If axis is parallel to this vector, use a default perpendicular axis
  if (axis.mag() === 0) {
    axis = new p5.Vector(1, 0, 0);
  }
  // Rotate by angle around the perpendicular axis
  return rotate3D(vec.copy(), angle, axis);
}

/**
 * Rotates a vector around an arbitrary 3D axis or around the Z-axis if no axis provided.
 *
 * 2D Mode (no axis): Rotates in the XY plane by rotating around the Z-axis.
 *
 * 3D Mode (with axis): Uses Rodrigues' rotation formula for arbitrary axis rotation.
 * Rodrigues' formula: v_rot = v*cos(theta) + (k x v)*sin(theta) + k*(k . v)*(1-cos(theta))
 * where k is the normalized rotation axis and theta is the rotation angle.
 *
 * This function mutates the input vector and returns it for method chaining.
 * @param vec The vector to rotate (mutated in place)
 * @param angle Rotation angle in radians
 * @param axis Optional 3D axis to rotate around; if omitted, rotates around Z-axis (2D rotation)
 * @returns The same vector after rotation (mutated)
 */
export function rotate3D(
  vec: p5.Vector,
  angle: number,
  axis?: p5.Vector,
): p5.Vector {
  if (!axis) {
    // 2D rotation fallback: rotate in XY plane around Z-axis
    const x = vec.x;
    const y = vec.y;
    vec.x = x * Math.cos(angle) - y * Math.sin(angle);
    vec.y = x * Math.sin(angle) + y * Math.cos(angle);
    return vec;
  }

  // 3D rotation around arbitrary axis using Rodrigues' rotation formula
  const u = axis.copy().normalize(); // Normalize axis to unit vector
  const cosTheta = Math.cos(angle);
  const sinTheta = Math.sin(angle);

  // Rodrigues' formula components
  const dot = vec.dot(u); // Component of v parallel to k
  const cross = p5.Vector.cross(u, vec) as unknown as p5.Vector; // k x v

  // v_rot = v*cos(theta) + (k x v)*sin(theta) + k*(k . v)*(1-cos(theta))
  const rotated = p5.Vector.add(
    vec.copy().mult(cosTheta),
    p5.Vector.add(cross.mult(sinTheta), u.mult(dot * (1 - cosTheta))),
  );

  vec.set(rotated.x, rotated.y, rotated.z);
  return vec;
}
