import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { CoordinateSystem } from '@/classes/Geometry/CoordinateSystem';
import { Sphere } from '@/classes/Geometry/Sphere';
import { Vehicle } from '@/classes/MarkMakingEntities/Extensible/Vehicle';

/**
 * Renders vehicles as spheres on the 2D canvas via camera projection.
 * Each vehicle's position becomes the center of a sphere with the configured radius.
 * Supports both wireframe silhouette outlines and filled screen-space approximations.
 */
export class SphereRenderer {
  /**
   * Creates a new SphereRenderer.
   * @param sketch The p5.js sketch instance for drawing operations
   * @param radius The radius of each rendered sphere in world units
   * @param color RGB color array [R, G, B] used for both stroke and fill (values 0–255)
   * @param camera The 3D camera used to project sphere geometry into screen coordinates
   * @param strokeWeightValue Stroke thickness in pixels for silhouette rendering (default: 1)
   */
  constructor(
    private sketch: P5,
    public radius: number,
    public color: number[],
    public camera: Camera3D,
    public strokeWeightValue: number = 1,
  ) {}

  /**
   * Builds a Sphere centered at a vehicle's current world position.
   * @param vehicle The vehicle whose position defines the sphere center
   * @returns A Sphere of this.radius centered at the vehicle's position
   */
  private sphereForVehicle(vehicle: Vehicle): Sphere {
    const center = vehicle.coordSystem.getPosition();
    return new Sphere(
      CoordinateSystem.fromOriginAndNormal(center, new P5.Vector(0, 0, 1)),
      this.radius,
    );
  }

  /**
   * Renders the silhouette outline of one or more vehicles as spheres.
   * Constructs a sphere at each vehicle's position and projects its silhouette circle
   * as connected line segments. Skips vehicles whose silhouettes cannot be projected.
   * This method mutates the p5 canvas state (push/pop for isolation) and returns it for method chaining.
   * @param vehicles A single Vehicle or array of Vehicles to outline
   * @param segmentCount Number of line segments used to approximate each silhouette circle (default: 64)
   * @returns This SphereRenderer instance for method chaining
   */
  renderSilhouette(
    vehicles: Vehicle | Vehicle[],
    segmentCount: number = 64,
  ): SphereRenderer {
    const toRender = Array.isArray(vehicles) ? vehicles : [vehicles];
    this.sketch.push();
    this.sketch.stroke(this.color[0], this.color[1], this.color[2]);
    this.sketch.strokeWeight(this.strokeWeightValue);
    this.sketch.noFill();
    for (const vehicle of toRender) {
      const sphere = this.sphereForVehicle(vehicle);
      const silhouette = sphere.silhouetteCircle(this.camera.pos);
      silhouette.renderSegmentCount = segmentCount;
      const projected = this.camera.renderLines(silhouette.renderSegments);
      for (const seg of projected) seg.render2D(this.sketch);
    }
    this.sketch.pop();
    return this;
  }

  /**
   * Renders one or more vehicles as filled sphere circles in 2D screen space.
   * Constructs a sphere at each vehicle's position, projects its center, and estimates
   * the screen-space radius using a tangent point perpendicular to the camera view ray.
   * Skips vehicles whose centers or tangent points project outside the camera view.
   * This method mutates the p5 canvas state (push/pop for isolation) and returns it for method chaining.
   * @param vehicles A single Vehicle or array of Vehicles to fill
   * @returns This SphereRenderer instance for method chaining
   */
  renderFill(vehicles: Vehicle | Vehicle[]): SphereRenderer {
    const toRender = Array.isArray(vehicles) ? vehicles : [vehicles];
    this.sketch.push();
    this.sketch.fill(this.color[0], this.color[1], this.color[2]);
    this.sketch.noStroke();
    for (const vehicle of toRender) {
      const center = vehicle.coordSystem.getPosition();
      const screenCenter = this.camera.project(center);
      if (screenCenter === null) continue;

      // Find a tangent direction perpendicular to the camera→center axis so the
      // offset point is always visible and gives a stable radius estimate.
      const toCenter = P5.Vector.sub(center, this.camera.pos).normalize();
      let perp = new P5.Vector(1, 0, 0);
      if (Math.abs(toCenter.dot(perp)) > 0.9) perp = new P5.Vector(0, 1, 0);
      const tangent = toCenter.copy().cross(perp).normalize();

      const edgePoint = center.copy().add(tangent.mult(this.radius));
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
