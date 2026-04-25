import P5 from 'p5';
import { BufferAttribute } from 'three';
import { Line } from '@/classes/Geometry/Line';
import { Mesh3D } from './Mesh3D';

/**
 * Edge-to-adjacent-faces adjacency map keyed by "minIdx_maxIdx" vertex pair.
 * Each entry stores the face indices that share that edge. Built once per
 * mesh revision and cached.
 */
interface EdgeAdjacency {
  /** Per edge: pair of vertex indices and up to two adjacent face indices. */
  edges: {
    v0: number;
    v1: number;
    faceA: number;
    faceB: number; // -1 for boundary edges
  }[];
  /** Face centroids in world space, indexed by face index. */
  centroids: Float32Array;
  /** Face normals in world space, indexed by face index. */
  normals: Float32Array;
  /** World-space vertex positions, indexed by vertex index. */
  vertices: Float32Array;
}

/**
 * Extracts the view-dependent silhouette of a mesh as a set of Line segments
 * in world space. An edge is emitted when:
 *   - It is a boundary edge (only one adjacent face), or
 *   - The two adjacent faces' "facing" (sign of dot(faceNormal, faceCentroid - cameraPos))
 *     disagree, meaning the edge separates a front-facing from a back-facing
 *     triangle as seen from the camera.
 *
 * The adjacency map and face geometry are built once per mesh revision and
 * cached; the per-frame cost is just a linear walk over edges.
 */
export class MeshSilhouetteExtractor {
  private readonly cache = new WeakMap<
    Mesh3D,
    { revision: number; adjacency: EdgeAdjacency }
  >();

  /**
   * Returns silhouette Line segments in world space for the given mesh as
   * seen from `cameraPos`.
   * @param mesh The mesh to extract the silhouette of.
   * @param cameraPos World-space camera position.
   */
  extract(mesh: Mesh3D, cameraPos: P5.Vector): Line[] {
    const adj = this.getAdjacency(mesh);
    const out: Line[] = [];
    const cx = cameraPos.x;
    const cy = cameraPos.y;
    const cz = cameraPos.z;

    const verts = adj.vertices;
    const centroids = adj.centroids;
    const normals = adj.normals;

    for (const edge of adj.edges) {
      let emit = false;

      if (edge.faceB < 0) {
        emit = true;
      } else {
        const sa = faceSign(centroids, normals, edge.faceA, cx, cy, cz);
        const sb = faceSign(centroids, normals, edge.faceB, cx, cy, cz);
        // Different signs means the edge is on the silhouette; a zero dot
        // (grazing) is treated conservatively as "not silhouette" to avoid
        // doubled lines at exact tangent angles.
        if (sa * sb < 0) emit = true;
      }

      if (!emit) continue;

      const ax = verts[edge.v0 * 3];
      const ay = verts[edge.v0 * 3 + 1];
      const az = verts[edge.v0 * 3 + 2];
      const bx = verts[edge.v1 * 3];
      const by = verts[edge.v1 * 3 + 1];
      const bz = verts[edge.v1 * 3 + 2];
      out.push(
        new Line(new P5.Vector(ax, ay, az), new P5.Vector(bx, by, bz)),
      );
    }

    return out;
  }

  /**
   * Returns the cached adjacency for the mesh, building (or rebuilding) it
   * when the mesh's revision has changed.
   */
  private getAdjacency(mesh: Mesh3D): EdgeAdjacency {
    const cached = this.cache.get(mesh);
    if (cached && cached.revision === mesh.revision) return cached.adjacency;
    const adjacency = buildAdjacency(mesh);
    this.cache.set(mesh, { revision: mesh.revision, adjacency });
    return adjacency;
  }
}

/**
 * Sign of dot(faceNormal, faceCentroid - cameraPos). Positive values mean the
 * face is oriented away from the camera (back-facing); negative values mean
 * front-facing. Zero is grazing (degenerate).
 */
function faceSign(
  centroids: Float32Array,
  normals: Float32Array,
  faceIdx: number,
  cx: number,
  cy: number,
  cz: number,
): number {
  const ci = faceIdx * 3;
  const dx = centroids[ci] - cx;
  const dy = centroids[ci + 1] - cy;
  const dz = centroids[ci + 2] - cz;
  return normals[ci] * dx + normals[ci + 1] * dy + normals[ci + 2] * dz;
}

/**
 * Builds an edge-adjacency map over the mesh's indexed triangles, plus
 * per-face centroids and normals in world space. All output buffers are
 * flat Float32Arrays for cache-friendly iteration.
 */
function buildAdjacency(mesh: Mesh3D): EdgeAdjacency {
  const positions = mesh.geometry.getAttribute('position') as BufferAttribute;
  const indices = mesh.getIndices();
  const worldMat = mesh.getWorldMatrix().elements;

  const vertexCount = positions.count;
  const vertices = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const w =
      worldMat[3] * x + worldMat[7] * y + worldMat[11] * z + worldMat[15] || 1;
    vertices[i * 3] =
      (worldMat[0] * x + worldMat[4] * y + worldMat[8] * z + worldMat[12]) / w;
    vertices[i * 3 + 1] =
      (worldMat[1] * x + worldMat[5] * y + worldMat[9] * z + worldMat[13]) / w;
    vertices[i * 3 + 2] =
      (worldMat[2] * x + worldMat[6] * y + worldMat[10] * z + worldMat[14]) /
      w;
  }

  const faceCount = indices.length / 3;
  const centroids = new Float32Array(faceCount * 3);
  const normals = new Float32Array(faceCount * 3);
  for (let f = 0; f < faceCount; f++) {
    const i0 = indices[f * 3];
    const i1 = indices[f * 3 + 1];
    const i2 = indices[f * 3 + 2];
    const ax = vertices[i0 * 3];
    const ay = vertices[i0 * 3 + 1];
    const az = vertices[i0 * 3 + 2];
    const bx = vertices[i1 * 3];
    const by = vertices[i1 * 3 + 1];
    const bz = vertices[i1 * 3 + 2];
    const cx = vertices[i2 * 3];
    const cy = vertices[i2 * 3 + 1];
    const cz = vertices[i2 * 3 + 2];
    centroids[f * 3] = (ax + bx + cx) / 3;
    centroids[f * 3 + 1] = (ay + by + cy) / 3;
    centroids[f * 3 + 2] = (az + bz + cz) / 3;
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    normals[f * 3] = nx;
    normals[f * 3 + 1] = ny;
    normals[f * 3 + 2] = nz;
  }

  // Shared edges: key by the vertex-index pair (sorted). First face sets
  // faceA; second face sets faceB. Edges with only one adjacent face stay
  // at faceB = -1 (boundary edges).
  const edgeMap = new Map<
    number,
    { v0: number; v1: number; faceA: number; faceB: number }
  >();
  // Encode an edge key as a 53-bit integer (safe while vertex count < 2^26).
  const keyFor = (a: number, b: number): number => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return lo * 67108864 + hi; // lo * 2^26 + hi
  };
  for (let f = 0; f < faceCount; f++) {
    const i0 = indices[f * 3];
    const i1 = indices[f * 3 + 1];
    const i2 = indices[f * 3 + 2];
    for (const [a, b] of [
      [i0, i1],
      [i1, i2],
      [i2, i0],
    ]) {
      const key = keyFor(a, b);
      const existing = edgeMap.get(key);
      if (existing) {
        existing.faceB = f;
      } else {
        edgeMap.set(key, {
          v0: Math.min(a, b),
          v1: Math.max(a, b),
          faceA: f,
          faceB: -1,
        });
      }
    }
  }

  return {
    edges: Array.from(edgeMap.values()),
    centroids,
    normals,
    vertices,
  };
}
