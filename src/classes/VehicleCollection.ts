import P5 from 'p5';
import type { Vehicle } from './Vehicle';
import { OcTree } from './VehicleOcTree';

export class VehicleCollection {
  public vehicles: Vehicle[] = [];
  private ocTree: OcTree | null = null;

  constructor(vehicles?: Vehicle[]) {
    if (vehicles) {
      this.vehicles = vehicles;
    }
  }

  addVehicle(
    vehicles: Vehicle | Vehicle[],
    rebuildOcTree: boolean = true,
  ): VehicleCollection {
    // rebuild octree can cause performance issues if using this function in loops adding single vehicles
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

  buildOcTree() {
    this.ocTree = new OcTree(this.vehicles);
  }

  update() {
    this.vehicles.forEach((v) => v.update());
    this.ocTree = null;
    return this;
  }

  applyWind() {
    this.vehicles.forEach((v) => v.applyWind);
    return this;
  }

  applyForce(force: P5.Vector) {
    this.vehicles.forEach((v) => v.applyForce(force));
  }

  applyAggregateSteerForce() {
    this.vehicles.forEach((v) => v.applyAggregateSteerForce());
  }

  seak(
    targetPosition: P5.Vector | P5.Vector[],
    multiplier: number | 'Max Velocity' = 1,
  ) {
    const targetList = Array.isArray(targetPosition)
      ? targetPosition
      : [targetPosition];
    for (const target of targetList) {
      this.vehicles.forEach((v) => v.seak(target, multiplier));
    }
  }

  steer(
    direction: P5.Vector | P5.Vector[],
    multiplier: number | 'Max Velocity' = 1,
  ) {
    const directionList = Array.isArray(direction) ? direction : [direction];
    for (const dir of directionList) {
      this.vehicles.forEach((v) => v.steer(dir, multiplier));
    }
  }

  arrive(targetPosition: P5.Vector | P5.Vector[]) {
    const targetPositionList = Array.isArray(targetPosition)
      ? targetPosition
      : [targetPosition];
    for (const pos of targetPositionList) {
      this.vehicles.forEach((v) => v.arrive(pos));
    }
  }

  avoid(
    targetPosition: P5.Vector | P5.Vector[],
    desiredClosestDistance: number,
    multiplier: number | 'Max Velocity' = 1,
  ) {
    const targetPositionList = Array.isArray(targetPosition)
      ? targetPosition
      : [targetPosition];
    for (const pos of targetPositionList) {
      this.vehicles.forEach((v) =>
        v.avoid(pos, desiredClosestDistance, multiplier),
      );
    }
  }

  separate(
    separateMultiplier: number | 'Max Velocity' = 0.5,
    neighborDistance: number,
  ) {
    // need an oc tree to find neighbors
  }

  align(alignMultiplier: number | 'Max Velocity' = 5) {
    // need an oc tree to find neighbor vectors
  }

  cohere(cohereMultiplier: number | 'Max Velocity' = 5) {
    // need an oc tree to find neighbors
  }

  flock(
    separateMultiplier: number | 'Max Velocity' = 0.5,
    alignMultiplier: number | 'Max Velocity' = 5,
    cohereMultiplier: number | 'Max Velocity' = 5,
  ) {
    // need an oc tree to find neighbors and neighbor vectors
  }
}
