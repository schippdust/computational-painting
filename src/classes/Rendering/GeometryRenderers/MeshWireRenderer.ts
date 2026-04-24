import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { Mesh3D } from '@/classes/Mesh/Mesh3D';
import { MeshWireExtractor } from '@/classes/Mesh/MeshWireExtractor';
import { MeshOcclusionClipper } from '@/classes/Mesh/MeshOcclusionClipper';
import type { ClipResult } from '@/classes/Mesh/MeshOcclusionClipper';
import { LineRenderer } from './LineRenderer';

/**
 * Renders the crease-edge wireframe of Mesh3D instances onto the p5 canvas.
 * Uses MeshWireExtractor (THREE.EdgesGeometry under the hood) to compute
 * hard edges per mesh and MeshOcclusionClipper to remove portions hidden by
 * other meshes (including the owning mesh itself for back-face hiding).
 *
 * Drawing is delegated to an internal LineRenderer so the output obeys the
 * same distance-scaled stroke behaviour as every other renderer in the project.
 */
export class MeshWireRenderer {
  private readonly extractor: MeshWireExtractor;
  private readonly clipper: MeshOcclusionClipper;
  private readonly lineRenderer: LineRenderer;

  /**
   * Creates a new MeshWireRenderer.
   * @param sketch The p5.js sketch instance for drawing operations.
   * @param color RGB color array [R, G, B] used for the wire strokes.
   * @param camera The 3D camera used for projection.
   * @param strokeWeightValue Nominal stroke thickness at `referenceDistance` (default 1).
   * @param referenceDistance World-space distance at which strokeWeight is nominal (default 1000).
   * @param thresholdAngleDeg Minimum inter-face angle (°) for a crease edge (default 1).
   */
  constructor(
    protected sketch: P5,
    public color: number[],
    public camera: Camera3D,
    public strokeWeightValue: number = 1,
    public referenceDistance: number = 1000,
    public thresholdAngleDeg: number = 1,
  ) {
    this.extractor = new MeshWireExtractor();
    this.clipper = new MeshOcclusionClipper();
    this.lineRenderer = new LineRenderer(
      sketch,
      color,
      strokeWeightValue,
      camera,
      referenceDistance,
    );
  }

  /**
   * Renders the crease-edge wireframe of the given meshes, optionally
   * clipping against occluders. Pass the same array as `meshes` and
   * `occluders` to hide back-side wires of the meshes themselves.
   *
   * This method mutates the p5 canvas state (via the internal LineRenderer's
   * per-line push/pop) and returns `this` for method chaining.
   *
   * @param meshes Meshes whose wires should be drawn.
   * @param occluders Meshes used for occlusion clipping (default: no occluders).
   * @param samplesPerEdge Sub-division count per wire segment when clipping (default 15).
   * @returns This renderer, for method chaining.
   */
  renderWires(
    meshes: Mesh3D | Mesh3D[],
    occluders: Mesh3D[] = [],
    samplesPerEdge: number = 15,
  ): MeshWireRenderer {
    const meshList = Array.isArray(meshes) ? meshes : [meshes];
    this.syncLineRendererProps();

    const camPos = this.camera.pos;
    for (const mesh of meshList) {
      const wireLines = this.extractor.extract(mesh, this.thresholdAngleDeg);
      if (occluders.length === 0) {
        this.lineRenderer.renderLines(wireLines);
        continue;
      }
      const clipped: ClipResult = this.clipper.clip(
        wireLines,
        camPos,
        occluders,
        samplesPerEdge,
      );
      for (const poly of clipped.polylines) {
        this.lineRenderer.renderLines(poly.segments);
      }
      this.lineRenderer.renderLines(clipped.lines);
    }
    return this;
  }

  /** Propagates mutable public props to the internal LineRenderer. */
  private syncLineRendererProps(): void {
    this.lineRenderer.color = this.color;
    this.lineRenderer.strokeWeightValue = this.strokeWeightValue;
    this.lineRenderer.referenceDistance = this.referenceDistance;
    this.lineRenderer.camera = this.camera;
  }
}
