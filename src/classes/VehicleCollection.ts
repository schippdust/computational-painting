import P5 from 'p5';
import type { Vehicle } from './Vehicle';
import { OcTree } from './VehicleOcTree';

export class VehicleCollection {
  public vehicles: Vehicle[] = [];
  private ocTree: OcTree | null = null;
  private ocTreeRebuilt:boolean = false

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
    this.ocTreeRebuilt = true
    return this;
  }

  update(): VehicleCollection {
    this.vehicles.forEach((v) => v.update());
    this.vehicles = this.vehicles.filter((v) => {
      return v.age < v.lifeExpectancy
    })
    this.ocTreeRebuilt = false
    return this;
  }

  applyWind(): VehicleCollection {
    this.vehicles.forEach((v) => v.applyWind);
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

  seak(
    targetPosition: P5.Vector | P5.Vector[],
    multiplier: number | 'Max Velocity' = 1,
  ): VehicleCollection {
    const targetList = Array.isArray(targetPosition)
      ? targetPosition
      : [targetPosition];
    for (const target of targetList) {
      this.vehicles.forEach((v) => v.seak(target, multiplier));
    }
    return this;
  }

  steer(
    direction: P5.Vector | P5.Vector[],
    multiplier: number | 'Max Velocity' = 1,
  ): VehicleCollection {
    const directionList = Array.isArray(direction) ? direction : [direction];
    for (const dir of directionList) {
      this.vehicles.forEach((v) => v.steer(dir, multiplier));
    }
    return this;
  }

  arrive(targetPosition: P5.Vector | P5.Vector[]): VehicleCollection {
    const targetPositionList = Array.isArray(targetPosition)
      ? targetPosition
      : [targetPosition];
    for (const pos of targetPositionList) {
      this.vehicles.forEach((v) => v.arrive(pos));
    }
    return this;
  }

  avoid(
    targetPosition: P5.Vector | P5.Vector[],
    desiredClosestDistance: number,
    multiplier: number | 'Max Velocity' = 1,
  ): VehicleCollection {
    const targetPositionList = Array.isArray(targetPosition)
      ? targetPosition
      : [targetPosition];
    for (const pos of targetPositionList) {
      this.vehicles.forEach((v) =>
        v.avoid(pos, desiredClosestDistance, multiplier),
      );
    }
    return this;
  }

  separate(
    neighborDistance: number,
    separateMultiplier: number | 'Max Velocity' = 1,
  ): VehicleCollection {
    if (this.ocTree == null) {
      this.buildOcTree();
    }
    if (this.ocTree != null) {
      const ocTree = this.ocTree;
      this.vehicles.forEach((v) => {
        v.neighbors = ocTree.queryNeighbors(v, neighborDistance);
        v.separate(
          v.neighbors.map((n) => n.coords),
          separateMultiplier,
        );
      });
    }
    return this;
  }

  align(
    neighborDistance: number,
    alignMultiplier: number | 'Max Velocity' = 1,
  ): VehicleCollection {
    if (this.ocTree == null) {
      this.buildOcTree();
    }
    if (this.ocTree != null) {
      const ocTree = this.ocTree;
      this.vehicles.forEach((v) => {
        v.neighbors = ocTree.queryNeighbors(v, neighborDistance);
        v.align(
          v.neighbors.map((n) => n.phys.velocity),
          alignMultiplier,
        );
      });
    }
    return this;
  }

  cohere(
    neighborDistance: number,
    cohereMultiplier: number | 'Max Velocity' = 1,
  ): VehicleCollection {
    if (this.ocTree == null) {
      this.buildOcTree();
    }
    if (this.ocTree != null) {
      const ocTree = this.ocTree;
      this.vehicles.forEach((v) => {
        v.neighbors = ocTree.queryNeighbors(v, neighborDistance);
        v.cohere(
          v.neighbors.map((n) => n.coords),
          cohereMultiplier,
        );
      });
    }
    return this;
  }

  flock(
    neighborDistance: number,
    separateMultiplier: number | 'Max Velocity' = 0.5,
    alignMultiplier: number | 'Max Velocity' = 5,
    cohereMultiplier: number | 'Max Velocity' = 5,
  ): VehicleCollection {
    if (this.ocTree == null) {
      this.buildOcTree();
    }
    if (this.ocTree != null) {
      const ocTree = this.ocTree;
      this.vehicles.forEach((v) => {
        v.neighbors = ocTree.queryNeighbors(v, neighborDistance);
        v.separate(
          v.neighbors.map((n) => n.coords),
          separateMultiplier,
        );
        v.align(
          v.neighbors.map((n) => n.phys.velocity),
          alignMultiplier,
        );
        v.cohere(
          v.neighbors.map((n) => n.coords),
          cohereMultiplier,
        );
      });
    }
    return this;
  }
}
