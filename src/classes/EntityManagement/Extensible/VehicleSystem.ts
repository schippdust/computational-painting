import {
  createGenericPhysicalProps,
  Vehicle,
  type VehiclePhysicalProps,
} from '../../MarkMakingEntities/Extensible/Vehicle';
import P5 from 'p5';
import { VehicleCollection } from './VehicleCollection';
import type { WindSystem } from '../../Core/WindSystem';

export class VehicleSystem extends Vehicle {
  public systemVehicles: VehicleCollection = new VehicleCollection();

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
    this.systemVehicles.addVehicle(vehicles, rebuildOcTree);
    return this;
  }

  update(): VehicleSystem {
    // updates the system based on all forces that have been applied at the system level,
    // then transforms all subvehicles based on change in the system's position,
    // then updates all subvehicles based on forces that have been applied at the sublevel
    super.update();
    if (this.previousCoords.length === 0) {
      const changeInPosition = this.coords.copy().sub(this.previousCoords[0]);
      this.systemVehicles.transformAll(changeInPosition);
    }
    this.systemVehicles.update();
    return this;
  }
}
