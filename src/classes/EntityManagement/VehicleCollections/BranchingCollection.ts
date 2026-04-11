import P5 from 'p5';
import type { Vehicle } from '../../MarkMakingEntities/Extensible/Vehicle';
import { OcTree } from '../../Core/VehicleOcTree';
import type { WindSystem } from '../../Core/WindSystem';
import { VehicleCollection } from '../Extensible/VehicleCollection';
import { Sphere } from '../../Geometry/Sphere';

/**
 * Configuration properties for branching behavior in BranchingCollection.
 * Controls probability, geometry, and characteristics of vehicle branching.
 */
export interface BranchingCollectionProps {
  /**
   * Branching probability at end of vehicle lifecycle (higher age = higher probability).
   * Valid range: 0-1. Recommend values between 0.01-0.1.
   */
  highProbabilityOfBranching: number;
  /**
   * Branching probability for new/young vehicles (lower age = higher probability).
   * Valid range: 0-1. Recommend values between 0.001-0.01, lower than highProbabilityOfBranching.
   */
  lowProbabilityOfBranching: number;
  /**
   * Maximum spread angle in degrees for branch divergence from parent direction.
   * Defines the outer boundary of the cone around the parent's forward direction.
   * Recommend: 45-90 degrees.
   */
  maxSpreadAngle: number;
  /**
   * Minimum spread angle in degrees for branch divergence from parent direction.
   * Defines the inner boundary of the cone around the parent's forward direction.
   * Recommend: 15-45 degrees, less than maxSpreadAngle.
   */
  minSpreadAngle: number;
  /**
   * Scale factor for the branching force direction vector.
   * Higher values produce more aggressive divergence from parent trajectory.
   * Recommend: 2-10.
   */
  branchingForceStrength: number;
  /**
   * Minimum number of branches created when a vehicle branches.
   * Recommend: 2-3.
   */
  minNumberOfBranches: number;
  /**
   * Maximum number of branches created when a vehicle branches.
   * Recommend: 3-6. Should be greater than minNumberOfBranches.
   */
  maxNumberOfBranches: number;
}

/**
 * Factory function creating default branching collection properties.
 * Provides sensible defaults for organic-looking branching structures.
 * @returns Default BranchingCollectionProps with moderate branching behavior
 */
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

/**
 * A vehicle collection that implements organic branching behavior.
 * Vehicles probabilistically branch into multiple child vehicles at various points
 * in their lifecycle. Branching probability increases with vehicle age, creating
 * naturally-looking tree-like or vascular structures.
 */
export class BranchingCollection extends VehicleCollection {
  public branches: VehicleCollection[] = [];
  public props: BranchingCollectionProps;

  /**
   * Creates a new BranchingCollection with optional initial vehicles and properties.
   * @param vehicles Optional array of initial vehicles for the collection
   * @param props Branching behavior configuration (default: generic branching properties)
   */
  constructor(
    vehicles?: Vehicle[],
    props: BranchingCollectionProps = createGenericBranchingCollectionProps(),
  ) {
    super(vehicles);
    this.props = props;
  }

  /**
   * Updates all vehicles and processes branching.
   * For each vehicle, calculates branching probability based on age relative to lifespan.
   * Creates new branch vehicles from old vehicles and maintains the collection.
   * This method mutates the instance and returns it for method chaining.
   * @returns This BranchingCollection instance for method chaining
   */
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
