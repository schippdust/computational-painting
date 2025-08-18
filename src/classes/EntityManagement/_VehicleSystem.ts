import {
  createGenericPhysicalProps,
  Vehicle,
  type VehiclePhysicalProps,
} from '../MarkMakingEntities/_Vehicle';
import P5 from 'p5';
import { VehicleCollection } from './_VehicleCollection';
import type { WindSystem } from '../Core/WindSystem';

export class VehicleSystem extends Vehicle {
  public collection: VehicleCollection = new VehicleCollection();

  constructor(
    sketch: P5,
    coords: P5.Vector,
    physicalProperties: VehiclePhysicalProps = createGenericPhysicalProps(),
    upAxis: P5.Vector = new P5.Vector(0, 0, 1),
  ) {
    super(sketch, coords, physicalProperties, upAxis);
  }

  addVehicle(
    vehicles: Vehicle | Vehicle[],
    rebuildOcTree: boolean = true,
  ): VehicleSystem {
    this.collection.addVehicle(vehicles, rebuildOcTree);
    return this;
  }

  update(): VehicleSystem {
    super.update();
    const changeInPosition = this.coords.copy().sub(this.previousCoords[0]);
    this.collection.transformAll(changeInPosition);
    this.collection.update();
    return this;
  }
}
