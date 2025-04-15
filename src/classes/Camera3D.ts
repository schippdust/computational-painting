import P5, { Vector } from 'p5';
import { Line } from './Line';

export class Camera3D {
  private pos: P5.Vector;
  private focus: P5.Vector;
  private up: P5.Vector;
  private fov: number;
  private aspect: number;
  private canvasWidth: number;
  private canvasHeight: number;
  private near: number;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    pos = new P5.Vector(1000, 1000, 500),
    focus = new P5.Vector(0, 0, 0),
    up = new P5.Vector(0, 0, 1),
    fovDegrees = 60,
    near = 1,
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.aspect = canvasWidth / canvasHeight;
    this.pos = pos;
    this.focus = focus;
    this.up = up;
    this.fov = fovDegrees * (Math.PI / 180);
    this.near = near;
  }

  project(point: P5.Vector): P5.Vector | null {
    // Step 1: Orthonormal basis
    const forward = P5.Vector.sub(this.focus, this.pos).normalize(); // forward: into screen (Y)
    const right = P5.Vector.cross(forward, this.up.copy()) as unknown as Vector; // right: X
    right.normalize();
    const camUp = P5.Vector.cross(right, forward) as unknown as Vector; // camUp: Z
    camUp.normalize();

    // Step 2: Transform point into camera space
    const relative = P5.Vector.sub(point, this.pos);

    const camX = P5.Vector.dot(relative, right);
    const camY = P5.Vector.dot(relative, camUp);
    const camZ = P5.Vector.dot(relative, forward);

    if (camZ <= this.near) return null; // Behind camera

    // Step 3: Apply perspective projection
    const f = 1 / Math.tan(this.fov / 2);

    const ndcX = (camX * f) / (this.aspect * camZ);
    const ndcY = (camY * f) / camZ;

    // Step 4: Convert from NDC to screen space
    const screenX = ((ndcX + 1) * this.canvasWidth) / 2;
    const screenY = ((1 - ndcY) * this.canvasHeight) / 2;

    return new P5.Vector(screenX, screenY);
  }

  renderLines(line: Line | Line[]): Line[] {
    const lineList = Array.isArray(line) ? line : [line];
    const linesOut: Line[] = [];
    for (const line of lineList) {
      const projectedStartPoint = this.project(line.starPoint);
      const projectedEndPoint = this.project(line.endPoint);
      if (projectedStartPoint == null || projectedEndPoint == null) {
        continue;
      }
      linesOut.push(new Line(projectedStartPoint, projectedEndPoint));
    }
    return linesOut;
  }

  setPosition(pos: P5.Vector) {
    this.pos = pos;
  }

  lookAt(focus: P5.Vector) {
    this.focus = focus;
  }

  setFOV(degrees: number) {
    this.fov = degrees * (Math.PI / 180);
  }

  updateCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.aspect = width / height;
  }
}
