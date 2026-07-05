import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { DotRenderer } from '@/classes/Rendering/GeometryRenderers/DotRenderer';
import { Vehicle } from '@/classes/MarkMakingEntities/Extensible/Vehicle';

/**
 * Renders vehicles as tapering brushstroke-like trails using their position history.
 * The head (current position) is drawn at full size and opacity; historical positions
 * taper linearly toward zero in both size and alpha, creating a brushstroke appearance.
 * Dot size scales inversely with camera distance via the inherited scaledSize() method.
 * Each trail step changes alpha, so push/pop isolation is required per step.
 */
export class VehicleTaperingCircleRenderer extends DotRenderer {
  /**
   * Creates a new VehicleTaperingCircleRenderer.
   * @param sketch The p5.js sketch instance for drawing operations
   * @param dotSize The diameter of the dot at the vehicle's current position in screen pixels (default: 5)
   * @param referenceDistance A world-space distance used to normalise dot size relative to camera (default: 1000)
   * @param color RGB color array [R, G, B] for the marks (values 0–255)
   * @param camera The 3D camera used to project vehicle positions to 2D screen coordinates
   * @param trailLength How many historical positions to include in the tapering trail (default: 10)
   */
  constructor(
    sketch: P5,
    dotSize: number = 5,
    referenceDistance: number = 1000,
    color: number[],
    camera: Camera3D,
    public trailLength: number = 10,
  ) {
    super(sketch, dotSize, referenceDistance, color, camera);
  }

  /**
   * Renders one or more vehicles as tapering circle trails on the canvas.
   * Draws the tail (oldest history → newest) first so the head renders on top.
   * Each trail step interpolates size and alpha from zero at the tail to full at the head.
   * Dot size at the head scales inversely with distance to camera using referenceDistance.
   * Skips vehicles and individual history points that project outside the camera view.
   * This method mutates the p5 canvas state (push/pop for isolation) and returns it for method chaining.
   * @param vehicles A single Vehicle or array of Vehicles to render
   * @returns This VehicleTaperingCircleRenderer instance for method chaining
   */
  renderVehicles(vehicles: Vehicle | Vehicle[]): VehicleTaperingCircleRenderer {
    const toRender = Array.isArray(vehicles) ? vehicles : [vehicles];

    for (const vehicle of toRender) {
      const position = vehicle.coordSystem.getPosition();
      const screenPos = this.camera.project(position);
      if (screenPos === null) continue;

      const baseSize = this.scaledSize(position);

      // Draw tail first (oldest → newest) so the head is painted on top.
      // t = 0 at the tail, approaches 1 as the mark gets closer to the head.
      const history = vehicle.positionHistory.slice(0, this.trailLength);
      for (let i = history.length - 1; i >= 0; i--) {
        const t = 1 - (i + 1) / (this.trailLength + 1);
        const screenPt = this.camera.project(history[i]);
        if (screenPt === null) continue;

        this.sketch.push();
        this.sketch.fill(this.color[0], this.color[1], this.color[2], 255 * t);
        this.sketch.noStroke();
        this.sketch.ellipse(screenPt.x, screenPt.y, baseSize * t, baseSize * t);
        this.sketch.pop();
      }

      // Draw the head at full size and opacity.
      this.sketch.push();
      this.sketch.fill(this.color[0], this.color[1], this.color[2]);
      this.sketch.noStroke();
      this.sketch.ellipse(screenPos.x, screenPos.y, baseSize, baseSize);
      this.sketch.pop();
    }

    return this;
  }
}
