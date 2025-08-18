import P5 from 'p5';
import { Line } from './Line';
import { CoordinateSystem } from './CoordinateSystem';
import type { Camera3D } from '../Core/Camera3D';

export class Circle {
  public renderSegments: Line[] = [];
  private _renderSegmentCount: number = 16;
  constructor(
    public coordinateSystem: CoordinateSystem,
    private _radius: number,
  ) {
    this.calculateSegments();
  }

  updateCoordinateSystem(newCoordinateSystem: CoordinateSystem): Circle {
    this.coordinateSystem = newCoordinateSystem;
    this.calculateSegments();
    return this;
  }

  get renderSegmentCount() {
    return this._renderSegmentCount;
  }

  set renderSegmentCount(segments: number) {
    if (segments >= 8) {
      this._renderSegmentCount = segments;
      this.calculateSegments();
    } else {
      throw new Error('A circle must be rendered with at least 8 segments');
    }
  }

  get radius() {
    return this._radius;
  }

  set radius(radius: number) {
    this._radius = radius;
    this.calculateSegments;
  }

  get centerPoint() {
    return this.coordinateSystem.getPosition();
  }

  get normal() {
    return this.coordinateSystem.getZAxis();
  }

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

  getPointOnCircle(radians: number): P5.Vector {
    const localPoint = new P5.Vector(
      this._radius * Math.cos(radians),
      this._radius * Math.sin(radians),
      0,
    );
    return this.coordinateSystem.transformLocalPointsToWorldCs(localPoint)[0];
  }

  getNearestPointOnCircle(point: P5.Vector): P5.Vector {
    const localPoint = point.copy().sub(this.coordinateSystem.getPosition());
    const angle = Math.atan2(localPoint.y, localPoint.x);
    return this.getPointOnCircle(angle);
  }

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

  getTangentAtPoint(point: P5.Vector): P5.Vector {
    const nearestPoint = this.getNearestPointOnCircle(point);
    const angle = Math.atan2(
      nearestPoint.y - this.coordinateSystem.getPosition().y,
      nearestPoint.x - this.coordinateSystem.getPosition().x,
    );
    return this.getTangentAtAngle(angle);
  }

  // gets a coordinate system aligned to world space
  // at tangent point where z axis is aligned to the tangent
  // moving in the direction of the base unit circle
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

  randomPointOnSurface(useSphere: boolean = false): P5.Vector {
    return Circle.getRandomPointOnSurface(
      this.coordinateSystem,
      this._radius,
      useSphere,
    );
  }

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

  randomPointInside(useSphere: boolean = false): P5.Vector {
    return Circle.getRandomPointInside(
      this.coordinateSystem,
      this._radius,
      useSphere,
    );
  }

  renderProjected(p5: P5, camera: Camera3D) {
    const cameraProjectedSegments = camera.renderLines(this.renderSegments);
    for (const segment of cameraProjectedSegments) {
      segment.render(p5);
    }
  }
}
