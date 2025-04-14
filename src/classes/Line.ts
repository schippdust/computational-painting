import P5 from 'p5';

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
}
