import P5 from 'p5';
import { Vehicle } from '../MarkMakingEntities/Extensible/Vehicle';
import { VehicleCollection } from '../EntityManagement/Extensible/VehicleCollection';

/**
 * Configuration for a ViewBoundary soft containment force.
 */
export interface ViewBoundaryProps {
  /** World-space XY point the boundary is centered on (typically the camera's focus). */
  center: P5.Vector;
  /** Radius within which vehicles roam freely with no return pull. */
  comfortRadius: number;
  /** Distance beyond comfortRadius over which the return pull ramps up to full strength. */
  rampWidth: number;
  /** Multiplier scaling the return-seek force once ramped. */
  strength: number;
}

/**
 * Creates a new ViewBoundaryProps object with sensible default values.
 * @returns A ViewBoundaryProps object with default values
 */
export function createGenericViewBoundaryProps(): ViewBoundaryProps {
  return {
    center: new P5.Vector(0, 0, 0),
    comfortRadius: 1600,
    rampWidth: 700,
    strength: 1,
  };
}

/**
 * A soft, camera-relative containment force for an overhead view. Vehicles roam freely
 * within comfortRadius of the center point; beyond it, a smoothstep-ramped seek pulls
 * them back toward center, growing gradually so nothing "bounces" or hard-clamps at an
 * edge. Only the vehicle's XY (camera-plane) position is considered and corrected —
 * depth (Z) is left untouched, matching the "prefer horizontal motion" framing of an
 * overhead-viewed scene. Mirrors the WindSystem apply/applyAll idiom.
 */
export class ViewBoundary {
  public center: P5.Vector;
  public comfortRadius: number;
  public rampWidth: number;
  public strength: number;

  /**
   * Creates a new ViewBoundary.
   * @param props Boundary configuration (default: createGenericViewBoundaryProps())
   */
  constructor(props: ViewBoundaryProps = createGenericViewBoundaryProps()) {
    this.center = props.center.copy();
    this.comfortRadius = props.comfortRadius;
    this.rampWidth = props.rampWidth;
    this.strength = props.strength;
  }

  /**
   * Applies the return-pull force to a single vehicle if it has strayed past comfortRadius.
   * This method mutates the vehicle by applying a steering force and returns this for chaining.
   * @param vehicle The vehicle to check and steer
   * @returns This ViewBoundary instance for method chaining
   */
  apply(vehicle: Vehicle): ViewBoundary {
    const dx = vehicle.coords.x - this.center.x;
    const dy = vehicle.coords.y - this.center.y;
    const planarDist = Math.hypot(dx, dy);
    if (planarDist <= this.comfortRadius) {
      return this;
    }

    const t = Math.min((planarDist - this.comfortRadius) / this.rampWidth, 1);
    const rampedStrength = t * t * (3 - 2 * t) * this.strength; // smoothstep

    // Seek toward center in XY only — leave the vehicle's depth (Z) untouched.
    const target = new P5.Vector(
      this.center.x,
      this.center.y,
      vehicle.coords.z,
    );
    vehicle.seek(target, rampedStrength);
    return this;
  }

  /**
   * Applies the return-pull force to every vehicle in a collection.
   * This method mutates all vehicles and returns this for method chaining.
   * @param collection The VehicleCollection to check and steer
   * @returns This ViewBoundary instance for method chaining
   */
  applyAll(collection: VehicleCollection): ViewBoundary {
    collection.vehicles.forEach((v) => this.apply(v));
    return this;
  }
}
