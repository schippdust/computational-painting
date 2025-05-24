import P5 from 'p5';
import type { Camera3D } from '../Core/Camera3D';

export class Line {
  public starPoint: P5.Vector;
  public endPoint: P5.Vector;
  constructor(startPoint: P5.Vector, endPoint: P5.Vector) {
    this.starPoint = startPoint;
    this.endPoint = endPoint;
  }

  render(p5: P5) {
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
