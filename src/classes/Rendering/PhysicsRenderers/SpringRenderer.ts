import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { Line } from '@/classes/Geometry/Line';
import { Spring } from '@/classes/Core/Spring';
import { LineRenderer } from '@/classes/Rendering/GeometryRenderers/LineRenderer';

/**
 * Renders Spring instances as projected line segments whose stroke weight scales
 * inversely with camera distance — springs close to the camera appear bolder,
 * distant springs appear finer, preserving a sense of depth across dense lattices.
 *
 * Each spring is decomposed to a Line connecting its two endpoint vehicle positions,
 * then delegated to an internal LineRenderer. Distance scaling uses the line's midpoint
 * distance (handled by LineRenderer): scaledWeight = (baseStrokeWeight × referenceDistance) / dist.
 * Springs whose either endpoint projects behind the near clip plane are culled.
 *
 * Mutable properties (color, camera, baseStrokeWeight, referenceDistance) are forwarded
 * directly to the internal LineRenderer via get/set accessors — there is no secondary
 * copy to keep in sync.
 */
export class SpringRenderer {
  private lineRenderer: LineRenderer;

  /**
   * Creates a new SpringRenderer.
   * @param sketch The p5.js sketch instance for drawing operations
   * @param color RGB color array [R, G, B] for the spring lines (values 0–255)
   * @param camera The 3D camera used to project spring endpoints to 2D screen coordinates
   * @param baseStrokeWeight Stroke thickness at the reference distance in screen pixels (default: 1)
   * @param referenceDistance World-space distance at which baseStrokeWeight renders at its nominal size (default: 1000)
   */
  constructor(
    sketch: P5,
    color: number[],
    camera: Camera3D,
    baseStrokeWeight: number = 1,
    referenceDistance: number = 1000,
  ) {
    this.lineRenderer = new LineRenderer(
      sketch,
      color,
      baseStrokeWeight,
      camera,
      referenceDistance,
    );
  }

  get color(): number[] {
    return this.lineRenderer.color;
  }
  set color(v: number[]) {
    this.lineRenderer.color = v;
  }

  get camera(): Camera3D {
    return this.lineRenderer.camera;
  }
  set camera(v: Camera3D) {
    this.lineRenderer.camera = v;
  }

  get baseStrokeWeight(): number {
    return this.lineRenderer.strokeWeightValue;
  }
  set baseStrokeWeight(v: number) {
    this.lineRenderer.strokeWeightValue = v;
  }

  get referenceDistance(): number {
    return this.lineRenderer.referenceDistance;
  }
  set referenceDistance(v: number) {
    this.lineRenderer.referenceDistance = v;
  }

  /**
   * Renders one or more springs as distance-scaled projected line segments.
   * Each spring is converted to a Line between its endpoint vehicle positions.
   * Stroke weight is computed from the average camera distance of the two endpoints
   * and applied via the internal LineRenderer before each draw call.
   * This method mutates the p5 canvas state (push/pop per spring) and returns it for method chaining.
   * @param springs A single Spring or array of Springs to render
   * @returns This SpringRenderer instance for method chaining
   */
  renderSprings(springs: Spring | Spring[]): SpringRenderer {
    const list = Array.isArray(springs) ? springs : [springs];

    for (const spring of list) {
      const posA = spring.vehicleA.coords;
      const posB = spring.vehicleB.coords;
      this.lineRenderer.renderLines(new Line(posA, posB));
    }

    return this;
  }
}
