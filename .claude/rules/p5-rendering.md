# Rendering System

## Folder Layout

```
src/classes/Rendering/
├── GeometryRenderers/      Render raw geometry — no Vehicle dependency
│   ├── DotRenderer.ts      Distance-scaled filled circles at world-space positions
│   ├── LineRenderer.ts     Projected Line segments with configurable stroke
│   └── SphereRenderer.ts  Sphere silhouettes (wireframe) and screen-space fills
├── VehicleRenderers/       Thin adapters over GeometryRenderers; accept Vehicle arrays
│   ├── VehicleDotRenderer.ts           extends DotRenderer
│   ├── VehicleSphereRenderer.ts        extends SphereRenderer
│   ├── VehicleTaperingCircleRenderer.ts  tapering history trails (self-contained)
│   └── VehicletaperingSphereRenderer.ts  sphere-projected tapering trails (self-contained)
├── PhysicsRenderers/       Render simulation constructs (springs, fields, forces)
│   └── SpringRenderer.ts   Distance-scaled lines connecting Spring endpoint vehicles
└── DrawingUtils.ts         Standalone helpers (pressSpaceToPause, drawAxes)
```

## Design Pattern

Renderers are **plain classes** — no Vue reactivity, no Pinia. Each holds a `sketch: P5`, a `camera: Camera3D`, a `color: number[]` (RGB array), and any geometry-specific parameters as public properties. All mutating methods use `push()`/`pop()` for state isolation and return `this` for method chaining.

**GeometryRenderers** operate on geometry primitives (`P5.Vector`, `Line`, `Sphere`). Use them when geometry is computed independently of the physics pipeline.

**VehicleRenderers** extend or delegate to their GeometryRenderer counterpart. Their only job is extracting world positions (or constructing geometry) from `Vehicle` instances before delegating. Build a VehicleRenderer when vehicles own the data; build a GeometryRenderer when the rendering logic should also be available geometry-first.

**PhysicsRenderers** receive simulation objects (`Spring`, etc.) and decompose them to geometric primitives before delegating to a GeometryRenderer. For example, `SpringRenderer` converts each spring to a `Line` between its endpoint vehicle positions and passes it to an internal `LineRenderer`. The rule applies universally: every renderer — geometry, vehicle, or physics — should ultimately draw by calling a GeometryRenderer. No renderer other than a GeometryRenderer should issue raw p5 draw calls directly.

## Instantiation and Constructor Signatures

Every renderer is constructed once at `p5.setup()` time and reused for the lifetime of the sketch:

```ts
// GeometryRenderers
const dots = new DotRenderer(p5, dotSize, refDist, [r, g, b], camera);
const lines = new LineRenderer(p5, [r, g, b], strokeWeight, camera, refDist);
const spheres = new SphereRenderer(
  p5,
  [r, g, b],
  camera,
  strokeWeight,
  refDist,
);

// VehicleRenderers
const vehicleDots = new VehicleDotRenderer(
  p5,
  dotSize,
  refDist,
  [r, g, b],
  camera,
);
const vehicleSpheres = new VehicleSphereRenderer(
  p5,
  radius,
  [r, g, b],
  camera,
  strokeWeight,
);
const trails = new VehicleTaperingCircleRenderer(
  p5,
  dotSize,
  refDist,
  [r, g, b],
  camera,
  trailLen,
);
const sphereTrails = new TaperingSphereRenderer(
  p5,
  dotSize,
  refDist,
  [r, g, b],
  camera,
  sphere,
  trailLen,
);

// PhysicsRenderers
const springs = new SpringRenderer(
  p5,
  [r, g, b],
  camera,
  baseStrokeWeight,
  refDist,
);
```

Mutable public properties (`color`, `dotSize`, `strokeWeightValue`, etc.) can be changed at any time between frames to respond to Vue reactive props:

```ts
watch(primaryColor, (hex) => {
  vehicleDots.color = hexToRgb(hex);
  springs.color = hexToRgb(hex);
});
```

## Distance Scaling

**All renderers** scale their mark size inversely with camera distance. This is a universal requirement — every GeometryRenderer must implement it. The formula is:

```
scaledValue = (nominalValue × referenceDistance) / distanceToCamera
```

| Renderer         | Distance measured from                                       |
| ---------------- | ------------------------------------------------------------ |
| `DotRenderer`    | camera to each point                                         |
| `LineRenderer`   | camera to the line's midpoint                                |
| `SphereRenderer` | camera to each sphere's center                               |
| `SpringRenderer` | delegates to `LineRenderer` (midpoint of the spring segment) |

This keeps marks visually consistent regardless of zoom level — increase `referenceDistance` to make marks larger at a given world scale. The `referenceDistance` and nominal size (`dotSize`, `strokeWeightValue`) are public properties that can be changed between frames.

## Projection — Camera3D

All renderers project through `Camera3D.project(worldPos): P5.Vector | null`. A `null` return means the point is behind the near clip plane; renderers skip those marks silently. The camera is passed at construction and stored as a public property so it can be hot-swapped if needed.

```ts
const screenPos = camera.project(worldPos);
if (screenPos === null) return; // cull
```

`Camera3D.renderLines(line | line[])` batch-projects `Line` arrays, culling any segment where either endpoint is behind the clip plane.

## SphereRenderer — Silhouette vs Fill

`SphereRenderer` provides two modes:

- `renderSilhouette(spheres, segmentCount)` — computes the true silhouette circle of each sphere as seen from the camera position, then projects and draws it as line segments. `segmentCount` trades accuracy for draw cost (64 is smooth, 16 is coarse).
- `renderFill(spheres)` — fills an ellipse in screen space, estimating the screen radius by projecting a tangent point perpendicular to the camera ray. Fast but an approximation (accurate only when the sphere's center is not too close to the screen edge).

`VehicleSphereRenderer` exposes these as `renderSilhouetteVehicles()` and `renderFillVehicles()`, constructing a world-space `Sphere` at each vehicle's position with the configured `radius`.

## SpringRenderer

Draws each spring as a single projected line with per-spring stroke weight:

```ts
springRenderer.renderSprings(gen.springs); // gen.springs is Spring[]
```

Call this in the draw loop after `applySprings()` and `update()` but before the frame counter increment. Springs whose either endpoint is behind the clip plane are skipped.

## Render Order in the Draw Loop

```ts
p5.draw = () => {
  // 1. Apply forces
  collection.seek(targets, strength, range);
  collection.applySprings();
  collection.update();

  // 2. Render — geometry/physics first, vehicles on top
  lineRenderer.renderLines(someGeometry);
  springRenderer.renderSprings(gen.springs);
  vehicleDots.renderVehicles(collection.vehicles);
};
```

On an accumulating canvas (no `p5.background()` in draw), earlier marks persist. Render order affects layering.

## Adding a New Renderer

1. Decide which folder: GeometryRenderers (geometry input), VehicleRenderers (Vehicle input), or PhysicsRenderers (simulation object input).
2. Extend the appropriate base if one exists (e.g. extend `DotRenderer` for a new vehicle dot variant).
3. Store `sketch`, `camera`, `color`, and any geometry params as constructor properties.
4. Wrap every drawing operation in `push()`/`pop()`.
5. Return `this` from all rendering methods for method chaining.
