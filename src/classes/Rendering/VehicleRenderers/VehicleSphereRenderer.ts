import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { CoordinateSystem } from '@/classes/Geometry/CoordinateSystem';
import { Sphere } from '@/classes/Geometry/Sphere';
import { Vehicle } from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { SphereRenderer } from '@/classes/Rendering/GeometryRenderers/SphereRenderer';

/**
 * Renders vehicles as spheres on the 2D canvas via camera projection.
 * Extends SphereRenderer — all silhouette and fill rendering logic lives there.
 * Adds renderSilhouetteVehicles() and renderFillVehicles() as thin adapters that
 * construct a Sphere of the configured radius at each vehicle's world position.
 */
export class VehicleSphereRenderer extends SphereRenderer {
  /**
   * Creates a new VehicleSphereRenderer.
   * @param sketch The p5.js sketch instance for drawing operations
   * @param radius The radius of each rendered sphere in world units
   * @param color RGB color array [R, G, B] used for both stroke and fill (values 0–255)
   * @param camera The 3D camera used to project sphere geometry into screen coordinates
   * @param strokeWeightValue Stroke thickness in pixels for silhouette rendering (default: 1)
   */
  constructor(
    sketch: P5,
    public radius: number,
    color: number[],
    camera: Camera3D,
    strokeWeightValue: number = 1,
  ) {
    super(sketch, color, camera, strokeWeightValue);
  }

  /**
   * Builds a Sphere of this.radius centered at a vehicle's current world position.
   * @param vehicle The vehicle whose position defines the sphere center
   * @returns A Sphere centered at the vehicle's world position
   */
  private sphereForVehicle(vehicle: Vehicle): Sphere {
    return new Sphere(
      CoordinateSystem.fromOriginAndNormal(
        vehicle.coordSystem.getPosition(),
        new P5.Vector(0, 0, 1),
      ),
      this.radius,
    );
  }

  /**
   * Renders the silhouette outline of one or more vehicles as spheres.
   * Constructs a sphere at each vehicle's position and delegates to renderSilhouette().
   * This method mutates the p5 canvas state (push/pop for isolation) and returns it for method chaining.
   * @param vehicles A single Vehicle or array of Vehicles to outline
   * @param segmentCount Number of line segments per silhouette circle (default: 64)
   * @returns This VehicleSphereRenderer instance for method chaining
   */
  renderSilhouetteVehicles(
    vehicles: Vehicle | Vehicle[],
    segmentCount: number = 64,
  ): VehicleSphereRenderer {
    const list = Array.isArray(vehicles) ? vehicles : [vehicles];
    this.renderSilhouette(
      list.map((v) => this.sphereForVehicle(v)),
      segmentCount,
    );
    return this;
  }

  /**
   * Renders one or more vehicles as filled sphere circles in 2D screen space.
   * Constructs a sphere at each vehicle's position and delegates to renderFill().
   * This method mutates the p5 canvas state (push/pop for isolation) and returns it for method chaining.
   * @param vehicles A single Vehicle or array of Vehicles to fill
   * @returns This VehicleSphereRenderer instance for method chaining
   */
  renderFillVehicles(vehicles: Vehicle | Vehicle[]): VehicleSphereRenderer {
    const list = Array.isArray(vehicles) ? vehicles : [vehicles];
    this.renderFill(list.map((v) => this.sphereForVehicle(v)));
    return this;
  }
}
