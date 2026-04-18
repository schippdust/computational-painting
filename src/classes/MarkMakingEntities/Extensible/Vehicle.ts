import P5 from 'p5';
import { prependUniqueWithLimit } from '../../Core/CodeUtils';
import type { WindSystem } from '../../Core/WindSystem';
import { CoordinateSystem } from '../../Geometry/CoordinateSystem';
import { rotate3D } from '../../Geometry/VectorOverloads';

/**
 * Physical properties of a vehicle including kinematics, mass, and steering constraints.
 * Defines velocity, acceleration, angular limits, and directional vectors for 3D movement.
 */
export interface VehiclePhysicalProps {
  velocity: P5.Vector;
  acceleration: P5.Vector;
  mass: number;
  useMaxVelocity: boolean;
  maxVelocity: number;
  maxSteerForce: number;
  maxPitchAdjustment: number; // in radians
  aggregateSteer: P5.Vector;
  forward: P5.Vector;
  up: P5.Vector;
}

/**
 * Creates a new VehiclePhysicalProps object with sensible default values.
 * Provides a template for vehicle initialization with standard mass, velocity limits, and orientation.
 * @returns A VehiclePhysicalProps object with default values
 */
export function createGenericPhysicalProps(): VehiclePhysicalProps {
  return {
    velocity: new P5.Vector(0, 0, 0),
    acceleration: new P5.Vector(0, 0, 0),
    mass: 10,
    useMaxVelocity: false,
    maxVelocity: 10,
    maxSteerForce: 10,
    maxPitchAdjustment: Math.PI / 12, // radians
    aggregateSteer: new P5.Vector(0, 0, 0),
    forward: new P5.Vector(0, 0, 0),
    up: new P5.Vector(0, 0, 1),
  };
}

/**
 * Environmental properties affecting vehicle behavior.
 * Currently includes friction (damping) but extensible for other environmental factors.
 */
export interface VehicleEnvironmentalProperties {
  friction: number | null; // friction number from 0 to 1 will reduce motion by that amount
}

/**
 * A simulated agent or "vehicle" capable of movement, steering, and flocking behaviors.
 * Integrates physics simulation with behavioral steering and path tracking.
 * Maintains position via CoordinateSystem, tracks history, and supports various steering behaviors.
 */
export class Vehicle {
  public uuid: string;
  protected p5: P5;

  // characteristics
  public lifeExpectancy: number;
  public age: number;

  // simulation variables
  public coordSystem: CoordinateSystem;
  protected previousCoords: P5.Vector[];
  protected previousUpDirection: P5.Vector | null;
  protected previousForward: P5.Vector | null;
  protected maxNumberOfPreviousCoords: number;
  public phys: VehiclePhysicalProps;
  public env: VehicleEnvironmentalProperties;

  // behavior variables
  public constrainMovementOrthogonally: boolean;
  public desiredSeparation: number;
  protected persistentSteerForces: P5.Vector[] = [];

  /**
   * Creates a new Vehicle.
   * @param sketch The p5 instance
   * @param coords The initial position in world space
   * @param physicalProperties Physical/kinematic properties (default: generic properties)
   * @param upAxis The initial up direction for the vehicle's coordinate system (default: +Z)
   */
  constructor(
    sketch: P5,
    coords: P5.Vector,
    physicalProperties: VehiclePhysicalProps = createGenericPhysicalProps(),
    upAxis: P5.Vector = new P5.Vector(0, 0, 1),
  ) {
    this.uuid = crypto.randomUUID();
    this.p5 = sketch;

    this.lifeExpectancy = 150;
    this.age = 0;

    this.coordSystem = CoordinateSystem.fromOriginAndNormal(coords, upAxis);
    this.previousCoords = [];
    this.previousForward = null;
    this.previousUpDirection = null;
    this.maxNumberOfPreviousCoords = 10;
    // Copy mutable vector fields so vehicles constructed from the same props object
    // don't share acceleration/velocity state (shallow spread callers like GridGenerator
    // pass { ...propsObj }, which leaves P5.Vector references shared across all instances).
    this.phys = {
      ...physicalProperties,
      velocity: physicalProperties.velocity.copy(),
      acceleration: physicalProperties.acceleration.copy(),
      aggregateSteer: physicalProperties.aggregateSteer.copy(),
    };
    this.phys.up = upAxis; //should always be normalized
    this.phys.forward = new P5.Vector(0, 0, 0); //should always be normalized or 0
    this.env = { friction: null };

    this.constrainMovementOrthogonally = false;
    this.desiredSeparation = 40;
    this.persistentSteerForces = [];
  }

  /**
   * Gets the current position of the vehicle in world space.
   * @returns The vehicle's position
   */
  get coords(): P5.Vector {
    return this.coordSystem.getPosition();
  }

  /**
   * Tests whether the vehicle has exceeded its lifespan.
   * @returns True if age >= lifeExpectancy, false otherwise
   */
  get isDead(): boolean {
    return this.age >= this.lifeExpectancy;
  }

  /**
   * The vehicle's position history, stored most-recent-first.
   * The array is capped at maxNumberOfPreviousCoords entries (default: 10).
   * @returns A readonly view of the vehicle's previous world-space positions
   */
  get positionHistory(): readonly P5.Vector[] {
    return this.previousCoords;
  }

  /**
   * Sets the vehicle's velocity and updates the forward direction to match.
   * The forward vector is normalized from the velocity vector.
   * @param velocityVector The new velocity vector
   */
  set velocity(velocityVector: P5.Vector) {
    this.phys.velocity = velocityVector.copy();
    this.phys.forward = velocityVector.copy().normalize();
  }

  /**
   * Randomly relocates the vehicle to a position within a specified radius.
   * Optionally randomizes the up direction for 3D orientation variation.
   * This method mutates the instance and returns it for method chaining.
   * @param fromCoord The center position from which to randomize
   * @param maxDist The maximum distance to randomize in each direction
   * @param is3D If true, randomizes Z coordinate; if false, keeps Z = 0 (default: true)
   * @param randomizeUp If true, randomizes the up direction for 3D variation (default: true)
   * @returns This Vehicle instance for method chaining
   */
  randomizeLocation(
    fromCoord: P5.Vector,
    maxDist: number,
    is3D: boolean = true,
    randomizeUp: boolean = true,
  ): Vehicle {
    const randomX = this.p5.random(fromCoord.x - maxDist, fromCoord.x + maxDist);
    const randomY = this.p5.random(fromCoord.y - maxDist, fromCoord.y + maxDist);
    const randomZ = this.p5.random(fromCoord.z - maxDist, fromCoord.z + maxDist);
    const randomCoords = new P5.Vector(randomX, randomY, is3D ? randomZ : 0);
    if (randomizeUp && is3D) {
      const randomUpX = this.p5.random();
      const randomUpY = this.p5.random();
      const randomUpZ = this.p5.random();
      const randomUp = new P5.Vector(randomUpX, randomUpY, randomUpZ).normalize();
      this.coordSystem = CoordinateSystem.fromOriginAndNormal(
        randomCoords,
        randomUp,
      );
    } else {
      this.coordSystem = CoordinateSystem.fromOriginAndNormal(
        randomCoords,
        this.coordSystem.getYAxis(),
      );
    }
    return this;
  }

  /**
   * Applies a translation to the vehicle's position.
   * This method mutates the instance and returns it for method chaining.
   * @param vectorTransformation The translation vector to apply
   * @returns This Vehicle instance for method chaining
   */
  transform(vectorTransformation: P5.Vector): Vehicle {
    this.coordSystem.translateCoordinateSystem(vectorTransformation);
    return this;
  }

  /**
   * Updates the vehicle's physics and age in a single frame.
   * Applies forces, updates velocity and position, adjusts pitch toward target orientation,
   * stores historical data, and increments age.
   * This method mutates the instance and returns it for method chaining.
   * @returns This Vehicle instance for method chaining
   */
  update(): Vehicle {
    // storing previous data
    prependUniqueWithLimit(
      this.previousCoords,
      this.coords,
      this.maxNumberOfPreviousCoords,
    );
    this.previousUpDirection = this.phys.up.copy().normalize();
    this.previousForward = this.phys.forward.copy().normalize();

    // Apply persistent steer forces at the beginning of the update
    for (const steerForce of this.persistentSteerForces) {
      this.applyForce(steerForce.copy());
    }

    // apply pseudo friction if relevant
    if (this.env.friction != null) {
      this.applyFriction();
    }

    // Limit acceleration BEFORE applying it to velocity
    this.phys.acceleration.limit(this.phys.maxSteerForce); // optional safety clamp
    this.phys.velocity = P5.Vector.add(
      this.phys.velocity,
      this.phys.acceleration,
    );
    if (this.phys.useMaxVelocity) {
      this.phys.velocity.limit(this.phys.maxVelocity);
    }
    // Reset acceleration so it doesn't carry into next frame
    this.phys.acceleration.mult(0);
    // Update coordinate system based on new position and velocity direction
    this.coordSystem.translateCoordinateSystem(this.phys.velocity);
    this.coordSystem = CoordinateSystem.fromOriginAndNormal(
      this.coords,
      this.phys.velocity,
    );
    this.phys.forward = this.coordSystem.getZAxis(1);

    // Update pitch (up direction) based on forward direction changes
    const pitchTarget = this.calculateTargetPitch();
    const previousUp = this.phys.up.copy().normalize();
    const angleBetween = previousUp.angleBetween(pitchTarget);
    const angleThreshold = 1e-5;

    if (angleBetween > angleThreshold) {
      const rotationAxis = previousUp.copy().cross(pitchTarget).normalize();
      const limitedAngle = Math.min(angleBetween, this.phys.maxPitchAdjustment);
      const rotatedUp = rotate3D(
        previousUp.copy(),
        limitedAngle,
        rotationAxis,
      ).normalize();
      this.phys.up = rotatedUp;
      this.coordSystem.setYAxis(rotatedUp);
    }

    // Stop near-zero velocities to avoid numerical drift
    const velocityThreshold = 1e-5;
    if (this.phys.velocity.mag() < velocityThreshold) {
      this.phys.velocity.mult(0);
    }

    this.age += 1;
    return this;
  }

  /**
   * Calculates the target pitch (up direction) based on forward direction changes.
   * Uses the pitch plane defined by previous and current forward vectors.
   * Ensures smooth orientation transitions frame-to-frame.
   * @returns The target up direction vector for pitch adjustment
   * @private
   */
  private calculateTargetPitch(): P5.Vector {
    const minMagnitudeThreshold = 1e-5; // Threshold for near-zero cross product conditions

    if (!this.previousForward || !this.previousUpDirection) {
      return this.phys.up.copy();
    }

    const currentForward = this.phys.forward.copy().normalize();
    const previousForward = this.previousForward.copy().normalize();
    const previousUp = this.previousUpDirection.copy().normalize();

    // The pitch plane is defined by the cross product of the previousForward and currentForward
    const pitchNormal = previousForward
      .copy()
      .cross(currentForward)
      .normalize();

    // Skip adjustment if direction hasn't meaningfully changed
    if (pitchNormal.mag() < minMagnitudeThreshold) {
      return this.phys.up.copy();
    }

    // Project the previous up direction onto the pitch plane
    const dot = previousUp.dot(pitchNormal);
    const projectedUp = previousUp
      .copy()
      .sub(pitchNormal.copy().mult(dot))
      .normalize();

    const newUp = currentForward
      .copy()
      .cross(currentForward.copy().cross(projectedUp))
      .normalize();

    return newUp;
  }

  /**
   * Applies drag/friction to reduce the vehicle's velocity.
   * Uses the environmental friction coefficient (0-1) to dampen motion.
   * This method mutates the instance and returns it for method chaining.
   * @returns This Vehicle instance for method chaining
   */
  applyFriction(): Vehicle {
    if (this.env.friction == null) {
      return this;
    }
    const friction = P5.Vector.copy(this.phys.velocity);
    friction.mult(-1).mult(this.env.friction);
    this.applyForce(friction);
    return this;
  }

  /**
   * Applies wind force from a wind system to the vehicle.
   * Combines directional wind and eddies at the vehicle's current position.
   * This method mutates the instance and returns it for method chaining.
   * @param windSystem The wind system to sample from
   * @param directionalWindMultiplier Scale factor for global wind (default: 1)
   * @param eddyMultiplier Scale factor for local turbulence (default: 1)
   * @returns This Vehicle instance for method chaining
   */
  applyWind(
    windSystem: WindSystem,
    directionalWindMultiplier = 1,
    eddyMultiplier = 1,
  ): Vehicle {
    const wind = windSystem.calculateWindAtCoords(
      this.coords,
      directionalWindMultiplier,
      eddyMultiplier,
    );
    this.applyForce(wind);
    return this;
  }

  /**
   * Applies a force to the vehicle by converting it to acceleration (F = ma).
   * Accumulates into the aggregated acceleration for the update step.
   * This method mutates the instance and returns it for method chaining.
   * @param force The force vector to apply
   * @returns This Vehicle instance for method chaining
   */
  applyForce(force: P5.Vector): Vehicle {
    const acceleration = force
      .copy()
      .div(this.phys.mass)
      .limit(this.phys.maxSteerForce);
    this.phys.acceleration.add(acceleration);
    return this;
  }

  /**
   * Applies the accumulated steering force and then resets it to zero.
   * Called after all steering behaviors have contributed to the aggregateSteer.
   * This method mutates the instance and returns it for method chaining.
   * @returns This Vehicle instance for method chaining
   */
  applyAggregateSteerForce(): Vehicle {
    this.applyForce(this.phys.aggregateSteer);
    this.phys.aggregateSteer.mult(0);
    return this;
  }

  /**
   * Seeks toward a target position with a given steering force multiplier.
   * Steering force scales with the desired velocity direction.
   * This method mutates the instance and returns it for method chaining.
   * @param targetPosition The position to seek toward
   * @param multiplier Scale factor for steering strength (default: 1)
   * @returns This Vehicle instance for method chaining
   */
  seek(targetPosition: P5.Vector, multiplier: number = 1): Vehicle {
    const desiredVelocity = P5.Vector.sub(targetPosition, this.coords);
    this.steer(desiredVelocity, multiplier);
    return this;
  }

  /**
   * Applies a steering force in a specified direction.
   * Returns immediately if direction has zero magnitude.
   * This method mutates the instance and returns it for method chaining.
   * @param direction The direction to steer toward (will be normalized)
   * @param multiplier Scale factor for steering strength (default: 1)
   * @returns This Vehicle instance for method chaining
   */
  steer(direction: P5.Vector, multiplier: number = 1): Vehicle {
    direction = direction.copy();
    if (direction.mag() == 0) {
      return this;
    }

    direction.mult(multiplier);

    const steer = direction;
    this.applyForce(steer);
    return this;
  }

  /**
   * Arrives at a target position with smooth deceleration.
   * Reduces velocity as the vehicle approaches to avoid overshooting.
   * Uses maxVelocity and maxSteerForce to calculate deceleration distance.
   * This method mutates the instance and returns it for method chaining.
   * @param targetPosition The position to arrive at
   * @returns This Vehicle instance for method chaining
   */
  arrive(targetPosition: P5.Vector): Vehicle {
    const desiredVelocity = P5.Vector.sub(targetPosition, this.coords);
    const desiredMagnitude = desiredVelocity.mag();
    desiredVelocity.normalize();
    const maxAccel = Math.sqrt(this.phys.maxSteerForce / this.phys.mass);
    const extraFrames = 3; // a little fudge factor
    const framesToStop = this.phys.maxVelocity / maxAccel + extraFrames;
    const decelRadius = framesToStop * this.phys.maxVelocity;

    if (desiredMagnitude < decelRadius) {
      const mappedMagnitude = this.p5.map(
        desiredMagnitude,
        0,
        decelRadius,
        0,
        this.phys.maxVelocity,
      );
      desiredVelocity.mult(mappedMagnitude);
    } else {
      desiredVelocity.mult(this.phys.maxVelocity);
    }
    const steer = P5.Vector.sub(desiredVelocity, this.phys.velocity);
    this.applyForce(steer);
    return this;
  }

  /**
   * Avoids a target position by steering away if too close.
   * Avoidance force increases as proximity decreases.
   * Returns immediately if already at or beyond the desired closest distance.
   * This method mutates the instance and returns it for method chaining.
   * @param targetPosition The position to avoid
   * @param desiredClosestDistance The minimum acceptable distance
   * @param multiplier Scale factor for avoidance strength (default: 1)
   * @returns This Vehicle instance for method chaining
   */
  avoid(
    targetPosition: P5.Vector,
    desiredClosestDistance: number,
    multiplier: number = 1,
  ): Vehicle {
    let distanceBetween = P5.Vector.dist(this.coords, targetPosition);
    if (distanceBetween > desiredClosestDistance) {
      return this;
    } else {
      const steerDirection = P5.Vector.sub(
        this.coords,
        targetPosition,
      ).normalize();
      const minDistance = 0.001; // Prevent division by zero when exactly at target
      if (distanceBetween == 0) {
        distanceBetween = minDistance;
      }
      const closenessRatio = distanceBetween / desiredClosestDistance;
      steerDirection.div(closenessRatio);
      this.steer(steerDirection, multiplier);
      return this;
    }
  }

  /**
   * Steers to maintain separation from nearby vehicles.
   * Calculates a repelling force based on proximity and desired separation distance.
   * Returns immediately if no other vehicles are provided.
   * This method mutates the instance and returns it for method chaining.
   * @param otherVehicleCoords Array of positions to maintain separation from
   * @param separateMultiplier Scale factor for separation strength (default: 0.5)
   * @returns This Vehicle instance for method chaining
   */
  separate(
    otherVehicleCoords: P5.Vector[],
    separateMultiplier: number = 0.5,
  ): Vehicle {
    if (otherVehicleCoords.length <= 0) {
      return this;
    }
    let countOfVehiclesTooClose = 0;
    let sumOfDistance = 0;
    const sumVect = new P5.Vector(0, 0, 0);

    for (const v of otherVehicleCoords) {
      const d = P5.Vector.dist(this.coords, v);

      if (d > 0 && d < this.desiredSeparation) {
        sumOfDistance += d;
        const diff = P5.Vector.sub(this.coords, v).normalize().div(d);
        sumVect.add(diff);
        countOfVehiclesTooClose += 1;
      }
    }
    if (countOfVehiclesTooClose > 0) {
      sumVect.mult(sumOfDistance / countOfVehiclesTooClose);
    }

    this.steer(sumVect, separateMultiplier);
    return this;
  }

  /**
   * Aligns the vehicle with the average direction of nearby neighbors.
   * Takes either a single vector or array of alignment vectors.
   * This method mutates the instance and returns it for method chaining.
   * @param alignmentVectors Single vector or array of velocity/direction vectors to align with
   * @param alignMultiplier Scale factor for alignment strength (default: 5)
   * @returns This Vehicle instance for method chaining
   */
  align(
    alignmentVectors: P5.Vector[] | P5.Vector,
    alignMultiplier: number = 5,
  ): Vehicle {
    const vectorList = Array.isArray(alignmentVectors)
      ? alignmentVectors
      : [alignmentVectors];
    if (vectorList.length <= 0) {
      return this;
    }
    const sumVect = new P5.Vector(0, 0, 0);
    for (const v of vectorList) {
      sumVect.add(v);
    }
    sumVect.div(vectorList.length);
    this.steer(sumVect, alignMultiplier);
    return this;
  }

  /**
   * Steers toward the center of mass of nearby vehicles.
   * Implements cohesion behavior for flocking/group dynamics.
   * This method mutates the instance and returns it for method chaining.
   * @param otherVehicleCoords Array of positions to cohere toward
   * @param cohereMultiplier Scale factor for cohesion strength (default: 5)
   * @returns This Vehicle instance for method chaining
   */
  cohere(
    otherVehicleCoords: P5.Vector[],
    cohereMultiplier: number = 5,
  ): Vehicle {
    if (otherVehicleCoords.length <= 0) {
      return this;
    }
    const sumVect = new P5.Vector(0, 0, 0);
    for (const v of otherVehicleCoords) {
      sumVect.add(v);
    }
    sumVect.div(otherVehicleCoords.length);
    this.seek(sumVect, cohereMultiplier);
    return this;
  }

  /**
   * Applies combined flocking behavior: separation, alignment, and cohesion.
   * This is the classic boid behavior from Reynolds' flocking algorithm.
   * This method mutates the instance and returns it for method chaining.
   * @param neighborCoords Array of nearby vehicle positions for separation and cohesion
   * @param neighborVelocities Array of nearby vehicle velocities for alignment
   * @param separateMultiplier Scale factor for separation behavior
   * @param alignMultiplier Scale factor for alignment behavior
   * @param cohereMultiplier Scale factor for cohesion behavior
   * @returns This Vehicle instance for method chaining
   */
  flock(
    neighborCoords: P5.Vector[],
    neighborVelocities: P5.Vector[],
    separateMultiplier: number,
    alignMultiplier: number,
    cohereMultiplier: number,
  ): Vehicle {
    this.separate(neighborCoords, separateMultiplier);
    this.align(neighborVelocities, alignMultiplier);
    this.cohere(neighborCoords, cohereMultiplier);
    return this;
  }

  /**
   * Creates a deep copy of this vehicle with all its properties and state.
   * Includes physical properties, environmental settings, and historical trajectory data.
   * The new vehicle will have a different UUID but otherwise identical configuration.
   * @returns A new Vehicle instance that is an independent copy of this one
   */
  duplicate(): Vehicle {
    // Create copies of physical properties
    const copiedPhysicalProps: VehiclePhysicalProps = {
      velocity: this.phys.velocity.copy(),
      acceleration: this.phys.acceleration.copy(),
      mass: this.phys.mass,
      useMaxVelocity: this.phys.useMaxVelocity,
      maxVelocity: this.phys.maxVelocity,
      maxSteerForce: this.phys.maxSteerForce,
      maxPitchAdjustment: this.phys.maxPitchAdjustment,
      aggregateSteer: this.phys.aggregateSteer.copy(),
      forward: this.phys.forward.copy(),
      up: this.phys.up.copy(),
    };

    // Create a new vehicle with the copied properties
    const newVehicle = new Vehicle(
      this.p5,
      this.coords.copy(),
      copiedPhysicalProps,
      this.phys.up.copy(),
    );

    // Copy other properties
    newVehicle.lifeExpectancy = this.lifeExpectancy;
    newVehicle.age = this.age;
    newVehicle.env.friction = this.env.friction;
    newVehicle.constrainMovementOrthogonally =
      this.constrainMovementOrthogonally;
    newVehicle.desiredSeparation = this.desiredSeparation;

    // Copy previous coordinates and directions if they exist
    newVehicle.previousCoords = this.previousCoords.map((coord) =>
      coord.copy(),
    );
    if (this.previousUpDirection) {
      newVehicle.previousUpDirection = this.previousUpDirection.copy();
    }
    if (this.previousForward) {
      newVehicle.previousForward = this.previousForward.copy();
    }

    // Copy persistent steer forces
    newVehicle.persistentSteerForces = this.persistentSteerForces.map((force) =>
      force.copy(),
    );

    return newVehicle;
  }

  /**
   * Adds one or more persistent steer forces to be applied every frame.
   * Persistent forces are retained across updates and duplications, providing
   * continuous acceleration or steering influence. The forces are applied sequentially
   * at the beginning of each update cycle.
   * This method mutates the instance and returns it for method chaining.
   * @param forces A single force vector or array of force vectors to add
   * @param preventDuplicates If true (default), prevents adding forces that already exist (using approximate equality)
   * @returns This Vehicle instance for method chaining
   */
  addPersistentSteerForce(
    forces: P5.Vector | P5.Vector[],
    preventDuplicates: boolean = true,
  ): Vehicle {
    const forcesToAdd = Array.isArray(forces) ? forces : [forces];
    const tolerance = 1e-6;

    for (const force of forcesToAdd) {
      // Check for duplicates if prevention is enabled
      let isDuplicate = false;
      if (preventDuplicates) {
        isDuplicate = this.persistentSteerForces.some((existing) => {
          const dx = Math.abs(existing.x - force.x);
          const dy = Math.abs(existing.y - force.y);
          const dz = Math.abs(existing.z - force.z);
          return dx <= tolerance && dy <= tolerance && dz <= tolerance;
        });
      }

      // Only add if not a duplicate (or if duplicates are allowed)
      if (!isDuplicate) {
        this.persistentSteerForces.push(force.copy());
      }
    }
    return this;
  }

  /**
   * Removes a specific persistent steer force by vector value.
   * Searches for the first force matching the given vector (using approximate equality)
   * and removes it. If not found, returns without error.
   * This method mutates the instance and returns it for method chaining.
   * @param force The force vector to remove
   * @returns This Vehicle instance for method chaining
   */
  removePersistentSteerForce(force: P5.Vector): Vehicle {
    const tolerance = 1e-6;
    this.persistentSteerForces = this.persistentSteerForces.filter((f) => {
      const dx = Math.abs(f.x - force.x);
      const dy = Math.abs(f.y - force.y);
      const dz = Math.abs(f.z - force.z);
      return dx > tolerance || dy > tolerance || dz > tolerance;
    });
    return this;
  }

  /**
   * Removes multiple persistent steer forces from the list.
   * Removes all forces matching the given vectors (using approximate equality).
   * This method mutates the instance and returns it for method chaining.
   * @param forces Array of force vectors to remove
   * @returns This Vehicle instance for method chaining
   */
  removePersistentSteerForces(forces: P5.Vector[]): Vehicle {
    for (const force of forces) {
      this.removePersistentSteerForce(force);
    }
    return this;
  }

  /**
   * Removes all persistent steer forces from the vehicle.
   * Clears the entire persistent steer forces array.
   * This method mutates the instance and returns it for method chaining.
   * @returns This Vehicle instance for method chaining
   */
  clearPersistentSteerForces(): Vehicle {
    this.persistentSteerForces = [];
    return this;
  }

  /**
   * Serializes the vehicle's state to a simple JSON object for debugging.
   * Includes UUID, age, position, velocity, and up direction.
   * @returns A plain object with serialized vehicle data
   */
  // creating simple debugging object, customize as needed
  toJson() {
    const coords = this.coords;
    const velocity = this.phys.velocity;
    const up = this.phys.up;
    return {
      uuid: this.uuid,
      age: this.age,
      coords: `X:${coords.x}, Y:${coords.y}, Z:${coords.z}`,
      velocity: `X:${velocity.x}, Y:${velocity.y}, Z:${velocity.z}`,
      up: `X:${up.x}, Y:${up.y}, Z:${up.z}`,
    };
  }
}
