import p5 from 'p5';

/**
 * Extends the p5.Vector prototype with custom geometric transformation methods.
 * These overloads add scatter (random perturbation) and rotate (3D/2D rotation) functionality
 * to the standard p5.js vector class, enabling more expressive geometric manipulations.
 */
declare module 'p5' {
  interface Vector {
    /**
     * Scatters the vector by rotating it by a random angle up to ratio * π.
     * Useful for adding directional jitter and creating variation in geometric designs.
     * This method mutates the vector and returns it for method chaining.
     * @param ratio Scatter intensity from 0 to 1, where 1 represents maximum perturbation (±π radians)
     * @returns This vector instance after scatter transformation (mutated)
     */
    scatter(ratio: number): p5.Vector;
    /**
     * Rotates the vector around an arbitrary 3D axis or around the Z-axis if no axis provided.
     * Supports both 2D rotation (around Z-axis) and 3D rotation using Rodrigues' rotation formula.
     * This method mutates the vector and returns it for method chaining.
     * @param angle Rotation angle in radians
     * @param axis Optional 3D axis to rotate around; if omitted, rotates around Z-axis (2D rotation)
     * @returns This vector instance after rotation (mutated)
     */
    rotate(angle: number, axis: p5.Vector): p5.Vector;
  }
}

/**
 * Scatters the vector by rotating it by a random angle up to ratio * π.
 * The rotation axis is randomly selected perpendicular to the vector,
 * unless the vector is nearly parallel to the random axis, in which case
 * a default axis (1, 0, 0) is used.
 *
 * Useful for adding directional jitter and creating variation in
 * computational art and generative geometry without changing magnitude.
 *
 * This method mutates the instance and returns it for method chaining.
 * @param ratio Scatter intensity from 0 to 1, where 1 = ±π radians (maximum perturbation)
 * @returns This vector instance after scatter transformation (mutated)
 */
p5.Vector.prototype.scatter = function (ratio: number): p5.Vector {
  if (ratio <= 0) return this.copy();
  if (ratio > 1) ratio = 1;
  const maxAngle = ratio * Math.PI;
  // Pick a random angle between 0 and maxAngle
  const angle = Math.random() * maxAngle;
  // Pick a random axis perpendicular to this vector
  let axis = p5.Vector.random3D();
  // If this vector is zero magnitude, return a random direction
  if (this.mag() === 0) return p5.Vector.random3D().mult(0);
  axis = axis.cross(this).normalize();
  // If axis is parallel to this vector, use a default perpendicular axis
  if (axis.mag() === 0) {
    axis = new p5.Vector(1, 0, 0);
  }
  // Rotate by angle around the perpendicular axis
  return this.copy().rotate(angle, axis);
};

/**
 * Rotates the vector around an arbitrary 3D axis or around the Z-axis if no axis provided.
 *
 * 2D Mode (no axis): Rotates in the XY plane by rotating around the Z-axis.
 *
 * 3D Mode (with axis): Uses Rodrigues' rotation formula for arbitrary axis rotation.
 * Rodrigues' formula: v_rot = v*cos(θ) + (k×v)*sin(θ) + k*(k·v)*(1-cos(θ))
 * where k is the normalized rotation axis and θ is the rotation angle.
 *
 * This method mutates the instance and returns it for method chaining.
 * @param angle Rotation angle in radians
 * @param axis Optional 3D axis to rotate around; if omitted, rotates around Z-axis (2D rotation)
 * @returns This vector instance after rotation (mutated)
 */
p5.Vector.prototype.rotate = function (
  angle: number,
  axis?: p5.Vector,
): p5.Vector {
  if (!axis) {
    // 2D rotation fallback: rotate in XY plane around Z-axis
    const x = this.x;
    const y = this.y;
    this.x = x * Math.cos(angle) - y * Math.sin(angle);
    this.y = x * Math.sin(angle) + y * Math.cos(angle);
    return this;
  }

  // 3D rotation around arbitrary axis using Rodrigues' rotation formula
  const u = axis.copy().normalize(); // Normalize axis to unit vector
  const cosTheta = Math.cos(angle);
  const sinTheta = Math.sin(angle);

  // Rodrigues' formula components
  const dot = this.dot(u); // Component of v parallel to k
  const cross = p5.Vector.cross(u, this) as unknown as p5.Vector; // k × v

  // v_rot = v*cos(θ) + (k×v)*sin(θ) + k*(k·v)*(1-cos(θ))
  const rotated = p5.Vector.add(
    this.copy().mult(cosTheta),
    p5.Vector.add(cross.mult(sinTheta), u.mult(dot * (1 - cosTheta))),
  );

  this.set(rotated.x, rotated.y, rotated.z);
  return this;
};
