import P5 from 'p5';
import type { Vehicle } from '../MarkMakingEntities/Extensible/Vehicle';

/**
 * A spring connecting two vehicles with Hooke's law physics and optional velocity damping.
 * Each frame, call applyForces() before the vehicles' update() so the spring force
 * integrates through the normal force-accumulation pipeline alongside all other forces.
 */
export class Spring {
  /**
   * Creates a new Spring between two vehicles.
   * @param vehicleA The first endpoint vehicle
   * @param vehicleB The second endpoint vehicle
   * @param restLength The natural (zero-force) length of the spring in world units
   * @param stiffness Spring constant k — higher values produce stronger restoring forces (default: 1)
   * @param damping Velocity damping coefficient along the spring axis — reduces oscillation (default: 0)
   */
  constructor(
    public vehicleA: Vehicle,
    public vehicleB: Vehicle,
    public restLength: number,
    public stiffness: number = 1,
    public damping: number = 0,
  ) {}

  /**
   * Computes Hooke's law spring force plus optional velocity damping, then applies
   * equal-and-opposite forces to both endpoint vehicles via vehicle.applyForce().
   * Must be called before vehicle.update() so the forces integrate in the normal
   * accumulation cycle (they are reset inside vehicle.update() after integration).
   * No-ops when the two vehicles are at the same position to avoid NaN from normalisation.
   * This method mutates both vehicles' acceleration and returns void.
   */
  applyForces(): void {
    const posA = this.vehicleA.coordSystem.getPosition();
    const posB = this.vehicleB.coordSystem.getPosition();

    const displacement = P5.Vector.sub(posB, posA);
    const currentLength = displacement.mag();

    if (currentLength < 0.001) return; // avoid degenerate zero-length case

    const direction = displacement.copy().normalize();
    const stretch = currentLength - this.restLength;

    // Hooke's law: F = k * x along the spring axis.
    // Positive stretch (extended) pulls endpoints together; negative (compressed) pushes apart.
    const springForce = direction.copy().mult(this.stiffness * stretch);

    // Velocity damping along the spring axis: reduces oscillation without affecting
    // motion perpendicular to the spring.
    if (this.damping > 0) {
      const relativeVelocity = P5.Vector.sub(
        this.vehicleB.phys.velocity,
        this.vehicleA.phys.velocity,
      );
      const dampingMagnitude = relativeVelocity.dot(direction) * this.damping;
      springForce.add(direction.copy().mult(dampingMagnitude));
    }

    // Equal and opposite: +force on A, -force on B.
    this.vehicleA.applyForce(springForce);
    this.vehicleB.applyForce(springForce.copy().mult(-1));
  }
}
