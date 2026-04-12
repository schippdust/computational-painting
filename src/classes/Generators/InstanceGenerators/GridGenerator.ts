import P5 from 'p5';
import {
  Vehicle,
  createGenericPhysicalProps,
  type VehiclePhysicalProps,
} from '../../MarkMakingEntities/Extensible/Vehicle';
import { Spring } from '../../Core/Spring';
import type { VehicleCollection } from '../../EntityManagement/Extensible/VehicleCollection';

/**
 * Configuration properties for GridGenerator.
 */
export interface GridGeneratorProps {
  /** Number of rows in the grid. */
  rows: number;
  /** Number of columns in the grid. */
  cols: number;
  /** World-space distance between adjacent vehicles. */
  spacing: number;
  /** World-space position of the top-left corner of the grid. */
  origin: P5.Vector;
  /** Spring constant k for all springs in the grid (default: 1). */
  stiffness?: number;
  /** Velocity damping along each spring axis (default: 0). */
  damping?: number;
  /**
   * Also wire the four diagonal neighbours with rest length spacing × √2.
   * Produces a shear-resistant lattice (default: false).
   */
  connectDiagonals?: boolean;
  /**
   * Direction of columns in world space (default: world +X).
   * Will be normalised internally.
   */
  xAxis?: P5.Vector;
  /**
   * Direction of rows in world space (default: world +Y).
   * Will be normalised internally.
   */
  yAxis?: P5.Vector;
}

/**
 * Creates a rectangular lattice of vehicles pre-wired with Hooke's-law springs in one call.
 * Unlike ProgressiveGenerators (which emit vehicles one at a time), GridGenerator instantiates
 * the entire grid immediately, making it suitable for initialising spring-cloth simulations.
 *
 * Usage:
 * ```ts
 * const gen = new GridGenerator(p5, props);
 * gen.populate(collection); // adds all vehicles and springs to the collection
 * const topLeft = gen.grid[0][0]; // reference individual vehicles
 * ```
 */
export class GridGenerator {
  /** The rows × cols 2D array of created Vehicle instances. */
  public grid: Vehicle[][] = [];
  /** All Spring instances created between grid neighbours. */
  public springs: Spring[] = [];

  /**
   * Creates a new GridGenerator. Does not create any vehicles yet — call populate() to build
   * the lattice and register it with a VehicleCollection.
   * @param sketch The p5.js sketch instance used to construct each Vehicle
   * @param props Grid layout and spring configuration
   * @param vehicleProps Physical properties template applied to every generated vehicle
   */
  constructor(
    private sketch: P5,
    private props: GridGeneratorProps,
    private vehicleProps: VehiclePhysicalProps = createGenericPhysicalProps(),
  ) {}

  /**
   * Builds the vehicle lattice and registers all vehicles and springs with the provided collection.
   * Vehicles are positioned in the plane defined by xAxis and yAxis from props.
   * Adjacent vehicles (horizontal and vertical) are connected with springs of rest length equal
   * to spacing; diagonal neighbours are optionally connected with rest length spacing × √2.
   * Calling populate() a second time appends another copy — create a new GridGenerator for a
   * fresh lattice.
   * This method mutates the collection and returns this GridGenerator instance for method chaining.
   * @param collection The VehicleCollection to add vehicles and springs to
   * @returns This GridGenerator instance for method chaining
   */
  populate(collection: VehicleCollection): GridGenerator {
    const {
      rows,
      cols,
      spacing,
      origin,
      stiffness = 1,
      damping = 0,
      connectDiagonals = false,
    } = this.props;

    const xDir = (this.props.xAxis ?? new P5.Vector(1, 0, 0))
      .copy()
      .normalize();
    const yDir = (this.props.yAxis ?? new P5.Vector(0, 1, 0))
      .copy()
      .normalize();
    const diagonalLength = spacing * Math.SQRT2;

    // Create vehicles at each lattice point.
    const grid: Vehicle[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: Vehicle[] = [];
      for (let c = 0; c < cols; c++) {
        const pos = origin
          .copy()
          .add(xDir.copy().mult(c * spacing))
          .add(yDir.copy().mult(r * spacing));
        row.push(new Vehicle(this.sketch, pos, { ...this.vehicleProps }));
      }
      grid.push(row);
    }
    this.grid = grid;

    // Register vehicles in batch (defer octree rebuild until all are added).
    for (const row of grid) {
      collection.addVehicle(row, false);
    }
    collection.buildOcTree();

    // Wire horizontal springs: (r, c) — (r, c+1).
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const s = new Spring(
          grid[r][c],
          grid[r][c + 1],
          spacing,
          stiffness,
          damping,
        );
        this.springs.push(s);
        collection.addSpring(s);
      }
    }

    // Wire vertical springs: (r, c) — (r+1, c).
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const s = new Spring(
          grid[r][c],
          grid[r + 1][c],
          spacing,
          stiffness,
          damping,
        );
        this.springs.push(s);
        collection.addSpring(s);
      }
    }

    // Wire diagonal springs if requested.
    if (connectDiagonals) {
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          // Top-left → bottom-right.
          const s1 = new Spring(
            grid[r][c],
            grid[r + 1][c + 1],
            diagonalLength,
            stiffness,
            damping,
          );
          // Top-right → bottom-left.
          const s2 = new Spring(
            grid[r][c + 1],
            grid[r + 1][c],
            diagonalLength,
            stiffness,
            damping,
          );
          this.springs.push(s1, s2);
          collection.addSpring(s1);
          collection.addSpring(s2);
        }
      }
    }

    return this;
  }
}
