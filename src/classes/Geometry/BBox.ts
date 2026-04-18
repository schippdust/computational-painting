import P5 from 'p5';
import type { Line } from './Line';
import { Intersections3d } from '../Core/Intersections3d';

/**
 * An axis-aligned bounding box (AABB) in 3D space.
 * Defined by a center point and independent half-extents per axis, allowing any
 * rectangular cuboid shape. The constructor takes halfX, halfY, halfZ as separate
 * numbers so non-cubic boxes are the natural form. Use BBox.cube() when you need
 * uniform extents on all axes.
 *
 * The halfExtents P5.Vector property is derived from the constructor args and can
 * be read directly when the combined vector is more convenient.
 */
export class BBox {
  /** Per-axis half-extents as a vector. Derived from the constructor args. */
  public halfExtents: P5.Vector;

  /**
   * Creates a new BBox with independent half-extents on each axis.
   * @param center The center of the region
   * @param halfX  Half-extent along the X axis (total X size = 2 * halfX)
   * @param halfY  Half-extent along the Y axis (total Y size = 2 * halfY)
   * @param halfZ  Half-extent along the Z axis (total Z size = 2 * halfZ)
   */
  constructor(
    public center: P5.Vector,
    halfX: number,
    halfY: number,
    halfZ: number,
  ) {
    this.halfExtents = new P5.Vector(halfX, halfY, halfZ);
  }

  /**
   * Tests whether a point lies inside this bounding box.
   * Uses half-open intervals (inclusive min, exclusive max) per axis.
   * @param point The point to test
   * @returns True if the point is inside this box
   */
  containsPoint(point: P5.Vector): boolean {
    return Intersections3d.pointInBox(point, this);
  }

  /**
   * Tests whether a sphere overlaps this bounding box.
   * @param center The sphere's center
   * @param radius The sphere's radius
   * @returns True if the sphere intersects or is contained by this box
   */
  intersectsSphere(center: P5.Vector, radius: number): boolean {
    return Intersections3d.sphereIntersectsBox(center, radius, this);
  }

  /**
   * Tests whether a line segment intersects this bounding box using the slab method.
   * @param line The line segment to test
   * @returns True if any part of the line passes through or touches this box
   */
  intersectsLine(line: Line): boolean {
    return Intersections3d.lineIntersectsBox(line, this);
  }

  /**
   * Returns the child BBox for the given octant offset.
   * Each axis is halved independently, so non-cubic parents produce non-cubic children.
   * @param dx -1 for the negative-x octant, +1 for positive-x
   * @param dy -1 for the negative-y octant, +1 for positive-y
   * @param dz -1 for the negative-z octant, +1 for positive-z
   * @returns The BBox for that octant
   */
  childAt(dx: -1 | 1, dy: -1 | 1, dz: -1 | 1): BBox {
    const hx = this.halfExtents.x / 2;
    const hy = this.halfExtents.y / 2;
    const hz = this.halfExtents.z / 2;
    return new BBox(
      new P5.Vector(
        this.center.x + dx * hx,
        this.center.y + dy * hy,
        this.center.z + dz * hz,
      ),
      hx,
      hy,
      hz,
    );
  }

  /**
   * Computes a tight-fitting BBox around all provided points, with a 10% buffer
   * per axis. Each axis is sized independently so the result matches the actual
   * data extents rather than forcing a cube.
   * @param pts The points to fit inside the box
   * @returns A BBox containing all points
   * @throws Error if pts is empty
   */
  static fromPoints(pts: P5.Vector[]): BBox {
    if (pts.length === 0)
      throw new Error('BBox.fromPoints requires at least one point.');

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
    return new BBox(
      center,
      Math.max(((max.x - min.x) / 2) * 1.1, 1),
      Math.max(((max.y - min.y) / 2) * 1.1, 1),
      Math.max(((max.z - min.z) / 2) * 1.1, 1),
    );
  }

  /**
   * Creates a cubic BBox with equal half-extents on all axes.
   * Convenience factory for when a uniform cube is desired.
   * @param center   The center of the cube
   * @param halfSize Half the side length (applied to all three axes)
   * @returns A cubic BBox
   */
  static cube(center: P5.Vector, halfSize: number): BBox {
    return new BBox(center, halfSize, halfSize, halfSize);
  }
}
