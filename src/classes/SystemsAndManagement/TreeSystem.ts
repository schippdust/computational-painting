import P5 from 'p5';
import { Vehicle } from '../Agents/Vehicle';
import { VehicleCollection } from './VehicleCollection';
import type { CoordinateSystem } from '../Geometry/CoordinateSystem';
import { TreeTracer } from '../Agents/TreeTracer';

interface TreeSystemParameters {
  branchProperties: BranchLevelProperties[]; // first branch property is lowest, last is highest
}

export interface BranchLevelProperties {
  name: string; // name of the branch level
  upwardTendancy: number; // -1 to 1
  upwardStrength: number; // multiplier for upward tendancy
  outwardTendancy: number; // -1 to 1
  outwardStrength: number; // multiplier for outward tendancy
  meanLifeExpectancy: number; // mean frames for branch duration, using guassian randomness
  stdvLifeExpectancy: number; // standard deviation of life expecatancy
  windMutliplier: number; // multiplier for the wind forces
  gnarlMultiplier: number; // multiplier for the gnarling forces
  ableToFork: boolean; // ability to fork to lower hierarchies at death
  branchProbability: number; // 0 to 1 probability of branch on any given frame
  twigProbability: number; // 0 to 1 probability of small twigs branching from large branch
  unexpectedDeathProbability:number; // 0 to 1 probability of randomly dying
}

enum TreeStyles {
  Default,
}

export function createTreeProperties(
  style: TreeStyles = TreeStyles.Default,
): TreeSystemParameters {
  return {
    branchProperties: [
      {
        name: 'Trunk',
        upwardTendancy: 1,
        upwardStrength: 4,
        outwardTendancy: 0,
        outwardStrength: 0,
        meanLifeExpectancy: 500,
        stdvLifeExpectancy: 50,
        windMutliplier: 2,
        gnarlMultiplier: 0.1,
        ableToFork: true,
        branchProbability: 0.05,
        twigProbability: 0.05,
        unexpectedDeathProbability: 0,
      },
      {
        name: 'Primary Branch',
        upwardTendancy: 1,
        upwardStrength: 4,
        outwardTendancy: 0,
        outwardStrength: 0,
        meanLifeExpectancy: 500,
        stdvLifeExpectancy: 50,
        windMutliplier: 2,
        gnarlMultiplier: 0.1,
        ableToFork: true,
        branchProbability: 0.05,
        twigProbability: 0.05,
        unexpectedDeathProbability: 0
      },
      {
        name: 'Secondary Branch',
        upwardTendancy: 1,
        upwardStrength: 4,
        outwardTendancy: 0,
        outwardStrength: 0,
        meanLifeExpectancy: 500,
        stdvLifeExpectancy: 50,
        windMutliplier: 2,
        gnarlMultiplier: 0.1,
        ableToFork: true,
        branchProbability: 0.05,
        twigProbability: 0.05,
        unexpectedDeathProbability: 0.01
      },
      {
        name: 'Twigs',
        upwardTendancy: 1,
        upwardStrength: 4,
        outwardTendancy: 0,
        outwardStrength: 0,
        meanLifeExpectancy: 500,
        stdvLifeExpectancy: 50,
        windMutliplier: 2,
        gnarlMultiplier: 0.1,
        ableToFork: false,
        branchProbability: 0.05,
        twigProbability: 0.05,
        unexpectedDeathProbability: 0.03
      }
    ],
  };
}

export class TreeSystem {
  public cs: CoordinateSystem;
  public props: TreeSystemParameters;

  public treeTracers: VehicleCollection;

  private p5: P5;
  private upTarget: P5.Vector

  constructor(
    location: CoordinateSystem,
    sketch: P5,
    props = createTreeProperties(),
  ) {
    this.cs = location;
    this.props = props;
    this.treeTracers = new VehicleCollection();
    this.p5 = sketch;
    this.upTarget = this.cs.getPosition().add(this.cs.getZAxis().mult(100000))
  }

  public update(){
    this.treeTracers.vehicles.forEach(vehicle => {
      const branch = vehicle as TreeTracer
      branch.seak(this.upTarget,branch.props)
    });
  }

  private addTracerToCollection(tracer: TreeTracer | TreeTracer[]) {
    this.treeTracers.addVehicle(tracer);
  }

  public firstBranch() {
    const firstBranch = new TreeTracer(
      this.p5,
      this.cs.getPosition(),
      this.props.branchProperties[0],
      this,
    );
    this.treeTracers.addVehicle(firstBranch);
  }

  public addBranch(cs: CoordinateSystem, maxBranchAngle: number) {}
}
