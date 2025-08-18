import {
  createGenericPhysicalProps,
  Vehicle,
  type VehiclePhysicalProps,
} from '@/classes/MarkMakingEntities/_Vehicle';
import { VehicleSystem } from '../_VehicleSystem';
import P5 from 'p5';

export interface BrushtrokeSystemProps {
  branchContinuityProbability: number; // do not set to a number greater than 1
  secondaryBranchProbability: number; // do not set to a number greater than 1
  offsetScatterPotential: number;
  brushVehiclePhys: VehiclePhysicalProps;
}

export class BrushtrokeSystem extends VehicleSystem {
  public brushProps: BrushtrokeSystemProps;
  constructor(
    sketch: P5,
    coords: P5.Vector,
    physicalProperties: VehiclePhysicalProps = createGenericPhysicalProps(),
    brushProps: BrushtrokeSystemProps,
    initialVelocityOverride: P5.Vector | null = null,
    upAxis: P5.Vector = new P5.Vector(0, 0, 1),
  ) {
    super(sketch, coords, physicalProperties, upAxis);
    this.brushProps = brushProps;
    if (initialVelocityOverride) {
      this.phys.velocity = initialVelocityOverride;
    }
    this.offsetFromPosition();
    return this;
  }

  offsetFromPosition(): BrushtrokeSystem {
    if (this.phys.velocity.mag() === 0) {
      const cursor = this.coords.copy();
      let offsetVector = this.phys.velocity.scatter(
        this.brushProps.offsetScatterPotential,
      );
      let continueOffsetting = true;
      let attempts = 0;
      const maxAttempts = 1000;
      while (continueOffsetting) {
        if (
          Math.random() >= this.brushProps.branchContinuityProbability ||
          attempts > maxAttempts
        ) {
          continueOffsetting = false;
        }
        const newVehicle = new Vehicle(
          this.protected,
          cursor.add(offsetVector),
          this.brushProps.brushVehiclePhys,
        );
        offsetVector = cursor.scatter(this.brushProps.offsetScatterPotential);
        this.addVehicle(newVehicle);
        attempts++;
      }
    }
    return this;
  }

  addVehicle(vehicles: Vehicle | Vehicle[]): BrushtrokeSystem {
    this.systemVehicles.addVehicle(vehicles, false);
    return this;
  }

  update(): BrushtrokeSystem {
    super.update();
    if (Math.random() < this.brushProps.secondaryBranchProbability) {
      this.offsetFromPosition();
    }
    return this;
  }
}
