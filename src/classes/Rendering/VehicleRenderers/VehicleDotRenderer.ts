import { Vehicle } from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { DotRenderer } from '@/classes/Rendering/GeometryRenderers/DotRenderer';

/**
 * Renders vehicles as simple circular dots on the 2D canvas.
 * Extends DotRenderer — all projection and distance-scaling logic lives there.
 * Adds renderVehicles() as a thin adapter that extracts world positions from vehicles.
 */
export class VehicleDotRenderer extends DotRenderer {
  /**
   * Renders one or more vehicles as distance-scaled filled circles.
   * Extracts each vehicle's world-space position and delegates to renderPoints().
   * This method mutates the p5 canvas state (push/pop per dot) and returns it for method chaining.
   * @param vehicles A single Vehicle or array of Vehicles to render
   * @returns This VehicleDotRenderer instance for method chaining
   */
  renderVehicles(vehicles: Vehicle | Vehicle[]): VehicleDotRenderer {
    const list = Array.isArray(vehicles) ? vehicles : [vehicles];
    this.renderPoints(list.map((v) => v.coordSystem.getPosition()));
    return this;
  }
}
