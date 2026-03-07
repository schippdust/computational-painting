import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { CoordinateSystem } from '@/classes/Geometry/CoordinateSystem';
import { Vehicle } from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { VehicleCollection } from '@/classes/EntityManagement/Extensible/VehicleCollection';

/**
 * Renders vehicles as simple circular dots on the 2D canvas.
 * Projects 3D vehicle positions to screen space using a camera and draws filled circles.
 * Useful for rapid prototyping, lightweight rendering, and visualization of vehicle distributions.
 * Skips rendering for vehicles outside the camera's view frustum (null projection).
 */
export class DotRenderer {
  /**
   * Creates a new DotRenderer with configurable appearance and camera projection.
   * @param sketch The p5.js sketch instance for drawing operations
   * @param dotSize The diameter of rendered dots in screen pixels (default: 5)
   * @param color RGB color array [R, G, B] for the dots (values 0-255)
   * @param camera The 3D camera used to project vehicle positions to 2D screen coordinates
   */
  constructor(
    private sketch: P5,
    public dotSize: number = 5,
    public color: number[],
    public camera: Camera3D,
  ) {}

  /**
   * Renders one or more vehicles as circular dots on the canvas.
   * Projects each vehicle's position from 3D world space to 2D screen space using the camera.
   * Skips vehicles whose positions project outside the camera view (returns null).
   * Uses the configured dot size and color for all rendered vehicles.
   * This method mutates the p5 canvas state (push/pop for isolation) and returns it for method chaining.
   * @param vehicles A single Vehicle or array of Vehicles to render
   * @returns This DotRenderer instance for method chaining
   */
  renderVehicles(vehicles: Vehicle | Vehicle[]): DotRenderer {
    let renderVehicles: Vehicle[] = [];
    if (!Array.isArray(vehicles)) {
      renderVehicles.push(vehicles);
    } else {
      renderVehicles = vehicles;
    }
    renderVehicles.forEach((vehicle) => {
      const position = vehicle.coordSystem.getPosition();
      const screenPos = this.camera.project(position);
      if (screenPos === null) {
        return;
      }

      this.sketch.push();
      this.sketch.fill(this.color);
      this.sketch.noStroke();
      this.sketch.ellipse(screenPos.x, screenPos.y, this.dotSize, this.dotSize);
      this.sketch.pop();
    });
    return this;
  }
}
