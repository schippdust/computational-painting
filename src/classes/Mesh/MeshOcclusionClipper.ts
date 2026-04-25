import P5 from 'p5';
import { Line } from '@/classes/Geometry/Line';
import { Polyline } from '@/classes/Geometry/Polyline';
import { Mesh3D } from './Mesh3D';
import { MeshRaycaster } from './MeshRaycaster';

/** Result of clipping a set of input lines against mesh occluders. */
export interface ClipResult {
  /** Visible runs of ≥3 samples collapsed into polylines. */
  polylines: Polyline[];
  /** Visible runs of exactly 2 samples that cannot form a polyline. */
  lines: Line[];
}

/**
 * Clips a set of world-space Line segments against mesh occluders from a
 * camera viewpoint, returning the visible runs as Polylines (≥3 contiguous
 * visible samples) or Lines (2-sample runs). Isolated single-sample runs are
 * dropped, as are fully occluded segments.
 *
 * Algorithm per input Line:
 *   1. Sample `samplesPerEdge + 1` points at regular intervals along the
 *      edge (including both endpoints).
 *   2. For each sample, ask the MeshRaycaster whether the segment from the
 *      camera to that sample point is blocked by any occluder.
 *   3. Walk the sample array, grouping contiguous visible runs. Emit each
 *      run of length ≥3 as a Polyline; runs of length 2 as a single Line.
 */
export class MeshOcclusionClipper {
  /**
   * Creates a new clipper.
   * @param raycaster The raycaster used for visibility tests.
   */
  constructor(private raycaster: MeshRaycaster = new MeshRaycaster()) {}

  /**
   * Clips `lines` against `occluders` from `cameraPos`.
   * @param lines Input line segments in world space.
   * @param cameraPos World-space camera position.
   * @param occluders Meshes that may occlude the input lines.
   * @param samplesPerEdge Number of sub-divisions per input line (default 15;
   *   produces 16 sample points per edge). Higher values give cleaner clips
   *   at more raycast cost.
   */
  clip(
    lines: Line[],
    cameraPos: P5.Vector,
    occluders: Mesh3D[],
    samplesPerEdge: number = 15,
  ): ClipResult {
    const polylines: Polyline[] = [];
    const outLines: Line[] = [];

    if (occluders.length === 0) {
      // Nothing to occlude against: emit every line as-is.
      return { polylines, lines: lines.slice() };
    }

    const sampleCount = Math.max(2, samplesPerEdge + 1);

    for (const line of lines) {
      const samples: P5.Vector[] = new Array(sampleCount);
      const visible: boolean[] = new Array(sampleCount);

      for (let i = 0; i < sampleCount; i++) {
        const t = i / (sampleCount - 1);
        const sample = line.getPointAtParam(t);
        samples[i] = sample;
        visible[i] = !this.raycaster.isOccluded(cameraPos, sample, occluders);
      }

      let runStart = -1;
      for (let i = 0; i < sampleCount; i++) {
        if (visible[i]) {
          if (runStart < 0) runStart = i;
        } else if (runStart >= 0) {
          emitRun(samples, runStart, i - 1, polylines, outLines);
          runStart = -1;
        }
      }
      if (runStart >= 0) {
        emitRun(samples, runStart, sampleCount - 1, polylines, outLines);
      }
    }

    return { polylines, lines: outLines };
  }
}

/**
 * Emits a contiguous run of visible samples as either a Polyline (length ≥3)
 * or a single Line (length 2). Runs of length 1 are dropped since there is no
 * segment to render.
 */
function emitRun(
  samples: P5.Vector[],
  start: number,
  end: number,
  polylines: Polyline[],
  lines: Line[],
): void {
  const length = end - start + 1;
  if (length < 2) return;
  if (length === 2) {
    lines.push(new Line(samples[start].copy(), samples[end].copy()));
    return;
  }
  const pts: P5.Vector[] = new Array(length);
  for (let i = 0; i < length; i++) pts[i] = samples[start + i].copy();
  polylines.push(new Polyline(pts));
}
