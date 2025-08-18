import type { Camera3D } from '../Core/Camera3D';
import {
  createGenericPhysicalProps,
  Vehicle,
} from '../MarkMakingEntities/_Vehicle';
import P5 from 'p5';
import { VehicleCollection } from './_VehicleCollection';
import type { VehiclePhysicalProps } from '../MarkMakingEntities/_Vehicle';
import { WindSystem } from '../Core/WindSystem';
import type { CoordinateSystem } from '../Geometry/CoordinateSystem';

export class MovingBrushstrokes extends VehicleCollection {
  private sketch: P5;
  public brushVariabilitySystem: WindSystem;
  public probabilityOfInitialBranch: number = 0.85;
  public probabilityofSecondaryBranching: number = 0.1;
  private branchingCoordinateSystem: CoordinateSystem | null = null;

  constructor(startPoint: P5.Vector, initialVelocity: P5.Vector, sketch: P5) {
    super();
    this.sketch = sketch;
    // creating intial vehicle
    const props = createGenericPhysicalProps();
    props.velocity = initialVelocity;
    const firstVehicle = new Vehicle(this.sketch, startPoint, props);
    this.addVehicle(firstVehicle);
    // creating brush variability system
    this.brushVariabilitySystem = new WindSystem(this.sketch);
  }

  update(): MovingBrushstrokes {
    this.applyWind(this.brushVariabilitySystem, 1, 1);
    super.update();

    return this;
  }

  get isDead(): boolean {
    return this.vehicles.length === 0;
  }
}
