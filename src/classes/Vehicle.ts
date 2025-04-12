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

const genericPhysicalProps: VehiclePhysicalProps = {
  velocity: new P5.Vector(0, 0, 0),
  acceleration: new P5.Vector(0, 0, 0),
  mass: 10,
  maxVelocity: 10,
  maxSteerForce: 10,
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

  randomizeLocation(
    fromCoord: P5.Vector,
    maxDist: number,
    is3D: boolean = false,
  ): void {
    let randomX = this.p5.random(fromCoord.x - maxDist, fromCoord.x + maxDist);
    let randomY = this.p5.random(fromCoord.y - maxDist, fromCoord.y + maxDist);
    let randomZ = this.p5.random(fromCoord.z - maxDist, fromCoord.z + maxDist);
    this.coords = new P5.Vector(randomX, randomY, is3D ? randomZ : 0);
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
    const acceleration = force
      .copy()
      .limit(this.phys.maxSteerForce)
      .div(this.phys.mass);
    this.phys.acceleration.add(acceleration);
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
    const steer = P5.Vector.sub(direction, this.phys.velocity);
    this.applyForce(steer);
  }

  arrive(targetPosition: P5.Vector): void {
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
  }

  avoid(targetPosition:P5.Vector, desiredClosestDistance:number, multiplier:number = 1): void{
    let distanceBetween = P5.Vector.dist(this.coords, targetPosition)
    if (distanceBetween > desiredClosestDistance){
      return
    } else {
      const steerDirection = P5.Vector.sub(this.coords, targetPosition).normalize()
      if (distanceBetween == 0){
        distanceBetween = 0.001
      }
      const closenessRatio = distanceBetween / desiredClosestDistance
      steerDirection.div(closenessRatio)
      this.steer(steerDirection, multiplier)
    }
  }

  
}
