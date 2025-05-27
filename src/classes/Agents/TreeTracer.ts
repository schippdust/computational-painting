import P5 from 'p5';
import type { TreeSystem } from '../SystemsAndManagement/TreeSystem';

import { Vehicle } from './Vehicle';

export class TreeTracer extends Vehicle {
  private treeSystem;
  private upDirection;
  private heirarchyLevel;
  private maxChildren;
  constructor(
    sketch: P5,
    coords: P5.Vector,
    heirarchyLevel: number,
    maxChildren: number,
    treeSystem: TreeSystem,
  ) {
    super(sketch, coords);
    this.treeSystem = treeSystem;
    this.upDirection = new P5.Vector(0, 0, 1);
    this.heirarchyLevel = heirarchyLevel;
    this.maxChildren = maxChildren;
  }

  update(): TreeTracer {
    super.update();
    if ((this.age = this.lifeExpectancy)) {
      for (let i = 0; i < this.maxChildren; i++) {}
    }

    return this;
  }
}
