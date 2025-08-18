import P5 from 'p5';
import { Vehicle } from '../MarkMakingEntities/Extensible/Vehicle';

export class LineGenerator {
  private vehicles: Vehicle[] = [];
  constructor(
    private startPoint: P5.Vector,
    private endPoint: P5.Vector,
    private radius: number,
  ) {}
}
