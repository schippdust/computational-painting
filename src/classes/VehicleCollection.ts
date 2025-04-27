import P5 from 'p5';
import type { Vehicle } from './Vehicle';
import { OcTree } from './VehicleOcTree';
import type { WindSystem } from './WindSystem';

export class VehicleCollection {
  public vehicles: Vehicle[] = [];
  private ocTree: OcTree | null = null;
  private ocTreeRebuilt: boolean = false;

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
    if (rebuildOcTree) {
      this.buildOcTree();
    }

    return this;
  }

  buildOcTree(): VehicleCollection {
    this.ocTree = new OcTree(this.vehicles);
    this.ocTreeRebuilt = true;
    return this;
  }

  update(): VehicleCollection {
    this.vehicles.forEach((v) => v.update());
    this.vehicles = this.vehicles.filter((v) => {
      return v.age < v.lifeExpectancy;
    });
    this.ocTreeRebuilt = false;
    return this;
  }

  applyWind(windSystem: WindSystem, multiplier = 1): VehicleCollection {
    this.vehicles.forEach((v) => v.applyWind(windSystem, multiplier));
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
        relevantVehicles.forEach((v) => v.seak(target, multiplier));
      } else {
        this.vehicles.forEach((v) => v.seak(target, multiplier));
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
}
