# Code Review — Development Plan

_Generated: 2026-07-04_
_Request: Full code review of the entire codebase by the Development Team (Architect, Software Engineer, Computational Designer)_

## Summary

Three parallel agents reviewed the entire source tree. This plan addresses a latent runtime crash in `SpringGridsCanvas`, a silent no-op UI parameter, two logic bugs in `BranchingCollection`, and a broad sweep of dead code, duplicated utilities, and class-layer purity violations. Work is organized from highest urgency (crashes, silent bugs) through cleanup, utility consolidation, physics correctness, and renderer architecture alignment. Total: 6 sprints, approximately 30 discrete tasks.

---

## Sprint 1 — Crash Fixes and Silent Bugs ✅ _Completed 2026-07-04_

**Goal:** Eliminate two runtime failures and two logic bugs that produce incorrect behavior silently.
**Rationale:** These items are product-breaking or silently corrupt artist intent. They must ship before any other work.
**Sources:** [AR] [SE] [CD]

### Tasks

- [x] Fix fatal crash in `SpringGridsCanvas`: vehicles expire at frame 250

  - File: `src/components/SpringGridsCanvas.vue`, lines ~127–134
  - Change: Replace `v.lifeExpectancy = 250` with `v.lifeExpectancy = Infinity` in the post-`gen.populate()` loop that iterates over `gen.grid` rows and vehicles. There are two nested `for...of` loops — both must be updated.
  - Context: `VehicleCollection.update()` culls vehicles when `age >= lifeExpectancy`. When all grid vehicles die at frame 250, the collection becomes empty. The next spatial query (e.g. `springVehicles.arrive()`) triggers `buildOcTree()` on an empty array, which throws `"Cannot construct OcTree with no vehicles"` and permanently crashes the draw loop. Spring grids are persistent simulations; `Infinity` is the documented correct value.
  - **Done:** Changed `v.lifeExpectancy = 250` → `v.lifeExpectancy = Infinity` in the triple-nested `for...of` loop in `SpringGridsCanvas.vue` (~line 130).

- [x] Fix silent no-op: `attractorStrength` prop slider has zero effect in `SpringGridsCanvas`

  - File: `src/components/SpringGridsCanvas.vue` (draw loop, approx. line 170–200)
  - Change: Find the call to `springVehicles.arrive(springAttractors, props.attractorRange)` in `p5.draw`. The `arrive()` method signature is `arrive(target, awarenessDistance?)` and does not accept a strength multiplier. Switch to `springVehicles.seek(springAttractors, props.attractorStrength, props.attractorRange)` so the strength slider is actually wired.
  - Context: The prop `attractorStrength` is declared in `defineProps`, passed from the page, and exposed in the toolbar slider — but the draw loop never uses its value. `seek(target, multiplier, awarenessDistance)` is the correct method for strength-scaled attraction. Verify that `toRef(props, 'attractorStrength')` is also created alongside the existing `attractorRange` toRef.
  - **Done:** Replaced `springVehicles.arrive(springAttractors, props.attractorRange)` with `springVehicles.seek(springAttractors, props.attractorStrength, props.attractorRange)`. Props are accessed directly via the reactive `props` object — no `toRef` wrapper needed since the draw loop reads `.value` at call time.

- [x] Fix `BranchingCollection` lifeExpectancy formula — missing parenthesis

  - File: `src/classes/EntityManagement/VehicleCollections/BranchingCollection.ts`, line ~134
  - Change: Find the line assigning `branch.lifeExpectancy`. Current code: `vehicle.lifeExpectancy * Math.random() * 0.5 + 0.75`. Correct to: `vehicle.lifeExpectancy * (Math.random() * 0.5 + 0.75)`. This ensures branches live between 75%–125% of the parent's remaining life, not between `0.75` and `parentLife * 0.5 + 0.75`.
  - Context: The additive `+0.75` outside the multiply makes branches at low `lifeExpectancy` values live nearly as long as the parent (not proportionally shorter), and at `Infinity` the formula still works accidentally. The parenthesis makes the intent clear and correct.
  - **Done:** Added parentheses: `vehicle.lifeExpectancy * (Math.random() * 0.5 + 0.75)`.

- [x] Fix `Vehicle.update()` wasted `translateCoordinateSystem` call
  - File: `src/classes/MarkMakingEntities/Extensible/Vehicle.ts`, lines ~257–262
  - Change: Find `translateCoordinateSystem(velocity)` immediately followed by `CoordinateSystem.fromOriginAndNormal(this.coords, this.phys.velocity)`. Remove the `translateCoordinateSystem(velocity)` call — the subsequent `fromOriginAndNormal` reconstructs the entire coordinate system from `this.coords` position and velocity direction, discarding the translated result anyway.
  - Context: `this.coords` holds the vehicle's world position (updated by the translation loop above). `fromOriginAndNormal` creates a fresh basis from that position, so the intermediate translate into the old coordinate system is a no-op that allocates matrix objects for nothing. Before removing, verify no subclass of `Vehicle` overrides `update()` in a way that reads `coordSystem` between the translate and the reconstruct.
  - **Done:** Replaced the two-step `translateCoordinateSystem(velocity)` + `fromOriginAndNormal(this.coords, velocity)` with a single `fromOriginAndNormal(P5.Vector.add(this.coords, this.phys.velocity), this.phys.velocity)`. This computes the new position directly, skipping the intermediate mutation. Equivalent behavior — no subclass reads `coordSystem` between the two lines.

---

## Sprint 2 — Dead Code Sweep ✅ _Completed 2026-07-04_

**Goal:** Remove all dead files, dead imports, dead fields, and commented-out code that contribute no value.
**Rationale:** This is pure noise reduction. Low risk, high signal-to-noise payoff. All items are confirmed unused.
**Sources:** [SE] [AR] [CD]

### Tasks

- [x] Delete `MovingBrushstrokes_Old.ts`

  - File: `src/classes/EntityManagement/MovingBrushstrokes_Old.ts`
  - Change: Delete the file entirely. No tracked source file imports it.
  - Context: Explicitly labelled `_Old`, predates the VehicleCollection/Wind architecture, lives outside the documented folder structure. Git history preserves it.
  - **Done:** File deleted. Confirmed no imports in any tracked source file.

- [x] Delete orphaned canvas component stubs with no pages or registry entries

  - Files: `src/components/ellipticalTestCanvas.vue`, `src/components/funShapesCanvas.vue`, `src/components/gridBlowingInWind.vue`, `src/components/initializationInputs.vue`
  - Change: Delete all four files. Confirm none appear in `src/canvasRegistry.ts` or `src/pages/` before deleting.
  - Context: These components have no corresponding page routes and no registry entries. They are invisible to users and only confuse readers of the components folder.
  - **Done:** All four files deleted. Verified absence from `canvasRegistry.ts` before deletion.

- [x] Remove `console.log('building oc tree')` from hot path

  - File: `src/classes/EntityManagement/Extensible/VehicleCollection.ts`, line ~83
  - Change: Delete the `console.log('building oc tree')` line inside `buildOcTree()`.
  - Context: `buildOcTree()` is called lazily after every `update()` call that is followed by a spatial query. At 40fps this emits 40+ console messages per second, flooding DevTools and masking all other debug output.
  - **Done:** Log line removed from `VehicleCollection.buildOcTree()`.

- [x] Remove dead `branches` field and its no-op `forEach` loop from `BranchingCollection`

  - File: `src/classes/EntityManagement/VehicleCollections/BranchingCollection.ts`
  - Change: Find `public branches: VehicleCollection[]` declaration and remove it. Find the `this.branches.forEach(branch => branch.update())` call in `update()` and remove it. Nothing ever pushes into `branches`.
  - Context: The field was likely intended for a hierarchical branching design that was replaced by pushing new vehicles directly into `this.vehicles`. It is `public` despite having no external consumers, and iterating an empty array on every frame is a documentation hazard.
  - **Done:** Removed `public branches: VehicleCollection[] = []` declaration and the `this.branches.forEach(...)` call at the end of `update()`.

- [x] Remove dead import `{ dot } from 'mathjs'` from three branching canvases

  - Files: `src/components/BranchingSpheresCanvas.vue` line ~19, `src/components/BranchingUpwardCanvas.vue` line ~19, `src/components/BranchingUpward2Canvas.vue` line ~19
  - Change: Delete the `import { dot } from 'mathjs'` line in each file. `dot` is not called anywhere in any of these files.
  - Context: Confirmed unused by all three reviewers. Copy-paste artifact from a shared template origin.
  - **Done:** Import line deleted from all three files.

- [x] Remove dead import `{ he } from 'vuetify/locale'` from SpringGridsCanvas

  - File: `src/components/SpringGridsCanvas.vue`, line ~14
  - Change: Delete the `import { he } from 'vuetify/locale'` line.
  - Context: The Hebrew locale string is unused. Almost certainly a scaffolding accident.
  - **Done:** Import line deleted.

- [x] Remove empty mouse event stubs from three canvas components

  - Files: `src/components/BranchingSpheresCanvas.vue`, `src/components/BranchingUpwardCanvas.vue`, `src/components/BranchingUpward2Canvas.vue`
  - Change: In each file, find and delete the three no-op event handlers inside `p5.keyPressed` or the sketch closure: `p5.mousePressed = () => {}`, `p5.mouseDragged = () => {}`, `p5.mouseReleased = () => {}`.
  - Context: These register three event listeners per sketch that do nothing. Also check whether the `new-canvas` scaffolding script (`scripts/new-canvas.ts` or similar) generates these stubs — if so, remove them from the template so future canvases don't start with them.
  - **Done:** Removed all three no-op handlers from each of the three canvas files. Checked `scripts/new-canvas.mjs` — the blank template does not generate mouse stubs, so no script change needed.

- [x] Remove commented-out code blocks in canvas components
  - Files: `src/components/BranchingUpwardCanvas.vue`, `src/components/BranchingUpward2Canvas.vue`, `src/components/BranchingSpheresCanvas.vue`, `src/components/SpringGridsCanvas.vue`
  - Change: Read each file and delete commented-out variable declarations (e.g. `// let generationSpheres`, `// let silhouettesRendered`), commented-out imports (e.g. `// import { Circle } from ...`), and commented-out draw calls (e.g. `// dotRenderer?.renderVehicles(...)`). Preserve any comment that explains _why_ something is done differently, not just what was removed.
  - Context: Confirmed in multiple files. Commented-out draw calls and variable declarations serve no purpose once an iteration has stabilized.
  - **Done:** Removed commented-out sphere variable declarations and constants from `BranchingUpwardCanvas` and `BranchingUpward2Canvas`; removed `// branchingCollection.applyWind(...)` and stale context comments from `BranchingSpheresCanvas`; removed `// p5.background(...)` and two `// dotRenderer?.renderVehicles(...)` lines from `SpringGridsCanvas`. Retained the "Render every 3rd frame to improve performance..." comment in `SpringGridsCanvas` as it explains a non-obvious throttling decision.

---

## Sprint 3 — Shared Utilities and Class Layer Purity ✅ _Completed 2026-07-04_

**Goal:** Extract the duplicated `hexToRgb` into the existing `Color.ts` stub, and fix `DrawingUtils.ts` reaching into Pinia at module load time.
**Rationale:** These two items reduce a 6-site duplication to 1, and eliminate a fragile module-level side effect that violates the class-layer / Vue-layer separation documented in the architecture rules.
**Sources:** [SE] [AR] [CD]

### Tasks

- [x] Implement `hexToRgb` in `src/classes/Core/Color.ts` and replace all inline copies

  - File (write): `src/classes/Core/Color.ts`
  - File (update × 6+): Every `*Canvas.vue` component that contains `const hexToRgb = ...`
  - Change: Add a named export to `Color.ts`: `export function hexToRgb(hex: string): [number, number, number]` using the same regex logic currently copy-pasted across canvas components (`/#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i`, parse as base-16, return `[r, g, b]`, fallback to `[255, 255, 255]`). Then in each canvas component that defines its own inline `hexToRgb`, delete the local definition and add `import { hexToRgb } from '@/classes/Core/Color'`.
  - Context: `Color.ts` currently exists as a stub. The function is byte-for-byte identical in at least 6 canvas files: `BranchingSpheresCanvas.vue`, `BranchingUpwardCanvas.vue`, `BranchingUpward2Canvas.vue`, `SpringGridsCanvas.vue`, `MeshOcclusionTestCanvas.vue`, `WorldEventTracking1Canvas.vue`. Run `grep -r "hexToRgb" src/` to find any additional occurrences.
  - **Done:** Added `export function hexToRgb(...)` to `Color.ts` with JSDoc. Grep found 7 files (plan estimated 6+; `SphereEmissionCanvas.vue` was the additional one). Removed the local definition from all 7 canvas components and replaced each with `import { hexToRgb } from '@/classes/Core/Color'`.

- [x] Fix `DrawingUtils.ts` — move Pinia store access inside the function body
  - File: `src/classes/Rendering/DrawingUtils.ts`
  - Change: Lines ~3–6 call `useAppStore()` and `storeToRefs(appStore)` at module top level, capturing `pauseCanvas`. Move both calls inside the `pressSpaceToPause(p5)` function body so they execute lazily (inside a Vue app context), not at import time.
  - Context: Pinia's `useStore()` composables require an active Pinia instance. Calling them at module load time means any import of `DrawingUtils` from outside a mounted Vue component (a test, a script, a future Node utility) will throw `"No active Pinia"`. The class-layer architecture explicitly forbids Vue/Pinia imports in renderer and utility classes — this is the one violation. After the fix, `pressSpaceToPause` reads `const appStore = useAppStore(); const { pauseCanvas } = storeToRefs(appStore)` on every call, which is negligible overhead.
  - **Done:** Moved `const appStore = useAppStore()` and `const { pauseCanvas } = storeToRefs(appStore)` from module top-level into the body of `pressSpaceToPause()`. Imports for `useAppStore` and `storeToRefs` remain at the top of the file. Added a brief comment noting that the function is always called inside a mounted component context.

---

## Sprint 4 — Physics Pipeline Correctness ✅ _Completed 2026-07-04_

**Goal:** Fix two physics behavioral issues and add a safety ergonomic to GridGenerator.
**Rationale:** These items affect the quality and correctness of the art output — either changing the mark-making behavior unexpectedly or creating conditions for the frame-250 crash to recur in future canvases.
**Sources:** [AR] [CD]

### Tasks

- [x] Add `immortal` option to `GridGenerator` to prevent lifeExpectancy boilerplate

  - File: `src/classes/Generators/InstanceGenerators/GridGenerator.ts`
  - Change: Add an `immortal?: boolean` field to `GridGeneratorProps` (default `false`). In `GridGenerator.populate(collection)`, after adding each vehicle to the collection, if `props.immortal === true`, set `vehicle.lifeExpectancy = Infinity`. This replaces the post-populate boilerplate loop in `SpringGridsCanvas.vue`.
  - Context: Every spring-grid canvas must currently run nested `for...of` loops after `gen.populate()` to set `lifeExpectancy = Infinity` on every vehicle. Forgetting this causes the frame-250 crash fixed in Sprint 1. Putting the option in the generator makes the safe path the easy path. After adding this, update `SpringGridsCanvas.vue` to pass `immortal: true` in `GridGeneratorProps` and remove the manual loops.
  - **Done:** Added `immortal?: boolean` to `GridGeneratorProps` with JSDoc explaining the crash risk. Destructured it in `populate()` (default `false`); vehicles are now created as `const v = new Vehicle(...)` and `v.lifeExpectancy = Infinity` is set when `immortal` is true. Updated `SpringGridsCanvas.vue` to pass `immortal: true` in the props object and removed `v.lifeExpectancy = Infinity` from the post-populate loop; the loop remains for `v.env.friction = 0.04`.

- [x] Fix `BranchingCollection.update()` — reorder to allow end-of-life branching

  - File: `src/classes/EntityManagement/VehicleCollections/BranchingCollection.ts`, method `update()`
  - Change: Currently: (1) `super.update()` culls dead vehicles, then (2) the branching loop runs on the surviving vehicles. Restructure to: (1) snapshot `this.vehicles` before culling, (2) run the branching loop over the snapshot, (3) call `super.update()`. This ensures vehicles at the end of their life still get a chance to branch before being culled.
  - Context: `super.update()` calls `vehicle.update()` and then filters out vehicles where `age >= lifeExpectancy`. The branching formula is weighted toward older vehicles (higher probability). If a vehicle reaches end-of-life, it is already removed before branching fires on it — the highest-probability branching moment is never reached. **Caveat:** After this change, verify the visual output of `BranchingSpheresCanvas` and `BranchingUpwardCanvas` — the new branches will have their forces applied one frame later (they are created before `super.update()` runs). This is expected and should be aesthetically imperceptible, but confirm before shipping.
  - **Done:** Snapshot via `this.vehicles.slice()` is taken first. Branching loop runs over the snapshot; branching vehicles are removed and new branches added to `this.vehicles`. `super.update()` is called last, applying physics to new branches this same frame and culling any end-of-life vehicles. Removed stale inline comments from the loop body.

- [x] Cache `Camera3D` orthonormal basis to avoid per-call recomputation
  - File: `src/classes/Core/Camera3D.ts`
  - Change: Add three private fields: `private _forward: P5.Vector`, `private _right: P5.Vector`, `private _up: P5.Vector`, and `private _basisDirty = true`. In `project()`, replace the inline forward/right/up computation with a check: if `_basisDirty`, recompute and cache, then set `_basisDirty = false`. In `setPosition()`, `lookAt()`, and `setFOV()`, set `_basisDirty = true`.
  - Context: Lines ~76–80 of `Camera3D.project()` recompute `forward`, `right`, and `camUp` via `P5.Vector.sub`, `.normalize()`, and `.cross()` on every call. At 1000 vehicles × 40fps this is 40,000 redundant basis computations per second. The basis only changes when camera position or look-at changes — which is typically once per frame at most, not once per vehicle. The Pinia store wraps the camera in `markRaw()` specifically because this is a known hot path. **Caveat:** If a canvas animates the camera position inside the draw loop (e.g. `camera.setPosition(...)` every frame), `_basisDirty` will be set and cleared each frame — identical performance to today, no regression.
  - **Done:** Added `_forward`, `_right`, `_up` (initialized to empty vectors), and `_basisDirty = true` as private fields. Extracted `_rebuildBasis()` private method that recomputes all three and clears the flag. `project()` calls `_rebuildBasis()` when dirty, then reads from cache. `setPosition()`, `lookAt()`, and `setFOV()` each set `_basisDirty = true`. Cleaned up the redundant `pos = pos.copy()` / `focus = focus.copy()` intermediate variables in the setters while there.

---

## Sprint 5 — Renderer Architecture Alignment ✅ _Completed 2026-07-04_

**Goal:** Fix the three renderer violations of the established architecture rules: push/pop batching, delegation hierarchy, and internal sync pattern.
**Rationale:** These bring the renderer layer into compliance with its own stated design rules and prevent the same violations from being treated as valid precedents in future renderers.
**Sources:** [SE] [AR] [CD]

### Tasks

- [x] Batch push/pop in `DotRenderer.renderPoints()` — one pair per batch, not per point

  - File: `src/classes/Rendering/GeometryRenderers/DotRenderer.ts`
  - Change: Move `p5.push()` and `p5.noStroke()` outside the loop. Move `p5.pop()` after the loop. Inside the loop, call `p5.fill(r, g, b)` and `p5.ellipse(...)` only — no push/pop per iteration.
  - Context: Currently every dot draw wraps in its own `push()`/`pop()` pair. At 1000 vehicles × 40fps = 40,000 state save/restore pairs/second on a large canvas. Fill and stroke settings are constant across the entire batch (same color, `noStroke()`), so only size changes per point — which does not require state save/restore. **Caveat:** This is safe only if `DotRenderer` guarantees uniform color per `renderPoints()` call. If a subclass needs per-point color variation, it must override `renderPoints()` with its own push/pop logic. Add a comment to the class marking this assumption.
  - **Done:** Moved `push()`/`fill()`/`noStroke()` before the loop and `pop()` after it. Also extracted `protected scaledSize(worldPos)` for reuse by subclasses. Added JSDoc note on the uniform-color assumption.

- [x] Refactor `TaperingCircleRenderer` to extend `DotRenderer` or delegate for distance scaling

  - File: `src/classes/Rendering/VehicleRenderers/VehicleTaperingCircleRenderer.ts`
  - Change: The class currently reimplements the distance-scaling formula `(dotSize * referenceDistance) / distanceToCamera` inline. At minimum, extract a protected method `scaledSize(worldPos: P5.Vector): number` on `DotRenderer` and call it from `TaperingCircleRenderer`. Alternatively, extend `DotRenderer` and override `renderPoints()` to implement the tapering trail rendering with history lookup. The goal is that the distance-scaling formula exists in exactly one place.
  - Context: The architecture rules state: "every renderer — geometry, vehicle, or physics — should ultimately draw by calling a GeometryRenderer. No renderer other than a GeometryRenderer should issue raw p5 draw calls directly." `TaperingCircleRenderer` issues raw `p5.ellipse()` calls and independently replicates the scaling math. Also note the class file is named `VehicleTaperingCircleRenderer.ts` but the internal class is named `TaperingCircleRenderer` — align the class name with the filename.
  - **Done:** Class renamed to `VehicleTaperingCircleRenderer`, now extends `DotRenderer`. Uses `this.scaledSize()` (inherited) instead of inline formula. Per-step push/pop retained because alpha varies per trail segment.

- [x] Move `SpringRenderer` construction inside `p5.setup()` in `SpringGridsCanvas`

  - File: `src/components/SpringGridsCanvas.vue`, lines ~179–184
  - Change: Find `const springRenderer = new SpringRenderer(...)` inside the `sketch(p5)` closure but outside `p5.setup = () => {...}`. Move this line (and any companion initialization) inside the `p5.setup` block, alongside all other renderer constructions.
  - Context: All other renderer instances in all canvas components are constructed inside `p5.setup()`. This one exception deviates from the convention documented in the p5 patterns rules and will confuse future canvas authors about the correct location for renderer initialization. In practice it works because `p5` is available as a closure argument, but it runs before the canvas element is created.
  - **Done:** Declared `let springRenderer: SpringRenderer | null = null` in the closure scope. Construction moved into `p5.setup()`. Draw loop updated with `springRenderer &&` guard.

- [x] Fix `SpringRenderer` — eliminate the dual-source-of-truth for `LineRenderer` properties
  - File: `src/classes/Rendering/PhysicsRenderers/SpringRenderer.ts`
  - Change: Find the `syncLineRendererProps()` method (or equivalent inline property re-assignment) called at the top of `renderSprings()`. Instead, make `SpringRenderer.color`, `SpringRenderer.camera`, `SpringRenderer.strokeWeightValue`, and `SpringRenderer.referenceDistance` use get/set accessors that forward directly to the internal `LineRenderer`. Remove the sync method.
  - Context: Currently `SpringRenderer` holds its own copies of these properties and copies them into `lineRenderer` on every render call. This creates two mutable sources of truth that must be kept in sync manually. The get/set proxy pattern (used by other mesh renderers) is the established alternative: the outer class doesn't store the value at all — it just forwards reads and writes to the inner renderer.
  - **Done:** Replaced own property fields with get/set accessors for `color`, `camera`, `baseStrokeWeight`, and `referenceDistance`, each forwarding directly to `this.lineRenderer`. Removed the 4-line sync block from `renderSprings()`.

---

## Sprint 6 — System-Level Stability ✅ _Completed 2026-07-04_

**Goal:** Fix two cross-canvas state issues that will cause silent interference as the codebase grows: the global `p5.noiseDetail()` conflict and the Pinia store state bleeding across navigation.
**Rationale:** Both issues are latent rather than currently breaking, but both will cause hard-to-debug failures once a second canvas uses `NoiseSystem` + `WindSystem` simultaneously, or once users navigate between canvases with different dimensions.
**Sources:** [AR] [CD]

### Tasks

- [x] Fix `NoiseSystem` and `WindSystem` global `p5.noiseDetail()` conflict

  - Files: `src/classes/Core/NoiseSystem.ts`, `src/classes/Core/WindSystem.ts`
  - Change: In `NoiseSystem`, move the `p5.noiseDetail()` call from the property setters (`set octaves(...)`, `set falloff(...)`) into `sample()` and `sampleScalar()`. Removed from constructor too. In `WindSystem`, stored octaves/falloff as private fields in `setNoiseDetail()` (instead of applying immediately), and added `p5.noiseDetail()` call at the top of `calculateWindAtCoords()`. Each system re-applies its own settings immediately before each use.
  - Context: `p5.noiseDetail()` is a global p5 setting. If `NoiseSystem` (octaves=5) and `WindSystem` (octaves=4) both exist, the last `set` call wins globally — both systems sample with whichever octave count was most recently written. `WorldEventTracking1Canvas` already uses both simultaneously.
  - **Done:** `NoiseSystem._applyNoiseDetail()` is now called at the top of `sample()` and `sampleScalar()` only — removed from setters and constructor. `WindSystem` stores `_noiseOctaves`/`_noiseFalloff` and applies them via `p5.noiseDetail()` at the top of `calculateWindAtCoords()`. Both classes have JSDoc noting the per-call isolation pattern.

- [x] Extend `resetInitialization()` in the Pinia store to reset canvas dimensions and camera
  - File: `src/stores/app.ts`
  - Change: `resetInitialization()` now also resets `canvasWidth`/`canvasHeight` to 4600, `cameraInitPos`/`Target`/`FOV` to their defaults, and creates a fresh `Camera3D(4600, 4600)`.
  - Context: Pages like `spring-grids.vue` call `setCanvasDims(6000, 6000)` in `onMounted`, setting global store dimensions. If the user navigates back to the gallery and opens a different canvas, the store would retain those dimensions. All six canvas pages also write `cameraInitPos`/`Target`/`FOV` — these are now reset so each canvas starts from a clean slate.
  - **Done:** Added resets for `canvasWidth`, `canvasHeight`, `cameraInitPos`, `cameraInitTarget`, `cameraInitFOV`, and `camera` inside `resetInitialization()`.
