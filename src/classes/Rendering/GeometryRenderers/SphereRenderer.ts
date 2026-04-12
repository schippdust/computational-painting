import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { Sphere } from '@/classes/Geometry/Sphere';

/**
 * Renders Sphere geometry on the 2D canvas via camera projection.
 * Supports wireframe silhouette outlines and filled screen-space approximations.
 * Stroke weight scales inversely with camera distance using the formula:
 * scaledWeight = (strokeWeightValue × referenceDistance) / dist,
 * where dist is the distance from the camera to the sphere's center.
 * Operates directly on Sphere instances; use VehicleSphereRenderer to render
 * vehicle-attached spheres without constructing Sphere objects manually.
 */
export class SphereRenderer {
  /**
   * Creates a new SphereRenderer.
   * @param sketch The p5.js sketch instance for drawing operations
   * @param color RGB color array [R, G, B] used for both stroke and fill (values 0–255)
   * @param camera The 3D camera used to project sphere geometry into screen coordinates
   * @param strokeWeightValue Nominal stroke thickness at the reference distance in pixels (default: 1)
   * @param referenceDistance World-space distance at which strokeWeightValue renders at its nominal size (default: 1000)
   */
  constructor(
    protected sketch: P5,
    public color: number[],
    public camera: Camera3D,
    public strokeWeightValue: number = 1,
    public referenceDistance: number = 1000,
  ) {}

  /**
   * Renders the silhouette outline of one or more spheres as projected line segments.
   * For each sphere, computes the silhouette circle as seen from the camera position and
   * projects its segments onto the canvas. Segments behind the near clip plane are culled.
   * This method mutates the p5 canvas state (push/pop for isolation) and returns it for method chaining.
   * @param spheres A single Sphere or array of Spheres to outline
   * @param segmentCount Number of line segments used to approximate each silhouette circle (default: 64)
   * @returns This SphereRenderer instance for method chaining
   */
  renderSilhouette(
    spheres: Sphere | Sphere[],
    segmentCount: number = 64,
  ): SphereRenderer {
    const toRender = Array.isArray(spheres) ? spheres : [spheres];
    for (const sphere of toRender) {
      const dist = P5.Vector.dist(sphere.centerPoint, this.camera.pos);
      const scaledWeight =
        (this.strokeWeightValue * this.referenceDistance) / dist;

      this.sketch.push();
      this.sketch.stroke(this.color[0], this.color[1], this.color[2]);
      this.sketch.strokeWeight(scaledWeight);
      this.sketch.noFill();
      const silhouette = sphere.silhouetteCircle(this.camera.pos);
      silhouette.renderSegmentCount = segmentCount;
      const projected = this.camera.renderLines(silhouette.renderSegments);
      for (const seg of projected) seg.render2D(this.sketch);
      this.sketch.pop();
    }
    return this;
  }

  /**
   * Renders one or more spheres as filled ellipses in 2D screen space.
   * Projects each sphere's center, then estimates the screen-space radius by projecting
   * a tangent point perpendicular to the camera view ray. Skips spheres whose center
   * or tangent point projects outside the camera view.
   * This method mutates the p5 canvas state (push/pop for isolation) and returns it for method chaining.
   * @param spheres A single Sphere or array of Spheres to fill
   * @returns This SphereRenderer instance for method chaining
   */
  renderFill(spheres: Sphere | Sphere[]): SphereRenderer {
    const toRender = Array.isArray(spheres) ? spheres : [spheres];
    this.sketch.push();
    this.sketch.fill(this.color[0], this.color[1], this.color[2]);
    this.sketch.noStroke();
    for (const sphere of toRender) {
      const center = sphere.centerPoint;
      const screenCenter = this.camera.project(center);
      if (screenCenter === null) continue;

      // Find a tangent direction perpendicular to the camera→center axis so the
      // offset point is always visible and gives a stable radius estimate.
      const toCenter = P5.Vector.sub(center, this.camera.pos).normalize();
      let perp = new P5.Vector(1, 0, 0);
      if (Math.abs(toCenter.dot(perp)) > 0.9) perp = new P5.Vector(0, 1, 0);
      const tangent = toCenter.copy().cross(perp).normalize();

      const edgePoint = center.copy().add(tangent.mult(sphere.radius));
      const screenEdge = this.camera.project(edgePoint);
      if (screenEdge === null) continue;

      const screenRadius = P5.Vector.dist(screenCenter, screenEdge);
      this.sketch.ellipse(
        screenCenter.x,
        screenCenter.y,
        screenRadius * 2,
        screenRadius * 2,
      );
    }
    this.sketch.pop();
    return this;
  }
}
