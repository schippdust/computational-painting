import P5 from 'p5';
import { prependUniqueWithLimit } from './CodeUtils';

export interface VehiclePhysicalProps {
  velocity: P5.Vector;
  acceleration: P5.Vector;
  mass: number;
  maxVelocity: number;
  maxSteerForce: number;
  aggregateSteer: P5.Vector;
  forward: P5.Vector | null;
}

function createGenericPhysicalProps() {
  return {
    velocity: new P5.Vector(0, 0, 0),
    acceleration: new P5.Vector(0, 0, 0),
    mass: 10,
    maxVelocity: 10,
    maxSteerForce: 10,
    aggregateSteer: new P5.Vector(0, 0, 0),
    forward: null,
  };
}

export interface VehicleEnvironmentalProperties {
  wind: P5.Vector | null;
  friction: number | null; // friction number from 0 to 1 will reduce motion by that amount
}

export class Vehicle {
  public uuid: string;
  private p5: P5;

  // characteristics
  public lifeExpectancy: number;
  public age: number;

  // simulation variables
  public coords: P5.Vector;
  private previousCoords: P5.Vector[];
  private maxNumberOfPreviousCoords: number;
  public phys: VehiclePhysicalProps;
  public env: VehicleEnvironmentalProperties;

  // behavior variables
  public constrainMovementOrthogonally: boolean;
  public desiredSeparation: number;

  constructor(
    sketch: P5,
    coords: P5.Vector,
    physicalProperties: VehiclePhysicalProps = createGenericPhysicalProps(),
  ) {
    this.uuid = crypto.randomUUID();
    this.p5 = sketch;

    this.lifeExpectancy = 150;
    this.age = 0;

    this.coords = coords.copy();
    this.previousCoords = [];
    this.maxNumberOfPreviousCoords = 10;
    this.phys = physicalProperties;
    this.env = { wind: null, friction: null };

    this.constrainMovementOrthogonally = false;
    this.desiredSeparation = 40;
  }

  randomizeLocation(
    fromCoord: P5.Vector,
    maxDist: number,
    is3D: boolean = false,
  ): Vehicle {
    let randomX = this.p5.random(fromCoord.x - maxDist, fromCoord.x + maxDist);
    let randomY = this.p5.random(fromCoord.y - maxDist, fromCoord.y + maxDist);
    let randomZ = this.p5.random(fromCoord.z - maxDist, fromCoord.z + maxDist);
    this.coords = new P5.Vector(randomX, randomY, is3D ? randomZ : 0);
    return this;
  }

  update(): Vehicle {
    if (this.env.friction != null) {
      this.applyFriction();
    }

    // Reset acceleration BEFORE applying it to velocity
    this.phys.acceleration.limit(this.phys.maxSteerForce); // optional safety clamp
    this.phys.velocity = P5.Vector.add(
      this.phys.velocity,
      this.phys.acceleration,
    );
    this.phys.velocity.limit(this.phys.maxVelocity);
    // Reset acceleration so it doesn't carry into next frame
    this.phys.acceleration.mult(0);

    // Store previous position
    prependUniqueWithLimit(
      this.previousCoords,
      this.coords.copy(),
      this.maxNumberOfPreviousCoords,
    );

    // Update position
    this.coords = P5.Vector.add(this.coords, this.phys.velocity);

    // Stop near-zero velocities
    if (this.phys.velocity.mag() < 0.00001) {
      this.phys.velocity.mult(0);
    }

    this.age += 1;
    return this;
  }

  setVelocity(velocity: P5.Vector) {
    velocity = velocity.copy();
    this.phys.velocity = velocity;
    console.log(this.uuid, 'setting velocity', velocity);
  }

  applyFriction(): Vehicle {
    if (this.env.friction == null) {
      return this;
    }
    const friction = P5.Vector.copy(this.phys.velocity);
    friction.mult(-1).normalize().mult(this.env.friction);
    this.applyForce(friction);
    return this;
  }

  applyWind(): Vehicle {
    return this;
  }

  applyForce(force: P5.Vector): Vehicle {
    const acceleration = force.copy().div(this.phys.mass);
    this.phys.acceleration.add(acceleration);
    return this;
  }

  applyAggregateSteerForce(): Vehicle {
    this.applyForce(this.phys.aggregateSteer);
    this.phys.aggregateSteer.mult(0);
    return this;
  }

  seak(targetPosition: P5.Vector, multiplier: number = 1): Vehicle {
    const desiredVelocity = P5.Vector.sub(targetPosition, this.coords);
    this.steer(desiredVelocity, multiplier);
    return this;
  }

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
      if (distanceBetween == 0) {
        distanceBetween = 0.001;
      }
      const closenessRatio = distanceBetween / desiredClosestDistance;
      steerDirection.div(closenessRatio);
      this.steer(steerDirection, multiplier);
      return this;
    }
  }

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
    this.seak(sumVect, cohereMultiplier);
    return this;
  }

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
}
