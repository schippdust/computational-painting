import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';

/**
 * Renders arbitrary 3D positions as distance-scaled filled circles on the 2D canvas.
 * Projects world-space positions through a camera and draws dots whose size scales
 * inversely with camera distance, preserving an approximate sense of depth.
 */
export class DotRenderer {
  /**
   * Creates a new DotRenderer.
   * @param sketch The p5.js sketch instance for drawing operations
   * @param dotSize The diameter of rendered dots at the reference distance in screen pixels (default: 5)
   * @param referenceDistance World-space distance at which dotSize is rendered at its nominal size (default: 1000)
   * @param color RGB color array [R, G, B] for the dots (values 0–255)
   * @param camera The 3D camera used to project positions to 2D screen coordinates
   */
  constructor(
    protected sketch: P5,
    public dotSize: number = 5,
    public referenceDistance: number = 1000,
    public color: number[],
    public camera: Camera3D,
  ) {}

  /**
   * Renders one or more world-space positions as distance-scaled filled circles.
   * Skips positions that project outside the camera view (null projection).
   * This method mutates the p5 canvas state (push/pop for isolation) and returns it for method chaining.
   * @param positions A single P5.Vector or array of P5.Vectors to render
   * @returns This DotRenderer instance for method chaining
   */
  renderPoints(positions: P5.Vector | P5.Vector[]): DotRenderer {
    const pts = Array.isArray(positions) ? positions : [positions];
    for (const position of pts) {
      const screenPos = this.camera.project(position);
      if (screenPos === null) continue;

      const distanceToCamera = P5.Vector.dist(position, this.camera.pos);
      const scaledSize =
        (this.dotSize * this.referenceDistance) / distanceToCamera;

      this.sketch.push();
      this.sketch.fill(this.color[0], this.color[1], this.color[2]);
      this.sketch.noStroke();
      this.sketch.ellipse(screenPos.x, screenPos.y, scaledSize, scaledSize);
      this.sketch.pop();
    }
    return this;
  }
}
