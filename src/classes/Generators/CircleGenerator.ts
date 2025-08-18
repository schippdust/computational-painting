import P5 from 'p5';
import { Vehicle } from '../MarkMakingEntities/Extensible/Vehicle';
import { VehicleCollection } from '../EntityManagement/Extensible/VehicleCollection';
import type { VehiclePhysicalProps } from '../MarkMakingEntities/Extensible/Vehicle';
import { createGenericPhysicalProps } from '../MarkMakingEntities/Extensible/Vehicle';
import type { Circle } from '../Geometry/Circle';

export interface CircleGeneratorProps {
  startAngle: number; // in radians
  endAngle: number; // in radians
  angleStep: number; //in radians
  velocityAtGeneration: P5.Vector; // velocity of the vehicle when generated, (0,0,1) vector would be aligned to the tangent of the circle
}

export class CircleGenerator {
  private currentStep: number;
  public complete: boolean = false;
  public generatedVehicles: VehicleCollection = new VehicleCollection();

  constructor(
    protected sketch: P5,
    public circle: Circle,
    protected props: CircleGeneratorProps,
    public vehicleProps: VehiclePhysicalProps = createGenericPhysicalProps(),
  ) {
    this.currentStep = props.startAngle;
  }

  generateVehicles(vehicle: Vehicle): CircleGenerator {
    if (this.complete) return this;

    // Get the position on the circle at the current angle
    const position = this.circle.getPointOnCircle(this.currentStep);

    // Get the tangent coordinate system at the current angle
    const tangentCS = this.circle.getTangentCoordinateSystemAtRadians(
      this.currentStep,
    );

    // Transform the local velocity vector to world space using the tangentCS (rotation only)
    const velocity = tangentCS.transformLocalDirectionToWorld(
      this.props.velocityAtGeneration,
    );
    vehicle.velocity = velocity;

    this.generatedVehicles.addVehicle(vehicle);

    // Increment the angle
    this.currentStep += this.props.angleStep;

    // Check if we've reached or exceeded the end angle
    if (
      (this.props.angleStep > 0 && this.currentStep > this.props.endAngle) ||
      (this.props.angleStep < 0 && this.currentStep < this.props.endAngle)
    ) {
      this.complete = true;
    }

    return this;
  }
}
