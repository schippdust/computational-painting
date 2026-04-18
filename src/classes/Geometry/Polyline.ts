import P5 from 'p5';
import type { Camera3D } from '../Core/Camera3D';
import { Line } from './Line';
import { CoordinateSystem } from './CoordinateSystem';

/**
 * A polyline in 3D space defined by an ordered sequence of points.
 * Internally stored as an array of Line segments connecting consecutive points.
 * All parametric and arc-length queries use true arc-length parameterization so
 * t=0.5 always lands at the geometric midpoint regardless of segment lengths.
 */
export class Polyline {
  /** Ordered array of line segments composing the polyline. */
  public readonly segments: Line[];

  private readonly _length: number;

  /**
   * Creates a new Polyline from an ordered list of points.
   * @param points At least two points; the first is the start, the last is the end.
   * @throws Error if fewer than two points are supplied
   */
  constructor(points: P5.Vector[]) {
    if (points.length < 2) {
      throw new Error('Polyline requires at least two points.');
    }
    this.segments = [];
    for (let i = 0; i < points.length - 1; i++) {
      this.segments.push(new Line(points[i].copy(), points[i + 1].copy()));
    }
    this._length = this.segments.reduce((sum, s) => sum + s.getLength(), 0);
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  /** Total arc length of the polyline. */
  get length(): number {
    return this._length;
  }

  /** Number of line segments (= number of points − 1). */
  get segmentCount(): number {
    return this.segments.length;
  }

  /** Copy of the first point. */
  get startPoint(): P5.Vector {
    return this.segments[0].startPoint.copy();
  }

  /** Copy of the last point. */
  get endPoint(): P5.Vector {
    return this.segments[this.segments.length - 1].endPoint.copy();
  }

  /**
   * Returns all defining points as an ordered array of copies.
   * Length equals segmentCount + 1.
   */
  get points(): P5.Vector[] {
    const pts = this.segments.map((s) => s.startPoint.copy());
    pts.push(this.segments[this.segments.length - 1].endPoint.copy());
    return pts;
  }

  // ── Parametric queries (t ∈ [0, 1]) ──────────────────────────────────────

  /**
   * Returns the point at normalized parameter t along the polyline.
   * Uses arc-length parameterization: t=0 → start, t=1 → end, t=0.5 → midpoint.
   * @param t Normalized parameter clamped to [0, 1]
   * @returns The world-space point at t
   */
  getPointAtParam(t: number): P5.Vector {
    return this.getPointAtDistance(t * this._length);
  }

  /**
   * Returns the coordinate system at normalized parameter t.
   * The Z axis is the polyline tangent at that point.
   * @param t Normalized parameter clamped to [0, 1]
   * @returns A CoordinateSystem aligned to the polyline at t
   */
  getCoordinateSystemAtParam(t: number): CoordinateSystem {
    return this.getCoordinateSystemAtDistance(t * this._length);
  }

  /**
   * Returns the normalized tangent direction at parameter t.
   * At segment junctions the tangent of the incoming segment is used.
   * @param t Normalized parameter clamped to [0, 1]
   * @returns A unit vector in the polyline's travel direction at t
   */
  getTangentAtParam(t: number): P5.Vector {
    return this.getTangentAtDistance(t * this._length);
  }

  // ── Arc-length queries ────────────────────────────────────────────────────

  /**
   * Returns the point at the given arc-length distance from the start.
   * Clamped to [0, length].
   * @param distance Arc-length distance from the start
   * @returns The world-space point at that distance
   */
  getPointAtDistance(distance: number): P5.Vector {
    const { segment, localT } = this._resolveDistance(distance);
    return segment.getPointAtParam(localT);
  }

  /**
   * Returns the coordinate system at the given arc-length distance from the start.
   * @param distance Arc-length distance from the start
   * @returns A CoordinateSystem aligned to the polyline at that distance
   */
  getCoordinateSystemAtDistance(distance: number): CoordinateSystem {
    const { segment, localT } = this._resolveDistance(distance);
    return segment.getCoordinateSystemAtParam(localT);
  }

  /**
   * Returns the normalized tangent direction at the given arc-length distance.
   * @param distance Arc-length distance from the start
   * @returns A unit vector in the polyline's travel direction at that distance
   */
  getTangentAtDistance(distance: number): P5.Vector {
    const { segment } = this._resolveDistance(distance);
    return segment.endPoint.copy().sub(segment.startPoint).normalize();
  }

  /**
   * Converts an arc-length distance to a normalized parameter.
   * Inverse of distance = t * length.
   * @param distance Arc-length distance from the start
   * @returns t in [0, 1]
   */
  getParamAtDistance(distance: number): number {
    if (this._length === 0) return 0;
    return Math.max(0, Math.min(1, distance / this._length));
  }

  // ── Nearest point ─────────────────────────────────────────────────────────

  /**
   * Finds the closest point on the polyline to a query point.
   * Tests every segment and returns the nearest result.
   * @param point The query point in world space
   * @returns The closest point on the polyline
   */
  getNearestPoint(point: P5.Vector): P5.Vector {
    return this._resolveNearestPoint(point).nearest;
  }

  /**
   * Returns the coordinate system at the point on the polyline closest to a query point.
   * @param point The query point in world space
   * @returns A CoordinateSystem at the nearest location on the polyline
   */
  getCoordinateSystemAtNearestPoint(point: P5.Vector): CoordinateSystem {
    const { segment, localT } = this._resolveNearestPoint(point);
    return segment.getCoordinateSystemAtParam(localT);
  }

  /**
   * Returns the normalized parameter [0, 1] corresponding to the point on the
   * polyline closest to a query point. Useful for projecting a point onto the
   * polyline and then sampling other properties at that location.
   * @param point The query point in world space
   * @returns t in [0, 1] of the nearest point on the polyline
   */
  getParamAtNearestPoint(point: P5.Vector): number {
    return this._resolveNearestPoint(point).param;
  }

  // ── Transforms ────────────────────────────────────────────────────────────

  /**
   * Returns a new Polyline with points in reversed order.
   * The original is not mutated.
   * @returns A new Polyline running from the original end to the original start
   */
  reversed(): Polyline {
    return new Polyline([...this.points].reverse());
  }

  /**
   * Returns a new Polyline translated by the given offset.
   * The original is not mutated.
   * @param offset Vector to add to every point
   * @returns A new Polyline shifted by offset
   */
  transform(offset: P5.Vector): Polyline {
    return new Polyline(this.points.map((p) => P5.Vector.add(p, offset)));
  }

  /**
   * Splits the polyline into two at parameter t, returning both halves.
   * The split point is shared as the end of the first and start of the second.
   * Intended for t strictly between 0 and 1; at the boundaries one half will
   * be a degenerate zero-length segment.
   * @param t Normalized parameter at which to split, clamped to [0, 1]
   * @returns A tuple [firstHalf, secondHalf]
   */
  split(t: number): [Polyline, Polyline] {
    const clampedT = Math.max(0, Math.min(1, t));
    const { segment, localT } = this._resolveDistance(clampedT * this._length);
    const splitPt = segment.getPointAtParam(localT);
    const segIdx = this.segments.indexOf(segment);
    const pts = this.points;

    const firstPts = pts.slice(0, segIdx + 1);
    if (localT > 0) firstPts.push(splitPt);

    const secondPts: P5.Vector[] = [];
    if (localT < 1) secondPts.push(splitPt);
    secondPts.push(...pts.slice(segIdx + 1));

    // Guarantee minimum two points in each half for the Polyline constructor
    if (firstPts.length < 2) firstPts.push(splitPt.copy());
    if (secondPts.length < 2) secondPts.unshift(splitPt.copy());

    return [new Polyline(firstPts), new Polyline(secondPts)];
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  /**
   * Renders the polyline directly in 2D using p5's shape primitives.
   * Draws a connected open shape through all points using the current stroke settings.
   * @param p5 The p5 instance to render with
   */
  render2D(p5: P5): void {
    p5.push();
    p5.beginShape();
    for (const seg of this.segments) {
      p5.vertex(seg.startPoint.x, seg.startPoint.y);
    }
    const last = this.segments[this.segments.length - 1];
    p5.vertex(last.endPoint.x, last.endPoint.y);
    p5.endShape();
    p5.pop();
  }

  /**
   * Renders the polyline in 3D by projecting each segment through a camera.
   * Segments that cross the near clip plane are culled individually, so partial
   * visibility is handled correctly.
   * @param p5     The p5 instance to render with
   * @param camera The Camera3D used for 3D → 2D projection
   */
  renderProjected(p5: P5, camera: Camera3D): void {
    p5.push();
    for (const seg of this.segments) {
      seg.renderProjected(p5, camera);
    }
    p5.pop();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Resolves an arc-length distance to the containing segment and local parameter.
   * Distance is clamped to [0, length] before resolution.
   * @param distance Arc-length distance from the start
   * @returns The segment and localT ∈ [0, 1] within that segment
   */
  private _resolveDistance(distance: number): {
    segment: Line;
    localT: number;
  } {
    let remaining = Math.max(0, Math.min(distance, this._length));
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const segLen = seg.getLength();
      const isLast = i === this.segments.length - 1;
      if (remaining <= segLen || isLast) {
        const localT = segLen > 0 ? Math.min(remaining / segLen, 1) : 0;
        return { segment: seg, localT };
      }
      remaining -= segLen;
    }
    const last = this.segments[this.segments.length - 1];
    return { segment: last, localT: 1 };
  }

  /**
   * Finds the segment and local parameter of the point on the polyline
   * closest to a given query point.
   * @param point The query point
   * @returns The best segment, its localT, the nearest world-space point, and global param
   */
  private _resolveNearestPoint(point: P5.Vector): {
    segment: Line;
    localT: number;
    nearest: P5.Vector;
    param: number;
  } {
    let bestIdx = 0;
    let bestNearest = this.segments[0].getNearestPoint(point);
    let bestDist = P5.Vector.dist(point, bestNearest);

    for (let i = 1; i < this.segments.length; i++) {
      const candidate = this.segments[i].getNearestPoint(point);
      const dist = P5.Vector.dist(point, candidate);
      if (dist < bestDist) {
        bestDist = dist;
        bestNearest = candidate;
        bestIdx = i;
      }
    }

    const bestSeg = this.segments[bestIdx];
    const segLen = bestSeg.getLength();
    const localT =
      segLen > 0
        ? Math.min(P5.Vector.dist(bestSeg.startPoint, bestNearest) / segLen, 1)
        : 0;

    let distanceBefore = 0;
    for (let i = 0; i < bestIdx; i++) {
      distanceBefore += this.segments[i].getLength();
    }
    const globalDist = distanceBefore + localT * segLen;
    const param = this._length > 0 ? globalDist / this._length : 0;

    return { segment: bestSeg, localT, nearest: bestNearest, param };
  }
}
