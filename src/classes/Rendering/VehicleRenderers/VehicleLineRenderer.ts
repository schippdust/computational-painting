import { Line } from '@/classes/Geometry/Line';
import { LineRenderer } from '@/classes/Rendering/GeometryRenderers/LineRenderer';
import { Vehicle } from '@/classes/MarkMakingEntities/Extensible/Vehicle';

/**
 * Renders vehicles as line segments connecting each vehicle's most recent previous
 * position to its current position. Stroke weight scales inversely with camera
 * distance, identical to LineRenderer.
 * Vehicles with no position history (e.g. on their very first frame) are skipped.
 * Extends LineRenderer — all projection, distance-scaling, and culling logic lives there.
 */
export class VehicleLineRenderer extends LineRenderer {
  /**
   * Renders one or more vehicles as line segments from their previous position to their current position.
   * Vehicles with no position history are skipped silently.
   * This method mutates the p5 canvas state (push/pop per line) and returns it for method chaining.
   * @param vehicles A single Vehicle or array of Vehicles to render
   * @returns This VehicleLineRenderer instance for method chaining
   */
  renderVehicles(vehicles: Vehicle | Vehicle[]): VehicleLineRenderer {
    const list = Array.isArray(vehicles) ? vehicles : [vehicles];

    const lines: Line[] = [];
    for (const vehicle of list) {
      if (vehicle.positionHistory.length === 0) continue;
      lines.push(
        new Line(
          vehicle.positionHistory[0].copy(),
          vehicle.coordSystem.getPosition(),
        ),
      );
    }

    this.renderLines(lines);
    return this;
  }
}
