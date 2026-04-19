import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { WorldSpaceOcTree } from '@/classes/Core/WorldSpaceOcTree';
import { BBoxRenderer } from '../GeometryRenderers/BBoxRenderer';
import { LineRenderer } from '../GeometryRenderers/LineRenderer';
import { Line } from '@/classes/Geometry/Line';

/**
 * Renders the spatial subdivision structure of a WorldSpaceOcTree as a wireframe.
 * Collects every node's bounding box, extracts all 12 edges per box, then deduplicates
 * shared edges before drawing — so internal faces shared between adjacent sibling nodes
 * are rendered only once rather than twice.
 *
 * All mutable properties (color, strokeWeightValue, camera, referenceDistance) proxy
 * to the internal LineRenderer.
 */
export class WorldSpaceOcTreeRenderer {
  private _lineRenderer: LineRenderer;

  /**
   * Creates a new WorldSpaceOcTreeRenderer.
   * @param sketch            The p5.js sketch instance
   * @param color             RGB color array [R, G, B] for the wireframe (values 0–255)
   * @param strokeWeightValue Nominal stroke weight at the reference distance (default: 1)
   * @param camera            Camera used to project corners to 2D screen coordinates
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
   * Renders the full subdivision structure of the given WorldSpaceOcTree.
   * Gathers bounding boxes from all nodes (leaf and internal), collects all edges,
   * removes duplicates that arise at shared faces between sibling nodes, then
   * renders only the unique edges.
   * This method mutates the p5 canvas state and returns this for method chaining.
   * @param tree The WorldSpaceOcTree whose structure to render
   * @returns This WorldSpaceOcTreeRenderer instance for method chaining
   */
  renderOcTree(tree: WorldSpaceOcTree): WorldSpaceOcTreeRenderer {
    const bboxes = tree.collectAllBBoxes();
    const seen = new Set<string>();
    const uniqueEdges: Line[] = [];

    for (const bbox of bboxes) {
      for (const edge of BBoxRenderer.getEdges(bbox)) {
        const key = WorldSpaceOcTreeRenderer._edgeKey(edge);
        if (!seen.has(key)) {
          seen.add(key);
          uniqueEdges.push(edge);
        }
      }
    }

    this._lineRenderer.renderLines(uniqueEdges);
    return this;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Produces a canonical string key for a line segment that is independent of
   * endpoint order — the lexicographically smaller endpoint (by x, then y, then z)
   * always comes first. Uses fixed 4-decimal precision to absorb any floating-point
   * jitter from repeated halving in the octree subdivision.
   */
  private static _edgeKey(line: Line): string {
    const fmt = (v: number) => v.toFixed(4);
    const a = line.startPoint;
    const b = line.endPoint;

    const aBeforeB =
      a.x < b.x ||
      (a.x === b.x && a.y < b.y) ||
      (a.x === b.x && a.y === b.y && a.z <= b.z);

    const [p, q] = aBeforeB ? [a, b] : [b, a];
    return `${fmt(p.x)},${fmt(p.y)},${fmt(p.z)}|${fmt(q.x)},${fmt(q.y)},${fmt(q.z)}`;
  }
}
