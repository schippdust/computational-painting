# Class Hierarchy and Folder Anatomy

All simulation and rendering logic lives in `src/classes/`. The folder structure reflects conceptual layers, not import order.

## When Something Belongs in a Class

Any modular logic touching physics, geometry, rendering, or a behavior that could plausibly be reused across more than one canvas belongs in `src/classes/`, not in a canvas component. Concretely:

- **Canvas components (`src/components/*Canvas.vue`) should only instantiate classes and call their methods.** The `<script setup>` block wires props → class constructors and drives the `p5.setup`/`p5.draw` loop; it should not contain novel algorithms, math, or drawing logic of its own. If you find yourself writing a loop that computes something non-trivial (a new curve, a new steering rule, a new projection), that computation belongs in a class.
- **A canvas component must never export anything for another canvas to import.** If two canvases need the same behavior, extract it into `src/classes/` and have both import it from there — canvases are leaves, not libraries.
- When asked to plan a large feature, default to assuming the new logic is a class (or an addition to an existing class) unless it is truly one-off UI wiring (a slider, a toolbar button, a prop).

## Library Preference (p5 / mathjs / three.js)

The codebase uses three math/geometry libraries with overlapping capabilities. Default to p5; reach for mathjs or three.js only when p5 can't do the job:

- **p5.js is the default.** Use `P5.Vector` and p5's built-in math for anything it already covers (vector arithmetic, basic trig, noise, projection). Don't pull in mathjs or three.js for something p5 already does.
- **mathjs** is for matrix math beyond what `P5.Vector` supports — general NxN matrix operations, decompositions, or anything `CoordinateSystem`'s basis-matrix transforms need (see `CoordinateSystem.ts` for the existing pattern). Prefer it over hand-rolling matrix math or forcing three.js's `Matrix4`/`Matrix3` into a role it's not suited for.
- **three.js** is used for its 3D geometry/mesh systems (see `src/classes/Mesh/`). While operating on three.js objects, use three.js's own `Vector3`/`Matrix4` rather than converting to `P5.Vector` mid-pipeline — three.js's vector methods are what its geometry, raycasting, and camera classes expect.
- **Crossing the boundary**: `src/classes/Mesh/ThreeInterop.ts` is the one place that converts between `P5.Vector` and three.js `Vector3` (`toVector3`, `toP5Vector`) and builds a three.js camera matching `Camera3D` (`buildPerspectiveCamera`). Any new three.js↔p5 conversion helper belongs there, not scattered inline in whichever class needs it.
- **Everything renders through p5 in the end.** Nothing draws directly from three.js or mathjs state. If a pipeline produces three.js geometry (a mesh silhouette, a wireframe), convert its output to `Line`/`P5.Vector` primitives — see `MeshWireExtractor.ts` / `MeshSilhouetteExtractor.ts` for the pattern — and hand those to an existing `GeometryRenderer` (`LineRenderer`, `DotRenderer`, etc.). Never add a bespoke three.js-based draw call as a shortcut.

## Composability — Reuse Before You Build

Classes are intentionally interdependent, and pipelines of existing classes are preferred over new bespoke logic. For example: `Circle` generates `Line` segments (`renderSegments`), which `LineRenderer` already knows how to draw — a new circular-motion feature should compose those two rather than re-deriving segment math and drawing it by hand.

Before writing new logic, check whether an existing class already produces the intermediate data you need (a `Line`, a `Sphere`, a set of points, a projected screen position) and an existing renderer already knows how to draw it. Favor chaining `Generator → Geometry → Renderer` (or `Vehicle(Collection) → GeometryRenderer` via a `VehicleRenderer` adapter) over writing a new self-contained class that duplicates a step another class already performs. When planning a large addition, explicitly list which existing classes the new feature can delegate to before deciding what (if anything) is genuinely new.

## Folder Map

```
src/classes/
├── Core/                    Foundational utilities used across all other layers
│   ├── Camera3D.ts          Perspective camera: 3D world → 2D screen projection
│   ├── Color.ts             Color utilities
│   ├── CodeUtils.ts         General helpers (e.g. prependUniqueWithLimit)
│   ├── PixelManager.ts      Direct pixel buffer access for high-perf drawing
│   ├── VehicleOcTree.ts     Octree spatial index for neighbor queries
│   ├── BaseOcTree.ts        Abstract generic octree node base: subdivision, capacity, typed item storage
│   ├── WorldSpaceOcTree.ts  Octree tracking per-region WorldEventRecords (geometry logged per named event)
│   ├── Intersections3d.ts   Static library of 3D intersection/containment tests (point/sphere/box, etc.)
│   ├── NoiseSystem.ts       Static (time-frozen) 3D Perlin noise field mapping positions → smooth vectors
│   ├── Spring.ts            Hooke's-law spring connecting two vehicles; applies paired forces each frame
│   └── WindSystem.ts        Curl-noise wind field (Perlin fBm, divergence-free)
│
├── Geometry/                Mathematical primitives; no simulation logic
│   ├── CoordinateSystem.ts  3×3 basis matrix; local↔world transforms; rotation, translation, lookAt
│   ├── Line.ts              Line segment with parametric helpers and 2D render
│   ├── Circle.ts            Circle with silhouette and segment utilities
│   ├── Sphere.ts            Sphere with silhouette, occlusion, random interior/surface points
│   ├── BBox.ts              Axis-aligned (or CS-local) bounding box: center + per-axis half-extents
│   ├── Polyline.ts          Ordered points as connected Line segments with arc-length parameterized queries
│   ├── GeometryTypes.ts     GeometryItem union type (Vector | Line | Sphere | Polyline)
│   └── VectorOverloads.ts   Augments P5.Vector with additional operators (import as side effect)
│
├── Mesh/                    three.js-backed mesh tools; the only folder that touches three.js directly
│   ├── Mesh3D.ts                    Wraps a three.js Mesh + BufferGeometry with BVH acceleration
│   ├── ThreeInterop.ts              P5.Vector ↔ THREE.Vector3 conversion; builds a THREE camera from Camera3D
│   ├── MeshRaycaster.ts             BVH-accelerated raycasting: P5.Vector rays against Mesh3D occluders
│   ├── MeshOcclusionClipper.ts      Clips world-space lines against mesh occluders from a camera view
│   ├── MeshSilhouetteExtractor.ts   Extracts a mesh's view-dependent silhouette edges as world-space Lines
│   └── MeshWireExtractor.ts         Extracts crease/hard edges of a mesh as cached world-space Lines
│
├── Generators/              Distribute vehicles along geometry at setup time
│   ├── InstanceGenerators/
│   │   └── GridGenerator.ts    Rectangular 3D lattice of vehicles pre-wired with springs
│   └── ProgressiveGenerators/
│       ├── LineGenerator.ts    Spawns vehicles at parametric intervals along a Line
│       └── CircleGenerator.ts  Spawns vehicles along a Circle
│
├── MarkMakingEntities/      Simulated agents that move through space and leave marks
│   ├── Extensible/
│   │   └── Vehicle.ts       Base agent: physics (velocity, acceleration, mass), steering behaviors
│   │                        (seek, arrive, avoid, separate, align, cohere, flock),
│   │                        persistent forces, position history, duplicate()
│   └── TestRenderVehicle.ts Example concrete vehicle for debugging/prototyping
│
├── EntityManagement/        Collections and systems that manage groups of vehicles
│   ├── Extensible/
│   │   ├── VehicleCollection.ts  Manages Vehicle[], batch operations, octree-accelerated
│   │   │                         spatial steering (flock, separate, arrive, avoid, etc.)
│   │   └── VehicleSystem.ts      Extends Vehicle: a vehicle that contains a VehicleCollection
│   │                             (hierarchical: system moves → sub-vehicles move with it)
│   ├── VehicleCollections/
│   │   └── BranchingCollection.ts  VehicleCollection + probabilistic branching
│   │                               (age-weighted, angular spread cone, duplicate-and-diverge)
│   └── VehicleSystems/
│       └── BrushStrokeSystem.ts    VehicleSystem specialized for brushstroke simulation
│
└── Rendering/               Draw vehicles and geometry to the p5 canvas
    ├── DrawingUtils.ts       Canvas helpers: pressSpaceToPause, etc.
    ├── CanvasThreads.ts      Threading/batching utilities for canvas operations
    ├── GeometryRenderers/    Render raw geometry — no Vehicle dependency
    │   ├── DotRenderer.ts             Distance-scaled filled circles at world-space positions
    │   ├── LineRenderer.ts            Projected line segments with distance-scaled stroke weight
    │   ├── SphereRenderer.ts          Sphere silhouettes (wireframe) and screen-space fills
    │   ├── BBoxRenderer.ts            AABB wireframes as 12 projected line segments (via LineRenderer)
    │   ├── MeshSilhouetteRenderer.ts  Mesh silhouette edges, occlusion-clipped (via LineRenderer)
    │   └── MeshWireRenderer.ts        Mesh crease-edge wireframe, occlusion-clipped (via LineRenderer)
    ├── VehicleRenderers/     Thin adapters over GeometryRenderers; accept Vehicle arrays
    │   ├── VehicleDotRenderer.ts              extends DotRenderer
    │   ├── VehicleSphereRenderer.ts           extends SphereRenderer
    │   ├── VehicleLineRenderer.ts             extends LineRenderer; current position → history position
    │   ├── VehicleTaperingCircleRenderer.ts   tapering history trails
    │   └── VehicletaperingSphereRenderer.ts   sphere-projected tapering trails
    └── PhysicsRenderers/     Render simulation constructs (springs, fields, forces)
        ├── SpringRenderer.ts          Distance-scaled lines connecting Spring endpoint vehicles
        └── WorldSpaceOcTreeRenderer.ts  Draws a WorldSpaceOcTree's node bounding boxes, deduplicated
```

## Extension Patterns

**Extending Vehicle** — subclass for new agent behaviors:

```ts
export class MyAgent extends Vehicle {
  // override update() to add custom per-frame behavior
  update(): MyAgent {
    super.update();
    this.seek(someTarget);
    return this;
  }
}
```

**Extending VehicleCollection** — subclass for new group behaviors:

```ts
export class MyCollection extends VehicleCollection {
  update(): MyCollection {
    super.update(); // handles physics + culls dead vehicles
    // add group-level behavior here
    return this;
  }
}
```

**Extending VehicleSystem** — subclass when you need a vehicle that owns sub-vehicles (hierarchical motion).

## Key Relationships

- `Vehicle` holds a `CoordinateSystem` (position + orientation in 3D world space)
- `VehicleCollection` holds `Vehicle[]`, `Spring[]`, and an optional `OcTree` for spatial queries; springs whose endpoint vehicles are culled during `update()` are pruned automatically
- `VehicleSystem extends Vehicle` and contains a `VehicleCollection` (sub-vehicles inherit parent's motion)
- `BranchingCollection extends VehicleCollection`, using `Sphere.randomDirectionInCone()` and `Vehicle.duplicate()` to spawn branch vehicles
- `Camera3D.project(P5.Vector)` converts world position → screen `P5.Vector | null`
- Renderers receive a `Camera3D` and call `camera.project()` per vehicle to get screen coordinates
- `WindSystem.calculateWindAtCoords(pos)` returns a force vector; call `vehicle.applyForce()` or `vehicle.applyWind(windSystem)`
- `VehicleOcTree` and `WorldSpaceOcTree` both extend a shared `BaseOcTree`/`BaseOcTreeNode`; `WorldSpaceOcTree` stores `WorldEventRecord[]` per node instead of `Vehicle[]`
- Every spatial-containment check (`BBox`, `VehicleOcTree`, `WorldSpaceOcTree`) delegates its point/sphere/line/polyline tests to the static `Intersections3d` library rather than reimplementing them
- `Circle` holds a `CoordinateSystem` and pre-generates its `Line[]` segments (`renderSegments`) at construction; `Sphere` holds a `CoordinateSystem` too but produces `Line[]`/`Circle` only on demand (`silhouetteSegments()`, `silhouetteCircle()`)
- `Polyline` is a sequence of `Line[]` and builds its arc-length/parametric queries on top of `Line`'s own parametric methods
- `Line.getCoordinateSystemAtParam()` / `Polyline.getCoordinateSystemAtParam()` / `Circle.getTangentCoordinateSystemAtRadians()` each derive a `CoordinateSystem` from a point + tangent; `LineGenerator`/`CircleGenerator` consume it to orient newly spawned vehicles
- `BBox.fromGeometry()` builds a bounding box directly from a `Line`, `Sphere`, `Polyline`, or `P5.Vector[]`
- `LineGenerator` and `CircleGenerator` each own an internal `VehicleCollection` they populate directly, rather than requiring a caller-supplied one
- `GridGenerator.populate()` builds the vehicle lattice, registers it on a `VehicleCollection`, and constructs/registers all `Spring`s via `collection.addSpring()`
- `Mesh3D` wraps the one three.js object other Mesh/ classes operate on; `MeshWireExtractor`/`MeshSilhouetteExtractor` turn it into world-space `Line[]`, which `MeshWireRenderer`/`MeshSilhouetteRenderer` draw via an internal `LineRenderer` — three.js never reaches the canvas directly
- `MeshOcclusionClipper` holds a `MeshRaycaster` and samples visibility along each input `Line` against `Mesh3D[]` occluders, producing a `ClipResult` of `Polyline[]`/`Line[]` that feeds `MeshWireRenderer`/`MeshSilhouetteRenderer`
- `WorldSpaceOcTreeRenderer` consumes `WorldSpaceOcTree.collectAllBBoxes()` plus `BBoxRenderer`'s static `getEdges()` helper to deduplicate shared edges before drawing

## New Class Procedures

Whenever a new class is added to `src/classes/`, update this file in the same change — the map and notes above are only useful if they stay current:

1. **Add it to the Folder Map.** Insert it under the correct folder (or propose a new folder if it doesn't fit an existing conceptual layer) with a one-line description in the same terse style as its neighbors.
2. **Check Extension Patterns.** If the new class is designed to be subclassed (lives in an `Extensible/` folder, or is a base class other canvases are expected to extend), add a short pattern for it following the existing `MyAgent`/`MyCollection` examples.
3. **Check Key Relationships.** If the new class holds, produces, or consumes another class's data (owns a `CoordinateSystem`, emits `Line`/`Sphere` geometry, wraps a three.js object, feeds a specific renderer, etc.), add a bullet describing that relationship — or update an existing bullet if the new class changes how one already-documented relationship works.
4. Do this even for small or seemingly one-off classes — an undocumented class is invisible to the "Composability — Reuse Before You Build" check above, and future planning will re-derive logic that already exists.
