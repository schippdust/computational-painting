import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { Vehicle } from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { Sphere } from '@/classes/Geometry/Sphere';

/**
 * Renders vehicles as tapering trails of perspective-correct ellipses projected onto a sphere's surface.
 * Each mark's circular footprint is oriented along the sphere's surface tangent plane at that point,
 * then projected to screen space — marks near the sphere's silhouette appear foreshortened, just as a
 * circle painted on a sphere would. The trail tapers in both size and alpha from head to tail,
 * identical in structure to TaperingCircleRenderer.
 */
export class TaperingSphereRenderer {
  /**
   * Creates a new TaperingSphereRenderer.
   * @param sketch The p5.js sketch instance for drawing operations
   * @param dotSize The diameter of the mark at the vehicle's current position in screen pixels (default: 5)
   * @param referenceDistance A world-space distance used to normalise mark size relative to camera (default: 1000)
   * @param color RGB color array [R, G, B] for the marks (values 0–255)
   * @param camera The 3D camera used to project positions to 2D screen coordinates
   * @param sphere The sphere whose surface defines the tangent-plane projection geometry
   * @param trailLength How many historical positions to include in the tapering trail (default: 10)
   */
  constructor(
    private sketch: P5,
    public dotSize: number = 5,
    public referenceDistance: number = 1000,
    public color: number[],
    public camera: Camera3D,
    public sphere: Sphere,
    public trailLength: number = 10,
  ) {}

  /**
   * Projects a single circular mark at a 3D world position as a perspective-foreshortened ellipse.
   * Computes the sphere surface normal at the given point, builds two orthogonal tangent axes in
   * the surface plane, projects both to screen space, and uses their screen-space lengths and
   * angle to draw an ellipse that respects the surface curvature as seen from the camera.
   * @param position World-space position of the mark centre
   * @param size World-space diameter of the circular mark before projection
   * @param alpha Alpha channel for the fill (0–255)
   */
  private renderEllipseAtPoint(
    position: P5.Vector,
    size: number,
    alpha: number,
  ): void {
    const screenPos = this.camera.project(position);
    if (screenPos === null) return;

    // Surface normal at this position (direction from sphere centre to point).
    const normal = P5.Vector.sub(position, this.sphere.centerPoint).normalize();

    // Build an orthonormal tangent basis in the sphere surface plane.
    // Choose a reference vector that avoids degeneracy with the surface normal.
    let ref = new P5.Vector(1, 0, 0);
    if (Math.abs(normal.dot(ref)) > 0.9) ref = new P5.Vector(0, 1, 0);
    const t1 = normal.copy().cross(ref).normalize();
    const t2 = normal.copy().cross(t1).normalize();

    const r = size / 2;
    const screenT1 = this.camera.project(
      P5.Vector.add(position, t1.copy().mult(r)),
    );
    const screenT2 = this.camera.project(
      P5.Vector.add(position, t2.copy().mult(r)),
    );
    if (screenT1 === null || screenT2 === null) return;

    // Screen-space ellipse axes and rotation angle from the first tangent direction.
    const axis1 = P5.Vector.dist(screenPos, screenT1) * 2;
    const axis2 = P5.Vector.dist(screenPos, screenT2) * 2;
    const angle = Math.atan2(
      screenT1.y - screenPos.y,
      screenT1.x - screenPos.x,
    );

    this.sketch.push();
    this.sketch.fill(this.color[0], this.color[1], this.color[2], alpha);
    this.sketch.noStroke();
    this.sketch.translate(screenPos.x, screenPos.y);
    this.sketch.rotate(angle);
    this.sketch.ellipse(0, 0, axis1, axis2);
    this.sketch.pop();
  }

  /**
   * Renders one or more vehicles as tapering sphere-projected ellipse trails on the canvas.
   * Draws the tail (oldest → newest history) first so the head renders on top.
   * Base mark size is calculated from the current position's distance to the camera and
   * applies uniformly across the entire trail for visual consistency.
   * Skips vehicles and individual marks that project outside the camera view.
   * This method mutates the p5 canvas state (push/pop for isolation) and returns it for method chaining.
   * @param vehicles A single Vehicle or array of Vehicles to render
   * @returns This TaperingSphereRenderer instance for method chaining
   */
  renderVehicles(vehicles: Vehicle | Vehicle[]): TaperingSphereRenderer {
    const toRender = Array.isArray(vehicles) ? vehicles : [vehicles];

    for (const vehicle of toRender) {
      const position = vehicle.coordSystem.getPosition();
      const distanceToCamera = P5.Vector.dist(position, this.camera.pos);
      const baseSize =
        (this.dotSize * this.referenceDistance) / distanceToCamera;

      // Draw tail first (oldest → newest) so the head is painted on top.
      const history = vehicle.positionHistory.slice(0, this.trailLength);
      for (let i = history.length - 1; i >= 0; i--) {
        const t = 1 - (i + 1) / (this.trailLength + 1);
        this.renderEllipseAtPoint(history[i], baseSize * t, 255 * t);
      }

      // Draw the head at full size and opacity.
      this.renderEllipseAtPoint(position, baseSize, 255);
    }

    return this;
  }
}
