import P5 from 'p5';
import { Line } from './Line';
import { Sphere } from './Sphere';
import { Polyline } from './Polyline';
import { CoordinateSystem } from './CoordinateSystem';
import { Intersections3d } from '../Core/Intersections3d';
import type { GeometryItem } from './GeometryTypes';

/**
 * An axis-aligned bounding box (AABB) in 3D space.
 * Defined by a center point and independent half-extents per axis, allowing any
 * rectangular cuboid shape. The constructor takes halfX, halfY, halfZ as separate
 * numbers so non-cubic boxes are the natural form. Use BBox.cube() when you need
 * uniform extents on all axes.
 *
 * All static factory methods accept an optional CoordinateSystem parameter. When
 * provided, input geometry is transformed to that coordinate system's local space
 * before the box is computed, producing a CS-axis-aligned (OBB-style) bounding
 * volume expressed in local coordinates. Intersection tests on a CS-aligned BBox
 * should be performed with geometry also transformed to the same local space.
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

  // ── Intersection tests ────────────────────────────────────────────────────

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
   * Tests whether any segment of a polyline intersects this bounding box.
   * @param polyline The polyline to test
   * @returns True if at least one segment of the polyline passes through or touches this box
   */
  intersectsPolyline(polyline: Polyline): boolean {
    return Intersections3d.polylineIntersectsBox(polyline, this);
  }

  // ── Random sampling ──────────────────────────────────────────────────────

  /**
   * Returns a uniformly random point within this bounding box.
   * @returns A random P5.Vector inside the box
   */
  randomPoint(): P5.Vector {
    return new P5.Vector(
      this.center.x + (Math.random() * 2 - 1) * this.halfExtents.x,
      this.center.y + (Math.random() * 2 - 1) * this.halfExtents.y,
      this.center.z + (Math.random() * 2 - 1) * this.halfExtents.z,
    );
  }

  // ── Subdivision ───────────────────────────────────────────────────────────

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

  // ── Static factories ──────────────────────────────────────────────────────

  /**
   * Computes a tight-fitting BBox around all provided points, with a 10% buffer
   * per axis. Each axis is sized independently so the result matches the actual
   * data extents rather than forcing a cube.
   *
   * When coordinateSystem is provided the points are first transformed into that
   * CS's local space; the returned BBox is expressed in local coordinates.
   *
   * @param pts              The points to fit inside the box
   * @param coordinateSystem Optional CS to align the box to; omit for world axes
   * @returns A BBox containing all points
   * @throws Error if pts is empty
   */
  static fromPoints(
    pts: P5.Vector[],
    coordinateSystem?: CoordinateSystem,
  ): BBox {
    if (pts.length === 0)
      throw new Error('BBox.fromPoints requires at least one point.');

    const resolved = coordinateSystem
      ? BBox._toLocalSpace(pts, coordinateSystem)
      : pts;

    const min = resolved[0].copy();
    const max = resolved[0].copy();

    for (const p of resolved) {
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
   *
   * When coordinateSystem is provided the center is transformed into that CS's
   * local space; the returned BBox is expressed in local coordinates.
   *
   * @param center           The center of the cube in world space (or local space if no CS)
   * @param halfSize         Half the side length (applied to all three axes)
   * @param coordinateSystem Optional CS to align the box to; omit for world axes
   * @returns A cubic BBox
   */
  static cube(
    center: P5.Vector,
    halfSize: number,
    coordinateSystem?: CoordinateSystem,
  ): BBox {
    const resolved = coordinateSystem
      ? BBox._toLocalSpace([center], coordinateSystem)[0]
      : center;
    return new BBox(resolved, halfSize, halfSize, halfSize);
  }

  /**
   * Computes a BBox that exactly contains the given geometry (no buffer).
   *
   * - P5.Vector: a zero-extent point box at that position.
   * - Line: the box spans the two endpoints on each axis.
   * - Sphere: the box extends by the sphere's radius in every direction from center,
   *   producing a cube whose side length equals the sphere's diameter.
   *
   * When coordinateSystem is provided the geometry is transformed into that CS's
   * local space before the box is computed. The returned BBox is expressed in
   * local coordinates; run intersection tests with geometry also in local space.
   *
   * @param geometry         A GeometryItem (P5.Vector, Line, or Sphere) to bound
   * @param coordinateSystem Optional CS to align the box to; omit for world axes
   * @returns A BBox tightly containing the geometry
   */
  static fromGeometry(
    geometry: GeometryItem,
    coordinateSystem?: CoordinateSystem,
  ): BBox {
    if (geometry instanceof Line) {
      let s = geometry.startPoint;
      let e = geometry.endPoint;

      if (coordinateSystem) {
        [s, e] = BBox._toLocalSpace([s, e], coordinateSystem);
      }

      return new BBox(
        new P5.Vector((s.x + e.x) / 2, (s.y + e.y) / 2, (s.z + e.z) / 2),
        Math.abs(e.x - s.x) / 2,
        Math.abs(e.y - s.y) / 2,
        Math.abs(e.z - s.z) / 2,
      );
    }

    if (geometry instanceof Sphere) {
      const r = geometry.radius;
      const center = coordinateSystem
        ? BBox._toLocalSpace([geometry.centerPoint], coordinateSystem)[0]
        : geometry.centerPoint.copy();
      return new BBox(center, r, r, r);
    }

    if (geometry instanceof Polyline) {
      return BBox.fromPoints(geometry.points, coordinateSystem);
    }

    // P5.Vector — a point has no extent
    const pt = coordinateSystem
      ? BBox._toLocalSpace([geometry], coordinateSystem)[0]
      : geometry.copy();
    return new BBox(pt, 0, 0, 0);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Transforms an array of world-space points into the given coordinate system's
   * local space using the world CS as the input frame.
   * @param worldPts         Points in world space
   * @param coordinateSystem Target local coordinate system
   * @returns Points expressed in the CS's local coordinates
   */
  private static _toLocalSpace(
    worldPts: P5.Vector[],
    coordinateSystem: CoordinateSystem,
  ): P5.Vector[] {
    return CoordinateSystem.transformLocalPointsToTargetCs(
      CoordinateSystem.getWorldAxes(),
      coordinateSystem,
      worldPts,
    );
  }
}
