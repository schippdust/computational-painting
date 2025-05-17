import P5 from 'p5';
import { prependUniqueWithLimit } from './CodeUtils';
import type { WindSystem } from './WindSystem';
import { CoordinateSystem } from './CoordinateSystem';

export interface VehiclePhysicalProps {
  velocity: P5.Vector;
  acceleration: P5.Vector;
  mass: number;
  maxVelocity: number;
  maxSteerForce: number;
  maxPitchAdjustment: number; // in radians
  aggregateSteer: P5.Vector;
  forward: P5.Vector;
  up: P5.Vector;
}

function createGenericPhysicalProps() {
  return {
    velocity: new P5.Vector(0, 0, 0),
    acceleration: new P5.Vector(0, 0, 0),
    mass: 10,
    maxVelocity: 10,
    maxSteerForce: 10,
    maxPitchAdjustment: Math.PI / 12, // radians
    aggregateSteer: new P5.Vector(0, 0, 0),
    forward: new P5.Vector(0, 0, 0),
    up: new P5.Vector(0, 0, 1),
  };
}

export interface VehicleEnvironmentalProperties {
  friction: number | null; // friction number from 0 to 1 will reduce motion by that amount
}

export class Vehicle {
  public uuid: string;
  private p5: P5;

  // characteristics
  public lifeExpectancy: number;
  public age: number;

  // simulation variables
  public coordSystem: CoordinateSystem;
  private previousCoords: P5.Vector[];
  private previousUpDirection: P5.Vector | null;
  private previousForward: P5.Vector | null;
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
    this.phys = physicalProperties;
    this.phys.up = upAxis; //should always be normalized
    this.phys.forward = new P5.Vector(0, 0, 0); //should always be normalized or 0
    this.env = { friction: null };

    this.constrainMovementOrthogonally = false;
    this.desiredSeparation = 40;
  }

  get coords(): P5.Vector {
    return this.coordSystem.getPosition();
  }

  get isDead(): boolean {
    return this.age >= this.lifeExpectancy;
  }

  set velocity(velocityVector: P5.Vector) {
    this.phys.velocity = velocityVector.copy();
    this.phys.forward = velocityVector.copy().normalize();
  }

  randomizeLocation(
    fromCoord: P5.Vector,
    maxDist: number,
    is3D: boolean = true,
    randomizeUp: boolean = true,
  ): Vehicle {
    let randomX = this.p5.random(fromCoord.x - maxDist, fromCoord.x + maxDist);
    let randomY = this.p5.random(fromCoord.y - maxDist, fromCoord.y + maxDist);
    let randomZ = this.p5.random(fromCoord.z - maxDist, fromCoord.z + maxDist);
    let randomCoords = new P5.Vector(randomX, randomY, is3D ? randomZ : 0);
    if (randomizeUp && is3D) {
      let randomUpX = this.p5.random();
      let randomUpY = this.p5.random();
      let randomUpZ = this.p5.random();
      let randomUp = new P5.Vector(randomUpX, randomUpY, randomUpZ).normalize();
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
      this.coords,
      this.maxNumberOfPreviousCoords,
    );

    // Store previous up direction
    this.previousUpDirection = this.phys.up.copy();

    // Update position
    this.coordSystem.translateCoordinateSystem(this.phys.velocity);

    // Update pitch
    const pitchTarget = this.calculateTargetPitch();
    const currentUp = this.phys.up.copy().normalize();
    const angleBetween = currentUp.angleBetween(pitchTarget);

    if (angleBetween > 1e-5) {
      const rotationAxis = currentUp.copy().cross(pitchTarget).normalize();
      const limitedAngle = Math.min(angleBetween, this.phys.maxPitchAdjustment);
      const rotatedUp = currentUp
        .copy()
        .rotate(limitedAngle, rotationAxis)
        .normalize();
      this.phys.up = rotatedUp;
      this.coordSystem.setYAxis(rotatedUp);
    }
    // rotate coordinate system up to the maxPitchAdjustment to attempt to match the pitch target
    // set up to be equal to a normalized version of this vector

    // Stop near-zero velocities
    if (this.phys.velocity.mag() < 0.00001) {
      this.phys.velocity.mult(0);
    }

    this.age += 1;
    return this;
  }

  private calculateTargetPitch(): P5.Vector {
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

    // Near 0 conditions will occur if the direction hasn't really changed
    if (pitchNormal.mag() < 1e-5) {
      return this.phys.up.copy();
    }

    // Project the previous up direction onto the pitch plane with some fun vector math
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

  // creating simple debugging object, customize as needed
  toJson() {
    let coords = this.coords;
    let velocity = this.phys.velocity;
    let up = this.phys.up;
    return {
      uuid: this.uuid,
      age: this.age,
      coords: `X:${coords.x}, Y:${coords.y}, Z:${coords.z}`,
      velocity: `X:${velocity.x}, Y:${velocity.y}, Z:${velocity.z}`,
      up: `X:${up.x}, Y:${up.y}, Z:${up.z}`,
    };
  }
}
