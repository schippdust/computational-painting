import P5 from 'p5';
import { Vehicle } from '../MarkMakingEntities/Extensible/Vehicle';

/**
 * A node in an octree spatial partitioning structure.
 * Represents a cubic region in 3D space and can contain vehicles or subdivide into 8 child nodes.
 * Used internally by OcTree for hierarchical spatial queries and insertion.
 */
class OcTreeNode {
  vehicles: Vehicle[];
  divided: boolean;
  children: OcTreeNode[];

  /**
   * Creates a new OcTreeNode.
   * @param boundary The center of the cubic region represented by this node
   * @param halfSize Half the width of the cube (total width = 2 * halfSize)
   * @param capacity Maximum number of vehicles before subdivision (default: 4)
   */
  constructor(
    public boundary: P5.Vector,
    public halfSize: number,
    public capacity: number = 4,
  ) {
    this.vehicles = [];
    this.divided = false;
    this.children = [];
  }

  /**
   * Tests if a point is within this node's cubic boundary.
   * Uses axis-aligned bounding box containment check.
   * @param point The point to test
   * @returns True if the point is inside this node's cubic region, false otherwise
   */
  contains(point: P5.Vector): boolean {
    return (
      point.x >= this.boundary.x - this.halfSize &&
      point.x < this.boundary.x + this.halfSize &&
      point.y >= this.boundary.y - this.halfSize &&
      point.y < this.boundary.y + this.halfSize &&
      point.z >= this.boundary.z - this.halfSize &&
      point.z < this.boundary.z + this.halfSize
    );
  }

  /**
   * Inserts a vehicle into this node or its children.
   * If this node has space, adds the vehicle directly.
   * If full, subdivides (if needed) and recursively inserts into children.
   * @param vehicle The vehicle to insert
   * @returns True if insertion succeeded, false if vehicle is outside this node's boundary
   */
  insert(vehicle: Vehicle): boolean {
    if (!this.contains(vehicle.coords)) return false;

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
   * Subdivides this node into 8 child octants.
   * Creates a 2x2x2 grid of child nodes, each with half the size of the parent.
   * Sets the divided flag and populates the children array.
   */
  subdivide() {
    const { x, y, z } = this.boundary;
    const hs = this.halfSize / 2;

    for (let dx of [-1, 1]) {
      for (let dy of [-1, 1]) {
        for (let dz of [-1, 1]) {
          const offset = new P5.Vector(dx * hs, dy * hs, dz * hs);
          const center = P5.Vector.add(this.boundary, offset);
          this.children.push(new OcTreeNode(center, hs, this.capacity));
        }
      }
    }

    this.divided = true;
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
   * Tests if a sphere intersects with this node's axis-aligned cubic boundary.
   * Uses efficient AABB-sphere collision detection.
   * @param center The center of the sphere
   * @param radius The radius of the sphere
   * @returns True if the sphere intersects or overlaps this node's cube, false otherwise
   */
  intersectsSphere(center: P5.Vector, radius: number): boolean {
    let d = 0;

    const { x, y, z } = center;
    const bx = this.boundary.x;
    const by = this.boundary.y;
    const bz = this.boundary.z;
    const hs = this.halfSize;

    for (const [val, b] of [
      [x, bx],
      [y, by],
      [z, bz],
    ] as [number, number][]) {
      const min = b - hs;
      const max = b + hs;
      if (val < min) d += (val - min) ** 2;
      else if (val > max) d += (val - max) ** 2;
    }

    return d <= radius ** 2;
  }

  /**
   * Recursively inserts all vehicles from another node (and its children) into this tree.
   * Traverses the entire subtree and inserts each vehicle using the standard insert logic.
   * @param node The source node whose vehicles will be inserted into this tree
   */
  insertNode(node: OcTreeNode) {
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
export class OcTree {
  root: OcTreeNode;
  capacity: number;

  /**
   * Creates a new OcTree and optionally populates it with vehicles.
   * Automatically computes bounding box and initializes the root node.
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
    this.capacity = capacity;

    if (vehicles.length === 0) {
      throw new Error('Cannot construct OcTree with no vehicles.');
    }

    // Find min and max coordinates across all vehicles
    const min = vehicles[0].coords.copy();
    const max = vehicles[0].coords.copy();

    for (const v of vehicles) {
      min.x = Math.min(min.x, v.coords.x);
      min.y = Math.min(min.y, v.coords.y);
      min.z = Math.min(min.z, v.coords.z);

      max.x = Math.max(max.x, v.coords.x);
      max.y = Math.max(max.y, v.coords.y);
      max.z = Math.max(max.z, v.coords.z);
    }

    // Compute center and size
    const center = P5.Vector.add(min, max).div(2);
    const size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z) * 1.1; // slight buffer
    const halfSize = size / 2;

    this.root = new OcTreeNode(center, halfSize, capacity);

    if (automaticallyBuild) {
      this.build(vehicles);
    }
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
      if (!this.root.contains(v.coords)) {
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

  /**
   * Expands the octree to encompass a point that falls outside the current root's boundary.
   * Creates progressively larger roots until the point is contained.
   * Rebuilds the tree structure while preserving all existing vehicles.
   * @param point The point that must be contained in the expanded tree
   * @private
   */
  private expandToFit(point: P5.Vector) {
    while (!this.root.contains(point)) {
      const oldRoot = this.root;
      const newHalfSize = oldRoot.halfSize * 2;

      const dir = point.copy().sub(oldRoot.boundary).normalize();
      const offset = dir.copy().mult(oldRoot.halfSize);
      const newCenter = oldRoot.boundary.copy().add(offset);

      this.root = new OcTreeNode(newCenter, newHalfSize, this.capacity);
      this.root.subdivide();
      this.root.insertNode(oldRoot); // Assumes this exists
    }
  }
}
