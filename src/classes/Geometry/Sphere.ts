import P5 from 'p5';
import { Line } from './Line';
import { CoordinateSystem } from './CoordinateSystem';
import type { Camera3D } from '../Core/Camera3D';
import { Circle } from './Circle';

export class Sphere {
  public renderSegements: Line[] = [];
  private _renderSegmentCount: number = 16;
  constructor(
    public coordinateSystem: CoordinateSystem,
    private _radius: number,
  ) {
    // this.calculateSegments();
  }

  get renderSegmentCount() {
    return this._renderSegmentCount;
  }

  set renderSegmentCount(segments: number) {
    if (segments >= 8) {
      this._renderSegmentCount = segments;
      // this.calculateSegments();
    } else {
      throw new Error('A sphere must be rendered with at least 8 segments');
    }
  }

  get radius() {
    return this._radius;
  }

  set radius(radius: number) {
    if (radius < 0) {
      this._radius = radius;
    } else {
      throw new Error('Radius must be a positive number');
    }
  }

  get volumne() {
    return (4 / 3) * Math.PI * this._radius ** 3;
  }

  get centerPoint() {
    return this.coordinateSystem.getPosition();
  }

  randomPointOnSurface(): P5.Vector {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const x = this._radius * Math.sin(phi) * Math.cos(theta);
    const y = this._radius * Math.sin(phi) * Math.sin(theta);
    const z = this._radius * Math.cos(phi);
    return this.coordinateSystem
      .getPosition()
      .copy()
      .add(new P5.Vector(x, y, z));
  }

  randomPointInside(): P5.Vector {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = Math.random() * this._radius;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    return this.coordinateSystem
      .getPosition()
      .copy()
      .add(new P5.Vector(x, y, z));
  }

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

  isPointInside(point: P5.Vector): boolean {
    const distance = P5.Vector.dist(point, this.coordinateSystem.getPosition());
    return distance < this._radius;
  }

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

  isLineObscured(line: Line, observationPoint: P5.Vector): boolean {
    // Use silhouette cone from observationPoint
    const center = this.coordinateSystem.getPosition();
    const r = this._radius;
    const p1 = line.starPoint;
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

  obscureLine(line: Line, observationPoint: P5.Vector): Line[] {
    // Returns visible segments of the line, hiding parts obscured by the sphere's silhouette cone
    const center = this.coordinateSystem.getPosition();
    const r = this._radius;
    const p1 = line.starPoint;
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
    // Find intersection t along the segment
    const d = P5.Vector.sub(p2, p1);
    const OP1 = P5.Vector.sub(p1, observationPoint);
    const OP2 = P5.Vector.sub(p2, observationPoint);
    // Solve quadratic for t where OP = OP1 + t*(OP2-OP1) is on the cone
    const V = P5.Vector.sub(OP2, OP1);
    const a = V.dot(OCn) * V.dot(OCn) - cosAlpha * cosAlpha * V.dot(V);
    const b =
      2 * (V.dot(OCn) * OP1.dot(OCn) - cosAlpha * cosAlpha * V.dot(OP1));
    const c = OP1.dot(OCn) * OP1.dot(OCn) - cosAlpha * cosAlpha * OP1.dot(OP1);
    const disc = b * b - 4 * a * c;
    if (disc < 0) return [line]; // should not happen if one endpoint is inside
    const sqrtDisc = Math.sqrt(disc);
    let t = (-b + (obscured1 ? 1 : -1) * sqrtDisc) / (2 * a);
    t = Math.max(0, Math.min(1, t));
    const pt = P5.Vector.add(p1, d.copy().mult(t));
    if (obscured1) {
      return [new Line(pt, p2.copy())];
    } else {
      return [new Line(p1.copy(), pt)];
    }
  }

  sillhouetteCircle(observationPoint: P5.Vector): Circle {
    const cameraPosition = observationPoint;
    const circleCoordinateSystem = this.coordinateSystem
      .clone()
      .lookAt(cameraPosition);
    const circle = new Circle(circleCoordinateSystem, this.radius);
    circle.renderSegmentCount = this.renderSegmentCount;
    return circle;
  }

  sillhouetteSegments(observationPoint: P5.Vector): Line[] {
    const circle = this.sillhouetteCircle(observationPoint);
    return circle.renderSegments;
  }

  /**
   * Generate a random direction within a cone
   * @param forwardDirection The axis of the cone (will be normalized)
   * @param upDirection A direction perpendicular to forward that helps define the cone orientation (will be normalized)
   * @param minAngleDegrees Minimum angle from the forward direction (degrees)
   * @param maxAngleDegrees Maximum angle from the forward direction (degrees)
   * @returns A random direction within the cone
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

  transform(vector: P5.Vector): Sphere {
    this.coordinateSystem.translateCoordinateSystem(vector);
    return this;
  }

  updateCoordinateSystem(newCoordinateSystem: CoordinateSystem): Sphere {
    this.coordinateSystem = newCoordinateSystem;
    return this;
  }
}
