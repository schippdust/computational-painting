import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { BBox } from '@/classes/Geometry/BBox';
import { Line } from '@/classes/Geometry/Line';
import { LineRenderer } from './LineRenderer';

/**
 * Renders axis-aligned bounding boxes as 3D wireframes.
 * Each box is drawn as 12 projected line segments connecting its 8 corners.
 * Stroke weight scales inversely with camera distance via the internal LineRenderer.
 *
 * All mutable properties (color, strokeWeightValue, camera, referenceDistance)
 * proxy directly to the internal LineRenderer so changes take effect immediately
 * on the next render call.
 */
export class BBoxRenderer {
  private _lineRenderer: LineRenderer;

  /**
   * Creates a new BBoxRenderer.
   * @param sketch           The p5.js sketch instance
   * @param color            RGB color array [R, G, B] for wireframe edges (values 0–255)
   * @param strokeWeightValue Nominal stroke weight at the reference distance (default: 1)
   * @param camera           Camera used to project 3D corners to 2D screen coordinates
   * @param referenceDistance World-space distance at which strokeWeightValue renders at nominal size (default: 1000)
   */
  constructor(
    sketch: P5,
    color: number[],
    strokeWeightValue: number = 1,
    camera: Camera3D,
    referenceDistance: number = 1000,
  ) {
    this._lineRenderer = new LineRenderer(
      sketch,
      color,
      strokeWeightValue,
      camera,
      referenceDistance,
    );
  }

  get color(): number[] {
    return this._lineRenderer.color;
  }
  set color(v: number[]) {
    this._lineRenderer.color = v;
  }

  get strokeWeightValue(): number {
    return this._lineRenderer.strokeWeightValue;
  }
  set strokeWeightValue(v: number) {
    this._lineRenderer.strokeWeightValue = v;
  }

  get camera(): Camera3D {
    return this._lineRenderer.camera;
  }
  set camera(v: Camera3D) {
    this._lineRenderer.camera = v;
  }

  get referenceDistance(): number {
    return this._lineRenderer.referenceDistance;
  }
  set referenceDistance(v: number) {
    this._lineRenderer.referenceDistance = v;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  /**
   * Renders a single BBox as a projected wireframe.
   * This method mutates the p5 canvas state and returns this for method chaining.
   * @param bbox The bounding box to render
   * @returns This BBoxRenderer instance for method chaining
   */
  renderBBox(bbox: BBox): BBoxRenderer {
    this._lineRenderer.renderLines(BBoxRenderer.getEdges(bbox));
    return this;
  }

  /**
   * Renders multiple BBoxes as projected wireframes.
   * This method mutates the p5 canvas state and returns this for method chaining.
   * @param bboxes The bounding boxes to render
   * @returns This BBoxRenderer instance for method chaining
   */
  renderBBoxes(bboxes: BBox[]): BBoxRenderer {
    for (const bbox of bboxes) {
      this.renderBBox(bbox);
    }
    return this;
  }

  // ── Static helpers ────────────────────────────────────────────────────────

  /**
   * Returns the 12 edges of a BBox as Line segments.
   * The 8 corners are the ±halfExtent combinations on each axis from the center.
   * Each of the 12 lines connects a pair of corners that differ on exactly one axis.
   * @param bbox The bounding box to decompose
   * @returns Array of 12 Line segments representing the wireframe edges
   */
  static getEdges(bbox: BBox): Line[] {
    const { x: cx, y: cy, z: cz } = bbox.center;
    const { x: hx, y: hy, z: hz } = bbox.halfExtents;

    // 8 corners — ordered by iterating dx∈{-1,+1}, dy∈{-1,+1}, dz∈{-1,+1}
    const corners: P5.Vector[] = [];
    for (const dx of [-1, 1]) {
      for (const dy of [-1, 1]) {
        for (const dz of [-1, 1]) {
          corners.push(new P5.Vector(cx + dx * hx, cy + dy * hy, cz + dz * hz));
        }
      }
    }

    // 12 edges: each pair of corners that differ in exactly one axis
    // Z-axis edges (indices 0-1, 2-3, 4-5, 6-7)
    // Y-axis edges (indices 0-2, 1-3, 4-6, 5-7)
    // X-axis edges (indices 0-4, 1-5, 2-6, 3-7)
    return [
      new Line(corners[0], corners[1]),
      new Line(corners[2], corners[3]),
      new Line(corners[4], corners[5]),
      new Line(corners[6], corners[7]),
      new Line(corners[0], corners[2]),
      new Line(corners[1], corners[3]),
      new Line(corners[4], corners[6]),
      new Line(corners[5], corners[7]),
      new Line(corners[0], corners[4]),
      new Line(corners[1], corners[5]),
      new Line(corners[2], corners[6]),
      new Line(corners[3], corners[7]),
    ];
  }
}
