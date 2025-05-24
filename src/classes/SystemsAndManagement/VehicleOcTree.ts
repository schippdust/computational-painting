import P5 from 'p5';
import { Vehicle } from '../Agents/Vehicle';

class OcTreeNode {
  boundary: P5.Vector; // center of cube
  halfSize: number;
  capacity: number;
  vehicles: Vehicle[];
  divided: boolean;
  children: OcTreeNode[];

  constructor(boundary: P5.Vector, halfSize: number, capacity: number = 4) {
    this.boundary = boundary;
    this.halfSize = halfSize;
    this.capacity = capacity;
    this.vehicles = [];
    this.divided = false;
    this.children = [];
  }

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

  insertNode(node: OcTreeNode) {
    for (const v of node.vehicles) {
      this.insert(v);
    }
    for (const child of node.children) {
      if (child) this.insertNode(child);
    }
  }
}

export class OcTree {
  root: OcTreeNode;
  capacity: number;

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

  build(vehicles: Vehicle[]): OcTree {
    for (const v of vehicles) {
      if (!this.root.contains(v.coords)) {
        this.expandToFit(v.coords);
      }
      this.root.insert(v);
    }
    return this;
  }

  queryNeighbors(target: Vehicle | P5.Vector, radius: number): Vehicle[] {
    const targetPos = target instanceof P5.Vector ? target : target.coords;
    const targetId = (target as Vehicle).uuid ?? null;

    return this.root
      .queryRange(targetPos, radius)
      .filter((other) => other.uuid !== targetId);
  }

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
