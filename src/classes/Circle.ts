import P5 from 'p5';
import type { Line } from './Line';

export class Circle {
  public centerPoint: P5.Vector;
  public normal: P5.Vector;
  public radius: number;
  private _renderSegments: number;

  constructor(centerPoint: P5.Vector, radius: number, normal: P5.Vector) {
    this.centerPoint = centerPoint;
    this.radius = radius;
    this.normal = normal;
    this._renderSegments = 16;
  }

  get renderSegments() {
    return this._renderSegments;
  }

  set renderSegments(segments: number) {
    if (segments >= 8) {
      this._renderSegments = segments;
    } else {
      throw new Error('A circle must be rendered with at least 8 segments');
    }
  }

  getSegments() {
    const segments: Line[] = [];
    const points: P5.Vector[] = [];
    for (let i = 0; i < this._renderSegments; i++) {
      const point = new P5.Vector();
    }
  }
}
