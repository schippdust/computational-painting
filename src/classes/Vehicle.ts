import P5 from 'p5';
import { prependUniqueWithLimit } from './CodeUtils';

export interface VehiclePhysicalProps {
  velocity: P5.Vector;
  acceleration: P5.Vector;
  mass: number;
  maxVelocity: number;
  maxSteerForce: number | null;
  aggregateSteer: P5.Vector;
  forward: P5.Vector | null;
}

const genericPhysicalProps: VehiclePhysicalProps = {
  velocity: new P5.Vector(0, 0, 0),
  acceleration: new P5.Vector(0, 0, 0),
  mass: 10,
  maxVelocity: 10,
  maxSteerForce: null,
  aggregateSteer: new P5.Vector(0, 0, 0),
  forward: null,
};

export interface VehicleEnvironmentalProperties {
  wind: P5.Vector | null;
  friction: number | null; // friction number from 0 to 1 will reduce motion by that amount
}

export class Vehicle {
  public uuid: string;
  private p5: P5;

  private lifeExpectancy: number;
  private age: number;

  public coords: P5.Vector;
  private previousCoords: P5.Vector[];
  private maxNumberOfPreviousCoords: number;
  private phys: VehiclePhysicalProps;
  private env: VehicleEnvironmentalProperties;

  public constrainMovementOrthogonally: boolean;

  constructor(
    sketch: P5,
    coords: P5.Vector,
    physicalProperties: VehiclePhysicalProps = genericPhysicalProps,
  ) {
    this.uuid = crypto.randomUUID();
    this.p5 = sketch;

    this.lifeExpectancy = 10000;
    this.age = 0;

    this.coords = coords;
    this.previousCoords = [];
    this.maxNumberOfPreviousCoords = 10;
    this.phys = physicalProperties;
    this.env = { wind: null, friction: null };

    this.constrainMovementOrthogonally = false;
  }

  update(): void {
    if (this.env.friction != null) {
      this.applyFriction();
    }
    this.phys.velocity.add(this.phys.acceleration).limit(this.phys.maxVelocity); // applying acceleration to velocity
    prependUniqueWithLimit(
      this.previousCoords,
      this.coords.copy(),
      this.maxNumberOfPreviousCoords,
    ); // logging previous coordinates before updating
    this.coords.add(this.phys.velocity); // updating position based on newly calculated velocity
    if (this.phys.velocity.mag() < 0.00001) {
      this.phys.velocity.mult(0); // a mathemtically simple way of letting objects come to a stop
    }
    this.phys.acceleration.mult(0);
    this.age += 1;
  }

  applyFriction(): void {
    if (this.env.friction == null) {
      return;
    }
    const friction = P5.Vector.copy(this.phys.velocity);
    friction.mult(-1).normalize().mult(this.env.friction);
    this.applyForce(friction);
  }

  applyWind(): void {}

  applyForce(force: P5.Vector): void {
    if (this.phys.maxSteerForce != null) {
      const acceleration = force
        .copy()
        .limit(this.phys.maxSteerForce)
        .div(this.phys.mass);
      this.phys.acceleration.add(acceleration);
    } else {
      const acceleration = force.copy().div(this.phys.mass);
      this.phys.acceleration.add(acceleration);
    }
  }

  applyAggregateSteerForce(): void {
    this.applyForce(this.phys.aggregateSteer);
    this.phys.aggregateSteer.mult(0);
  }

  seak(
    targetPosition: P5.Vector,
    multiplier: number | 'Max Velocity' = 1,
  ): void {
    const desiredVelocity = P5.Vector.sub(targetPosition, this.coords);
    this.steer(desiredVelocity, multiplier);
  }

  steer(direction: P5.Vector, multiplier: number | 'Max Velocity' = 1): void {
    if (direction.mag() == 0) {
      return;
    }
    if (multiplier == 'Max Velocity') {
      direction.mult(this.phys.maxVelocity);
    } else {
      direction.mult(multiplier);
    }
    let steer = P5.Vector.sub(direction, this.phys.velocity);
    this.phys.aggregateSteer.add(steer);
  }
}
