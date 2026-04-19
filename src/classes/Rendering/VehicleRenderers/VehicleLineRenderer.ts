import { Line } from '@/classes/Geometry/Line';
import { LineRenderer } from '@/classes/Rendering/GeometryRenderers/LineRenderer';
import { Vehicle } from '@/classes/MarkMakingEntities/Extensible/Vehicle';

/**
 * Renders vehicles as line segments connecting each vehicle's current position to
 * a previous position from its history. The target history entry is selected by
 * historyIndex (0 = one frame back, higher = further into the past). Vehicles with
 * no history yet are skipped silently.
 *
 * Extends LineRenderer — all projection, distance scaling, and culling logic lives there.
 */
export class VehicleLineRenderer extends LineRenderer {
  /**
   * Which entry in positionHistory to use as the line's far endpoint.
   * 0 = one frame back (shortest streak), higher values reach further into the past.
   * Clamped to the vehicle's available history length — vehicles with fewer stored
   * positions than historyIndex use their oldest stored position instead.
   * @default 0
   */
  public historyIndex: number = 0;

  /**
   * Renders one or more vehicles as line segments from their current position to a
   * previous position. Vehicles with no history are skipped silently.
   * This method mutates the p5 canvas state (push/pop per line) and returns it for method chaining.
   * @param vehicles A single Vehicle or array of Vehicles to render
   * @returns This VehicleLineRenderer instance for method chaining
   */
  renderVehicles(vehicles: Vehicle | Vehicle[]): VehicleLineRenderer {
    const list = Array.isArray(vehicles) ? vehicles : [vehicles];
    const lines: Line[] = [];

    for (const v of list) {
      const history = v.positionHistory;
      if (history.length === 0) continue;
      const idx = Math.min(this.historyIndex, history.length - 1);
      lines.push(new Line(v.coordSystem.getPosition(), history[idx]));
    }

    if (lines.length > 0) this.renderLines(lines);
    return this;
  }
}
