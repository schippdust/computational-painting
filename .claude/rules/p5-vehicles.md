# Vehicles and Vehicle Collections

## The Physics Pipeline

Every frame the draw loop must run operations in this order:

1. **Apply forces** — seek, steer, wind, springs, and any custom forces accumulate into `phys.acceleration`
2. **`collection.update()`** — for each vehicle: applies friction, integrates `acceleration → velocity → position`, resets acceleration to zero, increments age, then culls dead vehicles and nullifies the octree

`update()` resets acceleration to zero at the end of each vehicle's step. Any force applied _after_ `update()` silently disappears — it will not integrate until the next frame. Forces applied _before_ `update()` are guaranteed to integrate this frame.

```ts
// Correct order — every frame
collection.seek(targets, strength, range);
collection.applySprings();
collection.update();
renderer.renderVehicles(collection.vehicles);
```

## Force Application — Direct vs. Collection Methods

**Direct on a vehicle** — use when you have a reference and need unconditional application:

```ts
vehicle.seek(target, multiplier);
vehicle.applyForce(force);
vehicle.arrive(target);
```

**Via `VehicleCollection`** — use for batch operations across the whole collection. Most methods accept an optional `awarenessDistance` that limits the operation to vehicles within that radius of the target (using the octree internally):

```ts
collection.seek(target, multiplier, awarenessDistance); // seek toward position
collection.arrive(target, awarenessDistance); // arrive with deceleration
collection.avoid(target, desiredDist, awarenessDistance); // steer away
collection.applyForce(force); // unconditional, all vehicles
collection.applyWind(windSystem); // wind field, all vehicles
```

**Spatial queries use the octree.** `seek`, `arrive`, `avoid`, `separate`, `alignToNeighbors`, `cohere`, and `flock` all route through `vehiclesInRange()`, which builds or reuses the octree. The octree is nullified by `update()` each frame and rebuilt lazily on the next spatial query. Flat Z=0 grids (e.g. spring grids in the XY plane) are handled correctly — the octree bounding box uses only the XY span for sizing and all Z=0 vehicles are inserted into the Z-positive octants.

## Springs

Springs are registered on the collection and applied explicitly — `update()` does NOT call `applySprings()` automatically.

```ts
// Register (usually done once at setup by a generator)
collection.addSpring(spring);
collection.addSpringBetween(vehicleA, vehicleB, restLength, stiffness, damping);

// Apply every frame, before update()
collection.applySprings();
collection.update();
```

`GridGenerator.populate(collection)` registers all grid springs automatically. After calling it, use `gen.springs` to iterate them for live prop changes:

```ts
for (const s of gen.springs) {
  s.stiffness = props.springStiffness;
  s.damping = props.springDamping;
}
```

## Vehicle Lifetime

`Vehicle.lifeExpectancy` defaults to **150 frames**. `update()` filters out vehicles whose `age >= lifeExpectancy`. For persistent simulations (spring grids, fixed lattices) set it to `Infinity` immediately after construction:

```ts
for (const row of gen.grid) {
  for (const v of row) {
    v.lifeExpectancy = Infinity;
  }
}
```

If all vehicles expire, `collection.vehicles` becomes empty. The octree constructor throws `"Cannot construct OcTree with no vehicles"` if `buildOcTree()` is called on an empty collection, which crashes the draw loop permanently.

## Persistent Forces

Persistent steer forces are re-applied at the start of every `vehicle.update()` without explicit per-frame calls. Use them for forces that should always be on, like gravity or a constant wind direction:

```ts
vehicle.addPersistentSteerForce(gravity);
collection.addPersistentSteerForceAll(gravity); // applies to all vehicles
```

Remove with `vehicle.removePersistentSteerForce(force)` or `collection.clearPersistentSteerForcesAll()`.

## Method Chaining

All `VehicleCollection` mutating methods return `this`. Chaining is idiomatic for multi-step per-frame operations:

```ts
collection
  .applyWind(windSystem)
  .seek(targets, 0.5, 800)
  .flock(200)
  .applySprings()
  .update();
```

## Environmental Friction

`vehicle.env.friction` is `null` by default (no friction). Set a value between 0 and 1 to apply velocity damping each frame. Applied inside `vehicle.update()` before acceleration integration:

```ts
vehicle.env.friction = 0.04; // 4% velocity reduction per frame
```
