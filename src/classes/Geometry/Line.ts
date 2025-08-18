import P5 from 'p5';
import type { Camera3D } from '../Core/Camera3D';
import { CoordinateSystem } from './CoordinateSystem';

export class Line {
  constructor(
    public starPoint: P5.Vector,
    public endPoint: P5.Vector,
  ) {}

  getPointAtParam(t: number): P5.Vector {
    return this.starPoint.copy().lerp(this.endPoint, t);
  }

  getNearestPoint(point: P5.Vector): P5.Vector {
    const lineVector = this.endPoint.copy().sub(this.starPoint);
    const pointVector = point.copy().sub(this.starPoint);
    let t = pointVector.dot(lineVector) / lineVector.magSq();
    t = Math.max(0, Math.min(1, t));
    return this.getPointAtParam(t);
  }

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

  getLength(): number {
    return this.starPoint.dist(this.endPoint);
  }

  render2D(p5: P5) {
    p5.line(
      this.starPoint.x,
      this.starPoint.y,
      this.endPoint.x,
      this.endPoint.y,
    );
  }

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
