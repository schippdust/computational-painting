import P5 from 'p5';
import type { Vehicle } from '../../MarkMakingEntities/Extensible/Vehicle';
import { OcTree } from '../../Core/VehicleOcTree';
import type { WindSystem } from '../../Core/WindSystem';
import { VehicleCollection } from '../Extensible/VehicleCollection';
import { Sphere } from '../../Geometry/Sphere';

export interface BranchingCollectionProps {
  highProbabilityOfBranching: number;
  lowProbabilityOfBranching: number;
  maxSpreadAngle: number; //degrees
  minSpreadAngle: number; //degrees
  branchingForceStrength: number;
  minNumberOfBranches: number;
  maxNumberOfBranches: number;
}

export function createGenericBranchingCollectionProps(): BranchingCollectionProps {
  return {
    highProbabilityOfBranching: 0.03,
    lowProbabilityOfBranching: 0.005,
    maxSpreadAngle: 75,
    minSpreadAngle: 35,
    branchingForceStrength: 5,
    minNumberOfBranches: 2,
    maxNumberOfBranches: 5,
  };
}

export class BranchingCollection extends VehicleCollection {
  public branches: VehicleCollection[] = [];
  public props: BranchingCollectionProps;

  constructor(
    vehicles?: Vehicle[],
    props: BranchingCollectionProps = createGenericBranchingCollectionProps(),
  ) {
    super(vehicles);
    this.props = props;
  }

  update(): BranchingCollection {
    super.update();

    // Process branching for each vehicle
    const newVehicles: Vehicle[] = [];
    const vehiclesToRemove: Set<string> = new Set();

    for (const vehicle of this.vehicles) {
      // Calculate branching probability based on age
      // Closer to end of lifecycle = closer to highProbabilityOfBranching
      // Newer vehicle = closer to lowProbabilityOfBranching
      const lifeProgress = vehicle.age / vehicle.lifeExpectancy;
      const branchingProbability =
        this.props.lowProbabilityOfBranching +
        lifeProgress *
          (this.props.highProbabilityOfBranching -
            this.props.lowProbabilityOfBranching);

      // Check if vehicle should branch
      if (Math.random() < branchingProbability) {
        // Randomly select number of branches
        const numberOfBranches = Math.floor(
          Math.random() *
            (this.props.maxNumberOfBranches -
              this.props.minNumberOfBranches +
              1) +
            this.props.minNumberOfBranches,
        );

        // Create and apply forces to each branch
        for (let i = 0; i < numberOfBranches; i++) {
          const branch = vehicle.duplicate();
          branch.age = 0;
          branch.lifeExpectancy =
            vehicle.lifeExpectancy * Math.random() * 0.5 + 0.75;
          const branchForce = this.generateRandomBranchingForce(vehicle);
          branch.velocity = branchForce.setMag(vehicle.phys.velocity.mag());
          newVehicles.push(branch);
        }

        vehiclesToRemove.add(vehicle.uuid);
      }
    }

    // Replace branching vehicles in the main collection
    this.addVehicle(newVehicles, false);
    this.vehicles = this.vehicles.filter((v) => !vehiclesToRemove.has(v.uuid));
    this.vehicles.push(...newVehicles);

    this.branches.forEach((branch) => branch.update());
    return this;
  }

  /**
   * Generate a random branching force direction within the spread angle cone
   * The cone is centered around the vehicle's forward direction
   * @param vehicle The vehicle that is branching
   * @returns A force vector at a random angle within the spread cone
   */
  private generateRandomBranchingForce(vehicle: Vehicle): P5.Vector {
    const direction = Sphere.randomDirectionInCone(
      vehicle.phys.forward,
      vehicle.phys.up,
      this.props.minSpreadAngle,
      this.props.maxSpreadAngle,
    );
    return direction.mult(this.props.branchingForceStrength);
  }
}
