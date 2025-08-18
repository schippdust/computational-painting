import P5 from 'p5';
import { Vehicle } from '../MarkMakingEntities/Extensible/Vehicle';
import { VehicleCollection } from '../EntityManagement/Extensible/VehicleCollection';
import type { VehiclePhysicalProps } from '../MarkMakingEntities/Extensible/Vehicle';
import { createGenericPhysicalProps } from '../MarkMakingEntities/Extensible/Vehicle';
import { Line } from '../Geometry/Line';

export interface LineGeneratorProps {
  startT: number; // 0=start, 1=end
  endT: number; // 0=start, 1=end
  tStep: number; // step size along the line (0-1)
  velocityAtGeneration: P5.Vector; // local velocity (e.g. (1,0,0) = along line, (0,0,1) = up)
}

export class LineGenerator {
  private currentT: number;
  public complete: boolean = false;
  public generatedVehicles: VehicleCollection = new VehicleCollection();

  constructor(
    protected sketch: P5,
    public line: Line,
    protected props: LineGeneratorProps,
    public vehicleProps: VehiclePhysicalProps = createGenericPhysicalProps(),
  ) {
    this.currentT = props.startT;
  }

  generateVehicles(vehicle: Vehicle): LineGenerator {
    if (this.props.tStep === 0) {
      console.warn('LineGenerator: tStep is 0, no vehicles will be generated.');
      this.complete = true;
    }
    if (this.complete) return this;

    // Use the line's helper to get the position at currentT
    const position = this.line.getPointAtParam(this.currentT);

    // Use the line's helper to get the coordinate system at currentT
    const coordSystem = this.line.getCoordinateSystemAtParam(this.currentT);

    // Transform the local velocity to world using the coordinate system
    const velocity = coordSystem.transformLocalDirectionToWorld(
      this.props.velocityAtGeneration,
    );
    vehicle.velocity = velocity;

    this.generatedVehicles.addVehicle(vehicle);

    // Increment t
    this.currentT += this.props.tStep;

    // Check if we've reached or exceeded the end
    if (
      (this.props.tStep > 0 && this.currentT > this.props.endT) ||
      (this.props.tStep < 0 && this.currentT < this.props.endT)
    ) {
      this.complete = true;
    }

    return this;
  }
}
