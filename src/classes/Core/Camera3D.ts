import P5 from 'p5';
import { Line } from '../Geometry/Line';

/**
 * A 3D perspective camera that projects 3D world coordinates to 2D screen coordinates.
 * Implements perspective projection with configurable field of view, aspect ratio, and near clipping plane.
 * Uses a right-handed coordinate system with forward/right/up basis vectors.
 */
export class Camera3D {
  private fov: number;
  private aspect: number;

  /**
   * Creates a new Camera3D instance.
   * @param canvasWidth The width of the rendering canvas in pixels
   * @param canvasHeight The height of the rendering canvas in pixels
   * @param pos The camera position in world space (default: (1000, 1000, 500))
   * @param focus The point the camera looks toward in world space (default: (0, 0, 0))
   * @param up The up direction vector in world space (default: (0, 0, 1))
   * @param fovDegrees The vertical field of view in degrees (default: 60)
   * @param near The near clipping plane distance (default: 1)
   */
  constructor(
    private canvasWidth: number,
    private canvasHeight: number,
    public pos = new P5.Vector(1000, 1000, 500),
    private focus = new P5.Vector(0, 0, 0),
    private up = new P5.Vector(0, 0, 1),
    fovDegrees = 60,
    private near = 1,
  ) {
    this.aspect = canvasWidth / canvasHeight;
    this.fov = fovDegrees * (Math.PI / 180);
  }

  /**
   * Projects a 3D point in world space to 2D screen coordinates using perspective projection.
   * Points behind the camera (closer than the near clipping plane) return null.
   * Process: world → camera space basis transformation → perspective divide → NDC → screen space.
   * @param point A 3D point in world coordinates
   * @returns The 2D screen coordinates, or null if the point is behind the near clipping plane
   */
  project(point: P5.Vector): P5.Vector | null {
    // Step 1: Orthonormal basis
    point = point.copy();
    const forward = P5.Vector.sub(this.focus, this.pos).normalize(); // forward: into screen (Y)
    const right = forward.copy().cross(this.up.copy()) as P5.Vector; // right: X
    right.normalize();
    const camUp = right.copy().cross(forward.copy()) as P5.Vector; // camUp: Z
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

  /**
   * Projects multiple 3D points to 2D screen coordinates in one call.
   * Useful for batch rendering where individual project() calls would be verbose.
   * Points behind the near clipping plane are returned as null at their index.
   * @param points An array of 3D points in world coordinates
   * @returns An array of 2D screen coordinate vectors (or null for culled points), same order as input
   */
  projectMany(points: P5.Vector[]): (P5.Vector | null)[] {
    return points.map((p) => this.project(p));
  }

  /**
   * Projects one or more lines from world space to screen space.
   * Lines with endpoints behind the near clipping plane are culled.
   * Efficiently handles both single lines and arrays of lines.
   * @param line A single Line or array of Lines in world coordinates
   * @returns An array of projected Line objects in screen coordinates
   */
  renderLines(line: Line | Line[]): Line[] {
    const lineList = Array.isArray(line) ? line : [line];
    const linesOut: Line[] = [];
    for (const line of lineList) {
      const projectedStartPoint = this.project(line.startPoint);
      const projectedEndPoint = this.project(line.endPoint);
      if (projectedStartPoint == null || projectedEndPoint == null) {
        continue;
      }
      linesOut.push(new Line(projectedStartPoint, projectedEndPoint));
    }
    return linesOut;
  }

  /**
   * Sets the camera position in world space.
   * @param pos The new camera position
   */
  setPosition(pos: P5.Vector) {
    pos = pos.copy();
    this.pos = pos;
  }

  /**
   * Sets the point the camera looks toward.
   * Updates the camera's forward direction to point at the focus position.
   * @param focus The new focus point in world coordinates
   */
  lookAt(focus: P5.Vector) {
    focus = focus.copy();
    this.focus = focus;
  }

  /**
   * Sets the vertical field of view of the camera.
   * @param degrees The field of view angle in degrees
   */
  setFOV(degrees: number) {
    this.fov = degrees * (Math.PI / 180);
  }

  /**
   * Updates the canvas dimensions and recalculates the aspect ratio.
   * Call this when the canvas is resized to maintain correct perspective proportions.
   * @param width The new canvas width in pixels
   * @param height The new canvas height in pixels
   */
  updateCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.aspect = width / height;
  }
}
