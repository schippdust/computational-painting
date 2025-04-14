import P5 from 'p5';
import { Vehicle } from './Vehicle';

export class LineGenerator {
  private startPoint: P5.Vector;
  private endPoint: P5.Vector;
  private vehicles: Vehicle[];
  private radius: number;

  constructor(startPoint: P5.Vector, endPoint: P5.Vector, radius: number) {
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.vehicles = [];
    this.radius = radius;
  }
}
