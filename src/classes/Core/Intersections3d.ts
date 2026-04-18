import P5 from 'p5';
import type { BBox } from '../Geometry/BBox';
import type { Line } from '../Geometry/Line';

/**
 * Static utility class for 3D intersection and containment tests.
 * All geometry classes and spatial structures delegate to these methods
 * so the math lives in one place and can be reused freely.
 */
export class Intersections3d {
  /**
   * Tests whether a point is inside an axis-aligned bounding box.
   * Uses half-open intervals: inclusive on the min face, exclusive on the max face.
   * @param point The point to test
   * @param bbox  The bounding box to test against
   * @returns True if the point is inside the box
   */
  static pointInBox(point: P5.Vector, bbox: BBox): boolean {
    const { center, halfExtents } = bbox;
    return (
      point.x >= center.x - halfExtents.x &&
      point.x < center.x + halfExtents.x &&
      point.y >= center.y - halfExtents.y &&
      point.y < center.y + halfExtents.y &&
      point.z >= center.z - halfExtents.z &&
      point.z < center.z + halfExtents.z
    );
  }

  /**
   * Tests whether a sphere overlaps an axis-aligned bounding box.
   * Uses the squared minimum-distance-from-center-to-box test.
   * @param sphereCenter The sphere's center
   * @param radius       The sphere's radius
   * @param bbox         The bounding box to test against
   * @returns True if the sphere intersects or is fully inside the box
   */
  static sphereIntersectsBox(
    sphereCenter: P5.Vector,
    radius: number,
    bbox: BBox,
  ): boolean {
    const { center, halfExtents } = bbox;
    let d = 0;
    for (const [val, c, he] of [
      [sphereCenter.x, center.x, halfExtents.x],
      [sphereCenter.y, center.y, halfExtents.y],
      [sphereCenter.z, center.z, halfExtents.z],
    ] as [number, number, number][]) {
      const min = c - he;
      const max = c + he;
      if (val < min) d += (val - min) ** 2;
      else if (val > max) d += (val - max) ** 2;
    }
    return d <= radius ** 2;
  }

  /**
   * Tests whether a line segment intersects an axis-aligned bounding box.
   * Uses the slab method: intersects all three axis-aligned slab pairs and checks
   * that the resulting t-intervals overlap and fall within [0, 1].
   * @param line The line segment to test
   * @param bbox The bounding box to test against
   * @returns True if any part of the segment passes through or touches the box
   */
  static lineIntersectsBox(line: Line, bbox: BBox): boolean {
    const { startPoint, endPoint } = line;
    const { center, halfExtents } = bbox;

    const axes: [number, number, number, number][] = [
      [endPoint.x - startPoint.x, startPoint.x, center.x, halfExtents.x],
      [endPoint.y - startPoint.y, startPoint.y, center.y, halfExtents.y],
      [endPoint.z - startPoint.z, startPoint.z, center.z, halfExtents.z],
    ];

    let tMin = 0;
    let tMax = 1;

    for (const [d, o, c, he] of axes) {
      const min = c - he;
      const max = c + he;

      if (Math.abs(d) < 1e-9) {
        // Ray is parallel to this slab — check if origin is inside
        if (o < min || o > max) return false;
      } else {
        const t1 = (min - o) / d;
        const t2 = (max - o) / d;
        const tNear = Math.min(t1, t2);
        const tFar = Math.max(t1, t2);
        tMin = Math.max(tMin, tNear);
        tMax = Math.min(tMax, tFar);
        if (tMin > tMax) return false;
      }
    }

    return tMin <= tMax;
  }

  /**
   * Tests whether a point is inside a sphere.
   * @param point       The point to test
   * @param sphereCenter The sphere's center
   * @param radius       The sphere's radius
   * @returns True if the point is inside or on the surface of the sphere
   */
  static pointInSphere(
    point: P5.Vector,
    sphereCenter: P5.Vector,
    radius: number,
  ): boolean {
    return P5.Vector.dist(point, sphereCenter) <= radius;
  }

  /**
   * Tests whether two spheres intersect.
   * @param c1 Center of the first sphere
   * @param r1 Radius of the first sphere
   * @param c2 Center of the second sphere
   * @param r2 Radius of the second sphere
   * @returns True if the spheres overlap or touch
   */
  static sphereIntersectsSphere(
    c1: P5.Vector,
    r1: number,
    c2: P5.Vector,
    r2: number,
  ): boolean {
    return P5.Vector.dist(c1, c2) <= r1 + r2;
  }
}
