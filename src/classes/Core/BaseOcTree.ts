import P5 from 'p5';
import { BBox } from '../Geometry/BBox';

/**
 * Abstract base for a single octree node.
 * Holds the spatial boundary, capacity, subdivision state, and a typed item store.
 * Subclasses define the payload type T, how items are inserted, and how child nodes
 * are constructed.
 *
 * The F-bounded generic `TSelf extends BaseOcTreeNode<T, TSelf>` ensures
 * that `children` and `createChild` are correctly typed in all subclasses
 * without unsafe casts.
 *
 * @typeParam T    The payload type stored at each node (e.g. Vehicle, WorldEventRecord[])
 * @typeParam TSelf The concrete node subclass — ensures typed children
 */
export abstract class BaseOcTreeNode<
  T,
  TSelf extends BaseOcTreeNode<T, TSelf>,
> {
  divided: boolean = false;
  children: TSelf[] = [];

  /**
   * Depth of this node in the tree. The initial root is 0. Each subdivision step
   * increments depth by 1 for children. When the tree expands upward (a new root is
   * inserted above the current root), the new root receives depth = oldRoot.depth − 1,
   * keeping all existing nodes stable while ancestor nodes use negative depths.
   */
  readonly depth: number;

  /**
   * @param bbox     The spatial boundary of this node
   * @param capacity Threshold that governs when to subdivide (interpretation is subclass-defined)
   * @param depth    Depth of this node (default: 0 for the initial root)
   */
  constructor(
    public bbox: BBox,
    public capacity: number,
    depth: number = 0,
  ) {
    this.depth = depth;
  }

  // ── Concrete: spatial tests — delegate to BBox ────────────────────────────

  /**
   * Returns true if the given point is inside this node's bounding box.
   * @param point The point to test
   * @returns True if the point is contained by this node's BBox
   */
  containsPoint(point: P5.Vector): boolean {
    return this.bbox.containsPoint(point);
  }

  /**
   * Returns true if the given sphere overlaps this node's bounding box.
   * @param center The sphere center
   * @param radius The sphere radius
   * @returns True if the sphere intersects this node's BBox
   */
  intersectsSphere(center: P5.Vector, radius: number): boolean {
    return this.bbox.intersectsSphere(center, radius);
  }

  // ── Concrete: subdivision ─────────────────────────────────────────────────

  /**
   * Subdivides this node into 8 child nodes, one per octant.
   * Calls createChild for each octant BBox, which subclasses implement
   * to return the correctly typed child node.
   * Must not be called when the node is already divided.
   */
  subdivide(): void {
    for (const dx of [-1, 1] as const) {
      for (const dy of [-1, 1] as const) {
        for (const dz of [-1, 1] as const) {
          this.children.push(this.createChild(this.bbox.childAt(dx, dy, dz)));
        }
      }
    }
    this.divided = true;
  }

  // ── Abstract: subclass-defined behaviour ──────────────────────────────────

  /**
   * Factory: creates a child node for the given bbox with the same capacity.
   * Subclasses return `new ConcreteNode(bbox, this.capacity, ...)`.
   * Called exclusively from subdivide().
   * @param bbox The bounding box for the new child
   * @returns A new node of the same concrete type as this node
   */
  protected abstract createChild(bbox: BBox): TSelf;

  /**
   * Returns the item store of this node.
   * VehicleOcTreeNode returns Vehicle[]; WorldSpaceOcTreeNode returns WorldEventRecord[].
   * Used by the tree's reattachOldRoot logic to iterate items during expansion.
   * @returns The array of items stored directly at this node
   */
  abstract getItems(): T[];
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abstract base for an octree spatial structure.
 * Manages a root node, capacity, and auto-expanding bounds.
 * Subclasses define the node type, how the root is constructed,
 * and how the old root is reattached after expansion.
 *
 * @typeParam T     The payload type stored at nodes
 * @typeParam TNode The concrete node subclass
 */
export abstract class BaseOcTree<T, TNode extends BaseOcTreeNode<T, TNode>> {
  root: TNode;
  capacity: number;

  /**
   * @param initialRoot The starting root node (constructed by the subclass)
   * @param capacity    Node capacity — passed through to all created nodes
   */
  constructor(initialRoot: TNode, capacity: number) {
    this.root = initialRoot;
    this.capacity = capacity;
  }

  // ── Concrete: expand-to-fit loop ──────────────────────────────────────────

  /**
   * Expands the root until it contains the given point.
   * Each iteration doubles the half-extents on all axes and shifts the center
   * toward the point by the old half-extents (per axis), then delegates
   * re-attachment of the old root to reattachOldRoot.
   * Subclasses only need to implement reattachOldRoot — the loop is shared.
   * @param point The point that must fall inside the root after expansion
   */
  protected expandToFit(point: P5.Vector): void {
    while (!this.root.containsPoint(point)) {
      const oldRoot = this.root;
      const oldHE = oldRoot.bbox.halfExtents;
      const newHalfExtents = oldHE.copy().mult(2);

      const dir = point.copy().sub(oldRoot.bbox.center).normalize();
      const offset = new P5.Vector(
        dir.x * oldHE.x,
        dir.y * oldHE.y,
        dir.z * oldHE.z,
      );
      const newCenter = oldRoot.bbox.center.copy().add(offset);

      const newBBox = new BBox(
        newCenter,
        newHalfExtents.x,
        newHalfExtents.y,
        newHalfExtents.z,
      );
      this.root = this.createNode(newBBox, oldRoot.depth - 1);
      this.root.subdivide();
      this.reattachOldRoot(oldRoot, this.root);
    }
  }

  // ── Abstract: node factory + reattachment ─────────────────────────────────

  /**
   * Creates a new node for the given bbox with this tree's capacity.
   * Called during expandToFit to build a new root (depth = oldRoot.depth − 1).
   * Subclasses return `new ConcreteNode(bbox, this.capacity, ..., depth)`.
   * @param bbox  The bounding box for the new node
   * @param depth Depth of the new node (default: 0)
   * @returns A new node of the correct concrete type
   */
  protected abstract createNode(bbox: BBox, depth?: number): TNode;

  /**
   * Re-attaches the previous root to the new, larger root after expansion.
   *
   * VehicleOcTree: recursively extracts every Vehicle from oldRoot and
   * re-inserts it into newRoot so items redistribute across the subdivided octants.
   *
   * WorldSpaceOcTree: finds the child of newRoot whose bbox contains
   * oldRoot's center and splices oldRoot in directly — no per-item
   * redistribution needed; recorded geometry remains correct in place.
   *
   * @param oldRoot The root before expansion
   * @param newRoot The newly created, already-subdivided root
   */
  protected abstract reattachOldRoot(oldRoot: TNode, newRoot: TNode): void;
}
