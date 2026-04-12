import P5 from 'p5';
import { Vehicle } from '../../MarkMakingEntities/Extensible/Vehicle';
import { VehicleCollection } from '../../EntityManagement/Extensible/VehicleCollection';
import type { VehiclePhysicalProps } from '../../MarkMakingEntities/Extensible/Vehicle';
import { createGenericPhysicalProps } from '../../MarkMakingEntities/Extensible/Vehicle';
import type { Circle } from '../../Geometry/Circle';

/**
 * Configuration properties for CircleGenerator.
 * Defines the angular traversal parameters and initial velocity for generated vehicles.
 */
export interface CircleGeneratorProps {
  /**
   * Starting angle in radians for vehicle generation (0 = circle center direction).
   */
  startAngle: number;
  /**
   * Ending angle in radians for vehicle generation (defines traversal range).
   */
  endAngle: number;
  /**
   * Angular step size in radians (positive = counterclockwise, negative = clockwise).
   * Determines spacing between generated vehicles along the circle.
   */
  angleStep: number;
  /**
   * Local velocity vector at generation time, expressed in the tangent coordinate system.
   * For example: (0,0,1) vector aligned to circle tangent, (1,0,0) radially outward.
   */
  velocityAtGeneration: P5.Vector;
}

/**
 * Generates vehicles distributed along a circle perimeter at regular angular intervals.
 * Vehicles are positioned at specified angles and oriented according to the circle's
 * local tangent coordinate system. Useful for creating circular formations and paths.
 *
 * The generator traverses from startAngle to endAngle in steps of angleStep.
 * Positive angleStep traverses counterclockwise; negative traverses clockwise.
 */
export class CircleGenerator {
  private currentStep: number;
  public complete: boolean = false;
  public generatedVehicles: VehicleCollection = new VehicleCollection();

  /**
   * Creates a new CircleGenerator for distributing vehicles along a circle.
   * @param sketch The p5.js sketch instance for vector utilities and randomization
   * @param circle The Circle geometry to generate vehicles along
   * @param props Angular traversal and velocity configuration
   * @param vehicleProps Physical properties template for generated vehicles (default: generic physical properties)
   */
  constructor(
    protected sketch: P5,
    public circle: Circle,
    protected props: CircleGeneratorProps,
    public vehicleProps: VehiclePhysicalProps = createGenericPhysicalProps(),
  ) {
    this.currentStep = props.startAngle;
  }

  /**
   * Generates all remaining vehicles along the circle in one call.
   * Calls the provided factory to produce a fresh Vehicle for each angular step.
   * Marks the generator complete when finished.
   * This method mutates the generator state and returns it for method chaining.
   * @param vehicleFactory A function that returns a new Vehicle instance for each position
   * @param rebuildOcTree Whether to rebuild the octree after all vehicles are added (default: true)
   * @returns This CircleGenerator instance for method chaining
   */
  generateAll(
    vehicleFactory: () => Vehicle,
    rebuildOcTree = true,
  ): CircleGenerator {
    while (!this.complete) {
      this.generateVehicle(vehicleFactory(), false);
    }
    if (rebuildOcTree && this.generatedVehicles.count > 1) {
      this.generatedVehicles.buildOcTree();
    }
    return this;
  }

  /**
   * Generates a single vehicle at the current angular position on the circle.
   * Positions the vehicle at the current angle and orients it using the tangent
   * coordinate system. The velocity is transformed from local to world space.
   * Automatically increments the angle and marks complete when endAngle is reached.
   *
   * This method mutates the provided vehicle and updates the generator state.
   * @param vehicle The Vehicle instance to position and add to the collection
   * @param rebuildOcTree Whether to rebuild spatial partitioning after adding (default: true)
   * @returns This CircleGenerator instance for method chaining
   */
  generateVehicle(vehicle: Vehicle, rebuildOcTree = true): CircleGenerator {
    if (this.complete) {
      // console.log('generator has died');
      return this;
    }
    // console.log('generating vehicle at step', this.currentStep);

    // Get the tangent coordinate system at the current angle
    const tangentCS = this.circle.getTangentCoordinateSystemAtRadians(
      this.currentStep,
    );
    // console.log('found tangentCS', tangentCS);
    vehicle.coordSystem = tangentCS;
    // Transform the local velocity vector to world space using the tangentCS (rotation only)
    const velocity = tangentCS.transformLocalDirectionToWorld(
      this.props.velocityAtGeneration,
    );
    velocity.setMag(this.props.velocityAtGeneration.mag());

    vehicle.velocity = velocity;
    // console.log('set  velocity');
    this.generatedVehicles.addVehicle(vehicle, rebuildOcTree);
    // console.log(
    //   'added vehicle to generatedVehicles',
    //   this.generatedVehicles.vehicles.length,
    // );
    // Increment the angle
    this.currentStep += this.props.angleStep;
    // console.log('incremented currentStep to', this.currentStep);
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
