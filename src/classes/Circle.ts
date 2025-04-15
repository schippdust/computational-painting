import P5 from 'p5';
import { Line } from './Line';
import { CoordinateSystem } from './CoordinateSystem';
import type { Camera3D } from './Camera3D';

export class Circle {
  public coordinateSystem: CoordinateSystem;
  private _radius: number;
  private _renderSegmentCount: number;
  public renderSegments: Line[];

  constructor(coordinateSystem: CoordinateSystem, radius: number) {
    this.coordinateSystem = coordinateSystem;
    this._radius = radius;
    this._renderSegmentCount = 16;
    this.renderSegments = [];
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
    return this.coordinateSystem.getOrigin();
  }

  get normal() {
    return this.coordinateSystem.getZAxis();
  }

  calculateSegments() {
    const segments: Line[] = [];
    const unitPoints: P5.Vector[] = [];

    for (let i = 0; i < this._renderSegmentCount; i++) {
      const point = new P5.Vector(
        Math.cos(Math.PI * 2 * (i / this._renderSegmentCount)),
        Math.sin(Math.PI * 2 * (i / this._renderSegmentCount)),
      ).mult(this._radius);
      unitPoints.push(point);
    }

    const segmentPoints = CoordinateSystem.transformPoints(
      CoordinateSystem.getWorldCoordinates(),
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

  renderProjected(p5: P5, camera: Camera3D) {
    const cameraProjectedSegments = camera.renderLines(this.renderSegments);
    for (const segment of cameraProjectedSegments) {
      segment.render(p5);
    }
  }
}
