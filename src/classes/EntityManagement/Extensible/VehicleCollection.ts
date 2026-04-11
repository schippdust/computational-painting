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

  /**
   * Creates a new VehicleCollection with optional initial vehicles.
   * @param vehicles Optional array of Vehicle instances to initialize the collection
   */
  constructor(vehicles?: Vehicle[]) {
    if (vehicles) {
      this.vehicles = vehicles;
    }
  }

  /** Number of vehicles currently in the collection. */
  get count(): number {
    return this.vehicles.length;
  }

  /** True when the collection contains no vehicles. */
  get isEmpty(): boolean {
    return this.vehicles.length === 0;
  }

  /**
   * Removes a vehicle from the collection by UUID.
   * Does nothing if no vehicle with that UUID exists.
   * This method mutates the instance and returns it for method chaining.
   * @param uuid The UUID of the vehicle to remove
   * @returns This VehicleCollection instance for method chaining
   */
  removeVehicle(uuid: string): VehicleCollection {
    this.vehicles = this.vehicles.filter((v) => v.uuid !== uuid);
    return this;
  }

  /**
   * Removes all vehicles from the collection and clears the octree.
   * This method mutates the instance and returns it for method chaining.
   * @returns This VehicleCollection instance for method chaining
   */
  clear(): VehicleCollection {
    this.vehicles = [];
    this.ocTree = null;
    return this;
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
    this.ocTree = new OcTree(this.vehicles);
    return this;
  }

  update(): VehicleCollection {
    this.vehicles.forEach((v) => v.update());
    this.vehicles = this.vehicles.filter((v) => v.age < v.lifeExpectancy);
    // Invalidate the octree — vehicles have moved and dead ones have been removed.
    // It will be rebuilt lazily on the next spatial query.
    this.ocTree = null;
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

  seek(
    targetPosition: P5.Vector | P5.Vector[],
    multiplier: number = 1,
    awarenessDistance: number | null = null,
  ): VehicleCollection {
    const targets = Array.isArray(targetPosition) ? targetPosition : [targetPosition];
    for (const target of targets) {
      this.vehiclesInRange(target, awarenessDistance).forEach((v) => v.seek(target, multiplier));
    }
    return this;
  }

  arrive(
    targetPosition: P5.Vector | P5.Vector[],
    awarenessDistance: number | null = null,
  ): VehicleCollection {
    const targets = Array.isArray(targetPosition) ? targetPosition : [targetPosition];
    for (const target of targets) {
      this.vehiclesInRange(target, awarenessDistance).forEach((v) => v.arrive(target));
    }
    return this;
  }

  avoid(
    targetPosition: P5.Vector | P5.Vector[],
    desiredClosestDistance: number,
    awarenessDistance: number | null = null,
    multiplier: number = 1,
  ): VehicleCollection {
    const targets = Array.isArray(targetPosition) ? targetPosition : [targetPosition];
    for (const target of targets) {
      this.vehiclesInRange(target, awarenessDistance).forEach((v) =>
        v.avoid(target, desiredClosestDistance, multiplier),
      );
    }
    return this;
  }

  separate(
    neighborDistance: number,
    separateMultiplier: number = 1,
  ): VehicleCollection {
    const ocTree = this.requireOcTree();
    if (ocTree) {
      this.vehicles.forEach((v) => {
        v.separate(ocTree.queryNeighbors(v, neighborDistance).map((n) => n.coords), separateMultiplier);
      });
    }
    return this;
  }

  alignToVectors(
    alignmentVectors: P5.Vector | P5.Vector[],
    alignMultiplier: number = 1,
  ): VehicleCollection {
    const vectorList = Array.isArray(alignmentVectors) ? alignmentVectors : [alignmentVectors];
    this.vehicles.forEach((v) => v.align(vectorList, alignMultiplier));
    return this;
  }

  alignToNeighbors(
    neighborDistance: number,
    alignMultiplier: number = 1,
  ): VehicleCollection {
    const ocTree = this.requireOcTree();
    if (ocTree) {
      this.vehicles.forEach((v) => {
        v.align(ocTree.queryNeighbors(v, neighborDistance).map((n) => n.phys.velocity), alignMultiplier);
      });
    }
    return this;
  }

  cohere(
    neighborDistance: number,
    cohereMultiplier: number = 1,
  ): VehicleCollection {
    const ocTree = this.requireOcTree();
    if (ocTree) {
      this.vehicles.forEach((v) => {
        v.cohere(ocTree.queryNeighbors(v, neighborDistance).map((n) => n.coords), cohereMultiplier);
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
    const ocTree = this.requireOcTree();
    if (ocTree) {
      this.vehicles.forEach((v) => {
        const neighbors = ocTree.queryNeighbors(v, neighborDistance);
        v.separate(neighbors.map((n) => n.coords), separateMultiplier);
        v.align(neighbors.map((n) => n.phys.velocity), alignMultiplier);
        v.cohere(neighbors.map((n) => n.coords), cohereMultiplier);
      });
    }
    return this;
  }

  /**
   * Returns the vehicles within a given radius of a center point.
   * If radius is null or zero, returns all vehicles in the collection.
   * Builds the octree lazily when a radius is provided.
   * @param center The position to query around
   * @param radius Search radius, or null to include all vehicles
   * @returns Array of vehicles within range (or all vehicles if no radius)
   * @private
   */
  private vehiclesInRange(center: P5.Vector, radius: number | null): Vehicle[] {
    if (radius != null && radius > 0) {
      if (this.ocTree == null) this.buildOcTree();
      if (this.ocTree != null) return this.ocTree.queryNeighbors(center, radius);
    }
    return this.vehicles;
  }

  /**
   * Ensures the octree is built, constructing it lazily if absent.
   * Returns null if the collection has fewer than two vehicles (octree not needed).
   * @returns The current OcTree instance, or null if unavailable
   * @private
   */
  private requireOcTree(): OcTree | null {
    if (this.ocTree == null && this.vehicles.length > 1) this.buildOcTree();
    return this.ocTree;
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
