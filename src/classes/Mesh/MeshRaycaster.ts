import P5 from 'p5';
import { Raycaster, Vector3 } from 'three';
import type { Intersection } from 'three';
import { Mesh3D } from './Mesh3D';

/** Result of a successful raycast against a Mesh3D. */
export interface RayHit {
  /** World-space point of intersection. */
  point: P5.Vector;
  /** Distance from the ray origin to the hit point. */
  distance: number;
  /** The mesh that was hit. */
  mesh: Mesh3D;
  /** Index of the hit face (triangle), if available. */
  faceIndex: number | null;
}

/**
 * BVH-accelerated raycasting service. Holds a single THREE.Raycaster that is
 * mutated per query (cheap) and walks a user-supplied list of Mesh3D
 * occluders each call. Accepts origins/directions as P5.Vectors and returns
 * hits expressed in P5.Vectors, so nothing outside this module needs to know
 * about THREE types.
 */
export class MeshRaycaster {
  private readonly raycaster = new Raycaster();
  private readonly originBuffer = new Vector3();
  private readonly dirBuffer = new Vector3();

  /**
   * Casts a ray from `origin` along `direction` and returns the first
   * intersection across all `meshes`, or null if nothing was hit within
   * `[near, far]`.
   *
   * `direction` is normalized internally; callers can pass an unnormalized
   * ray direction without issue.
   *
   * @param origin World-space ray origin.
   * @param direction Ray direction (will be normalized).
   * @param meshes Meshes to test against.
   * @param near Minimum hit distance (default 0, bumped slightly in practice by callers).
   * @param far Maximum hit distance (default Infinity).
   */
  raycast(
    origin: P5.Vector,
    direction: P5.Vector,
    meshes: Mesh3D[],
    near: number = 0,
    far: number = Infinity,
  ): RayHit | null {
    if (meshes.length === 0) return null;
    this.originBuffer.set(origin.x, origin.y, origin.z);
    this.dirBuffer.set(direction.x, direction.y, direction.z).normalize();
    this.raycaster.set(this.originBuffer, this.dirBuffer);
    this.raycaster.near = near;
    this.raycaster.far = far;
    this.raycaster.firstHitOnly = true;

    let best: Intersection | null = null;
    let bestMesh: Mesh3D | null = null;
    for (const mesh of meshes) {
      const hits: Intersection[] = [];
      mesh.threeMesh.raycast(this.raycaster, hits);
      for (const h of hits) {
        if (best === null || h.distance < best.distance) {
          best = h;
          bestMesh = mesh;
        }
      }
    }

    if (best === null || bestMesh === null) return null;
    return {
      point: new P5.Vector(best.point.x, best.point.y, best.point.z),
      distance: best.distance,
      mesh: bestMesh,
      faceIndex: best.faceIndex ?? null,
    };
  }

  /**
   * Tests whether the segment from `from` to `to` is blocked by any mesh in
   * `occluders`. A hit whose distance is less than the segment length minus
   * `epsilon` means the endpoint is occluded.
   *
   * An `originEpsilon` is applied by stepping the ray origin a small amount
   * toward `to` so the ray does not immediately self-hit the mesh that owns
   * `from` (e.g. when sampling points near a silhouette edge of an occluder).
   *
   * @param from Ray origin (typically camera position).
   * @param to World-space target point.
   * @param occluders Meshes to test against.
   * @param originEpsilon Forward offset applied to the ray origin (default 0.01).
   * @param endEpsilon Tolerance subtracted from the segment length before comparison (default 0.5).
   */
  isOccluded(
    from: P5.Vector,
    to: P5.Vector,
    occluders: Mesh3D[],
    originEpsilon: number = 0.01,
    endEpsilon: number = 0.5,
  ): boolean {
    if (occluders.length === 0) return false;
    const dir = P5.Vector.sub(to, from);
    const fullDist = dir.mag();
    if (fullDist <= originEpsilon) return false;
    dir.normalize();
    const offsetOrigin = P5.Vector.add(from, dir.copy().mult(originEpsilon));
    const maxDist = fullDist - originEpsilon;
    const hit = this.raycast(offsetOrigin, dir, occluders, 0, maxDist);
    if (hit === null) return false;
    return hit.distance < maxDist - endEpsilon;
  }

}
