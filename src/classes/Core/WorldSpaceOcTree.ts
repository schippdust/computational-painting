import P5 from 'p5';
import { Line } from '../Geometry/Line';
import { Sphere } from '../Geometry/Sphere';
import { Polyline } from '../Geometry/Polyline';
import { BBox } from '../Geometry/BBox';
import { BaseOcTreeNode, BaseOcTree } from './BaseOcTree';
import type { GeometryItem } from '../Geometry/GeometryTypes';

export type { GeometryItem };

/**
 * A record of one tracked event type within a single spatial node.
 * Accumulates all geometry items that have been logged for this event
 * in this node's spatial region.
 */
export interface WorldEventRecord {
  /** The name of the event being tracked. */
  event: string;
  /** All geometry items logged for this event in this node's region. */
  geometry: GeometryItem[];
  /** Total number of geometry items logged (equals geometry.length). */
  count: number;
  /** Maximum count before this node subdivides. Inherited by child nodes. */
  limit: number;
}

// ─── Node ─────────────────────────────────────────────────────────────────────

/**
 * A node in the WorldSpaceOcTree.
 * Each node holds one WorldEventRecord per tracked event type.
 * When any record's count exceeds its limit, the node subdivides and
 * redistributes its geometry to the appropriate children.
 */
class WorldSpaceOcTreeNode extends BaseOcTreeNode<
  WorldEventRecord,
  WorldSpaceOcTreeNode
> {
  /** One record per tracked event name, for O(1) lookup. */
  records: Map<string, WorldEventRecord> = new Map();

  /**
   * Creates a new WorldSpaceOcTreeNode.
   * @param bbox         The bounding box for this node's spatial region
   * @param capacity     Passed to base (not used for subdivision here — limit governs it)
   * @param trackedEvents Initial set of event names and their limits to pre-register
   */
  constructor(
    bbox: BBox,
    capacity: number,
    trackedEvents: Map<string, number> = new Map(),
  ) {
    super(bbox, capacity);
    for (const [event, limit] of trackedEvents) {
      this.records.set(event, { event, geometry: [], count: 0, limit });
    }
  }

  /** Returns the current event records as an array (used by base class reattach logic). */
  getItems(): WorldEventRecord[] {
    return [...this.records.values()];
  }

  /**
   * Creates a child node of the same type, propagating all tracked event registrations.
   * @param bbox The bounding box for the child
   * @returns A new WorldSpaceOcTreeNode with the same tracked events (empty counts)
   */
  protected createChild(bbox: BBox): WorldSpaceOcTreeNode {
    const inherited = new Map<string, number>();
    for (const [event, record] of this.records) {
      inherited.set(event, record.limit);
    }
    return new WorldSpaceOcTreeNode(bbox, this.capacity, inherited);
  }

  /**
   * Registers a new event type on this node.
   * If the event is already tracked, this is a no-op.
   * @param event The event name
   * @param limit The count limit before subdivision
   */
  registerEvent(event: string, limit: number): void {
    if (!this.records.has(event)) {
      this.records.set(event, { event, geometry: [], count: 0, limit });
    }
  }

  /**
   * Logs a point event on this node and its children.
   * On a leaf: adds the point to the record, increments count, and
   * triggers subdivision if the limit is exceeded.
   * On an internal node: recurses into children whose bbox contains the point.
   * @param point The point to log
   * @param event The event name to log it under
   */
  logPoint(point: P5.Vector, event: string): void {
    if (!this.divided) {
      this._logGeometry(point, event, () => this.bbox.containsPoint(point));
    } else {
      for (const child of this.children) {
        if (child.containsPoint(point)) {
          child.logPoint(point, event);
        }
      }
    }
  }

  /**
   * Logs a line event on this node and its children.
   * On a leaf: adds the line to every intersecting record, then subdivides if over limit.
   * On an internal node: recurses into children whose bbox intersects the line.
   * @param line The line segment to log
   * @param event The event name to log it under
   */
  logLine(line: Line, event: string): void {
    if (!this.divided) {
      this._logGeometry(line, event, () => this.bbox.intersectsLine(line));
    } else {
      for (const child of this.children) {
        if (child.bbox.intersectsLine(line)) {
          child.logLine(line, event);
        }
      }
    }
  }

  /**
   * Logs a sphere event on this node and its children.
   * On a leaf: adds the sphere to every intersecting record, then subdivides if over limit.
   * On an internal node: recurses into children whose bbox intersects the sphere.
   * @param sphere The sphere to log
   * @param event The event name to log it under
   */
  logSphere(sphere: Sphere, event: string): void {
    const center = sphere.centerPoint;
    const radius = sphere.radius;
    if (!this.divided) {
      this._logGeometry(sphere, event, () =>
        this.bbox.intersectsSphere(center, radius),
      );
    } else {
      for (const child of this.children) {
        if (child.bbox.intersectsSphere(center, radius)) {
          child.logSphere(sphere, event);
        }
      }
    }
  }

  /**
   * Logs a polyline event on this node and its children.
   * On a leaf: adds the polyline if any of its segments intersect this bbox, then subdivides if over limit.
   * On an internal node: recurses into children whose bbox intersects the polyline.
   * @param polyline The polyline to log
   * @param event The event name to log it under
   */
  logPolyline(polyline: Polyline, event: string): void {
    if (!this.divided) {
      this._logGeometry(polyline, event, () =>
        this.bbox.intersectsPolyline(polyline),
      );
    } else {
      for (const child of this.children) {
        if (child.bbox.intersectsPolyline(polyline)) {
          child.logPolyline(polyline, event);
        }
      }
    }
  }

  /**
   * Propagates a newly registered event down to all existing children.
   * Called by WorldSpaceOcTree.trackWorldEvents after initial registration.
   * @param event The event name
   * @param limit The count limit
   */
  propagateEvent(event: string, limit: number): void {
    this.registerEvent(event, limit);
    if (this.divided) {
      for (const child of this.children) {
        child.propagateEvent(event, limit);
      }
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Core leaf-node logging logic.
   * Checks whether the geometry should be recorded here (via the intersects callback),
   * then adds it to the record and checks for subdivision.
   * @param geom      The geometry item to log
   * @param event     The event name
   * @param intersects A callback returning true if this node's bbox intersects the geometry
   */
  private _logGeometry(
    geom: GeometryItem,
    event: string,
    intersects: () => boolean,
  ): void {
    if (!intersects()) return;

    const record = this.records.get(event);
    if (!record) return; // event not tracked on this node

    record.geometry.push(geom);
    record.count++;

    if (record.count > record.limit) {
      this._subdivideAndRedistribute();
    }
  }

  /**
   * Subdivides this leaf node and redistributes all recorded geometry to children.
   * After redistribution, clears the geometry from this (now internal) node but
   * preserves the record structure so trackWorldEvents can still propagate later.
   */
  private _subdivideAndRedistribute(): void {
    this.subdivide(); // creates 8 children via createChild (inherits tracked events)

    for (const [event, record] of this.records) {
      for (const geom of record.geometry) {
        if (geom instanceof P5.Vector) {
          for (const child of this.children) {
            child.logPoint(geom, event);
          }
        } else if (geom instanceof Line) {
          for (const child of this.children) {
            child.logLine(geom, event);
          }
        } else if (geom instanceof Polyline) {
          for (const child of this.children) {
            child.logPolyline(geom, event);
          }
        } else {
          // Sphere
          for (const child of this.children) {
            child.logSphere(geom as Sphere, event);
          }
        }
      }
      // Clear this node's geometry — it is now an internal node
      record.geometry = [];
      record.count = 0;
    }
  }
}

// ─── Tree ─────────────────────────────────────────────────────────────────────

/**
 * A spatial octree that tracks named events in 3D world space.
 * Each spatial node records which geometry items have been logged for each
 * registered event type. When a node's event count exceeds its limit, the
 * node subdivides and redistributes geometry to finer-grained children.
 *
 * The tree auto-expands its root when geometry is logged outside current bounds.
 *
 * Usage:
 * ```ts
 * const tree = new WorldSpaceOcTree(new P5.Vector(0, 0, 0), 5000);
 * tree.trackWorldEvents('vehicle-pass', 10);
 * tree.logPointEvent(vehicle.coords, 'vehicle-pass');
 * tree.logLineEvent(new Line(p1, p2), 'vehicle-pass');
 * tree.logSphereEvent(new Sphere(cs, 200), 'vehicle-pass');
 * ```
 */
export class WorldSpaceOcTree extends BaseOcTree<
  WorldEventRecord,
  WorldSpaceOcTreeNode
> {
  /** Registered events and their per-node limits. */
  private trackedEvents: Map<string, number> = new Map();

  /**
   * Creates a new WorldSpaceOcTree with an empty root and no tracked events.
   * @param initialBBox The initial bounding volume. Use BBox.cube() for a uniform
   *                    cube or supply per-axis half-extents for a rectangular volume.
   * @param capacity    Node capacity (default: 4)
   */
  constructor(initialBBox: BBox, capacity: number = 4) {
    const root = new WorldSpaceOcTreeNode(initialBBox, capacity);
    super(root, capacity);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Registers a new event type across the entire tree.
   * All existing nodes immediately receive an empty record for this event.
   * New nodes created via subdivision automatically inherit it.
   * This method mutates the instance and returns it for method chaining.
   * @param event The event name to track (must be unique)
   * @param limit Count limit before a node subdivides for this event
   * @returns This WorldSpaceOcTree instance for method chaining
   */
  trackWorldEvents(event: string, limit: number): WorldSpaceOcTree {
    this.trackedEvents.set(event, limit);
    this.root.propagateEvent(event, limit);
    return this;
  }

  /**
   * Logs a point event at the given position.
   * Expands the tree if the point is outside the current bounds, then
   * records it in all intersecting leaf nodes.
   * This method mutates the instance and returns it for method chaining.
   * @param point The position to log
   * @param event The event name (must be registered via trackWorldEvents first)
   * @returns This WorldSpaceOcTree instance for method chaining
   */
  logPointEvent(point: P5.Vector, event: string): WorldSpaceOcTree {
    if (!this.root.containsPoint(point)) {
      this.expandToFit(point);
    }
    this.root.logPoint(point, event);
    return this;
  }

  /**
   * Logs a line event for the given line segment.
   * Expands the tree if the line's midpoint is outside the current bounds, then
   * records the line in all leaf nodes whose bbox it intersects.
   * This method mutates the instance and returns it for method chaining.
   * @param line  The line segment to log
   * @param event The event name (must be registered via trackWorldEvents first)
   * @returns This WorldSpaceOcTree instance for method chaining
   */
  logLineEvent(line: Line, event: string): WorldSpaceOcTree {
    const midpoint = P5.Vector.add(line.startPoint, line.endPoint).div(2);
    if (!this.root.containsPoint(midpoint)) {
      this.expandToFit(midpoint);
    }
    this.root.logLine(line, event);
    return this;
  }

  /**
   * Logs a sphere event for the given sphere.
   * Expands the tree if the sphere's center is outside the current bounds, then
   * records the sphere in all leaf nodes whose bbox it intersects.
   * This method mutates the instance and returns it for method chaining.
   * @param sphere The sphere to log
   * @param event  The event name (must be registered via trackWorldEvents first)
   * @returns This WorldSpaceOcTree instance for method chaining
   */
  logSphereEvent(sphere: Sphere, event: string): WorldSpaceOcTree {
    const center = sphere.centerPoint;
    if (!this.root.containsPoint(center)) {
      this.expandToFit(center);
    }
    this.root.logSphere(sphere, event);
    return this;
  }

  /**
   * Logs a polyline event for the given polyline.
   * Expands the tree if the polyline's midpoint is outside the current bounds, then
   * records the polyline in all leaf nodes whose bbox any of its segments intersect.
   * This method mutates the instance and returns it for method chaining.
   * @param polyline The polyline to log
   * @param event    The event name (must be registered via trackWorldEvents first)
   * @returns This WorldSpaceOcTree instance for method chaining
   */
  logPolylineEvent(polyline: Polyline, event: string): WorldSpaceOcTree {
    const midpoint = polyline.getPointAtParam(0.5);
    if (!this.root.containsPoint(midpoint)) {
      this.expandToFit(midpoint);
    }
    this.root.logPolyline(polyline, event);
    return this;
  }

  /**
   * Returns random points sampled from the tree, biased toward spatial regions
   * with higher activity for the given event.
   *
   * At bias=0 each point is drawn uniformly from the entire root bounding box.
   * At bias=1 leaf nodes are selected proportionally to their logged event count,
   * so high-activity regions are sampled much more frequently.
   * Intermediate values blend volume-proportional and activity-proportional weights:
   *   weight_i = (1 − bias) × (leafVolume_i / totalVolume) + bias × (count_i / totalCount)
   *
   * Only leaf nodes participate in the weighted selection. When no events have
   * been logged for the given event name (totalCount = 0), the method falls back
   * to volume-proportional weights regardless of bias.
   * This method does not mutate the instance.
   * @param event         The tracked event name to use as the activity signal
   * @param numberOfPoints How many points to return (default: 1)
   * @param bias          Blend between uniform (0) and fully activity-weighted (1) (default: 0.85)
   * @returns An array of P5.Vector positions sampled from the tree
   */
  randomPointsByActivity(
    event: string,
    numberOfPoints: number = 1,
    bias: number = 0.85,
  ): P5.Vector[] {
    if (numberOfPoints <= 0) return [];

    if (bias === 0) {
      return Array.from({ length: numberOfPoints }, () =>
        this.root.bbox.randomPoint(),
      );
    }

    const leaves: WorldSpaceOcTreeNode[] = [];
    this._collectLeaves(this.root, leaves);

    if (leaves.length === 0) {
      return Array.from({ length: numberOfPoints }, () =>
        this.root.bbox.randomPoint(),
      );
    }

    const volumes = leaves.map(
      (l) =>
        8 * l.bbox.halfExtents.x * l.bbox.halfExtents.y * l.bbox.halfExtents.z,
    );
    const totalVolume = volumes.reduce((a, b) => a + b, 0);

    const counts = leaves.map((l) => l.records.get(event)?.count ?? 0);
    const totalCount = counts.reduce((a, b) => a + b, 0);

    const weights = leaves.map((_, i) => {
      const vw = totalVolume > 0 ? volumes[i] / totalVolume : 1 / leaves.length;
      const aw = totalCount > 0 ? counts[i] / totalCount : 1 / leaves.length;
      return (1 - bias) * vw + bias * aw;
    });

    const cumulative: number[] = [];
    let weightSum = 0;
    for (const w of weights) {
      weightSum += w;
      cumulative.push(weightSum);
    }

    return Array.from({ length: numberOfPoints }, () => {
      const r = Math.random() * weightSum;
      let idx = cumulative.findIndex((c) => r <= c);
      if (idx < 0) idx = leaves.length - 1;
      return leaves[idx].bbox.randomPoint();
    });
  }

  /**
   * Returns the bounding boxes of every node in the tree — both internal and leaf nodes.
   * Useful for visualizing the full spatial subdivision structure.
   * This method does not mutate the instance.
   * @returns An array of BBox instances, one per tree node
   */
  collectAllBBoxes(): BBox[] {
    const nodes: WorldSpaceOcTreeNode[] = [];
    this._collectAllNodes(this.root, nodes);
    return nodes.map((n) => n.bbox);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Recursively collects all leaf nodes into the provided array. */
  private _collectLeaves(
    node: WorldSpaceOcTreeNode,
    leaves: WorldSpaceOcTreeNode[],
  ): void {
    if (!node.divided) {
      leaves.push(node);
    } else {
      for (const child of node.children) {
        this._collectLeaves(child, leaves);
      }
    }
  }

  /** Recursively collects every node (leaf and internal) into the provided array. */
  private _collectAllNodes(
    node: WorldSpaceOcTreeNode,
    acc: WorldSpaceOcTreeNode[],
  ): void {
    acc.push(node);
    if (node.divided) {
      for (const child of node.children) {
        this._collectAllNodes(child, acc);
      }
    }
  }

  // ── BaseOcTree implementation ──────────────────────────────────────────────

  /** Creates a new root node for the given bbox, pre-registering all tracked events. */
  protected createNode(bbox: BBox): WorldSpaceOcTreeNode {
    return new WorldSpaceOcTreeNode(bbox, this.capacity, this.trackedEvents);
  }

  /**
   * Re-attaches the old root to the new root after expansion by structural splice.
   * Finds the child of the new root whose bbox contains the old root's center,
   * and replaces it with the old root directly — no per-item re-insertion needed.
   * Any remaining children of the new root are fresh empty nodes (already created
   * by subdivide()) and will fill naturally as new events are logged.
   * @param oldRoot The root before expansion
   * @param newRoot The newly created, already-subdivided root
   */
  protected reattachOldRoot(
    oldRoot: WorldSpaceOcTreeNode,
    newRoot: WorldSpaceOcTreeNode,
  ): void {
    const oldCenter = oldRoot.bbox.center;
    for (let i = 0; i < newRoot.children.length; i++) {
      if (newRoot.children[i].bbox.containsPoint(oldCenter)) {
        newRoot.children[i] = oldRoot;
        return;
      }
    }
    // Fallback: no child contains the old center (shouldn't happen with correct expansion)
    // Insert old root's content into the first child as a safe default.
    for (const [event, record] of oldRoot.records) {
      for (const geom of record.geometry) {
        if (geom instanceof P5.Vector)
          newRoot.children[0].logPoint(geom, event);
        else if (geom instanceof Line) newRoot.children[0].logLine(geom, event);
        else if (geom instanceof Polyline)
          newRoot.children[0].logPolyline(geom, event);
        else newRoot.children[0].logSphere(geom as Sphere, event);
      }
    }
  }
}
