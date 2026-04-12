import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { Line } from '@/classes/Geometry/Line';

/**
 * Renders Line geometry by projecting world-space line segments through a camera
 * onto the 2D canvas. Stroke weight scales inversely with camera distance using the
 * same formula as DotRenderer: scaledWeight = (strokeWeightValue × referenceDistance) / dist,
 * where dist is the distance from the camera to the line's midpoint.
 * Segments whose endpoints are behind the near clip plane are culled.
 */
export class LineRenderer {
  /**
   * Creates a new LineRenderer.
   * @param sketch The p5.js sketch instance for drawing operations
   * @param color RGB color array [R, G, B] for the lines (values 0–255)
   * @param strokeWeightValue Nominal stroke thickness at the reference distance in pixels (default: 1)
   * @param camera The 3D camera used to project line endpoints to 2D screen coordinates
   * @param referenceDistance World-space distance at which strokeWeightValue renders at its nominal size (default: 1000)
   */
  constructor(
    protected sketch: P5,
    public color: number[],
    public strokeWeightValue: number = 1,
    public camera: Camera3D,
    public referenceDistance: number = 1000,
  ) {}

  /**
   * Renders one or more world-space Line segments projected through the camera.
   * Each line's stroke weight is scaled by its midpoint's distance to the camera.
   * Lines with either endpoint behind the near clip plane are culled entirely.
   * This method mutates the p5 canvas state (push/pop per line) and returns it for method chaining.
   * @param lines A single Line or array of Lines in world coordinates
   * @returns This LineRenderer instance for method chaining
   */
  renderLines(lines: Line | Line[]): LineRenderer {
    const lineList = Array.isArray(lines) ? lines : [lines];

    for (const line of lineList) {
      const projectedStart = this.camera.project(line.startPoint);
      const projectedEnd = this.camera.project(line.endPoint);
      if (projectedStart === null || projectedEnd === null) continue;

      const midpoint = P5.Vector.add(line.startPoint, line.endPoint).div(2);
      const dist = P5.Vector.dist(midpoint, this.camera.pos);
      const scaledWeight =
        (this.strokeWeightValue * this.referenceDistance) / dist;

      this.sketch.push();
      this.sketch.stroke(this.color[0], this.color[1], this.color[2]);
      this.sketch.strokeWeight(scaledWeight);
      this.sketch.noFill();
      this.sketch.line(
        projectedStart.x,
        projectedStart.y,
        projectedEnd.x,
        projectedEnd.y,
      );
      this.sketch.pop();
    }

    return this;
  }
}
