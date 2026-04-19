import P5 from 'p5';
import { Vehicle } from '../MarkMakingEntities/Extensible/Vehicle';
import { BBox } from '../Geometry/BBox';
import { BaseOcTreeNode, BaseOcTree } from './BaseOcTree';

/**
 * A node in the vehicle octree spatial partitioning structure.
 * Represents a cubic region in 3D space and can contain vehicles or subdivide into 8 child nodes.
 * Used internally by OcTree for hierarchical spatial queries and insertion.
 */
class VehicleOcTreeNode extends BaseOcTreeNode<Vehicle, VehicleOcTreeNode> {
  vehicles: Vehicle[] = [];

  /**
   * Creates a new VehicleOcTreeNode.
   * @param bbox     The axis-aligned bounding box for this node's region
   * @param capacity Maximum number of vehicles before subdivision (default: 4)
   * @param depth    Depth of this node in the tree (default: 0)
   */
  constructor(bbox: BBox, capacity: number = 4, depth: number = 0) {
    super(bbox, capacity, depth);
  }

  /** Returns the vehicles stored directly at this node. */
  getItems(): Vehicle[] {
    return this.vehicles;
  }

  /** Creates a child node of the same type for the given bbox. */
  protected createChild(bbox: BBox): VehicleOcTreeNode {
    return new VehicleOcTreeNode(bbox, this.capacity, this.depth + 1);
  }

  /**
   * Inserts a vehicle into this node or its children.
   * If this node has space, adds the vehicle directly.
   * If full, subdivides (if needed) and recursively inserts into children.
   * @param vehicle The vehicle to insert
   * @returns True if insertion succeeded, false if vehicle is outside this node's boundary
   */
  insert(vehicle: Vehicle): boolean {
    if (!this.containsPoint(vehicle.coords)) return false;

    if (this.vehicles.length < this.capacity) {
      this.vehicles.push(vehicle);
      return true;
    }

    if (!this.divided) this.subdivide();

    for (const child of this.children) {
      if (child.insert(vehicle)) return true;
    }

    return false;
  }

  /**
   * Recursively queries all vehicles within a spherical region.
   * Tests each node's intersection with the sphere and collects matching vehicles.
   * Recursively searches children if this node is subdivided.
   * @param center The center of the query sphere
   * @param radius The radius of the query sphere
   * @param found An accumulator array for results (default: new empty array)
   * @returns An array of all vehicles within the spherical region
   */
  queryRange(
    center: P5.Vector,
    radius: number,
    found: Vehicle[] = [],
  ): Vehicle[] {
    if (!this.intersectsSphere(center, radius)) return found;

    for (const v of this.vehicles) {
      if (P5.Vector.dist(v.coords, center) <= radius) {
        found.push(v);
      }
    }

    if (this.divided) {
      for (const child of this.children) {
        child.queryRange(center, radius, found);
      }
    }

    return found;
  }

  /**
   * Recursively inserts all vehicles from another node (and its children) into this tree.
   * @param node The source node whose vehicles will be inserted
   */
  insertNode(node: VehicleOcTreeNode): void {
    for (const v of node.vehicles) {
      this.insert(v);
    }
    for (const child of node.children) {
      if (child) this.insertNode(child);
    }
  }
}

/**
 * An octree spatial partitioning structure for efficient 3D neighbor queries.
 * Recursively subdivides 3D space into cubic octants to enable fast range queries.
 * Typical use case: finding nearby vehicles for physics calculations or rendering.
 */
export class OcTree extends BaseOcTree<Vehicle, VehicleOcTreeNode> {
  /**
   * Creates a new OcTree and optionally populates it with vehicles.
   * Automatically computes a bounding box from the vehicle positions.
   * @param vehicles An array of vehicles to insert (must be non-empty)
   * @param capacity Maximum vehicles per node before subdivision (default: 4)
   * @param automaticallyBuild If true, immediately inserts all vehicles (default: true)
   * @throws Error if vehicles array is empty
   */
  constructor(
    vehicles: Vehicle[],
    capacity: number = 4,
    automaticallyBuild: boolean = true,
  ) {
    if (vehicles.length === 0) {
      throw new Error('Cannot construct OcTree with no vehicles.');
    }

    const bbox = BBox.fromPoints(vehicles.map((v) => v.coords));
    const root = new VehicleOcTreeNode(bbox, capacity);
    super(root, capacity);

    if (automaticallyBuild) {
      this.build(vehicles);
    }
  }

  /** Creates a new VehicleOcTreeNode for the given bbox. */
  protected createNode(bbox: BBox, depth: number = 0): VehicleOcTreeNode {
    return new VehicleOcTreeNode(bbox, this.capacity, depth);
  }

  /**
   * Re-inserts all vehicles from the old root into the new root after expansion.
   * Vehicles redistribute across the newly subdivided octants.
   * @param oldRoot The root before expansion
   * @param newRoot The newly created, already-subdivided root
   */
  protected reattachOldRoot(
    oldRoot: VehicleOcTreeNode,
    newRoot: VehicleOcTreeNode,
  ): void {
    newRoot.insertNode(oldRoot);
  }

  /**
   * Populates the octree by inserting all vehicles.
   * Automatically expands the tree if any vehicle falls outside the initial bounds.
   * This method mutates the instance and returns it for method chaining.
   * @param vehicles An array of vehicles to insert
   * @returns This OcTree instance for method chaining
   */
  build(vehicles: Vehicle[]): OcTree {
    for (const v of vehicles) {
      if (!this.root.containsPoint(v.coords)) {
        this.expandToFit(v.coords);
      }
      this.root.insert(v);
    }
    return this;
  }

  /**
   * Finds all vehicles within a given radius of a target position or vehicle.
   * Efficiently uses the octree structure to avoid testing distant vehicles.
   * Automatically excludes the target vehicle if querying by vehicle reference.
   * @param target Either a position vector or a vehicle (for position-based queries)
   * @param radius The search radius
   * @returns An array of vehicles within the specified radius (excluding the target vehicle itself)
   */
  queryNeighbors(target: Vehicle | P5.Vector, radius: number): Vehicle[] {
    const targetPos = target instanceof P5.Vector ? target : target.coords;
    const targetId = (target as Vehicle).uuid ?? null;

    return this.root
      .queryRange(targetPos, radius)
      .filter((other) => other.uuid !== targetId);
  }
}
