import {
  createGenericPhysicalProps,
  Vehicle,
  type VehiclePhysicalProps,
} from '../../MarkMakingEntities/Extensible/Vehicle';
import P5 from 'p5';
import { VehicleCollection } from './VehicleCollection';
import type { WindSystem } from '../../Core/WindSystem';

/**
 * A vehicle that extends Vehicle with hierarchical sub-vehicle management.
 * Acts as a container system where the parent vehicle's position changes are
 * propagated to all contained sub-vehicles. Useful for creating grouped formations
 * and hierarchical vehicle structures.
 * 
 * Update sequence: (1) Update system-level physics, (2) Transform all sub-vehicles
 * by the change in system position, (3) Update sub-vehicles with their own physics.
 */
export class VehicleSystem extends Vehicle {
  public systemVehicles: VehicleCollection = new VehicleCollection();

  /**
   * Creates a new VehicleSystem with optional initial sub-vehicles.
   * @param sketch The p5.js sketch instance for vector utilities
   * @param coords Initial position vector for the system
   * @param physicalProperties Physical properties template for the system vehicle (default: generic physical properties)
   * @param upAxis Initial up direction for orientation (default: positive Z-axis)
   */
  constructor(
    sketch: P5,
    coords: P5.Vector,
    physicalProperties: VehiclePhysicalProps = createGenericPhysicalProps(),
    upAxis: P5.Vector = new P5.Vector(0, 0, 1),
  ) {
    super(sketch, coords, physicalProperties, upAxis);
  }

  /**
   * Adds one or more vehicles to the system's vehicle collection.
   * This method mutates the system's collection and returns it for method chaining.
   * @param vehicles A single Vehicle or array of Vehicles to add to the system
   * @param rebuildOcTree Whether to rebuild spatial partitioning after adding (default: true)
   * @returns This VehicleSystem instance for method chaining
   */
  addVehicle(
    vehicles: Vehicle | Vehicle[],
    rebuildOcTree: boolean = true,
  ): VehicleSystem {
    this.systemVehicles.addVehicle(vehicles, rebuildOcTree);
    return this;
  }

  /**
   * Updates the system and all contained sub-vehicles in hierarchical order.
   * First updates the parent system vehicle's physics based on system-level forces.
   * Then applies the positional change to all sub-vehicles (maintains relative positions).
   * Finally updates each sub-vehicle's physics with their own applied forces.
   * This method mutates the instance and returns it for method chaining.
   * @returns This VehicleSystem instance for method chaining
   */
  update(): VehicleSystem {
    // updates the system based on all forces that have been applied at the system level,
    // then transforms all subvehicles based on change in the system's position,
    // then updates all subvehicles based on forces that have been applied at the sublevel
    super.update();
    if (this.previousCoords.length === 0) {
      const changeInPosition = this.coords.copy().sub(this.previousCoords[0]);
      this.systemVehicles.transformAll(changeInPosition);
    }
    this.systemVehicles.update();
    return this;
  }
}
