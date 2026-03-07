import P5 from 'p5';
import type { Camera3D } from '../Core/Camera3D';
import { CoordinateSystem } from './CoordinateSystem';

/**
 * Represents a line segment in 2D or 3D space defined by two endpoints.
 * Provides methods for geometric calculations including point sampling,
 * nearest point projection, and coordinate system generation along the line.
 */
export class Line {
  /**
   * Creates a new Line instance.
   * @param starPoint The starting point of the line segment
   * @param endPoint The ending point of the line segment
   */
  constructor(
    public starPoint: P5.Vector,
    public endPoint: P5.Vector,
  ) {}

  /**
   * Gets a point along the line at parameter t.
   * @param t Normalized parameter from 0 (start point) to 1 (end point)
   * @returns A point interpolated along the line at parameter t
   */
  getPointAtParam(t: number): P5.Vector {
    return this.starPoint.copy().lerp(this.endPoint, t);
  }

  /**
   * Finds the nearest point on the line to a given point in space.
   * The result is clamped to the line segment between start and end points.
   * @param point The point to project onto the line
   * @returns The closest point on the line segment to the given point
   */
  getNearestPoint(point: P5.Vector): P5.Vector {
    const lineVector = this.endPoint.copy().sub(this.starPoint);
    const pointVector = point.copy().sub(this.starPoint);
    let t = pointVector.dot(lineVector) / lineVector.magSq();
    t = Math.max(0, Math.min(1, t));
    return this.getPointAtParam(t);
  }

  /**
   * Creates a local coordinate system at a point along the line.
   * The coordinate system has the line's direction as the X-axis (tangent),
   * and automatically generates orthogonal normal and binormal vectors.
   * @param t Normalized parameter from 0 to 1 along the line
   * @returns A CoordinateSystem positioned at parameter t with tangent alignment
   */
  getCoordinateSystemAtParam(t: number): CoordinateSystem {
    const position = this.getPointAtParam(t);
    const tangent = this.endPoint.copy().sub(this.starPoint).normalize();
    let arbitrary = new P5.Vector(0, 0, 1);
    if (Math.abs(tangent.dot(arbitrary)) > 0.99) {
      arbitrary = new P5.Vector(1, 0, 0);
    }
    const normal = tangent.copy().cross(arbitrary).normalize();
    return CoordinateSystem.fromOriginNormalX(position, tangent, normal);
  }

  /**
   * Creates a local coordinate system at the nearest point on the line to a given point.
   * Combines the functionality of getNearestPoint and getCoordinateSystemAtParam.
   * @param point The reference point to find the nearest location on the line
   * @returns A CoordinateSystem positioned at the nearest point with tangent alignment
   */
  getCoordinateSystemAtNearestPoint(point: P5.Vector): CoordinateSystem {
    const nearestPoint = this.getNearestPoint(point);
    const tangent = this.endPoint.copy().sub(this.starPoint).normalize();
    let arbitrary = new P5.Vector(0, 0, 1);
    if (Math.abs(tangent.dot(arbitrary)) > 0.99) {
      arbitrary = new P5.Vector(1, 0, 0);
    }
    const normal = tangent.copy().cross(arbitrary).normalize();
    return CoordinateSystem.fromOriginNormalX(nearestPoint, tangent, normal);
  }

  /**
   * Calculates the Euclidean distance between the start and end points.
   * @returns The length of the line segment
   */
  getLength(): number {
    return this.starPoint.dist(this.endPoint);
  }

  /**
   * Renders the line directly in 2D space using the p5 graphics context.
   * Draws a line from starPoint to endPoint using the current stroke settings.
   * @param p5 The p5 instance to use for rendering
   */
  render2D(p5: P5) {
    p5.line(
      this.starPoint.x,
      this.starPoint.y,
      this.endPoint.x,
      this.endPoint.y,
    );
  }

  /**
   * Renders the line in 3D space by projecting it through a camera into 2D screen coordinates.
   * Handles 3D lines that may need to be rendered as multiple projected line segments.
   * @param p5 The p5 instance to use for rendering
   * @param camera The Camera3D instance that defines the projection transformation
   */
  renderProjected(p5: P5, camera: Camera3D) {
    const projectedLines = camera.renderLines(this);
    for (const line of projectedLines) {
      p5.line(
        line.starPoint.x,
        line.starPoint.y,
        line.endPoint.x,
        line.endPoint.y,
      );
    }
  }
}
