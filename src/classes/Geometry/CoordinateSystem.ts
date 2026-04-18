import * as math from 'mathjs';
import P5 from 'p5';
import { Line } from './Line';

/**
 * Represents a local 3D coordinate system with position and orientation.
 * Provides utilities for transforming between local and world coordinate spaces,
 * rotating and translating the coordinate system, and extracting basis vectors.
 * The basis matrix stores three orthonormal vectors as columns representing X, Y, and Z axes.
 */
export class CoordinateSystem {
  /**
   * Creates a new CoordinateSystem instance.
   * Typically created through static factory methods rather than direct construction.
   * @param origin The position of the coordinate system's origin in world space
   * @param basis A 3x3 matrix where each column represents a basis vector (X, Y, Z axes) in world coordinates
   */
  constructor(
    protected origin: P5.Vector,
    protected basis: math.Matrix,
  ) {
    // each column is a basis vector in world coordinates
  }

  //////////////////////////////////////////////////////////////////////////////
  ////////////////// Constructors

  ////////////////// Static construction is prefered method
  ////////////////// as it is easier to understand than the creation of basis matrices

  //////////////////////////////////////////////////////////////////////////////

  /**
   * Creates a coordinate system from an origin point and a normal (Z-axis) vector.
   * Automatically generates orthogonal X and Y axes using the world Y-axis as reference.
   * @param origin The origin position of the new coordinate system
   * @param normal The Z-axis direction (will be normalized)
   * @returns A new CoordinateSystem with the specified origin and orientation
   */
  static fromOriginAndNormal(
    origin: P5.Vector,
    normal: P5.Vector,
  ): CoordinateSystem {
    origin = origin.copy();
    normal = normal.copy();
    const z = normal.normalize();

    // Define "up" manually as world Y axis
    const up = new P5.Vector(0, 1, 0);

    // If normal is too close to up, use world X instead
    const dot = Math.abs(z.dot(up));
    const fallback = new P5.Vector(1, 0, 0);
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

  /**
   * Creates a coordinate system with explicit control over both the Z-axis (normal) and X-axis.
   * The Y-axis is computed to ensure orthogonality with Z and X.
   * @param origin The origin position of the new coordinate system
   * @param normal The Z-axis direction (will be normalized)
   * @param xAxis The X-axis direction (will be normalized and corrected for orthogonality)
   * @returns A new CoordinateSystem with the specified origin and fully defined axes
   */
  static fromOriginNormalX(
    origin: P5.Vector,
    normal: P5.Vector,
    xAxis: P5.Vector,
  ): CoordinateSystem {
    origin = origin.copy();
    normal = normal.copy();
    xAxis = xAxis.copy();
    const z = normal.normalize();
    const x = xAxis.normalize();
    const y = z.copy().cross(x).normalize();
    const correctedX = y.copy().cross(z).normalize(); // ensures orthogonality

    const basis = math.matrix([
      [correctedX.x, y.x, z.x],
      [correctedX.y, y.y, z.y],
      [correctedX.z, y.z, z.z],
    ]);

    return new CoordinateSystem(origin, basis);
  }

  /**
   * Creates a deep copy of this coordinate system.
   * The returned instance is independent and can be modified without affecting the original.
   * @returns A new CoordinateSystem with copied origin and basis
   */
  clone(): CoordinateSystem {
    return new CoordinateSystem(this.origin.copy(), this.basis.clone());
  }

  //////////////////////////////////////////////////////////////////////////////
  ////////////////// Transformations acting upon coordinate system

  ////////////////// All transformations mutate the instance directly
  ////////////////// and return it to enable method chaining

  //////////////////////////////////////////////////////////////////////////////

  /**
   * Rotates the coordinate system around a specified axis (defaults to Z-axis).
   * Uses Rodrigues' rotation formula to compute the rotation matrix.
   * This method mutates the instance and returns it for method chaining.
   * @param angle The rotation angle in radians
   * @param axis The axis to rotate around (defaults to the Z-axis if not provided)
   * @returns This CoordinateSystem instance for method chaining
   */
  rotateCoordinateSystem(angle: number, axis?: P5.Vector): this {
    // Default to the Z-axis if no axis is provided
    const rotationAxis = (axis || this.getZAxis(1)).copy().normalize();

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const oneMinusCosA = 1 - cosA;

    const ux = rotationAxis.x;
    const uy = rotationAxis.y;
    const uz = rotationAxis.z;

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

    // Mutate the basis in-place
    this.basis = math.multiply(rotationMatrix, this.basis) as math.Matrix;

    return this;
  }

  /**
   * Translates the coordinate system's origin by a given vector.
   * The orientation (basis) remains unchanged.
   * This method mutates the instance and returns it for method chaining.
   * @param translation The translation vector to apply to the origin
   * @returns This CoordinateSystem instance for method chaining
   */
  translateCoordinateSystem(translation: P5.Vector): CoordinateSystem {
    this.origin.add(translation);
    return this;
  }

  /**
   * Orients the coordinate system to look toward a target position.
   * The forward direction (Z-axis) points from the origin toward the target.
   * The up vector defines the orientation around the forward axis (defaults to world Y-axis).
   * This method mutates the instance and returns it for method chaining.
   * @param target The position to look toward
   * @param up The up direction (defaults to world Y-axis if not provided or too parallel to forward)
   * @returns This CoordinateSystem instance for method chaining
   */
  lookAt(target: P5.Vector, up?: P5.Vector): CoordinateSystem {
    const forward = P5.Vector.sub(target, this.origin).normalize();
    let upVector = up ? up.copy().normalize() : new P5.Vector(0, 1, 0);

    // If forward is too close to up, use world X instead
    const dot = Math.abs(forward.dot(upVector));
    const fallback = new P5.Vector(1, 0, 0);
    if (dot > 0.99) {
      upVector = fallback;
    }

    const right = forward.copy().cross(upVector).normalize();
    const correctedUp = right.copy().cross(forward).normalize(); // ensure orthogonality

    this.basis = math.matrix([
      [right.x, correctedUp.x, forward.x],
      [right.y, correctedUp.y, forward.y],
      [right.z, correctedUp.z, forward.z],
    ]);

    return this;
  }

  //////////////////////////////////////////////////////////////////////////////
  ////////////////// Vector Projection Utilities
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Transforms one or more points from this coordinate system's local space to world space.
   * Applies the basis transformation and translates by the origin.
   * @param local A point or array of points in local coordinates
   * @returns An array of points transformed to world coordinates
   */
  transformLocalPointsToWorldCs(local: P5.Vector | P5.Vector[]): P5.Vector[] {
    const pointList = Array.isArray(local) ? local : [local];
    const projectedPoints: P5.Vector[] = [];
    for (const pt of pointList) {
      const localPt = pt.copy();
      const localArr = [localPt.x, localPt.y, localPt.z];

      const rotated = math.multiply(this.basis, localArr) as math.Matrix;
      const rotatedArr = (
        math.flatten(rotated) as math.Matrix
      ).toArray() as number[];

      const projectedPoint = new P5.Vector(
        rotatedArr[0] + this.origin.x,
        rotatedArr[1] + this.origin.y,
        rotatedArr[2] + this.origin.z,
      );
      projectedPoints.push(projectedPoint);
    }
    return projectedPoints;
  }

  /**
   * Transforms a direction vector from local space to world space.
   * Unlike point transformations, directions are not affected by translation (only rotation).
   * @param local A direction vector in local coordinates
   * @returns The direction transformed to world coordinates
   */
  transformLocalDirectionToWorld(local: P5.Vector): P5.Vector {
    const localArr = [local.x, local.y, local.z];
    const rotated = math.multiply(this.basis, localArr) as math.Matrix;
    const rotatedArr = (
      math.flatten(rotated) as math.Matrix
    ).toArray() as number[];
    return new P5.Vector(rotatedArr[0], rotatedArr[1], rotatedArr[2]);
  }

  /**
   * Transforms points from one coordinate system to another.
   * Converts from the input coordinate system's local space to the output coordinate system's local space.
   * @param inputCS The source coordinate system
   * @param outputCS The target coordinate system
   * @param points A point or array of points in input coordinate system space
   * @returns An array of points transformed to output coordinate system space
   */
  static transformLocalPointsToTargetCs(
    inputCS: CoordinateSystem,
    outputCS: CoordinateSystem,
    points: P5.Vector | P5.Vector[],
  ): P5.Vector[] {
    const pointList = Array.isArray(points) ? points : [points];
    const transformed: P5.Vector[] = [];

    const inputBasisInv = math.inv(inputCS.basis);
    const outputBasis = outputCS.basis;

    for (let point of pointList) {
      point = point.copy();
      const relative = math.subtract(
        [point.x, point.y, point.z],
        [inputCS.origin.x, inputCS.origin.y, inputCS.origin.z],
      );

      const localMatrix = math.multiply(inputBasisInv, relative);
      const local = (
        math.flatten(localMatrix) as math.Matrix
      ).toArray() as number[];

      const worldMatrix = math.add(math.multiply(outputBasis, local), [
        outputCS.origin.x,
        outputCS.origin.y,
        outputCS.origin.z,
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

      transformed.push(new P5.Vector(worldVec[0], worldVec[1], worldVec[2]));
    }

    return transformed;
  }

  //////////////////////////////////////////////////////////////////////////////
  ////////////////// Setters

  ////////////////// All setters return "this" to enable method chaining

  //////////////////////////////////////////////////////////////////////////////

  /**
   * Sets the origin position of the coordinate system.
   * The orientation (basis) remains unchanged.
   * This method mutates the instance and returns it for method chaining.
   * @param newPosition The new origin position
   * @returns This CoordinateSystem instance for method chaining
   */
  setPosition(newPosition: P5.Vector): CoordinateSystem {
    this.origin = newPosition.copy();
    return this;
  }

  /**
   * Sets the Y-axis direction while preserving the Z-axis.
   * Recomputes the X-axis to maintain orthogonality.
   * This method mutates the instance and returns it for method chaining.
   * @param newYAxis The new Y-axis direction (will be normalized)
   * @returns This CoordinateSystem instance for method chaining
   */
  setYAxis(newYAxis: P5.Vector): CoordinateSystem {
    const y = newYAxis.copy().normalize();
    const z = this.getZAxis(1).normalize();
    let x = y.copy().cross(z).normalize();

    // If y and z are parallel, fallback to a default orthogonal x
    if (x.mag() < 1e-6) {
      const fallback = new P5.Vector(1, 0, 0);
      x = fallback.copy().cross(z).normalize();
    }

    const correctedY = z.copy().cross(x).normalize(); // ensure orthogonality

    this.basis = math.matrix([
      [x.x, correctedY.x, z.x],
      [x.y, correctedY.y, z.y],
      [x.z, correctedY.z, z.z],
    ]);

    return this;
  }

  //////////////////////////////////////////////////////////////////////////////
  ////////////////// Getters
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Returns a coordinate system aligned with the world axes.
   * The origin is at the world origin (0, 0, 0) with X, Y, Z axes aligned with world axes.
   * @returns A new CoordinateSystem representing the world coordinate system
   */
  static getWorldAxes() {
    return this.fromOriginNormalX(
      new P5.Vector(0, 0, 0),
      new P5.Vector(0, 0, 1),
      new P5.Vector(1, 0, 0),
    );
  }

  /**
   * Generates three Line objects representing the X, Y, and Z axes of this coordinate system.
   * Useful for debugging and visualization of coordinate system orientation.
   * @param length The length of each axis line (defaults to 1)
   * @returns An array of three Line objects representing the X, Y, and Z axes
   */
  getRenderAxes(length = 1): Line[] {
    const xDir = this.getXAxis(length);
    const yDir = this.getYAxis(length);
    const zDir = this.getZAxis(length);

    const xLine = new Line(
      this.origin.copy(),
      P5.Vector.add(this.origin, xDir),
    );
    const yLine = new Line(
      this.origin.copy(),
      P5.Vector.add(this.origin, yDir),
    );
    const zLine = new Line(
      this.origin.copy(),
      P5.Vector.add(this.origin, zDir),
    );

    return [xLine, yLine, zLine];
  }

  /**
   * Gets the X-axis direction vector of this coordinate system, optionally scaled by length.
   * @param length The scale factor to apply to the axis vector (defaults to 1)
   * @returns The X-axis direction in world coordinates
   */
  getXAxis(length = 1): P5.Vector {
    const basisArray = this.basis.toArray() as number[][];
    return new P5.Vector(
      basisArray[0][0],
      basisArray[1][0],
      basisArray[2][0],
    ).mult(length);
  }

  /**
   * Gets the Y-axis direction vector of this coordinate system, optionally scaled by length.
   * @param length The scale factor to apply to the axis vector (defaults to 1)
   * @returns The Y-axis direction in world coordinates
   */
  getYAxis(length = 1): P5.Vector {
    const basisArray = this.basis.toArray() as number[][];
    return new P5.Vector(
      basisArray[0][1],
      basisArray[1][1],
      basisArray[2][1],
    ).mult(length);
  }

  /**
   * Gets the Z-axis direction vector of this coordinate system, optionally scaled by length.
   * @param length The scale factor to apply to the axis vector (defaults to 1)
   * @returns The Z-axis direction in world coordinates
   */
  getZAxis(length = 1): P5.Vector {
    const basisArray = this.basis.toArray() as number[][];
    return new P5.Vector(
      basisArray[0][2],
      basisArray[1][2],
      basisArray[2][2],
    ).mult(length);
  }

  /**
   * Gets the origin position of this coordinate system.
   * @returns A copy of the origin point in world coordinates
   */
  getPosition(): P5.Vector {
    return this.origin.copy();
  }
}
