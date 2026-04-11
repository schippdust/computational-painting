import P5 from 'p5';
import { Line } from './Line';
import { CoordinateSystem } from './CoordinateSystem';
import type { Camera3D } from '../Core/Camera3D';
import { Circle } from './Circle';

/**
 * Represents a sphere in 3D space defined by a coordinate system and radius.
 * Provides utilities for random point generation, surface/containment queries,
 * occlusion testing, and silhouette computation for camera frustum culling.
 */
export class Sphere {
  public renderSegments: Line[] = [];
  private _renderSegmentCount: number = 16;

  /**
   * Creates a new Sphere instance.
   * @param coordinateSystem The coordinate system defining the sphere's center and orientation
   * @param _radius The radius of the sphere
   */
  constructor(
    public coordinateSystem: CoordinateSystem,
    private _radius: number,
  ) {
    // this.calculateSegments();
  }

  /**
   * Gets the number of segments used to render the sphere.
   * @returns The current render segment count
   */
  get renderSegmentCount() {
    return this._renderSegmentCount;
  }

  /**
   * Sets the number of segments used to render the sphere.
   * Must be at least 8 segments for a valid sphere representation.
   * @param segments The number of segments (must be >= 8)
   * @throws Error if segments < 8
   */
  set renderSegmentCount(segments: number) {
    if (segments >= 8) {
      this._renderSegmentCount = segments;
      // this.calculateSegments();
    } else {
      throw new Error('A sphere must be rendered with at least 8 segments');
    }
  }

  /**
   * Gets the radius of the sphere.
   * @returns The current radius value
   */
  get radius() {
    return this._radius;
  }

  /**
   * Sets the radius of the sphere.
   * Must be a positive number.
   * @param radius The new radius value (must be positive)
   * @throws Error if radius <= 0
   */
  set radius(radius: number) {
    if (radius > 0) {
      this._radius = radius;
    } else {
      throw new Error('Radius must be a positive number');
    }
  }

  /**
   * Calculates the volume of the sphere (4/3 * π * r³).
   * @returns The volume of the sphere
   */
  get volume() {
    return (4 / 3) * Math.PI * this._radius ** 3;
  }

  /**
   * Gets the center point of the sphere (the origin of its coordinate system).
   * @returns The center point in world coordinates
   */
  get centerPoint() {
    return this.coordinateSystem.getPosition();
  }

  /**
   * Generates a random point uniformly distributed on the sphere's surface.
   * Uses spherical coordinates with proper distribution (accounting for sin(phi) in the volume element).
   * @returns A random point on the sphere's surface
   */
  randomPointOnSurface(): P5.Vector {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(1 - 2 * Math.random());
    const x = this._radius * Math.sin(phi) * Math.cos(theta);
    const y = this._radius * Math.sin(phi) * Math.sin(theta);
    const z = this._radius * Math.cos(phi);
    return this.coordinateSystem
      .getPosition()
      .copy()
      .add(new P5.Vector(x, y, z));
  }

  /**
   * Generates a random point uniformly distributed inside the sphere's volume.
   * Uses spherical coordinates with proper distribution corrections:
   * - arccos distribution for phi to account for sin(phi) in volume element
   * - cube root for radius to account for r² in volume element
   * @returns A random point inside the sphere
   */
  randomPointInside(): P5.Vector {
    const theta = Math.random() * Math.PI * 2;
    // Account for sin(phi) in the volume element by using arccos distribution
    const phi = Math.acos(1 - 2 * Math.random());
    // Account for r^2 in the volume element by using cube root
    const r = this._radius * Math.cbrt(Math.random());
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    return this.coordinateSystem
      .getPosition()
      .copy()
      .add(new P5.Vector(x, y, z));
  }

  /**
   * Generates multiple random points uniformly distributed on the sphere's surface.
   * @param count How many points to generate
   * @returns An array of random points on the sphere's surface
   */
  randomPointsOnSurface(count: number): P5.Vector[] {
    const points: P5.Vector[] = [];
    for (let i = 0; i < count; i++) {
      points.push(this.randomPointOnSurface());
    }
    return points;
  }

  /**
   * Generates multiple random points uniformly distributed inside the sphere's volume.
   * @param count How many points to generate
   * @returns An array of random points inside the sphere
   */
  randomPointsInside(count: number): P5.Vector[] {
    const points: P5.Vector[] = [];
    for (let i = 0; i < count; i++) {
      points.push(this.randomPointInside());
    }
    return points;
  }

  /**
   * Finds the nearest point on the sphere's surface to a given point.
   * Projects the point onto the sphere along the direction from center to point.
   * @param point The reference point
   * @returns The closest point on the sphere's surface
   */
  nearestPointOnSurface(point: P5.Vector): P5.Vector {
    const direction = P5.Vector.sub(
      point,
      this.coordinateSystem.getPosition(),
    ).normalize();
    return this.coordinateSystem
      .getPosition()
      .copy()
      .add(direction.mult(this._radius));
  }

  /**
   * Tests whether a point is inside the sphere.
   * @param point The point to test
   * @returns True if the point is inside the sphere, false otherwise
   */
  isPointInside(point: P5.Vector): boolean {
    const distance = P5.Vector.dist(point, this.coordinateSystem.getPosition());
    return distance < this._radius;
  }

  /**
   * Tests whether a point is obscured by the sphere from an observation point.
   * Uses the sphere's silhouette cone projected from the observer's position.
   * @param point The point to test for occlusion
   * @param observationPoint The observer's position
   * @returns True if the point is obscured by the sphere, false otherwise
   */
  isPointObscured(point: P5.Vector, observationPoint: P5.Vector): boolean {
    const toPoint = P5.Vector.sub(point, observationPoint);
    const toCenter = P5.Vector.sub(
      this.coordinateSystem.getPosition(),
      observationPoint,
    );
    const projectionLength = toPoint.dot(toCenter) / toCenter.mag();
    const closestPoint = P5.Vector.add(
      observationPoint,
      toCenter.copy().setMag(projectionLength),
    );
    const distanceToSurface = P5.Vector.dist(
      closestPoint,
      this.coordinateSystem.getPosition(),
    );
    return (
      distanceToSurface < this._radius &&
      projectionLength > 0 &&
      projectionLength < toPoint.mag()
    );
  }

  /**
   * Tests whether a line segment is obscured by the sphere's silhouette cone.
   * Returns true if the line is fully or partially obscured.
   * @param line The line segment to test
   * @param observationPoint The observer's position
   * @returns True if the line is obscured by the sphere, false if fully visible
   */
  isLineObscured(line: Line, observationPoint: P5.Vector): boolean {
    // Use silhouette cone from observationPoint
    const center = this.coordinateSystem.getPosition();
    const r = this._radius;
    const p1 = line.startPoint;
    const p2 = line.endPoint;
    // Vector from observer to sphere center
    const OC = P5.Vector.sub(center, observationPoint);
    const OCmag = OC.mag();
    // If observer is inside the sphere, everything is visible
    if (OCmag < r) return false;
    // Cosine of half the cone angle
    const cosAlpha = Math.sqrt(OCmag * OCmag - r * r) / OCmag;
    // For each endpoint, check if it's inside the cone
    function isObscured(pt: P5.Vector) {
      const OP = P5.Vector.sub(pt, observationPoint).normalize();
      const OCn = OC.copy().normalize();
      return OP.dot(OCn) > cosAlpha;
    }
    const obscured1 = isObscured(p1);
    const obscured2 = isObscured(p2);
    // If both endpoints are obscured, the line is fully obscured
    if (obscured1 && obscured2) return true;
    // If one is obscured, the line is partially obscured
    if (obscured1 || obscured2) return true;
    // Otherwise, fully visible
    return false;
  }

  /**
   * Clips a line segment against the sphere's silhouette cone, removing obscured portions.
   * Returns an array of visible line segments (usually 0, 1, or 2 segments).
   * @param line The line segment to clip
   * @param observationPoint The observer's position
   * @returns An array of line segments representing the visible portions
   */
  obscureLine(line: Line, observationPoint: P5.Vector): Line[] {
    // Returns visible segments of the line, hiding parts obscured by the sphere's silhouette cone
    const center = this.coordinateSystem.getPosition();
    const r = this._radius;
    const p1 = line.startPoint;
    const p2 = line.endPoint;
    const OC = P5.Vector.sub(center, observationPoint);
    const OCmag = OC.mag();
    if (OCmag < r) return [line]; // observer inside sphere
    const cosAlpha = Math.sqrt(OCmag * OCmag - r * r) / OCmag;
    const OCn = OC.copy().normalize();
    function isObscured(pt: P5.Vector) {
      const OP = P5.Vector.sub(pt, observationPoint).normalize();
      return OP.dot(OCn) > cosAlpha;
    }
    const obscured1 = isObscured(p1);
    const obscured2 = isObscured(p2);
    // If both visible, return whole line
    if (!obscured1 && !obscured2) return [line];
    // If both obscured, return nothing
    if (obscured1 && obscured2) return [];

    // Otherwise, clip at intersection with cone
    const d = P5.Vector.sub(p2, p1);
    const OP1 = P5.Vector.sub(p1, observationPoint);
    const V = d.copy();

    // Solve quadratic: |OP1 + t*V|^2 * cosAlpha^2 = (OP1 + t*V) . OCn)^2
    const V_dot_OCn = V.dot(OCn);
    const OP1_dot_OCn = OP1.dot(OCn);
    const V_dot_V = V.dot(V);
    const OP1_dot_V = OP1.dot(V);
    const cosSq = cosAlpha * cosAlpha;

    const a = V_dot_OCn * V_dot_OCn - cosSq * V_dot_V;
    const b = 2 * (V_dot_OCn * OP1_dot_OCn - cosSq * OP1_dot_V);
    const c = OP1_dot_OCn * OP1_dot_OCn - cosSq * OP1.dot(OP1);

    // Handle degenerate case where a ≈ 0 (line nearly parallel to cone)
    const epsilon = 1e-10;
    if (Math.abs(a) < epsilon) {
      if (Math.abs(b) > epsilon) {
        const t = -c / b;
        if (t >= 0 && t <= 1) {
          const pt = P5.Vector.add(p1, d.copy().mult(t));
          if (obscured1) {
            return [new Line(pt, p2.copy())];
          } else {
            return [new Line(p1.copy(), pt)];
          }
        }
      }
      return [line];
    }

    const disc = b * b - 4 * a * c;
    if (disc < 0) return [line];

    const sqrtDisc = Math.sqrt(disc);
    const t1_raw = (-b - sqrtDisc) / (2 * a);
    const t2_raw = (-b + sqrtDisc) / (2 * a);

    // Collect all roots that fall within or very close to [0, 1]
    const candidateTs: number[] = [];

    if (t1_raw >= -epsilon && t1_raw <= 1 + epsilon) {
      candidateTs.push(t1_raw);
    }
    if (
      t2_raw >= -epsilon &&
      t2_raw <= 1 + epsilon &&
      Math.abs(t2_raw - t1_raw) > epsilon
    ) {
      candidateTs.push(t2_raw);
    }

    if (candidateTs.length === 0) return [line];

    // For each candidate, clamp it to [0, 1]
    const clampedTs = candidateTs.map((t) => Math.max(0, Math.min(1, t)));

    // Remove duplicates (roots that clamp to the same value)
    const uniqueTs: number[] = [];
    for (const t of clampedTs) {
      if (
        uniqueTs.length === 0 ||
        Math.abs(t - uniqueTs[uniqueTs.length - 1]) > epsilon
      ) {
        uniqueTs.push(t);
      }
    }

    if (uniqueTs.length === 0) return [line];

    // Select the appropriate intersection based on which endpoint is obscured
    // If p1 is obscured, use the largest t (closest to p2, the visible endpoint)
    // If p1 is visible, use the smallest t (closest to p1, the visible endpoint)
    const selectedT = obscured1 ? Math.max(...uniqueTs) : Math.min(...uniqueTs);
    const pt = P5.Vector.add(p1, d.copy().mult(selectedT));

    if (obscured1) {
      return [new Line(pt, p2.copy())];
    } else {
      return [new Line(p1.copy(), pt)];
    }
  }

  /**
   * Computes the silhouette circle of the sphere as seen from an observation point.
   * The silhouette circle is the circle on the sphere's surface where the normal is perpendicular
   * to the view direction, defining the outline of the sphere's projection.
   * @param observationPoint The observer's position
   * @returns A Circle object representing the silhouette
   */
  silhouetteCircle(observationPoint: P5.Vector): Circle {
    const cameraPosition = observationPoint;
    const circleCoordinateSystem = this.coordinateSystem
      .clone()
      .lookAt(cameraPosition);
    const circle = new Circle(circleCoordinateSystem, this.radius);
    circle.renderSegmentCount = this.renderSegmentCount;
    return circle;
  }

  /**
   * Gets the silhouette line segments of the sphere as seen from an observation point.
   * @param observationPoint The observer's position
   * @returns An array of Line segments representing the silhouette outline
   */
  silhouetteSegments(observationPoint: P5.Vector): Line[] {
    const circle = this.silhouetteCircle(observationPoint);
    return circle.renderSegments;
  }

  /**
   * Generates a random direction within a cone from a forward direction.
   * Useful for spreading rays, particles, or branching patterns within a constrained angular range.
   * Properly accounts for angular distribution within the cone.
   * @param forwardDirection The axis of the cone (will be normalized)
   * @param upDirection A direction perpendicular to forward that helps define the cone orientation (will be normalized)
   * @param minAngleDegrees Minimum angle from the forward direction in degrees
   * @param maxAngleDegrees Maximum angle from the forward direction in degrees
   * @returns A random direction vector within the cone
   */
  static randomDirectionInCone(
    forwardDirection: P5.Vector,
    upDirection: P5.Vector,
    minAngleDegrees: number,
    maxAngleDegrees: number,
  ): P5.Vector {
    // Convert angles from degrees to radians
    const minAngle = (minAngleDegrees * Math.PI) / 180;
    const maxAngle = (maxAngleDegrees * Math.PI) / 180;

    // Random angle within the cone (polar angle from forward axis)
    const coneAngle = minAngle + Math.random() * (maxAngle - minAngle);

    // Random azimuthal angle around the forward axis
    const azimuth = Math.random() * 2 * Math.PI;

    // Get the forward direction (normalized)
    let forward = forwardDirection.copy().normalize();
    if (forward.mag() < 0.001) {
      forward = new P5.Vector(0, 0, 1); // default forward if not moving
    }

    let up = upDirection.copy().normalize();

    // Create an orthonormal basis with forward as the z-axis
    // Find a vector perpendicular to forward
    let xAxis = up.copy().cross(forward).normalize();
    if (xAxis.mag() < 0.001) {
      // If forward and up are nearly parallel, create a different perpendicular
      xAxis = new P5.Vector(1, 0, 0);
      if (Math.abs(forward.x) > 0.9) {
        xAxis = new P5.Vector(0, 1, 0);
      }
      xAxis = xAxis.sub(forward.copy().mult(forward.dot(xAxis))).normalize();
    }

    // Create another perpendicular vector
    const yAxis = forward.copy().cross(xAxis).normalize();

    // Create the direction within the cone
    // Start with a direction in the x-y plane at the azimuthal angle
    const coneDirectionInPlane = xAxis
      .copy()
      .mult(Math.cos(azimuth))
      .add(yAxis.copy().mult(Math.sin(azimuth)))
      .normalize();

    // Rotate toward the forward axis by the cone angle
    const branchDirection = forward
      .copy()
      .mult(Math.cos(coneAngle))
      .add(coneDirectionInPlane.copy().mult(Math.sin(coneAngle)))
      .normalize();

    return branchDirection;
  }

  /**
   * Translates the sphere's position by a given vector.
   * This method mutates the instance and returns it for method chaining.
   * @param vector The translation vector to apply
   * @returns This Sphere instance for method chaining
   */
  transform(vector: P5.Vector): Sphere {
    this.coordinateSystem.translateCoordinateSystem(vector);
    return this;
  }

  /**
   * Updates the sphere's coordinate system.
   * This method mutates the instance and returns it for method chaining.
   * @param newCoordinateSystem The new coordinate system
   * @returns This Sphere instance for method chaining
   */
  updateCoordinateSystem(newCoordinateSystem: CoordinateSystem): Sphere {
    this.coordinateSystem = newCoordinateSystem;
    return this;
  }
}
