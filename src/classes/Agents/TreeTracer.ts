import P5 from 'p5';
import type { BranchLevelProperties, TreeSystem } from '../SystemsAndManagement/TreeSystem';

import { Vehicle } from './Vehicle';

export class TreeTracer extends Vehicle {
  private treeSystem;
  private upDirection;
  public props;
  constructor(
    sketch: P5,
    coords: P5.Vector,
    props: BranchLevelProperties,
    treeSystem: TreeSystem,
  ) {
    super(sketch, coords);
    this.treeSystem = treeSystem;
    this.upDirection = new P5.Vector(0, 0, 1);
    this.props = props
  }

  update(): TreeTracer {
    if (this.p5.random() < this.props.unexpectedDeathProbability){
      this.age = this.lifeExpectancy
    }
    
    super.update();
    
    if ((this.age = this.lifeExpectancy)) {
      // fork
    }

    return this;
  }

  // createChildTreeTracer(maxBranchingAngle = Math.PI / 4): TreeTracer {
  //   const childProps = this.treeSystem.getChildProps(this.props)

  //   return new TreeTracer(
  //     this.p5,
  //     this.coords,
  //     this.heirarchyLevel + 1,
  //     this.maxChildren + this.heirarchyLevel,
  //     this.treeSystem,
  //   );
  // }
}
