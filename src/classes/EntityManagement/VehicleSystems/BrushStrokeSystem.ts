import {
  createGenericPhysicalProps,
  Vehicle,
  type VehiclePhysicalProps,
} from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { VehicleSystem } from '../Extensible/VehicleSystem';
import P5 from 'p5';
import { scatter } from '@/classes/Geometry/VectorOverloads';

/**
 * Configuration properties for brush stroke effects in BrushStrokeSystem.
 * Controls branching and geometric properties of brush strokes.
 * Valid probability values must be in range [0, 1].
 */
export interface BrushtrokeSystemProps {
  /**
   * Probability that a branching offset continues adding new branches (0-1).
   * Higher values create longer, more connected stroke patterns.
   * Recommend: 0.1-0.7.
   */
  branchContinuityProbability: number;
  /**
   * Probability of secondary branching during each update (0-1).
   * Controls likelihood of creating new offset branches from the stroke system.
   * Recommend: 0.01-0.3.
   */
  secondaryBranchProbability: number;
  /**
   * Intensity of random scatter applied to offset vectors (0-1).
   * Controls chaotic variation in stroke width and direction.
   * Higher values = more variation. Recommend: 0.05-0.5.
   */
  offsetScatterPotential: number;
  /**
   * Physical properties template for vehicles created as brush stroke branches.
   * Defines mass, damping, acceleration limits for offset vehicles.
   */
  brushPhysProps: VehiclePhysicalProps;
}

/**
 * A vehicle system that creates brush stroke effects with probabilistic branching.
 * Extends VehicleSystem to layer multiple offset vehicles creating a painterly effect.
 * Vehicles branch off from the main stroke path at random intervals with scattered positions,
 * building organic brush-like structures with variable widths and directions.
 */
export class BrushStrokeSystem extends VehicleSystem {
  public brushProps: BrushtrokeSystemProps;
  /**
   * Creates a new BrushStrokeSystem with brush-specific configuration.
   * Initializes offset positioning to create the initial brush stroke width.
   * @param sketch The p5.js sketch instance for vector utilities
   * @param coords Initial position for the brush stroke system
   * @param physProps Physical properties for the main system vehicle (default: generic physical properties)
   * @param brushProps Brush stroke configuration (probability, scatter, offset properties)
   * @param initialVelocityOverride Optional velocity override; if null, system velocity remains at default
   * @param upAxis Initial up direction for orientation (default: positive Z-axis)
   */
  constructor(
    sketch: P5,
    coords: P5.Vector,
    physProps: VehiclePhysicalProps = createGenericPhysicalProps(),
    brushProps: BrushtrokeSystemProps,
    initialVelocityOverride: P5.Vector | null = null,
    upAxis: P5.Vector = new P5.Vector(0, 0, 1),
  ) {
    super(sketch, coords, physProps, upAxis);
    this.brushProps = brushProps;
    if (initialVelocityOverride) {
      this.phys.velocity = initialVelocityOverride;
    }
    this.offsetFromPosition();
    return this;
  }

  /**
   * Creates offset branch vehicles to establish the initial brush stroke width.
   * Generates vehicles offset from the current position using scattered directions
   * and continues branching with probabilistic continuation until threshold reached.
   * This method mutates the system by adding vehicles to the collection.
   * @returns This BrushStrokeSystem instance for method chaining
   */
  offsetFromPosition(): BrushStrokeSystem {
    if (this.phys.velocity.mag() === 0) {
      const cursor = this.coords.copy();
      let offsetVector = scatter(
        this.phys.velocity,
        this.brushProps.offsetScatterPotential,
      );
      let continueOffsetting = true;
      let attempts = 0;
      const maxAttempts = 1000;
      while (continueOffsetting) {
        if (
          Math.random() >= this.brushProps.branchContinuityProbability ||
          attempts > maxAttempts
        ) {
          continueOffsetting = false;
        }
        const newVehicle = new Vehicle(
          this.p5,
          cursor.add(offsetVector),
          this.brushProps.brushPhysProps,
        );
        offsetVector = scatter(cursor, this.brushProps.offsetScatterPotential);
        this.addVehicle(newVehicle);
        attempts++;
      }
    }
    return this;
  }

  /**
   * Adds one or more vehicles to the brush stroke system's vehicle collection.
   * This method mutates the system's collection and returns it for method chaining.
   * @param vehicles A single Vehicle or array of Vehicles to add to the system
   * @returns This BrushStrokeSystem instance for method chaining
   */
  addVehicle(vehicles: Vehicle | Vehicle[]): BrushStrokeSystem {
    this.systemVehicles.addVehicle(vehicles, false);
    return this;
  }

  /**
   * Updates the brush stroke system and its contained vehicles.
   * Calls parent system update, then probabilistically creates additional
   * offset branches based on secondaryBranchProbability.
   * This method mutates the instance and returns it for method chaining.
   * @returns This BrushStrokeSystem instance for method chaining
   */
  update(): BrushStrokeSystem {
    super.update();
    if (Math.random() < this.brushProps.secondaryBranchProbability) {
      this.offsetFromPosition();
    }
    return this;
  }
}
