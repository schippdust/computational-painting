import * as math from 'mathjs';
import p5 from 'p5';
import { Line } from './Line';

export class CoordinateSystem {
  private position: p5.Vector;
  private basis: math.Matrix; // 3x3 rotation matrix (columns are basis vectors)

  constructor(origin: p5.Vector, basis: math.Matrix) {
    this.position = origin;
    this.basis = basis; // each column is a basis vector in world coordinates
  }

  static fromOriginAndNormal(
    origin: p5.Vector,
    normal: p5.Vector,
  ): CoordinateSystem {
    const z = normal.copy().normalize();

    // Define "up" manually as world Y axis
    const up = new p5.Vector(0, 1, 0);

    // If normal is too close to up, use world X instead
    const dot = Math.abs(z.dot(up));
    const fallback = new p5.Vector(1, 0, 0);
    const ref = dot < 0.99 ? up : fallback;

    const x = ref.copy().cross(z).normalize();
    const y = z.copy().cross(x).normalize();

    const basis = math.matrix([
      [x.x, y.x, z.x],
      [x.y, y.y, z.y],
      [x.z, y.z, z.z],
    ]);

    return new CoordinateSystem(origin.copy(), basis);
  }

  static fromOriginNormalX(
    origin: p5.Vector,
    normal: p5.Vector,
    xAxis: p5.Vector,
  ): CoordinateSystem {
    const z = normal.copy().normalize();
    const x = xAxis.copy().normalize();
    const y = z.copy().cross(x).normalize();
    const correctedX = y.copy().cross(z).normalize(); // ensures orthogonality

    const basis = math.matrix([
      [correctedX.x, y.x, z.x],
      [correctedX.y, y.y, z.y],
      [correctedX.z, y.z, z.z],
    ]);

    return new CoordinateSystem(origin, basis);
  }

  static getWorldCoordinates() {
    return this.fromOriginNormalX(
      new p5.Vector(0, 0, 0),
      new p5.Vector(0, 0, 1),
      new p5.Vector(1, 0, 0),
    );
  }

  toWorld(local: p5.Vector): p5.Vector {
    const localArr = [local.x, local.y, local.z];

    const rotated = math.multiply(this.basis, localArr) as math.Matrix;
    const rotatedArr = (
      math.flatten(rotated) as math.Matrix
    ).toArray() as number[];

    return new p5.Vector(
      rotatedArr[0] + this.position.x,
      rotatedArr[1] + this.position.y,
      rotatedArr[2] + this.position.z,
    );
  }

  // transformPoints(outputCs: CoordinateSystem, points: p5.Vector | p5.Vector[]) {
  //   return CoordinateSystem.transformPoints(this, outputCs, points);
  // }

  static transformPoints(
    inputCS: CoordinateSystem,
    outputCS: CoordinateSystem,
    points: p5.Vector | p5.Vector[],
  ): p5.Vector[] {
    const pointList = Array.isArray(points) ? points : [points];
    const transformed: p5.Vector[] = [];

    const inputBasisInv = math.inv(inputCS.basis);
    const outputBasis = outputCS.basis;

    for (const point of pointList) {
      const relative = math.subtract(
        [point.x, point.y, point.z],
        [inputCS.position.x, inputCS.position.y, inputCS.position.z],
      );

      const localMatrix = math.multiply(inputBasisInv, relative);
      const local = (
        math.flatten(localMatrix) as math.Matrix
      ).toArray() as number[];

      const worldMatrix = math.add(math.multiply(outputBasis, local), [
        outputCS.position.x,
        outputCS.position.y,
        outputCS.position.z,
      ]);
      function toVector3(input: unknown): number[] {
        if (Array.isArray(input)) {
          return input as number[];
        } else if (typeof input === 'number') {
          throw new Error(
            'Unexpected scalar result when array/vector expected',
          );
        } else {
          return (
            math.flatten(input as math.Matrix) as math.Matrix
          ).toArray() as number[];
        }
      }
      // Ensure it's a number[]
      const worldVec = toVector3(worldMatrix);

      transformed.push(new p5.Vector(worldVec[0], worldVec[1], worldVec[2]));
    }

    return transformed;
  }

  rotateCoordinateSystem(angle: number, axis?: p5.Vector): CoordinateSystem {
    // Default to the Z-axis if no axis is provided
    const rotationAxis = axis || this.getZAxis(1).normalize();

    const u = rotationAxis.copy().normalize();

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const oneMinusCosA = 1 - cosA;

    const ux = u.x,
      uy = u.y,
      uz = u.z;

    // Rodrigues' rotation matrix
    const rotationMatrix = math.matrix([
      [
        cosA + ux * ux * oneMinusCosA,
        ux * uy * oneMinusCosA - uz * sinA,
        ux * uz * oneMinusCosA + uy * sinA,
      ],
      [
        uy * ux * oneMinusCosA + uz * sinA,
        cosA + uy * uy * oneMinusCosA,
        uy * uz * oneMinusCosA - ux * sinA,
      ],
      [
        uz * ux * oneMinusCosA - uy * sinA,
        uz * uy * oneMinusCosA + ux * sinA,
        cosA + uz * uz * oneMinusCosA,
      ],
    ]);

    // Apply rotation to the basis
    const newBasis = math.multiply(rotationMatrix, this.basis) as math.Matrix;

    return new CoordinateSystem(this.position.copy(), newBasis);
  }

  getRenderAxes(length = 1): Line[] {
    const xDir = this.getXAxis(length);
    const yDir = this.getYAxis(length);
    const zDir = this.getZAxis(length);

    const xLine = new Line(
      this.position.copy(),
      p5.Vector.add(this.position, xDir),
    );
    const yLine = new Line(
      this.position.copy(),
      p5.Vector.add(this.position, yDir),
    );
    const zLine = new Line(
      this.position.copy(),
      p5.Vector.add(this.position, zDir),
    );

    return [xLine, yLine, zLine];
  }

  getXAxis(length = 1): p5.Vector {
    const basisArray = this.basis.toArray() as number[][];
    return new p5.Vector(
      basisArray[0][0],
      basisArray[1][0],
      basisArray[2][0],
    ).mult(length);
  }

  getYAxis(length = 1): p5.Vector {
    const basisArray = this.basis.toArray() as number[][];
    return new p5.Vector(
      basisArray[0][1],
      basisArray[1][1],
      basisArray[2][1],
    ).mult(length);
  }

  getZAxis(length = 1): p5.Vector {
    const basisArray = this.basis.toArray() as number[][];
    return new p5.Vector(
      basisArray[0][2],
      basisArray[1][2],
      basisArray[2][2],
    ).mult(length);
  }

  getPosition(): p5.Vector {
    return this.position;
  }
}
