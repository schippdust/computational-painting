import P5 from 'p5';
import type { Line } from './Line';
import { Intersections3d } from '../Core/Intersections3d';

/**
 * An axis-aligned bounding box (AABB) in 3D space.
 * Defined by a center point and a uniform half-extent on all three axes,
 * making it a cube. Used as the spatial boundary type for all octree nodes.
 */
export class BBox {
  /**
   * Creates a new BBox.
   * @param center The center of the cubic region
   * @param halfSize Half the side length of the cube (total side = 2 * halfSize)
   */
  constructor(
    public center: P5.Vector,
    public halfSize: number,
  ) {}

  /**
   * Tests whether a point lies inside this bounding box.
   * Uses half-open intervals (inclusive min, exclusive max) per axis.
   * @param point The point to test
   * @returns True if the point is inside this box
   */
  containsPoint(point: P5.Vector): boolean {
    return Intersections3d.pointInBox(point, this.center, this.halfSize);
  }

  /**
   * Tests whether a sphere overlaps this bounding box.
   * @param center The sphere's center
   * @param radius The sphere's radius
   * @returns True if the sphere intersects or is contained by this box
   */
  intersectsSphere(center: P5.Vector, radius: number): boolean {
    return Intersections3d.sphereIntersectsBox(
      center,
      radius,
      this.center,
      this.halfSize,
    );
  }

  /**
   * Tests whether a line segment intersects this bounding box using the slab method.
   * @param line The line segment to test
   * @returns True if any part of the line passes through or touches this box
   */
  intersectsLine(line: Line): boolean {
    return Intersections3d.lineIntersectsBox(line, this.center, this.halfSize);
  }

  /**
   * Returns the child BBox for the given octant offset.
   * The child has halfSize / 2 and its center is offset from this center
   * by halfSize/2 in each axis direction.
   * @param dx -1 for the negative-x octant, +1 for positive-x
   * @param dy -1 for the negative-y octant, +1 for positive-y
   * @param dz -1 for the negative-z octant, +1 for positive-z
   * @returns The BBox for that octant
   */
  childAt(dx: -1 | 1, dy: -1 | 1, dz: -1 | 1): BBox {
    const hs = this.halfSize / 2;
    const childCenter = new P5.Vector(
      this.center.x + dx * hs,
      this.center.y + dy * hs,
      this.center.z + dz * hs,
    );
    return new BBox(childCenter, hs);
  }

  /**
   * Computes a BBox that tightly contains all provided points, with a 10% size buffer.
   * The buffer prevents points on the exact boundary from being missed.
   * @param pts The points to fit inside the box
   * @returns A BBox containing all points
   * @throws Error if pts is empty
   */
  static fromPoints(pts: P5.Vector[]): BBox {
    if (pts.length === 0) throw new Error('BBox.fromPoints requires at least one point.');

    const min = pts[0].copy();
    const max = pts[0].copy();

    for (const p of pts) {
      min.x = Math.min(min.x, p.x);
      min.y = Math.min(min.y, p.y);
      min.z = Math.min(min.z, p.z);
      max.x = Math.max(max.x, p.x);
      max.y = Math.max(max.y, p.y);
      max.z = Math.max(max.z, p.z);
    }

    const center = P5.Vector.add(min, max).div(2);
    const size =
      Math.max(max.x - min.x, max.y - min.y, max.z - min.z) * 1.1;
    const halfSize = Math.max(size / 2, 1); // minimum 1 to avoid zero-size degenerate box

    return new BBox(center, halfSize);
  }
}
