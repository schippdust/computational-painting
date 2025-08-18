import P5 from 'p5';
import { Vehicle } from '../MarkMakingEntities/_Vehicle';
import { VehicleCollection } from '../EntityManagement/_VehicleCollection';
import type { VehiclePhysicalProps } from '../MarkMakingEntities/_Vehicle';

export class CircleGenerator {
  constructor(
    private sketch: P5,
    private center: P5.Vector,
    private radius: number,
    private vehicleProps: VehiclePhysicalProps = Vehicle.createGenericPhysicalProps(),
  ) {}
}
