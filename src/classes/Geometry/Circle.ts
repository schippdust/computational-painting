import P5 from 'p5';
import { Line } from './Line';
import { CoordinateSystem } from './CoordinateSystem';
import type { Camera3D } from '../Core/Camera3D';

/**
 * Represents a circle or sphere in 3D space.
 * Uses a coordinate system for positioning and orientation, and can generate random points
 * on or within the circle/sphere. Rendering is approximated as line segments.
 */
export class Circle {
  public renderSegments: Line[] = [];
  private _renderSegmentCount: number = 16;

  /**
   * Creates a new Circle instance.
   * @param coordinateSystem The coordinate system defining the circle's position and orientation
   * @param _radius The radius of the circle
   */
  constructor(
    public coordinateSystem: CoordinateSystem,
    private _radius: number,
  ) {
    this.calculateSegments();
  }

  /**
   * Updates the circle's coordinate system and recalculates render segments.
   * This method mutates the instance and returns it for method chaining.
   * @param newCoordinateSystem The new coordinate system for the circle
   * @returns This Circle instance for method chaining
   */
  updateCoordinateSystem(newCoordinateSystem: CoordinateSystem): Circle {
    this.coordinateSystem = newCoordinateSystem;
    this.calculateSegments();
    return this;
  }

  /**
   * Gets the number of line segments used to render the circle.
   * @returns The current render segment count
   */
  get renderSegmentCount() {
    return this._renderSegmentCount;
  }

  /**
   * Sets the number of line segments used to render the circle.
   * Must be at least 8 segments for a valid circle representation.
   * Automatically recalculates render segments when changed.
   * @param segments The number of segments (must be >= 8)
   * @throws Error if segments < 8
   */
  set renderSegmentCount(segments: number) {
    if (segments >= 8) {
      this._renderSegmentCount = segments;
      this.calculateSegments();
    } else {
      throw new Error('A circle must be rendered with at least 8 segments');
    }
  }

  /**
   * Gets the radius of the circle.
   * @returns The current radius value
   */
  get radius() {
    return this._radius;
  }

  /**
   * Sets the radius of the circle and recalculates render segments.
   * @param radius The new radius value
   */
  set radius(radius: number) {
    this._radius = radius;
    this.calculateSegments();
  }

  /**
   * Gets the center point of the circle (the origin of its coordinate system).
   * @returns The center point in world coordinates
   */
  get centerPoint() {
    return this.coordinateSystem.getPosition();
  }

  /**
   * Gets the normal vector of the circle (perpendicular to the circle plane).
   * This is the Z-axis of the circle's coordinate system.
   * @returns The normal direction in world coordinates
   */
  get normal() {
    return this.coordinateSystem.getZAxis();
  }

  /**
   * Recalculates the line segments used to render the circle based on current radius and segment count.
   * Transforms points from local circle space to world space based on the coordinate system.
   * @private
   */
  private calculateSegments() {
    const segments: Line[] = [];
    const unitPoints: P5.Vector[] = [];

    for (let i = 0; i < this._renderSegmentCount; i++) {
      const point = new P5.Vector(
        Math.cos(Math.PI * 2 * (i / this._renderSegmentCount)),
        Math.sin(Math.PI * 2 * (i / this._renderSegmentCount)),
      ).mult(this._radius);
      unitPoints.push(point);
    }

    const segmentPoints = CoordinateSystem.transformLocalPointsToTargetCs(
      CoordinateSystem.getWorldAxes(),
      this.coordinateSystem,
      unitPoints,
    );

    for (let i = 0; i < segmentPoints.length; i++) {
      const stPt = segmentPoints[i];
      let endPt: P5.Vector;
      if (i < segmentPoints.length - 1) {
        endPt = segmentPoints[i + 1];
      } else {
        endPt = segmentPoints[0];
      }
      segments.push(new Line(stPt, endPt));
    }
    this.renderSegments = segments;
  }

  /**
   * Generates multiple random points on the surface of a circle or sphere.
   * @param center The circle's center as either a Vector or CoordinateSystem
   * @param radius The radius of the circle/sphere
   * @param numberOfPoints How many random points to generate
   * @param useSphere If true, generates points on a sphere surface; if false, on a circle (default: false)
   * @returns An array of random points on the surface
   */
  static getRandomPointsOnSurface(
    center: P5.Vector | CoordinateSystem,
    radius: number,
    numberOfPoints: number,
    useSphere: boolean = false,
  ) {
    const points: P5.Vector[] = [];
    for (let i = 0; i < numberOfPoints; i++) {
      points.push(Circle.getRandomPointOnSurface(center, radius, useSphere));
    }
    return points;
  }

  /**
   * Generates a single random point on the surface of a circle or sphere.
   * Uses uniform distribution for both circle and sphere surfaces.
   * @param center The circle's center as either a Vector or CoordinateSystem
   * @param radius The radius of the circle/sphere
   * @param useSphere If true, generates point on a sphere surface; if false, on a circle (default: false)
   * @returns A random point on the surface
   */
  static getRandomPointOnSurface(
    center: P5.Vector | CoordinateSystem,
    radius: number,
    useSphere: boolean = false,
  ): P5.Vector {
    const cs =
      center instanceof CoordinateSystem
        ? center
        : CoordinateSystem.fromOriginAndNormal(center, new P5.Vector(0, 0, 1));

    if (useSphere) {
      const u = Math.random();
      const v = Math.random();

      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const local = new P5.Vector(x, y, z);
      return cs.transformLocalPointsToWorldCs(local)[0];
    } else {
      const angle = Math.random() * 2 * Math.PI;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      const local = new P5.Vector(x, y, 0);
      return cs.transformLocalPointsToWorldCs(local)[0];
    }
  }

  /**
   * Generates multiple random points inside a circle or sphere.
   * @param center The circle's center as either a Vector or CoordinateSystem
   * @param radius The radius of the circle/sphere
   * @param numberOfPoints How many random points to generate
   * @param useSphere If true, generates points inside a sphere; if false, inside a circle (default: false)
   * @returns An array of random points inside the volume
   */
  static getRandomPointsInside(
    center: P5.Vector | CoordinateSystem,
    radius: number,
    numberOfPoints: number,
    useSphere: boolean = false,
  ) {
    const points: P5.Vector[] = [];
    for (let i = 0; i < numberOfPoints; i++) {
      points.push(Circle.getRandomPointInside(center, radius, useSphere));
    }
    return points;
  }

  /**
   * Generates a single random point inside a circle or sphere.
   * Uses uniform distribution corrections (cbrt for sphere, sqrt for circle) to ensure even coverage.
   * @param center The circle's center as either a Vector or CoordinateSystem
   * @param radius The radius of the circle/sphere
   * @param useSphere If true, generates point inside a sphere; if false, inside a circle (default: false)
   * @returns A random point inside the volume
   */
  static getRandomPointInside(
    center: P5.Vector | CoordinateSystem,
    radius: number,
    useSphere: boolean = false,
  ): P5.Vector {
    const cs =
      center instanceof CoordinateSystem
        ? center
        : CoordinateSystem.fromOriginAndNormal(center, new P5.Vector(0, 0, 1));

    if (useSphere) {
      const u = Math.random();
      const v = Math.random();

      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const local = new P5.Vector(x, y, z).mult(Math.cbrt(Math.random()));
      return cs.transformLocalPointsToWorldCs(local)[0];
    } else {
      const angle = Math.random() * 2 * Math.PI;
      const r = radius * Math.sqrt(Math.random());

      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);

      const local = new P5.Vector(x, y, 0);
      return cs.transformLocalPointsToWorldCs(local)[0];
    }
  }

  /**
   * Gets a point on the circle at a specific angle.
   * @param radians The angle in radians (0 to 2π)
   * @returns A point on the circle at the specified angle
   */
  getPointOnCircle(radians: number): P5.Vector {
    const localPoint = new P5.Vector(
      this._radius * Math.cos(radians),
      this._radius * Math.sin(radians),
      0,
    );
    return this.coordinateSystem.transformLocalPointsToWorldCs(localPoint)[0];
  }

  /**
   * Finds the nearest point on the circle to a given point in space.
   * Projects the point onto the circle's surface along the plane normal.
   * @param point The reference point to project
   * @returns The closest point on the circle
   */
  getNearestPointOnCircle(point: P5.Vector): P5.Vector {
    const localPoint = point.copy().sub(this.coordinateSystem.getPosition());
    const angle = Math.atan2(localPoint.y, localPoint.x);
    return this.getPointOnCircle(angle);
  }

  /**
   * Gets a point along the tangent line to the circle at a given angle.
   * Useful for drawing tangent lines or orienting objects along the circle.
   * @param radians The angle in radians at which to compute the tangent
   * @returns A point along the tangent direction at the specified angle
   */
  getTangentAtAngle(radians: number) {
    const tangentPoint = this.getPointOnCircle(radians);
    const tangentVector = new P5.Vector(
      -Math.sin(radians),
      Math.cos(radians),
      0,
    ).mult(this._radius);
    return this.coordinateSystem
      .transformLocalPointsToWorldCs(tangentVector)[0]
      .add(tangentPoint);
  }

  /**
   * Gets a point along the tangent line at the nearest point on the circle to a given point.
   * Combines getNearestPointOnCircle with getTangentAtAngle.
   * @param point The reference point
   * @returns A point along the tangent direction at the nearest point
   */
  getTangentAtPoint(point: P5.Vector): P5.Vector {
    const nearestPoint = this.getNearestPointOnCircle(point);
    const angle = Math.atan2(
      nearestPoint.y - this.coordinateSystem.getPosition().y,
      nearestPoint.x - this.coordinateSystem.getPosition().x,
    );
    return this.getTangentAtAngle(angle);
  }

  /**
   * Creates a local coordinate system at a point on the circle's tangent.
   * The Z-axis is aligned with the tangent direction, X-axis points toward the center.
   * Useful for orienting objects along the circle's perimeter.
   * @param radians The angle in radians at which to create the coordinate system
   * @returns A CoordinateSystem positioned on the circle with tangent orientation
   */
  getTangentCoordinateSystemAtRadians(radians: number): CoordinateSystem {
    const tangentPoint = this.getPointOnCircle(radians);
    // Tangent direction (z-axis)
    const tangentVector = new P5.Vector(
      -Math.sin(radians),
      Math.cos(radians),
      0,
    ).normalize();
    // X-axis: from tangent point to center
    const toCenter = this.centerPoint.copy().sub(tangentPoint).normalize();
    // Use fromOriginNormalX to set x-axis and z-axis
    return CoordinateSystem.fromOriginNormalX(
      tangentPoint,
      tangentVector,
      toCenter,
    );
  }

  /**
   * Generates multiple random points on the surface of this circle or sphere.
   * Instance method that uses this circle's coordinate system and radius.
   * @param numberOfPoints How many random points to generate
   * @param useSphere If true, generates points on a sphere surface; if false, on a circle (default: false)
   * @returns An array of random points on the surface
   */
  randomPointsOnSurface(numberOfPoints: number, useSphere: boolean = false) {
    const points: P5.Vector[] = [];
    for (let i = 0; i < numberOfPoints; i++) {
      points.push(
        Circle.getRandomPointOnSurface(
          this.coordinateSystem,
          this._radius,
          useSphere,
        ),
      );
    }
    return points;
  }

  /**
   * Generates a single random point on the surface of this circle or sphere.
   * Instance method that uses this circle's coordinate system and radius.
   * @param useSphere If true, generates point on a sphere surface; if false, on a circle (default: false)
   * @returns A random point on the surface
   */
  randomPointOnSurface(useSphere: boolean = false): P5.Vector {
    return Circle.getRandomPointOnSurface(
      this.coordinateSystem,
      this._radius,
      useSphere,
    );
  }

  /**
   * Generates multiple random points inside this circle or sphere.
   * Instance method that uses this circle's coordinate system and radius.
   * @param numberOfPoints How many random points to generate
   * @param useSphere If true, generates points inside a sphere; if false, inside a circle (default: false)
   * @returns An array of random points inside the volume
   */
  randomPointsInside(numberOfPoints: number, useSphere: boolean = false) {
    const points: P5.Vector[] = [];
    for (let i = 0; i < numberOfPoints; i++) {
      points.push(
        Circle.getRandomPointInside(
          this.coordinateSystem,
          this._radius,
          useSphere,
        ),
      );
    }
    return points;
  }

  /**
   * Generates a single random point inside this circle or sphere.
   * Instance method that uses this circle's coordinate system and radius.
   * @param useSphere If true, generates point inside a sphere; if false, inside a circle (default: false)
   * @returns A random point inside the volume
   */
  randomPointInside(useSphere: boolean = false): P5.Vector {
    return Circle.getRandomPointInside(
      this.coordinateSystem,
      this._radius,
      useSphere,
    );
  }

  /**
   * Renders the circle in 3D space by projecting it through a camera into 2D screen coordinates.
   * Uses the pre-calculated render segments for efficient rendering.
   * @param p5 The p5 instance to use for rendering
   * @param camera The Camera3D instance that defines the projection transformation
   */
  renderProjected(p5: P5, camera: Camera3D) {
    const cameraProjectedSegments = camera.renderLines(this.renderSegments);
    for (const segment of cameraProjectedSegments) {
      segment.render2D(p5);
    }
  }
}
