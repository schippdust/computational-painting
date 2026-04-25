import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { Mesh3D } from '@/classes/Mesh/Mesh3D';
import { MeshSilhouetteExtractor } from '@/classes/Mesh/MeshSilhouetteExtractor';
import { MeshOcclusionClipper } from '@/classes/Mesh/MeshOcclusionClipper';
import type { ClipResult } from '@/classes/Mesh/MeshOcclusionClipper';
import { LineRenderer } from './LineRenderer';

/**
 * Renders the view-dependent silhouettes of Mesh3D instances onto the p5
 * canvas. Uses MeshSilhouetteExtractor to compute silhouette edges per mesh
 * and MeshOcclusionClipper to remove the portions hidden by other meshes
 * (including self-occlusion). All drawing is delegated to an internal
 * LineRenderer so distance-scaled stroke weight and near-plane culling match
 * the rest of the project's renderers.
 */
export class MeshSilhouetteRenderer {
  private readonly extractor: MeshSilhouetteExtractor;
  private readonly clipper: MeshOcclusionClipper;
  private readonly lineRenderer: LineRenderer;

  /**
   * Creates a new MeshSilhouetteRenderer.
   * @param sketch The p5.js sketch instance for drawing operations.
   * @param color RGB color array [R, G, B] used for the silhouette strokes.
   * @param camera The 3D camera used for projection and silhouette orientation.
   * @param strokeWeightValue Nominal stroke thickness at `referenceDistance` (default 1).
   * @param referenceDistance World-space distance at which strokeWeight is nominal (default 1000).
   */
  constructor(
    protected sketch: P5,
    public color: number[],
    public camera: Camera3D,
    public strokeWeightValue: number = 1,
    public referenceDistance: number = 1000,
  ) {
    this.extractor = new MeshSilhouetteExtractor();
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
   * Renders the silhouettes of the given meshes, optionally clipping against
   * occluders so that silhouette segments hidden behind any occluder are
   * dropped. Pass the same array as `meshes` and `occluders` to enable
   * self-occlusion across the group.
   *
   * This method mutates the p5 canvas state (via the internal LineRenderer's
   * per-line push/pop) and returns `this` for method chaining.
   *
   * @param meshes Meshes whose silhouettes should be drawn.
   * @param occluders Meshes used for occlusion clipping (default: no occluders).
   * @param samplesPerEdge Sub-division count per silhouette edge when clipping (default 15).
   * @returns This renderer, for method chaining.
   */
  renderSilhouettes(
    meshes: Mesh3D | Mesh3D[],
    occluders: Mesh3D[] = [],
    samplesPerEdge: number = 15,
  ): MeshSilhouetteRenderer {
    const meshList = Array.isArray(meshes) ? meshes : [meshes];
    this.syncLineRendererProps();

    const camPos = this.camera.pos;
    for (const mesh of meshList) {
      const silhouetteLines = this.extractor.extract(mesh, camPos);
      if (occluders.length === 0) {
        this.lineRenderer.renderLines(silhouetteLines);
        continue;
      }
      const clipped: ClipResult = this.clipper.clip(
        silhouetteLines,
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
