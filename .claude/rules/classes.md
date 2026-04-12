# Class Hierarchy and Folder Anatomy

All simulation and rendering logic lives in `src/classes/`. The folder structure reflects conceptual layers, not import order.

## Folder Map

```
src/classes/
├── Core/                    Foundational utilities used across all other layers
│   ├── Camera3D.ts          Perspective camera: 3D world → 2D screen projection
│   ├── Color.ts             Color utilities
│   ├── CodeUtils.ts         General helpers (e.g. prependUniqueWithLimit)
│   ├── PixelManager.ts      Direct pixel buffer access for high-perf drawing
│   ├── VehicleOcTree.ts     Octree spatial index for neighbor queries
│   └── WindSystem.ts        Curl-noise wind field (Perlin fBm, divergence-free)
│
├── Geometry/                Mathematical primitives; no simulation logic
│   ├── CoordinateSystem.ts  3×3 basis matrix; local↔world transforms; rotation, translation, lookAt
│   ├── Line.ts              Line segment with parametric helpers and 2D render
│   ├── Circle.ts            Circle with silhouette and segment utilities
│   ├── Sphere.ts            Sphere with silhouette, occlusion, random interior/surface points
│   └── VectorOverloads.ts   Augments P5.Vector with additional operators (import as side effect)
│
├── Generators/              Distribute vehicles along geometry at setup time
│   ├── LineGenerator.ts     Spawns vehicles at parametric intervals along a Line
│   └── CircleGenerator.ts   Spawns vehicles along a Circle
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
    └── Renderers/
        ├── DotRenderer.ts             Vehicles as distance-scaled filled circles
        ├── SphereRenderer.ts          Renders Sphere geometry (silhouettes, fills)
        ├── TaperingCircleRenderer.ts  Vehicles as tapering circles (brushstroke-like)
        └── taperingSphereRenderer.ts  Sphere-projected tapering marks
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
- `VehicleCollection` holds `Vehicle[]` and an optional `OcTree` for spatial queries
- `VehicleSystem extends Vehicle` and contains a `VehicleCollection` (sub-vehicles inherit parent's motion)
- `Camera3D.project(P5.Vector)` converts world position → screen `P5.Vector | null`
- Renderers receive a `Camera3D` and call `camera.project()` per vehicle to get screen coordinates
- `WindSystem.calculateWindAtCoords(pos)` returns a force vector; call `vehicle.applyForce()` or `vehicle.applyWind(windSystem)`
