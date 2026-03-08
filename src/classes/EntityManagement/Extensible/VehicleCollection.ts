import P5 from 'p5';
import type { Vehicle } from '../../MarkMakingEntities/Extensible/Vehicle';
import { OcTree } from '../../Core/VehicleOcTree';
import type { WindSystem } from '../../Core/WindSystem';

/**
 * Manages a collection of vehicles with batch operations for physics, steering, and flocking.
 * Provides efficient spatial queries via octree and method chaining for fluent API usage.
 * Supports group operations: forces, wind, steering behaviors, flocking, and persistent forces.
 */
export class VehicleCollection {
  public vehicles: Vehicle[] = [];
  private ocTree: OcTree | null = null;
  private ocTreeRebuilt: boolean = false;

  /**
   * Creates a new VehicleCollection with optional initial vehicles.
   * @param vehicles Optional array of Vehicle instances to initialize the collection
   */
  constructor(vehicles?: Vehicle[]) {
    if (vehicles) {
      this.vehicles = vehicles;
    }
  }

  addVehicle(
    vehicles: Vehicle | Vehicle[],
    rebuildOcTree: boolean = true,
  ): VehicleCollection {
    // rebuild octree can cause performance issues if using this function repeatedly in loops adding single vehicles
    // in those instances consider not rebuilding until all vehicles have been added, then rebuild manually
    const vehicleList = Array.isArray(vehicles) ? vehicles : [vehicles];
    for (const vehicle of vehicleList) {
      this.vehicles.push(vehicle);
    }
    if (rebuildOcTree && this.vehicles.length > 1) {
      this.buildOcTree();
    }

    return this;
  }

  transformAll(vectorTransformation: P5.Vector): VehicleCollection {
    this.vehicles.forEach((v) => v.transform(vectorTransformation));
    return this;
  }

  buildOcTree(): VehicleCollection {
    console.log('building octree for', this.vehicles.length, 'vehicles');
    this.ocTree = new OcTree(this.vehicles);
    this.ocTreeRebuilt = true;
    return this;
  }

  update(): VehicleCollection {
    this.vehicles.forEach((v) => v.update());
    const updatedVehicleCount = this.vehicles.length;
    this.vehicles = this.vehicles.filter((v) => {
      return v.age < v.lifeExpectancy;
    });
    const stillLivingCount = this.vehicles.length;
    // if (updatedVehicleCount !== stillLivingCount) {
    //   console.log(
    //     `VehicleCollection: ${updatedVehicleCount - stillLivingCount} vehicles died.`,
    //   );
    // }
    this.ocTreeRebuilt = false;
    return this;
  }

  applyWind(
    windSystem: WindSystem,
    directionalWindMultiplier = 1,
    eddyMultiplier = 1,
  ): VehicleCollection {
    this.vehicles.forEach((v) =>
      v.applyWind(windSystem, directionalWindMultiplier, eddyMultiplier),
    );
    return this;
  }

  applyForce(force: P5.Vector): VehicleCollection {
    this.vehicles.forEach((v) => v.applyForce(force));
    return this;
  }

  applyAggregateSteerForce(): VehicleCollection {
    this.vehicles.forEach((v) => v.applyAggregateSteerForce());
    return this;
  }

  steer(
    direction: P5.Vector | P5.Vector[],
    multiplier: number = 1,
  ): VehicleCollection {
    const directionList = Array.isArray(direction) ? direction : [direction];
    for (const dir of directionList) {
      this.vehicles.forEach((v) => v.steer(dir, multiplier));
    }
    return this;
  }

  seak(
    targetPosition: P5.Vector | P5.Vector[],
    multiplier: number = 1,
    awarenessDistance: number | null = null,
  ): VehicleCollection {
    const targetList = Array.isArray(targetPosition)
      ? targetPosition
      : [targetPosition];
    for (const target of targetList) {
      if (
        this.ocTree == null &&
        awarenessDistance != null &&
        awarenessDistance > 0
      ) {
        this.buildOcTree();
      }
      if (
        this.ocTree != null &&
        awarenessDistance != null &&
        awarenessDistance > 0
      ) {
        const relevantVehicles = this.ocTree.queryNeighbors(
          target,
          awarenessDistance,
        );
        relevantVehicles.forEach((v) => v.seek(target, multiplier));
      } else {
        this.vehicles.forEach((v) => v.seek(target, multiplier));
      }
    }
    return this;
  }

  arrive(
    targetPosition: P5.Vector | P5.Vector[],
    awarenessDistance: number | null = null,
  ): VehicleCollection {
    const targetPositionList = Array.isArray(targetPosition)
      ? targetPosition
      : [targetPosition];
    for (const pos of targetPositionList) {
      if (
        this.ocTree == null &&
        awarenessDistance != null &&
        awarenessDistance > 0
      ) {
        this.buildOcTree();
      }
      if (
        this.ocTree != null &&
        awarenessDistance != null &&
        awarenessDistance > 0
      ) {
        const relevantVehicles = this.ocTree.queryNeighbors(
          pos,
          awarenessDistance,
        );
        relevantVehicles.forEach((v) => v.arrive(pos));
      } else {
        this.vehicles.forEach((v) => v.arrive(pos));
      }
    }
    return this;
  }

  avoid(
    targetPosition: P5.Vector | P5.Vector[],
    desiredClosestDistance: number,
    awarenessDistance: number | null = null,
    multiplier: number = 1,
  ): VehicleCollection {
    const targetPositionList = Array.isArray(targetPosition)
      ? targetPosition
      : [targetPosition];
    for (const pos of targetPositionList) {
      if (
        this.ocTree == null &&
        awarenessDistance != null &&
        awarenessDistance > 0
      ) {
        this.buildOcTree();
      }
      if (
        this.ocTree != null &&
        awarenessDistance != null &&
        awarenessDistance > 0
      ) {
        const relevantVehicles = this.ocTree.queryNeighbors(
          pos,
          awarenessDistance,
        );
        relevantVehicles.forEach((v) =>
          v.avoid(pos, desiredClosestDistance, multiplier),
        );
      } else {
        this.vehicles.forEach((v) =>
          v.avoid(pos, desiredClosestDistance, multiplier),
        );
      }
    }
    return this;
  }

  separate(
    neighborDistance: number,
    separateMultiplier: number = 1,
  ): VehicleCollection {
    if (this.ocTree == null) {
      this.buildOcTree();
    }
    if (this.ocTree != null) {
      const ocTree = this.ocTree;
      this.vehicles.forEach((v) => {
        const neighbors = ocTree.queryNeighbors(v, neighborDistance);
        v.separate(
          neighbors.map((n) => n.coords),
          separateMultiplier,
        );
      });
    }
    return this;
  }

  alignToVectors(
    alignmentVectors: P5.Vector | P5.Vector[],
    alignMultiplier: number = 1,
  ) {
    const vectorList = Array.isArray(alignmentVectors)
      ? alignmentVectors
      : [alignmentVectors];
    this.vehicles.forEach((v) => {
      v.align(vectorList, alignMultiplier);
    });
  }

  alignToNeighbors(
    neighborDistance: number,
    alignMultiplier: number = 1,
  ): VehicleCollection {
    if (this.ocTree == null) {
      this.buildOcTree();
    }
    if (this.ocTree != null) {
      const ocTree = this.ocTree;
      this.vehicles.forEach((v) => {
        const neighbors = ocTree.queryNeighbors(v, neighborDistance);
        v.align(
          neighbors.map((n) => n.phys.velocity),
          alignMultiplier,
        );
      });
    }
    return this;
  }

  cohere(
    neighborDistance: number,
    cohereMultiplier: number = 1,
  ): VehicleCollection {
    if (this.ocTree == null) {
      this.buildOcTree();
    }
    if (this.ocTree != null) {
      const ocTree = this.ocTree;
      this.vehicles.forEach((v) => {
        const neighbors = ocTree.queryNeighbors(v, neighborDistance);
        v.cohere(
          neighbors.map((n) => n.coords),
          cohereMultiplier,
        );
      });
    }
    return this;
  }

  flock(
    neighborDistance: number,
    separateMultiplier: number = 0.5,
    alignMultiplier: number = 5,
    cohereMultiplier: number = 5,
  ): VehicleCollection {
    if (this.ocTree == null) {
      this.buildOcTree();
    }
    if (this.ocTree != null) {
      const ocTree = this.ocTree;
      this.vehicles.forEach((v) => {
        const neighbors = ocTree.queryNeighbors(v, neighborDistance);
        v.separate(
          neighbors.map((n) => n.coords),
          separateMultiplier,
        );
        v.align(
          neighbors.map((n) => n.phys.velocity),
          alignMultiplier,
        );
        v.cohere(
          neighbors.map((n) => n.coords),
          cohereMultiplier,
        );
      });
    }
    return this;
  }

  /**
   * Adds one or more persistent steer forces to all vehicles in the collection.
   * Persistent forces are applied every frame to all vehicles and retained upon duplication.
   * This method mutates all vehicles and returns it for method chaining.
   * @param forces A single force vector or array of force vectors to add to all vehicles
   * @param preventDuplicates If true (default), prevents adding forces that already exist in each vehicle (using approximate equality)
   * @returns This VehicleCollection instance for method chaining
   */
  addPersistentSteerForceAll(
    forces: P5.Vector | P5.Vector[],
    preventDuplicates: boolean = true,
  ): VehicleCollection {
    this.vehicles.forEach((v) =>
      v.addPersistentSteerForce(forces, preventDuplicates),
    );
    return this;
  }

  /**
   * Removes a specific persistent steer force from all vehicles in the collection.
   * Searches for forces matching the given vector (using approximate equality) and removes them.
   * This method mutates all vehicles and returns it for method chaining.
   * @param force The force vector to remove from all vehicles
   * @returns This VehicleCollection instance for method chaining
   */
  removePersistentSteerForceAll(force: P5.Vector): VehicleCollection {
    this.vehicles.forEach((v) => v.removePersistentSteerForce(force));
    return this;
  }

  /**
   * Removes multiple persistent steer forces from all vehicles in the collection.
   * Removes forces matching the given vectors (using approximate equality) from all vehicles.
   * This method mutates all vehicles and returns it for method chaining.
   * @param forces Array of force vectors to remove from all vehicles
   * @returns This VehicleCollection instance for method chaining
   */
  removePersistentSteerForcesAll(forces: P5.Vector[]): VehicleCollection {
    this.vehicles.forEach((v) => v.removePersistentSteerForces(forces));
    return this;
  }

  /**
   * Removes all persistent steer forces from all vehicles in the collection.
   * Clears all persistent forces from every vehicle in the collection.
   * This method mutates all vehicles and returns it for method chaining.
   * @returns This VehicleCollection instance for method chaining
   */
  clearPersistentSteerForcesAll(): VehicleCollection {
    this.vehicles.forEach((v) => v.clearPersistentSteerForces());
    return this;
  }
}
