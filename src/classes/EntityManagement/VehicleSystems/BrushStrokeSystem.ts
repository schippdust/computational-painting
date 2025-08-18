import {
  createGenericPhysicalProps,
  Vehicle,
  type VehiclePhysicalProps,
} from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { VehicleSystem } from '../Extensible/VehicleSystem';
import P5 from 'p5';

export interface BrushtrokeSystemProps {
  branchContinuityProbability: number; // do not set to a number greater than 1
  secondaryBranchProbability: number; // do not set to a number greater than 1
  offsetScatterPotential: number;
  brushPhysProps: VehiclePhysicalProps;
}

export class BrushStrokeSystem extends VehicleSystem {
  public brushProps: BrushtrokeSystemProps;
  constructor(
    sketch: P5,
    coords: P5.Vector,
    physProps: VehiclePhysicalProps = createGenericPhysicalProps(),
    brushProps: BrushtrokeSystemProps,
    initialVelocityOverride: P5.Vector | null = null,
    upAxis: P5.Vector = new P5.Vector(0, 0, 1),
  ) {
    super(sketch, coords, physProps, upAxis);
    this.brushProps = brushProps;
    if (initialVelocityOverride) {
      this.phys.velocity = initialVelocityOverride;
    }
    this.offsetFromPosition();
    return this;
  }

  offsetFromPosition(): BrushStrokeSystem {
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
          this.p5,
          cursor.add(offsetVector),
          this.brushProps.brushPhysProps,
        );
        offsetVector = cursor.scatter(this.brushProps.offsetScatterPotential);
        this.addVehicle(newVehicle);
        attempts++;
      }
    }
    return this;
  }

  addVehicle(vehicles: Vehicle | Vehicle[]): BrushStrokeSystem {
    this.systemVehicles.addVehicle(vehicles, false);
    return this;
  }

  update(): BrushStrokeSystem {
    super.update();
    if (Math.random() < this.brushProps.secondaryBranchProbability) {
      this.offsetFromPosition();
    }
    return this;
  }
}
