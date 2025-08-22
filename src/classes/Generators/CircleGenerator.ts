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

  generateVehicle(vehicle: Vehicle, rebuildOcTree = true): CircleGenerator {
    if (this.complete) {
      console.log('generator has died');
      return this;
    }
    console.log('generating vehicle at step', this.currentStep);
    // Get the position on the circle at the current angle
    // const position = this.circle.getPointOnCircle(this.currentStep);

    // Get the tangent coordinate system at the current angle
    const tangentCS = this.circle.getTangentCoordinateSystemAtRadians(
      this.currentStep,
    );
    console.log('found tangentCS', tangentCS);
    vehicle.coordSystem = tangentCS;
    // Transform the local velocity vector to world space using the tangentCS (rotation only)
    const velocity = tangentCS.transformLocalDirectionToWorld(
      this.props.velocityAtGeneration,
    );

    vehicle.velocity = velocity;
    console.log('set  velocity');
    this.generatedVehicles.addVehicle(vehicle, rebuildOcTree);
    console.log(
      'added vehicle to generatedVehicles',
      this.generatedVehicles.vehicles.length,
    );
    // Increment the angle
    this.currentStep += this.props.angleStep;
    console.log('incremented currentStep to', this.currentStep);
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
