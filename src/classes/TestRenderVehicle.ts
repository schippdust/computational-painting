import type { Camera3D } from './Camera3D';
import { Vehicle } from './Vehicle';
import { Line } from './Line';
import P5 from 'p5';

export class TestRenderVehicle extends Vehicle {
  update(): TestRenderVehicle {
    // only required if I'm modifying the update function to track
    // additional information that can be used for rendering
    super.update();

    return this;
  }
  render(camera: Camera3D): TestRenderVehicle {
    const verticalLineStart = new P5.Vector(0, 10, 0);
    const verticalLineEnd = new P5.Vector(0, -10, 0);
    const horizontalLineStart = new P5.Vector(20, 0, 0);
    const horizontalLineEnd = new P5.Vector(-20, 0, 0);
    const localPoints = [
      verticalLineStart,
      verticalLineEnd,
      horizontalLineStart,
      horizontalLineEnd,
    ];
    const pts = this.coordSystem.transformLocalPointsToWorldCs(localPoints);

    const lines = [new Line(pts[0], pts[1]), new Line(pts[2], pts[3])];
    for (const line of lines) {
      line.renderProjected(this.p5, camera);
    }
    return this;
  }
}
