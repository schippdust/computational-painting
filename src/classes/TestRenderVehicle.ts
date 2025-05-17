import { Vehicle } from './Vehicle';
import P5 from 'p5';

export class TestRenderVehicle extends Vehicle {
  update(): TestRenderVehicle {
    // only required if I'm modifying the update function to track
    // additional information that can be used for rendering
    super.update();

    return this;
  }
  render(): TestRenderVehicle {
    return this;
  }
}
