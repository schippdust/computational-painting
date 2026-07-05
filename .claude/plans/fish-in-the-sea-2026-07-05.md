# Fish in the Sea (Flocking Canvas) — Development Plan

_Generated: 2026-07-05_
_Request: "I'd like the development team to put together a plan for a new canvas component. This component will be in a new group called 'Flocking'. The component can be called 'Fish in the Sea'. It should be like we are looking straight downward into the water watching swarms of fish flock together. First initialize something like this with existing classes, then begin modifying / extending / adding classess as necessary to achieve the following behaviors. There should be somewhere between 100-200 fish starting at randomized positions. — The fish should render themselves as lines with a circle at the 'front' of the vehicle, and the line pointing in the opposite direction of their current velocity. — There should be a top plane, closish to the camera, and a bottom plane relatively far away from the camera. The fish (vehicles) won't mind getting close to these barriers, but cannot pass through them, and won't 'bounce' off of them either, they'll just slow down as they approach them, even out to match them, then maybe go another direction if the flock is going another direction. — The fish should prefer to move in horizontal or vertical directions relatively to the camera, not perpendicular to the camera plane (ie like the fish prefer to swim on the same plane rather than moving up or down), but they are still able to move up and down if needed. — The fish should increasingly want to break away from the swarm as its density becomes too high (if there are over 20 fish). — Fish should be comfortable slowing down and even coming to a stop if they are in a pack of more than 5 fish. Build sprints in the plan to achieve these goals in whichever sequence makes the most sense programmatically."_

## Summary

A new top-down "Fish in the Sea" flocking canvas in a new **Flocking** group. 100–200 persistent fish school on the accumulating canvas, viewed straight down so **screen X/Y = world X/Y and depth = world Z**. Five behaviors are delivered as small, reusable pieces: a `VehicleFishRenderer` glyph, a `DepthSlab` soft-barrier Core force, a `Vehicle.dampAxis()` planar-preference drag, and a `FishSchoolCollection` that does density-adaptive breakaway (>20 neighbors) and pack braking (>5 neighbors) from a single octree neighbor pass. Everything is soft and smoothstep-ramped — no bounce, no hard thresholds, no `background()` in the draw loop.

### Cross-cutting decisions (settled in planning — do not re-litigate)

- **Depth axis = world Z, camera directly overhead.** Camera pose: position `(0, 0, H)` (large H, framed like `spring-grids`), focus `(0, 0, 0)`, up `(0, 1, 0)`. This yields forward `(0,0,-1)`, right `(1,0,0)`, up `(0,1,0)` — a valid orthonormal basis. "Prefer horizontal/vertical, not perpendicular" = prefer XY motion, damp Z. "Top plane close / bottom plane far" = high-Z plane and low-Z plane.
- **The default camera up `(0,0,1)` is parallel to the straight-down forward `(0,0,-1)`**, which degenerates the basis (`right = up × forward = 0` → NaN → projection breaks). The overhead camera **must** be given a horizontal up `(0,1,0)`. This requires a minimal `Camera3D` addition (Sprint 1).
- **No basis getters, no `CameraPlaneConstraint` class, no `Fish extends Vehicle` subclass, no `Plane` geometry primitive, no `BBox` containment, no reflection/bounce.** These were all considered and rejected; behavior-3 (planar preference) is world-Z drag, not a camera-relative class.
- **Do NOT revive `Vehicle.constrainMovementOrthogonally`** — it is a dead boolean flag (declared, copied in `duplicate()`, never read). A hard lock also looks mechanical. Use the soft `Vehicle.dampAxis()` force instead.
- **Persistent canvas:** no `p5.background()` in `draw()`. Call `p5.background(0)` once in `setup` only. Accumulation is the point — fish glyphs paint continuous ribbons.
- **Fixed population contract:** every fish must get `lifeExpectancy = Infinity` at spawn. Default is 150 frames; if the school empties, the next octree build throws `"Cannot construct OcTree with no vehicles"` and crashes the draw loop permanently.
- **Force ordering (load-bearing):** every frame apply forces `flock() → density pass → barrier → planar drag`, then `update()`, then `render`. All forces must be applied **before** `update()`, which zeroes acceleration at the end of each vehicle's step.
- **Force idiom:** new field-force classes mirror `WindSystem` — `apply(vehicle)` / `applyAll(collection)` returning `this`, called before `update()`.
- **Scaffolding is mandatory via the `npm run` scripts** (`new-canvas`, `create-slider`, etc.) — never hand-wire the canvas boilerplate, the parameter touch points, or the registry. See `.claude/skills/canvas-scripts.md`.
- **`classes.md` (and `p5-rendering.md` for the renderer) must be updated in the same change that adds each new class** — per the "New Class Procedures" rule. This is acceptance criteria, not optional.

---

## Sprint 1 — Scaffold + top-down camera + baseline flock ✅ _Completed 2026-07-05_

**Goal:** A working canvas in the Flocking group showing 100–200 persistent fish flocking on the accumulating canvas, viewed straight down, rendered with the stock `VehicleDotRenderer` placeholder. Proves the loop, the camera framing, and accumulation before any new class exists.
**Rationale:** Comes first because the request says "initialize with existing classes first," and because the overhead-camera basis fix is a hard blocker for everything camera-relative. De-risks the draw loop and the fixed-population/octree contract.
**Sources:** [SE] / [CD] / [AR] (all three)

### Tasks

- [x] Scaffold the canvas and Flocking group

  - Command: `npm run new-canvas -- fish-in-the-sea "Swarms of fish flocking, viewed straight down into water" --group "Flocking"`
  - Creates: `src/components/FishInTheSeaCanvas.vue`, `src/pages/fish-in-the-sea.vue`, and a `src/canvasRegistry.ts` entry. The "Flocking" group is created automatically by `--group` (no group registry to hand-edit).
  - Context: Route goes live at `http://localhost:3000/fish-in-the-sea`. The blank template ships with a `VehicleDotRenderer` stub — use it as the placeholder renderer this sprint.
  - **Done:** Ran the script as-is; created the three files with no manual edits to the registry.

- [x] Add a minimal horizontal-up setter to `Camera3D`

  - File: `src/classes/Core/Camera3D.ts`
  - Change: Add a public `setUp(up: P5.Vector): this` (or a `lookDown(height: number): this` convenience) that sets the private `up` field and marks the basis dirty so `_rebuildBasis()` recomputes on next use. Return `this` for chaining; add a JSDoc block noting it mutates and chains.
  - Context: `up` is currently private with default `(0,0,1)` and only `setPosition`/`lookAt`/`setFOV` mark the basis dirty — there is no way to set a horizontal up today. Without this the straight-down camera degenerates to a NaN basis. Do NOT add `getForward/getRight/getCameraUp` basis getters — nothing consumes them once depth is pinned to world Z.
  - **Done:** Added `setUp(up: P5.Vector): Camera3D` right above `setFOV`; copies the vector, sets `_basisDirty = true`, returns `this`.

- [x] Configure the overhead camera in the page `onMounted`

  - File: `src/pages/fish-in-the-sea.vue`
  - Change: Set canvas dims and camera pose the way `src/pages/spring-grids.vue` does (`setCanvasDims`, `setCameraInitPos`, `setCameraInitTarget`, and the new up setter). Pose: position `(0, 0, H)` with a large H scaled to the world (match spring-grids' magnitude), target `(0, 0, 0)`, up `(0, 1, 0)`.
  - Context: Setting camera pose at setup is wiring, not an algorithm, so it belongs in the page/component — not a class. Verify the exact store method names against `spring-grids.vue` before writing.
  - **Done:** Set `cameraInitPos(0,0,4000)`, `cameraInitTarget(0,0,0)`, `cameraInitFOV(65)` in the page's `onMounted`. Deviation: the `up` call itself was moved to `FishInTheSeaCanvas.vue`'s `p5.setup()` instead of the page, because `appStore.initializeCanvas()` (fired by the "Start Drawing" button) calls `initializeCamera()` first, replacing the `Camera3D` instance — any `setUp()` call made in the page's `onMounted` would target a camera object that gets discarded before drawing starts. The canvas component's `p5.setup()` only runs after `initialized` is true, so it's guaranteed to hold the live camera.
  - Kept default canvas dims (4600×4600) rather than overriding — no reason found to deviate from the architecture default for this canvas.

- [x] Spawn 100–200 persistent fish at randomized positions in `FishInTheSeaCanvas.vue`

  - File: `src/components/FishInTheSeaCanvas.vue`
  - Change: In `p5.setup`, create a plain `VehicleCollection`, populate it with `fishCount` (default ~150) `Vehicle`s at random XY positions within a spawn box and random Z within the intended slab. Give each fish a randomized initial velocity in the XY plane (so they start swimming horizontally, not from rest), `useMaxVelocity = true` with a modest `maxVelocity`, and **`lifeExpectancy = Infinity`**. Call `p5.background(0)` once here.
  - Context: Random spawn helpers exist on `Vehicle` (e.g. `randomizeLocation`) — check `Vehicle.ts` for the exact API. The `<script setup>` block must ONLY instantiate classes and drive the loop; no novel math here.
  - **Done:** `fishCount = 150`, spawn box `±1600` in X/Y, `±600` in Z. Used `new Vehicle(p5, coords, vehicleProps)` directly (not `randomizeLocation`, which also randomizes the up axis — not needed here) and set `fish.velocity = P5.Vector.random2D().mult(maxVelocity * 0.5)` for the initial XY-plane heading. `lifeExpectancy = Infinity` set per fish; `p5.background(backgroundColor.value)` called once in `setup`.

- [x] Drive a baseline flock in `p5.draw`

  - File: `src/components/FishInTheSeaCanvas.vue`
  - Change: Each frame call `collection.flock(neighborDistance)` then `collection.update()` then render with the placeholder `VehicleDotRenderer`. No `background()` in draw.
  - Context: `VehicleCollection.flock()` already does one octree neighbor query per fish and applies separate/align/cohere. Confirm the top-down framing, the accumulating trails, and that the school doesn't evaporate before moving on.
  - **Done:** `school.flock(neighborDistance)` → `school.update()` → `dotRenderer.renderVehicles(school.vehicles)` each frame, no `background()` call in `draw`.

- [x] **(Added during Sprint 1 testing, not in the original plan)** Contain fish within camera view with a new `ViewBoundary` Core force
  - Files: `src/classes/Core/ViewBoundary.ts` (new), `src/components/FishInTheSeaCanvas.vue`
  - Context: On first visual test, fish flocking with no boundary simply flew off to infinity once isolated from the school (no neighbors → near-zero flock force → constant-velocity drift forever), and `maxVelocity=25` read as too fast for the scale of the canvas. The plan's Sprint 4 `DepthSlab` only constrains the Z (depth) axis — nothing in the original plan keeps fish inside the camera's XY view.
  - **Done:** Added `ViewBoundary` (mirrors the `WindSystem` apply/applyAll idiom): vehicles roam freely within `comfortRadius` (1600) of a center point; beyond it, a smoothstep-ramped `vehicle.seek(center, rampedStrength)` pulls them back in XY only (Z/depth untouched), reaching full ramp at `comfortRadius + rampWidth` (700) — safely inside the ~2550-unit visible radius at this camera height/FOV. Wired into the draw loop as `viewBoundary.applyAll(school)`, after `flock()` and before `update()`. Also reduced `maxVelocity` 25→10 and `maxSteerForce` 40→20 so the school reads as swimming rather than darting. Documented in `classes.md` (folder map + Key Relationships).

### Addendum (2026-07-05) — Frozen flock investigation + `wander3d`/`wander2d`

After running Sprint 1 for a while, the user reported the canvas fully froze — every fish came to a dead stop — and asked (a) whether the avoid/separate forces were inadequate, and (b) for a new noise-driven "wander" force so paths curve organically instead of running dead straight once a fish has no flocking neighbors.

- [x] Investigate the freeze — is `separate()` inadequate?

  - Files read: `src/classes/MarkMakingEntities/Extensible/Vehicle.ts` (`separate()`, `update()`), `src/classes/EntityManagement/Extensible/VehicleCollection.ts` (`flock()`)
  - **Finding:** Yes — two compounding issues, both in shared `Vehicle`/`VehicleCollection` code (not fish-specific, left as-is since they're used across the whole codebase; documented instead in `p5-vehicles.md` for future canvases):
    1. `VehicleCollection.flock()`'s bare defaults (`separateMultiplier=0.5`, `alignMultiplier=5`, `cohereMultiplier=5`) weight cohesion/alignment 10× over separation. Our `school.flock(neighborDistance)` call in Sprint 1 used exactly these defaults.
    2. `Vehicle.separate()`'s repulsion doesn't actually scale up with proximity — it accumulates `unit_diff / d` per close neighbor, then rescales the sum by `sumOfDistance / count` at the end, which cancels almost all of the earlier `1/d` growth. Net effect: separation force is roughly constant-magnitude regardless of how close neighbors get, so it's easily and permanently overpowered by the much stronger align/cohere pull.
  - Combined with `Vehicle.update()`'s numerical-stability guard (`velocity.mag() < 1e-5` snaps velocity to exactly `(0,0,0)`), a tightly-clustered sub-group can reach a genuine stable fixed point — identical positions and velocities among neighbors produce exactly zero net steering force, which stays zero forever. That is what "froze."

- [x] Rebalance the fish flock call

  - File: `src/components/FishInTheSeaCanvas.vue`
  - **Done:** `school.flock(neighborDistance, separateMultiplier, alignMultiplier, cohereMultiplier)` now passes explicit `2 / 1.2 / 1` (separation weighted highest) instead of the library defaults. Also set `fish.desiredSeparation = 120` per fish (up from the `Vehicle` default of 40) so separation activates at a wider radius, before fish can converge to near-identical positions.

- [x] Add `Vehicle.wander3d()` / `Vehicle.wander2d()` + `VehicleCollection.wander3dAll()` / `wander2dAll()`

  - Files: `src/classes/MarkMakingEntities/Extensible/Vehicle.ts`, `src/classes/EntityManagement/Extensible/VehicleCollection.ts`
  - **Done:** `wander3d(options?)` steers toward a point that ambles across the surface of a sphere projected `distance` ahead of the vehicle (default 60) with radius `radius` (default 40); the wander point is persisted on the vehicle (`wanderDirection3d`) and takes a small step across the sphere surface each frame — a tangent-plane vector whose angle and magnitude are each sampled from smoothly-evolving Perlin noise (`p5.noise`, keyed by `frameCount × noiseScale + per-vehicle random seed`) and capped at `maxArcLength` (default 8 world units) — then `seek()`s toward the resulting world point. All options are optional; calling `wander3d()` with no arguments works. `wander2d(options?)` is the same idea confined to a circle: it persists a single angle (`wanderAngle2d`) and steps it by a noise-driven, `maxArcLength`-capped delta, then builds the target via the existing `Circle.getPointOnCircle()` (reusing the Geometry `Circle` class rather than reimplementing circle-point math). `wander2d`'s circle plane defaults to perpendicular to the vehicle's current travel direction (normal = travel direction, positioned `distance` ahead) but accepts an explicit `coordinateSystem` override. Both are general-purpose additions to the shared `Vehicle`/`VehicleCollection` classes, not fish-specific. `VehicleCollection.wander3dAll(options?)`/`wander2dAll(options?)` forEach the per-vehicle methods. `duplicate()` needed no changes — a duplicated vehicle's wander fields start `null`/unset via its own constructor, so copies get independent, decorrelated wander motion automatically. Documented in `classes.md` (Key Relationships) and `p5-vehicles.md` (new "Wander" section + a caveat note on `flock()`'s default multiplier imbalance).

- [x] Wire `wander3d` into the fish canvas for organic curvature
  - File: `src/components/FishInTheSeaCanvas.vue`
  - **Done:** `school.wander3dAll({ radius: 300, distance: 400, maxArcLength: 40, multiplier: 0.6, noiseScale: 0.005 })` called each frame, after `flock()` and before `viewBoundary.applyAll(school)`/`update()`. This also acts as a safety net against the freeze scenario above — a wander target is essentially never exactly at the vehicle's own position, so the steering force is never exactly zero, which prevents the velocity-threshold snap-to-zero fixed point from ever being reached even if flocking forces alone somehow converge again.

---

## Sprint 2 — Fish glyph (`VehicleFishRenderer`) ⬜

**Goal:** Replace the placeholder dots with the specified fish glyph: a circle at the head (current position) and a line pointing opposite the velocity.
**Rationale:** Early so every later behavior is visually legible. Depends only on Sprint 1.
**Sources:** [SE] / [CD] (both proposed the composed renderer; [AR] agreed once the fixed-forward-tail semantics were confirmed).

### Tasks

- [ ] Create `VehicleFishRenderer`

  - File: `src/classes/Rendering/VehicleRenderers/VehicleFishRenderer.ts` (new)
  - Change: A `VehicleRenderer` that **composes** (owns as private fields) an internal `LineRenderer` and `DotRenderer` — it does NOT extend either, and issues NO raw p5 draw calls. Per vehicle: head point = `v.coords`; tail point = `P5.Vector.sub(head, v.phys.forward.copy().setMag(tailLength))`; hand the head to the internal `DotRenderer` (head circle) and the head→tail `Line` to the internal `LineRenderer` (body). Expose `renderVehicles(vehicles)` returning `this`, plus public mutable `tailLength`, `headSize` (dot size), `strokeWeightValue`, `color`, `referenceDistance` (pass-throughs to the internal renderers).
  - Context: `v.phys.forward` is rebuilt normalized every `update()` from velocity (`coordSystem` is rebuilt via `fromOriginAndNormal(pos+vel, velocity)`), so `-forward` is the fish's swim direction with no history lag. Do NOT use `VehicleLineRenderer` — it draws current→history (a trail), which is the wrong glyph. Every renderer must bottom out in a GeometryRenderer (`p5-rendering.md`); composition satisfies that because a fish needs two primitives.

- [ ] (Optional, reactive) Velocity-scaled tail length

  - File: `VehicleFishRenderer.ts` + draw loop
  - Change: Optionally scale `tailLength` by `v.phys.velocity.mag()` so fast fish streak and stalled fish collapse to a dot. Gate behind a param/flag; default on. This is polish, not core.
  - Context: [CD] notes this visually sells the Sprint 5 "slow to a stop" behavior. The fixed forward-tail already satisfies the spec — only add if it reads well.

- [ ] Swap the renderer into the canvas

  - File: `src/components/FishInTheSeaCanvas.vue`
  - Change: Replace the `VehicleDotRenderer` placeholder with `VehicleFishRenderer` in `setup`/`draw`.

- [ ] Document the new renderer
  - Files: `.claude/rules/classes.md` and `.claude/rules/p5-rendering.md`
  - Change: Add `VehicleFishRenderer` to both folder maps (one-line description in the terse neighbor style) and add a Key Relationships bullet: "`VehicleFishRenderer` composes an internal `LineRenderer` (body) + `DotRenderer` (head); reads `v.phys.forward` for orientation."

---

## Sprint 3 — Density-adaptive schooling (`FishSchoolCollection`) ⬜

**Goal:** Fish break away from the swarm when locally crowded (>20 neighbors) and slow toward a stop when in a pack (>5 neighbors), both as smooth ramps.
**Rationale:** The behavioral heart of the piece and the part that stops it looking like generic boids. Sequenced before the barrier so the schooling dynamics are tuned in open water first. Depends on the octree-visibility change.
**Sources:** [SE] / [CD] / [AR] (all three; unanimous on one collection subclass, one neighbor query, smoothstep ramps).

### Tasks

- [ ] Promote `requireOcTree()` to `protected`

  - File: `src/classes/EntityManagement/Extensible/VehicleCollection.ts`
  - Change: Change `requireOcTree()` from `private` to `protected` so the subclass can reuse one neighbor pass. Leave `vehiclesInRange()` private unless the override genuinely needs it — keep the surface change minimal.
  - Context: Rebuilding a second octree per frame in the subclass would duplicate work and diverge from the base's documented flat-Z handling. This is the one intentional visibility seam.

- [ ] Create `FishSchoolCollection extends VehicleCollection`

  - File: `src/classes/EntityManagement/VehicleCollections/FishSchoolCollection.ts` (new)
  - Change: Mirror the `BranchingCollection` precedent (`src/classes/EntityManagement/VehicleCollections/BranchingCollection.ts`). Add a `FishSchoolCollectionProps` interface + `createGenericFishSchoolCollectionProps()` factory with: `crowdRadius`, `breakawayCount` (default 20), `breakawayStrength`, `packCount` (default 5), `packBrakeStrength`. Override `update()` to run ONE octree neighbor pass per vehicle before `super.update()`, and from each vehicle's neighbor **count** drive both behaviors:
    - **Breakaway (>20):** scale the separation multiplier upward via a smoothstep ramp as count overshoots `breakawayCount`, then `vehicle.separate(neighborCoords, scaledMult)`.
    - **Pack braking (>5):** ramp a velocity-opposing brake (`−velocity × k`, same shape as the existing `applyFriction`, gated on pack size) up via smoothstep as count passes `packCount`.
  - Context: **Both ramps MUST be smoothstep, not hard switches at 20/5**, or the school visibly "pops" at the thresholds — this is the single highest-risk detail for the underwater feel. One shared neighbor query serves flocking + breakaway + braking.

- [ ] Swap the base collection for `FishSchoolCollection` in the canvas

  - File: `src/components/FishInTheSeaCanvas.vue`
  - Change: Replace the plain `VehicleCollection` with `FishSchoolCollection`; keep the `flock()` call, then rely on the override for density behavior. Preserve force ordering: `flock() → (density in update) → ... → update()`.

- [ ] Document the new collection
  - File: `.claude/rules/classes.md`
  - Change: Add `FishSchoolCollection` to the folder map, add an Extension Pattern note (following the `MyCollection` example), and a Key Relationships bullet describing the single-neighbor-query density behavior. Note the `requireOcTree()` `private→protected` change in the relevant bullet.

---

## Sprint 4 — Soft depth barriers (`DepthSlab` Core force) ⬜

**Goal:** Two non-passable, non-bouncing depth planes (top close to camera at high Z, bottom far at low Z) that make fish slow, even out to match the plane, then drift along it until the flock pulls them away.
**Rationale:** Contains the school. Comes after schooling so the barrier is tuned against real flocking motion. Independent of Sprint 3 but easier to tune once schooling looks right.
**Sources:** [SE] / [CD] / [AR] (all three; unanimous it is a force, not geometry, and must not bounce).

### Tasks

- [ ] Create the `DepthSlab` Core force class

  - File: `src/classes/Core/DepthSlab.ts` (new)
  - Change: A field-force class sibling to `WindSystem`. Hold `topZ`, `bottomZ`, `influenceDistance`, `stiffness`, `normalDamping`. Add `DepthSlabProps` + `createGenericDepthSlabProps()`. `apply(vehicle)`: for each of the two planes, compute the signed Z-distance of `vehicle.coords`; only within `influenceDistance` of a plane, apply (a) a repulsion force along the plane normal (`−Z` for the top plane, `+Z` for the bottom) that grows via a smooth ramp as the fish approaches, and (b) a damping force that cancels the **Z-component of velocity** (`−velZ × normalDamping`). Add `applyAll(collection)` returning `this`.
  - Context: The damping (not repulsion alone) is what makes fish "slow down, even out to match" instead of bouncing. Only the Z (perpendicular) velocity component is damped — in-plane flocking velocity is left intact so the flock can still carry a fish along the wall. **Do NOT** use `Vehicle.avoid()` (it steers away from a point and reads as a bounce), a `Plane` geometry primitive, `BBox` containment, or reflection. Use `Vehicle.applyForce()` (it clamps by `maxSteerForce` and divides by mass). Apply before `update()`.

- [ ] Wire `DepthSlab` into the canvas draw loop

  - File: `src/components/FishInTheSeaCanvas.vue`
  - Change: Instantiate one `DepthSlab` at setup with the slab depth params; call `depthSlab.applyAll(collection)` each frame in force order: after `flock()`/density, before `update()`.

- [ ] Document `DepthSlab`
  - File: `.claude/rules/classes.md`
  - Change: Add `DepthSlab` under `Core/` in the folder map and a Key Relationships bullet ("`DepthSlab.applyAll(collection)` applies a soft, non-reflecting Z-barrier force; mirrors the `WindSystem` idiom").

---

## Sprint 5 — Planar preference (`Vehicle.dampAxis`) + organic polish ⬜

**Goal:** Fish prefer to swim in the XY plane (soft Z-velocity drag) but can still rise and dive when the flock does; add cheap organic touches so the motion reads as alive rather than mechanical.
**Rationale:** Refinement layer — the school should already be contained and behaving before adding the planar bias. Small, reusable Vehicle-layer addition.
**Sources:** [CD] (soft force) / [AR] (Vehicle-layer home / `dampAxis`); [SE]'s `CameraPlaneConstraint` was rejected as redundant under the world-Z pin.

### Tasks

- [ ] Add `Vehicle.dampAxis(axis, strength)`

  - File: `src/classes/MarkMakingEntities/Extensible/Vehicle.ts`
  - Change: Add a public `dampAxis(worldAxis: P5.Vector, strength: number): this` that applies a force `∝ −(velocity · axisUnit) × axisUnit × strength` — a soft, velocity-proportional restoring drag along the given world axis. Mutates and chains; JSDoc it.
  - Context: For planar preference, pass world `+Z` and a tunable strength. Soft, not a hard lock. Do NOT use `addPersistentSteerForce` (constant vectors can't express a velocity-dependent drag) and do NOT revive the dead `constrainMovementOrthogonally` flag. Low strength = fish gently level out but follow the school up/down under cohesion; high strength = nearly flat schooling.

- [ ] Apply the Z-drag in the canvas draw loop

  - File: `src/components/FishInTheSeaCanvas.vue`
  - Change: Each frame, for the collection, apply `dampAxis(worldZ, planarStrength)` before `update()` (after barrier). If a batch helper is cleaner, add a thin `dampAxisAll` to `VehicleCollection` mirroring the other `*All` methods — otherwise iterate.
  - Context: Keep the per-frame call in force order: `flock() → density → barrier → planar drag → update()`.

- [ ] Organic touches (cheap, high-value first)

  - File: `src/components/FishInTheSeaCanvas.vue` (+ optional `NoiseSystem` usage)
  - Change: Ensure randomized initial XY velocities (from Sprint 1) and a smooth per-frame turn clamp (`maxPitchAdjustment`/`maxVelocity`) are tuned. Optionally add a gentle `NoiseSystem` "current" force (low noise scale, small output magnitude) gated behind a reactive strength defaulting to low/zero so it doesn't fight the flocking read.
  - Context: These prevent the pure-boids "computational" look. The noise current is a nice-to-have; don't let it dominate.

- [ ] Document `dampAxis` (and `dampAxisAll` if added)
  - File: `.claude/rules/classes.md` / `.claude/rules/p5-vehicles.md`
  - Change: Note the new soft-axis-damping method in the Vehicle relationships / forces section.

---

## Sprint 6 — Parameterize + final wiring ⬜

**Goal:** Every meaningful control exposed via the canvas-scripts, split correctly between init-only and reactive, wired with `toRef` and per-frame push into the class instances; colors driven from the store.
**Rationale:** Last, once the full behavior set exists and the meaningful parameter ranges are known. Mechanical and scripted.
**Sources:** [SE] / [CD] / [AR]

### Tasks

- [ ] Add init-only parameters (`--reactive false`)

  - Command examples (run for each): `npm run create-slider -- fish-in-the-sea fish-count 100 150 200 --step 1 --reactive false`; sliders for `top-z`, `bottom-z` (slab depth / camera framing), and spawn spread box; a `create-input` seed if desired.
  - Context: These only make sense at setup — changing them live requires re-seeding. Slab depth also drives the free depth cue (near fish render larger via distance scaling), so make it comfortably deep.

- [ ] Add reactive parameters (init overlay + toolbar)

  - Commands (`create-slider`, one per param): `neighbor-distance`, `separation-strength`, `alignment-strength`, `cohesion-strength`, `max-velocity`, `planar-strength`, `breakaway-count` (default 20) + `breakaway-strength`, `pack-count` (default 5) + `pack-brake-strength`, `barrier-influence` + `barrier-stiffness` + `barrier-damping`, `head-size`, `tail-length`, `stroke-weight`. Add `npm run create-color-picker -- fish-in-the-sea fish-color <hex>` if not using the store `primaryColor`.
  - Context: Exposing the 20 and 5 thresholds as sliders is worth it — the aesthetic sweet spot (school "boils" vs "mills") is only findable by eye and interacts with fish count and neighbor radius. Use the same min/max/step in overlay and toolbar. For sub-unit params set `--step` an order of magnitude below the value.

- [ ] Push reactive props into class instances each frame

  - File: `src/components/FishInTheSeaCanvas.vue`
  - Change: Follow the `spring-grids.vue` pattern — read each reactive prop via `toRef(props, ...)` (the `create-*` scripts add the `defineProps`/`toRef` wiring) and, in `p5.draw`, push `.value`s into the `FishSchoolCollection` props, `DepthSlab` fields, `VehicleFishRenderer` fields, and the planar `dampAxis` strength. Watch the store `primaryColor` and update renderer `color` (like `SpringGridsCanvas.vue`).
  - Context: `toRef` keeps refs in sync with props, so reading `.value` in `draw()` always returns the current value — no `watch` needed except for color.

- [ ] Final documentation sweep
  - File: `.claude/rules/classes.md` (+ `p5-rendering.md`)
  - Change: Confirm all four new artifacts (`VehicleFishRenderer`, `FishSchoolCollection`, `DepthSlab`, `Vehicle.dampAxis`) are documented per the New Class Procedures — folder map, key relationships, extension pattern for `FishSchoolCollection`. Run `npm run type-check` and `npm run lint`.

---

## Deferred / explicitly out of scope

- `Camera3D` basis getters (`getForward/getRight/getCameraUp`) — no consumer once depth is pinned to world Z. Revisit only if an oblique/arbitrary view is later requested.
- `CameraPlaneConstraint` class — redundant with world-Z `dampAxis`.
- `Fish extends Vehicle` — no per-agent state justifies it (YAGNI).
- `Plane` geometry primitive / `BBox` containment / reflection-bounce barriers — a barrier is a force, not a shape.
- Reviving `Vehicle.constrainMovementOrthogonally` — dead flag; hard lock looks mechanical.
