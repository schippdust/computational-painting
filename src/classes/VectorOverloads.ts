import p5 from 'p5';

declare module 'p5' {
  interface Vector {
    rotate(theta: number, axis: p5.Vector): p5.Vector;
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
