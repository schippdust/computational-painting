import P5 from 'p5';
import { BufferAttribute, EdgesGeometry } from 'three';
import { Line } from '@/classes/Geometry/Line';
import { Mesh3D } from './Mesh3D';

/**
 * Extracts the crease edges of a mesh using THREE.EdgesGeometry. An edge is
 * emitted whenever the angle between adjacent face normals exceeds
 * `thresholdAngleDeg` — i.e. hard edges on box/cylinder-like meshes,
 * skipping the smooth interior triangulation of curved surfaces.
 *
 * Result is view-independent, so it's cached per `(mesh.revision,
 * thresholdAngleDeg)`; cache entries older than the current mesh revision
 * are discarded on the next call.
 *
 * Output Lines are in world space — the mesh's world matrix is applied to
 * every edge endpoint before emission, so downstream LineRenderer can draw
 * them directly through a Camera3D.
 */
export class MeshWireExtractor {
  /** Cache: mesh → { revision, thresholdAngleDeg, lines }. */
  private readonly cache = new WeakMap<
    Mesh3D,
    { revision: number; thresholdAngleDeg: number; lines: Line[] }
  >();

  /**
   * Returns crease-edge Line segments in world space for the given mesh.
   * @param mesh The mesh to extract edges from.
   * @param thresholdAngleDeg Minimum angle between adjacent face normals for
   *   an edge to qualify as a crease (default 1°; a very low threshold means
   *   "nearly every triangle edge"). Typical values: 1 for flat-shaded meshes,
   *   30–45 for smooth meshes where only the hard edges matter.
   */
  extract(mesh: Mesh3D, thresholdAngleDeg: number = 1): Line[] {
    const cached = this.cache.get(mesh);
    if (
      cached &&
      cached.revision === mesh.revision &&
      cached.thresholdAngleDeg === thresholdAngleDeg
    ) {
      return cached.lines;
    }

    const edges = new EdgesGeometry(mesh.geometry, thresholdAngleDeg);
    const positions = edges.getAttribute('position') as BufferAttribute;
    const worldMat = mesh.getWorldMatrix();
    const lines: Line[] = [];
    const vCount = positions.count;
    // EdgesGeometry emits pairs: position[2i] → position[2i+1] per edge.
    for (let i = 0; i < vCount; i += 2) {
      const sx = positions.getX(i);
      const sy = positions.getY(i);
      const sz = positions.getZ(i);
      const ex = positions.getX(i + 1);
      const ey = positions.getY(i + 1);
      const ez = positions.getZ(i + 1);
      const start = new P5.Vector(sx, sy, sz);
      const end = new P5.Vector(ex, ey, ez);
      applyMatrix4(start, worldMat.elements);
      applyMatrix4(end, worldMat.elements);
      lines.push(new Line(start, end));
    }
    edges.dispose();

    this.cache.set(mesh, {
      revision: mesh.revision,
      thresholdAngleDeg,
      lines,
    });
    return lines;
  }
}

/**
 * Applies a column-major 4x4 matrix `m` to a P5.Vector in place, treating it
 * as a point (w=1). Avoids allocating a THREE.Vector3 per vertex.
 */
function applyMatrix4(v: P5.Vector, m: number[]): void {
  const x = v.x;
  const y = v.y;
  const z = v.z;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
  v.x = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  v.y = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  v.z = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
}
