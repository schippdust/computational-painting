import P5 from 'p5';
import { LimitedArray } from './UtilityClasses';
import { PointRecord } from './GeometryRecords';
export const VehicleActions = Object.freeze({
  STEER: 0,
});

import { BaseSketchElement, ElementGeometryTypes } from './BaseSketchElement';
import { LinkRecord, PolylineRecord } from './GeometryRecords';

export class BaseVehicle extends BaseSketchElement {
  constructor(sketch, x = 0, y = 0) {
    super(sketch, x, y);
    this.secondPoint = undefined; //useful for extension, can export to csv as line between two points
    this.geometryType = ElementGeometryTypes.POINT;
    this.polylinePoints = new LimitedArray(20); //useful for extension, can export to csv as polyline between two points
    this.lifeExpectancy = undefined;
    this.age = 0;
    this.expired = false;

    this.aggregateSteer = this.s.createVector(0, 0);
    this.velocity = this.s.createVector(0, 0);
    this.coefOfFrict = 0.7;

    this.acceleration = this.s.createVector(0, 0);
    this.mass = 10;

    this.maxVelocity = 10;
    this.maxSteerForce = 5;

    this.constrainOrthogonally = false;
    this.orthogonalDirections = 8;
    this.orthogonalRotationalOffset = 0; //in radians

    this.wanderRadius = 50;
    this.wanderForwardRatio = 9 / 10;
    this.maxWanderAdjustment = (2 * Math.PI) / 10;
    this.wanderPointRadians = this.s.random(0, 2 * Math.PI);

    this.desiredSeparation = 40;
    this.neighbors = [];
  }

  update(applyFriction = true) {
    if (applyFriction) {
      this.applyFriction();
    }
    this.velocity.add(this.acceleration).limit(this.maxVelocity);
    if (this.constrainOrthogonally == false) {
      this.originPoint.add(this.velocity);
    } else {
      let angleBetweenOrthos = (Math.PI * 2) / this.orthogonalDirections;
      let comparisonVector = this.s
        .createVector(1, 0)
        .rotate(this.orthogonalRotationalOffset);
      let comparison = comparisonVector.angleBetween(this.velocity);
      let nearestIncrement = Math.round(comparison / angleBetweenOrthos);
      comparisonVector.rotate(nearestIncrement * angleBetweenOrthos);
      comparisonVector.setMag(
        Math.cos(comparison % angleBetweenOrthos) * this.velocity.mag(),
      );
      this.originPoint.add(comparisonVector);
    }
    if (this.velocity.mag() < 0.00001) {
      this.velocity.mult(0);
    }
    this.acceleration.mult(0);
    this.polylinePoints.push(this.originPoint.copy());
    this.neighbors = [];
    this.age += 1;
  }

  applyForce(force = this.s.createVector(0, 0)) {
    let acceleration = P5.Vector.div(force, this.mass);
    this.acceleration.add(acceleration);
  }

  applyAggregateSteerForce() {
    this.applyForce(this.aggregateSteer.limit(this.maxSteerForce));
    this.aggregateSteer = this.s.createVector(0, 0);
  }

  applyFriction() {
    // this is a simplified solution that roughly models real world behavior and assumes the canvas is "flat"
    let friction = P5.Vector.copy(this.velocity);
    friction.mult(-1).normalize().mult(this.coefOfFrict);
    this.applyForce(friction);
  }

  seakAtMaxVelocity(targetPosition = this.s.createVector(0, 0)) {
    let desiredVelocity = P5.Vector.sub(targetPosition, this.originPoint);
    this.steer(desiredVelocity, this.maxVelocity);
  }

  seak(targetPosition = this.s.createVector(0, 0), multiplier = 1) {
    let desiredVelocity = P5.Vector.sub(targetPosition, this.originPoint);
    this.steer(desiredVelocity, multiplier);
  }

  steer(direction = this.s.createVector(0, 0), multiplier = 1) {
    if (direction.mag() == 0) {
      return;
    }
    direction.mult(multiplier);
    let steer = P5.Vector.sub(direction, this.velocity);
    this.aggregateSteer.add(steer);
  }

  wander() {
    // console.log('wandering')
    let circleCenter = undefined;
    if (this.velocity.mag() == 0) {
      circleCenter = this.originPoint;
    } else {
      circleCenter = P5.Vector.add(
        this.originPoint,
        this.velocity
          .copy()
          .setMag(this.wanderRadius * this.wanderForwardRatio),
      );
    }
    let targetX = Math.cos(this.wanderPointRadians) * this.wanderRadius;
    let targetY = Math.sin(this.wanderPointRadians) * this.wanderRadius;
    let targetPoint = this.s.createVector(targetX, targetY).add(circleCenter);
    this.seakAtMaxVelocity(targetPoint);
    this.wanderPointRadians += this.s.random(
      this.maxWanderAdjustment * -1,
      this.maxWanderAdjustment,
    );
  }

  arrive(targetPosition = this.s.createVector(0, 0)) {
    let desiredVelocity = P5.Vector.sub(targetPosition, this.originPoint);
    let desiredMagnitude = desiredVelocity.mag();
    desiredVelocity.normalize();

    let maxAccel = Math.sqrt(this.maxSteerForce / this.mass);
    let extraFrames = 3;
    let framesToStop = this.maxVelocity / maxAccel + extraFrames;
    let decelRadius = framesToStop * this.maxVelocity;

    if (desiredMagnitude < decelRadius) {
      let mappedMagnitude = this.s.map(
        desiredMagnitude,
        0,
        decelRadius,
        0,
        this.maxVelocity,
      );
      desiredVelocity.mult(mappedMagnitude);
    } else {
      desiredVelocity.mult(this.maxVelocity);
    }
    let steer = P5.Vector.sub(desiredVelocity, this.velocity);
    steer.limit(this.maxSteerForce);
    this.applyForce(steer);
  }

  avoid(
    targetPosition = this.s.createVector(0, 0),
    desiredClosestDistance = 100,
    multiplier = 1,
  ) {
    let distanceBetween = P5.Vector.dist(this.originPoint, targetPosition);
    if (distanceBetween > desiredClosestDistance) {
      return;
    } else {
      let steerDirection = P5.Vector.sub(
        this.originPoint,
        targetPosition,
      ).normalize();
      if (distanceBetween == 0) {
        distanceBetween = 0.001;
      }
      let closenessRatio = distanceBetween / desiredClosestDistance;
      steerDirection.div(closenessRatio);
      this.steer(steerDirection, multiplier);
    }
  }

  steerToWithinBounds(min = this.sketchMin, max = this.sketchMax) {
    let aboveBounds = false;
    let belowBounds = false;
    let leftOfBounds = false;
    let rightOfBounds = false;
    if (this.originPoint.x < min.x) {
      leftOfBounds = true;
    } else if (this.originPoint.x > max.x) {
      rightOfBounds = true;
    }
    if (this.originPoint.y < min.y) {
      aboveBounds = true; //above and below are relative to +y axis pointing downward
    } else if (this.originPoint.y > max.y) {
      belowBounds = true;
    }
    if (!aboveBounds && !belowBounds && !leftOfBounds && !rightOfBounds) {
      return;
    }
    let steer = this.velocity.copy();
    if (aboveBounds) {
      steer.y = min.y - this.originPoint.y;
    } else if (belowBounds) {
      steer.y = max.y - this.originPoint.y;
    }
    if (rightOfBounds) {
      steer.x = max.x - this.originPoint.x;
    } else if (leftOfBounds) {
      steer.x = min.x - this.originPoint.x;
    }
    let target = P5.Vector.add(this.originPoint, steer);
    // this.applyForce(steer)
    this.seakAtMaxVelocity(target);
  }

  separate(otherVehicles = this.neighbors, separateMultiplier = 0.5) {
    if (otherVehicles.length <= 0) {
      return;
    }
    let countOfVehiclesTooClose = 0;
    let sumVect = this.s.createVector(0, 0);
    let sumOfDistance = 0;
    for (let v of otherVehicles) {
      let d = P5.Vector.dist(this.originPoint, v.originPoint);

      if (d > 0 && d < this.desiredSeparation) {
        sumOfDistance += d;
        let diff = P5.Vector.sub(this.originPoint, v.originPoint)
          .normalize()
          .div(d);
        sumVect.add(diff);
        countOfVehiclesTooClose += 1;
      }
    }
    if (countOfVehiclesTooClose > 0) {
      sumVect.mult(sumOfDistance / countOfVehiclesTooClose);
    }

    this.steer(sumVect, separateMultiplier);
  }

  align(otherVehicles = this.neighbors, alignMultiplier = 5) {
    if (otherVehicles.length <= 0) {
      return;
    }
    let sumVect = this.s.createVector(0, 0);
    for (let v of otherVehicles) {
      sumVect.add(v.velocity);
    }
    sumVect.div(otherVehicles.length);

    this.steer(sumVect, alignMultiplier);
  }

  cohere(otherVehicles = this.neighbors, cohereMultiplier = 5) {
    if (otherVehicles.length <= 0) {
      return;
    }
    let sumVect = this.s.createVector(0, 0);
    for (let v of otherVehicles) {
      sumVect.add(v.originPoint);
    }
    sumVect.div(otherVehicles.length);
    this.seak(sumVect, cohereMultiplier);
  }

  flock(separateMult = 0.5, alignMult = 0.5, cohereMult = 5) {
    this.separate(this.neighbors, separateMult);
    this.align(this.neighbors, alignMult);
    this.cohere(this.neighbors, cohereMult);
  }

  randomizeLocation() {
    let randomX = this.s.random(0, this.s.width);
    let randomY = this.s.random(0, this.s.height);
    this.originPoint = this.s.createVector(randomX, randomY);
  }

  // identifyNeighbors(distance = 100) {
  //   if (distance < this.desiredSeparation) {
  //     console.log(
  //       'WARNING: NEIGHBOR DISTANCE IS LESS THAN DESIRED SEPARATION, THIS MAY CAUSE UNINTENDED BEHAVIORS',
  //     )
  //   }
  //   if (this.quadTree) {
  //     return this.quadTree.queryRange(this, distance)
  //   } else {
  //     console.log(
  //       'WARNING: no quad tree was defined when searching for neighbors',
  //     )
  //     return []
  //   }
  // }

  get csvRecord() {
    let record = '\r\n';
    if (this.geometryType == ElementGeometryTypes.POINT) {
      record = PointRecord.createCsvRecord(this.uuid, this.originPoint);
    } else if (this.geometryType == ElementGeometryTypes.LINE) {
      record = LinkRecord.createCsvRecord(
        this.uuid,
        this.originPoint,
        this.secondPoint,
      );
    } else if (this.geometryType == ElementGeometryTypes.POLYLINE) {
      record = PolylineRecord.createCsvRecord(
        this.uuid,
        this.polylinePoints.items,
      );
    } else {
      record = `${this.uuid},ERROR,geometry type enum did not match draw condition`;
    }
    return record;
  }

  get x() {
    return this.originPoint.x;
  }
  get y() {
    return this.originPoint.y;
  }
  get xVel() {
    return this.velocity.x;
  }
  get yVel() {
    return this.velocity.y;
  }
  get xAcc() {
    return this.acceleration.x;
  }
  get yAcc() {
    return this.acceleration.y;
  }
  get telemetry() {
    return {
      x: this.x,
      y: this.y,
      xVel: this.xVel,
      yVel: this.yVel,
      xAcc: this.xAcc,
      yAcc: this.yAcc,
    };
  }
}
