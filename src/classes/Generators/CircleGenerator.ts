import P5 from 'p5';
import { Vehicle } from '../MarkMakingEntities/Extensible/Vehicle';
import { VehicleCollection } from '../EntityManagement/Extensible/VehicleCollection';
import type { VehiclePhysicalProps } from '../MarkMakingEntities/Extensible/Vehicle';
import { createGenericPhysicalProps } from '../MarkMakingEntities/Extensible/Vehicle';
export class CircleGenerator {
  constructor(
    private sketch: P5,
    private center: P5.Vector,
    private radius: number,
    private vehicleProps: VehiclePhysicalProps = createGenericPhysicalProps(),
  ) {}
}
