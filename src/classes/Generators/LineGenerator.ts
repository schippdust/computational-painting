import P5 from 'p5';
import { Vehicle } from '../MarkMakingEntities/Extensible/Vehicle';
import { VehicleCollection } from '../EntityManagement/Extensible/VehicleCollection';
import type { VehiclePhysicalProps } from '../MarkMakingEntities/Extensible/Vehicle';
import { createGenericPhysicalProps } from '../MarkMakingEntities/Extensible/Vehicle';
import { Line } from '../Geometry/Line';

/**
 * Configuration properties for LineGenerator.
 * Defines the parametric traversal parameters and initial velocity for generated vehicles.
 */
export interface LineGeneratorProps {
  /**
   * Starting parameter along the line: 0 = line start point, 1 = line end point.
   */
  startT: number;
  /**
   * Ending parameter along the line: 0 = line start point, 1 = line end point.
   */
  endT: number;
  /**
   * Parametric step size (0-1 range). Determines spacing between generated vehicles along the line.
   * Positive = forward direction, negative = backward direction.
   */
  tStep: number;
  /**
   * Local velocity vector at generation time, expressed in the line's tangent coordinate system.
   * For example: (1,0,0) along the line direction, (0,0,1) perpendicular/upward.
   */
  velocityAtGeneration: P5.Vector;
}

/**
 * Generates vehicles distributed along a line segment at regular parametric intervals.
 * Vehicles are positioned at specified points along the line and oriented according
 * to the line's local coordinate system (tangent, normal, binormal).
 * Useful for creating linear formations and stroke-like patterns.
 * 
 * The generator traverses from startT to endT in steps of tStep (t ∈ [0, 1]).
 * Positive tStep traverses toward the end; negative tStep traverses toward the start.
 */
export class LineGenerator {
  private currentT: number;
  public complete: boolean = false;
  public generatedVehicles: VehicleCollection = new VehicleCollection();

  /**
   * Creates a new LineGenerator for distributing vehicles along a line segment.
   * @param sketch The p5.js sketch instance for vector utilities and logging
   * @param line The Line geometry to generate vehicles along
   * @param props Parametric traversal and velocity configuration
   * @param vehicleProps Physical properties template for generated vehicles (default: generic physical properties)
   */
  constructor(
    protected sketch: P5,
    public line: Line,
    protected props: LineGeneratorProps,
    public vehicleProps: VehiclePhysicalProps = createGenericPhysicalProps(),
  ) {
    this.currentT = props.startT;
  }

  /**
   * Generates vehicles sequentially along the line from startT to endT.
   * Positions each vehicle at the current parametric position and orients it using
   * the line's coordinate system. Velocity is transformed from local to world space.
   * Automatically increments the parameter and marks complete when endT is reached.
   * 
   * Warns if tStep is zero (would cause infinite loop). This method mutates the
   * provided vehicle and updates the generator state.
   * @param vehicle The Vehicle instance to position and add to the collection
   * @returns This LineGenerator instance for method chaining
   */
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
