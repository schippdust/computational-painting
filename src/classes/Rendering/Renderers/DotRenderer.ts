import P5 from 'p5';
import { Camera3D } from '@/classes/Core/Camera3D';
import { CoordinateSystem } from '@/classes/Geometry/CoordinateSystem';
import { Vehicle } from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { VehicleCollection } from '@/classes/EntityManagement/Extensible/VehicleCollection';

export class DotRenderer {
  constructor(
    private sketch: P5,
    public dotSize: number = 5,
    public color: number[],
    public camera: Camera3D,
  ) {}

  renderVehicles(vehicles: Vehicle | Vehicle[]): DotRenderer {
    let renderVehicles: Vehicle[] = [];
    if (!Array.isArray(vehicles)) {
      renderVehicles.push(vehicles);
    } else {
      renderVehicles = vehicles;
    }
    renderVehicles.forEach((vehicle) => {
      const position = vehicle.coordSystem.getPosition();
      const screenPos = this.camera.project(position);
      if (screenPos === null) {
        return;
      }

      this.sketch.push();
      this.sketch.fill(this.color);
      this.sketch.noStroke();
      this.sketch.ellipse(screenPos.x, screenPos.y, this.dotSize, this.dotSize);
      this.sketch.pop();
    });
    return this;
  }
}
