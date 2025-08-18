import p5 from 'p5';

// Scatter (randomly perturb) the direction of a vector within a cone defined by ratio (0=no change, 1=any direction)
declare module 'p5' {
  interface Vector {
    scatter(ratio: number): p5.Vector;
  }
}

p5.Vector.prototype.scatter = function (ratio: number): p5.Vector {
  if (ratio <= 0) return this.copy();
  if (ratio > 1) ratio = 1;
  const maxAngle = ratio * Math.PI;
  // Pick a random angle between 0 and maxAngle
  const angle = Math.random() * maxAngle;
  // Pick a random axis perpendicular to this vector
  let axis = p5.Vector.random3D();
  // If this vector is zero, just return a random direction
  if (this.mag() === 0) return p5.Vector.random3D().mult(0);
  axis = axis.cross(this).normalize();
  if (axis.mag() === 0) {
    // If axis is parallel, pick a default
    axis = new p5.Vector(1, 0, 0);
  }
  // Rotate by angle around axis
  return this.copy().rotate(angle, axis);
};

declare module 'p5' {
  interface Vector {
    rotate(angle: number, axis: p5.Vector): p5.Vector;
  }
}

p5.Vector.prototype.rotate = function (
  angle: number,
  axis?: p5.Vector,
): p5.Vector {
  if (!axis) {
    // 2D rotation fallback (around Z-axis)
    const x = this.x;
    const y = this.y;
    this.x = x * Math.cos(angle) - y * Math.sin(angle);
    this.y = x * Math.sin(angle) + y * Math.cos(angle);
    return this;
  }

  // 3D rotation around arbitrary axis using Rodrigues' rotation formula
  const u = axis.copy().normalize(); // unit axis
  const cosTheta = Math.cos(angle);
  const sinTheta = Math.sin(angle);

  const dot = this.dot(u);
  const cross = p5.Vector.cross(u, this) as unknown as p5.Vector;

  const rotated = p5.Vector.add(
    this.copy().mult(cosTheta),
    p5.Vector.add(cross.mult(sinTheta), u.mult(dot * (1 - cosTheta))),
  );

  this.set(rotated.x, rotated.y, rotated.z);
  return this;
};
