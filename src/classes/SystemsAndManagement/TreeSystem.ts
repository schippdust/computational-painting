import P5 from 'p5';
import { Vehicle } from '../Agents/Vehicle';
import { VehicleCollection } from './VehicleCollection';
import type { CoordinateSystem } from '../Geometry/CoordinateSystem';
import { TreeTracer } from '../Agents/TreeTracer';

interface TreeSystemParameters {
  minimumBranchesAtLevel: 2;
  branchesAtLevels: Record<number, number>;
}

export class TreeSystem {
  public cs: CoordinateSystem;
  public treeHeight: number;
  public trunkHeight: number;

  public treeTracers: VehicleCollection;

  private p5: P5;

  constructor(location: CoordinateSystem, sketch: P5) {
    this.cs = location;
    this.treeHeight = 10;
    this.trunkHeight = 4;
    this.treeTracers = new VehicleCollection();
    this.p5 = sketch;
  }

  private addTracerToCollection(tracer: TreeTracer | TreeTracer[]) {
    this.treeTracers.addVehicle(tracer);
  }

  public firstBranch() {
    const firstBranch = new TreeTracer(
      this.p5,
      this.cs.getPosition(),
      0,
      2,
      this,
    );
    this.treeTracers.addVehicle(firstBranch);
  }

  public addBranch(cs: CoordinateSystem, maxBranchAngle: number) {}
}
