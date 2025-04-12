import P5 from 'p5';

export interface VehiclePhysicalProps {
  velocity: P5.Vector;
  acceleration: P5.Vector;
  mass: number;
  maxVelocity: number;
  maxSteerForce: number;
}

const genericPhysicalProps: VehiclePhysicalProps = {
  velocity: new P5.Vector(0, 0, 0),
  acceleration: new P5.Vector(0, 0, 0),
  mass: 10,
  maxVelocity: 10,
  maxSteerForce: 10,
};

export class Vehicle {
  public uuid: string;
  private p5: P5;

  private lifeExpectancy: number;
  private age: number;

  public coords: P5.Vector;
  private physicalProps: VehiclePhysicalProps;

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
    this.physicalProps = physicalProperties;
  }
}
