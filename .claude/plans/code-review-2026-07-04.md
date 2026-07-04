# Code Review — Development Plan
*Generated: 2026-07-04*
*Request: Full code review of the entire codebase by the Development Team (Architect, Software Engineer, Computational Designer)*

## Summary
Three parallel agents reviewed the entire source tree. This plan addresses a latent runtime crash in `SpringGridsCanvas`, a silent no-op UI parameter, two logic bugs in `BranchingCollection`, and a broad sweep of dead code, duplicated utilities, and class-layer purity violations. Work is organized from highest urgency (crashes, silent bugs) through cleanup, utility consolidation, physics correctness, and renderer architecture alignment. Total: 6 sprints, approximately 30 discrete tasks.

---

## Sprint 1 — Crash Fixes and Silent Bugs
**Goal:** Eliminate two runtime failures and two logic bugs that produce incorrect behavior silently.
**Rationale:** These items are product-breaking or silently corrupt artist intent. They must ship before any other work.
**Sources:** [AR] [SE] [CD]

### Tasks

- [ ] Fix fatal crash in `SpringGridsCanvas`: vehicles expire at frame 250
  - File: `src/components/SpringGridsCanvas.vue`, lines ~127–134
  - Change: Replace `v.lifeExpectancy = 250` with `v.lifeExpectancy = Infinity` in the post-`gen.populate()` loop that iterates over `gen.grid` rows and vehicles. There are two nested `for...of` loops — both must be updated.
  - Context: `VehicleCollection.update()` culls vehicles when `age >= lifeExpectancy`. When all grid vehicles die at frame 250, the collection becomes empty. The next spatial query (e.g. `springVehicles.arrive()`) triggers `buildOcTree()` on an empty array, which throws `"Cannot construct OcTree with no vehicles"` and permanently crashes the draw loop. Spring grids are persistent simulations; `Infinity` is the documented correct value.

- [ ] Fix silent no-op: `attractorStrength` prop slider has zero effect in `SpringGridsCanvas`
  - File: `src/components/SpringGridsCanvas.vue` (draw loop, approx. line 170–200)
  - Change: Find the call to `springVehicles.arrive(springAttractors, props.attractorRange)` in `p5.draw`. The `arrive()` method signature is `arrive(target, awarenessDistance?)` and does not accept a strength multiplier. Switch to `springVehicles.seek(springAttractors, props.attractorStrength, props.attractorRange)` so the strength slider is actually wired.
  - Context: The prop `attractorStrength` is declared in `defineProps`, passed from the page, and exposed in the toolbar slider — but the draw loop never uses its value. `seek(target, multiplier, awarenessDistance)` is the correct method for strength-scaled attraction. Verify that `toRef(props, 'attractorStrength')` is also created alongside the existing `attractorRange` toRef.

- [ ] Fix `BranchingCollection` lifeExpectancy formula — missing parenthesis
  - File: `src/classes/EntityManagement/VehicleCollections/BranchingCollection.ts`, line ~134
  - Change: Find the line assigning `branch.lifeExpectancy`. Current code: `vehicle.lifeExpectancy * Math.random() * 0.5 + 0.75`. Correct to: `vehicle.lifeExpectancy * (Math.random() * 0.5 + 0.75)`. This ensures branches live between 75%–125% of the parent's remaining life, not between `0.75` and `parentLife * 0.5 + 0.75`.
  - Context: The additive `+0.75` outside the multiply makes branches at low `lifeExpectancy` values live nearly as long as the parent (not proportionally shorter), and at `Infinity` the formula still works accidentally. The parenthesis makes the intent clear and correct.

- [ ] Fix `Vehicle.update()` wasted `translateCoordinateSystem` call
  - File: `src/classes/MarkMakingEntities/Extensible/Vehicle.ts`, lines ~257–262
  - Change: Find `translateCoordinateSystem(velocity)` immediately followed by `CoordinateSystem.fromOriginAndNormal(this.coords, this.phys.velocity)`. Remove the `translateCoordinateSystem(velocity)` call — the subsequent `fromOriginAndNormal` reconstructs the entire coordinate system from `this.coords` position and velocity direction, discarding the translated result anyway.
  - Context: `this.coords` holds the vehicle's world position (updated by the translation loop above). `fromOriginAndNormal` creates a fresh basis from that position, so the intermediate translate into the old coordinate system is a no-op that allocates matrix objects for nothing. Before removing, verify no subclass of `Vehicle` overrides `update()` in a way that reads `coordSystem` between the translate and the reconstruct.

---

## Sprint 2 — Dead Code Sweep
**Goal:** Remove all dead files, dead imports, dead fields, and commented-out code that contribute no value.
**Rationale:** This is pure noise reduction. Low risk, high signal-to-noise payoff. All items are confirmed unused.
**Sources:** [SE] [AR] [CD]

### Tasks

- [ ] Delete `MovingBrushstrokes_Old.ts`
  - File: `src/classes/EntityManagement/MovingBrushstrokes_Old.ts`
  - Change: Delete the file entirely. No tracked source file imports it.
  - Context: Explicitly labelled `_Old`, predates the VehicleCollection/Wind architecture, lives outside the documented folder structure. Git history preserves it.

- [ ] Delete orphaned canvas component stubs with no pages or registry entries
  - Files: `src/components/ellipticalTestCanvas.vue`, `src/components/funShapesCanvas.vue`, `src/components/gridBlowingInWind.vue`, `src/components/initializationInputs.vue`
  - Change: Delete all four files. Confirm none appear in `src/canvasRegistry.ts` or `src/pages/` before deleting.
  - Context: These components have no corresponding page routes and no registry entries. They are invisible to users and only confuse readers of the components folder.

- [ ] Remove `console.log('building oc tree')` from hot path
  - File: `src/classes/EntityManagement/Extensible/VehicleCollection.ts`, line ~83
  - Change: Delete the `console.log('building oc tree')` line inside `buildOcTree()`.
  - Context: `buildOcTree()` is called lazily after every `update()` call that is followed by a spatial query. At 40fps this emits 40+ console messages per second, flooding DevTools and masking all other debug output.

- [ ] Remove dead `branches` field and its no-op `forEach` loop from `BranchingCollection`
  - File: `src/classes/EntityManagement/VehicleCollections/BranchingCollection.ts`
  - Change: Find `public branches: VehicleCollection[]` declaration and remove it. Find the `this.branches.forEach(branch => branch.update())` call in `update()` and remove it. Nothing ever pushes into `branches`.
  - Context: The field was likely intended for a hierarchical branching design that was replaced by pushing new vehicles directly into `this.vehicles`. It is `public` despite having no external consumers, and iterating an empty array on every frame is a documentation hazard.

- [ ] Remove dead import `{ dot } from 'mathjs'` from three branching canvases
  - Files: `src/components/BranchingSpheresCanvas.vue` line ~19, `src/components/BranchingUpwardCanvas.vue` line ~19, `src/components/BranchingUpward2Canvas.vue` line ~19
  - Change: Delete the `import { dot } from 'mathjs'` line in each file. `dot` is not called anywhere in any of these files.
  - Context: Confirmed unused by all three reviewers. Copy-paste artifact from a shared template origin.

- [ ] Remove dead import `{ he } from 'vuetify/locale'` from SpringGridsCanvas
  - File: `src/components/SpringGridsCanvas.vue`, line ~14
  - Change: Delete the `import { he } from 'vuetify/locale'` line.
  - Context: The Hebrew locale string is unused. Almost certainly a scaffolding accident.

- [ ] Remove empty mouse event stubs from three canvas components
  - Files: `src/components/BranchingSpheresCanvas.vue`, `src/components/BranchingUpwardCanvas.vue`, `src/components/BranchingUpward2Canvas.vue`
  - Change: In each file, find and delete the three no-op event handlers inside `p5.keyPressed` or the sketch closure: `p5.mousePressed = () => {}`, `p5.mouseDragged = () => {}`, `p5.mouseReleased = () => {}`.
  - Context: These register three event listeners per sketch that do nothing. Also check whether the `new-canvas` scaffolding script (`scripts/new-canvas.ts` or similar) generates these stubs — if so, remove them from the template so future canvases don't start with them.

- [ ] Remove commented-out code blocks in canvas components
  - Files: `src/components/BranchingUpwardCanvas.vue`, `src/components/BranchingUpward2Canvas.vue`, `src/components/BranchingSpheresCanvas.vue`, `src/components/SpringGridsCanvas.vue`
  - Change: Read each file and delete commented-out variable declarations (e.g. `// let generationSpheres`, `// let silhouettesRendered`), commented-out imports (e.g. `// import { Circle } from ...`), and commented-out draw calls (e.g. `// dotRenderer?.renderVehicles(...)`). Preserve any comment that explains *why* something is done differently, not just what was removed.
  - Context: Confirmed in multiple files. Commented-out draw calls and variable declarations serve no purpose once an iteration has stabilized.

---

## Sprint 3 — Shared Utilities and Class Layer Purity
**Goal:** Extract the duplicated `hexToRgb` into the existing `Color.ts` stub, and fix `DrawingUtils.ts` reaching into Pinia at module load time.
**Rationale:** These two items reduce a 6-site duplication to 1, and eliminate a fragile module-level side effect that violates the class-layer / Vue-layer separation documented in the architecture rules.
**Sources:** [SE] [AR] [CD]

### Tasks

- [ ] Implement `hexToRgb` in `src/classes/Core/Color.ts` and replace all inline copies
  - File (write): `src/classes/Core/Color.ts`
  - File (update × 6+): Every `*Canvas.vue` component that contains `const hexToRgb = ...`
  - Change: Add a named export to `Color.ts`: `export function hexToRgb(hex: string): [number, number, number]` using the same regex logic currently copy-pasted across canvas components (`/#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i`, parse as base-16, return `[r, g, b]`, fallback to `[255, 255, 255]`). Then in each canvas component that defines its own inline `hexToRgb`, delete the local definition and add `import { hexToRgb } from '@/classes/Core/Color'`.
  - Context: `Color.ts` currently exists as a stub. The function is byte-for-byte identical in at least 6 canvas files: `BranchingSpheresCanvas.vue`, `BranchingUpwardCanvas.vue`, `BranchingUpward2Canvas.vue`, `SpringGridsCanvas.vue`, `MeshOcclusionTestCanvas.vue`, `WorldEventTracking1Canvas.vue`. Run `grep -r "hexToRgb" src/` to find any additional occurrences.

- [ ] Fix `DrawingUtils.ts` — move Pinia store access inside the function body
  - File: `src/classes/Rendering/DrawingUtils.ts`
  - Change: Lines ~3–6 call `useAppStore()` and `storeToRefs(appStore)` at module top level, capturing `pauseCanvas`. Move both calls inside the `pressSpaceToPause(p5)` function body so they execute lazily (inside a Vue app context), not at import time.
  - Context: Pinia's `useStore()` composables require an active Pinia instance. Calling them at module load time means any import of `DrawingUtils` from outside a mounted Vue component (a test, a script, a future Node utility) will throw `"No active Pinia"`. The class-layer architecture explicitly forbids Vue/Pinia imports in renderer and utility classes — this is the one violation. After the fix, `pressSpaceToPause` reads `const appStore = useAppStore(); const { pauseCanvas } = storeToRefs(appStore)` on every call, which is negligible overhead.

---

## Sprint 4 — Physics Pipeline Correctness
**Goal:** Fix two physics behavioral issues and add a safety ergonomic to GridGenerator.
**Rationale:** These items affect the quality and correctness of the art output — either changing the mark-making behavior unexpectedly or creating conditions for the frame-250 crash to recur in future canvases.
**Sources:** [AR] [CD]

### Tasks

- [ ] Add `immortal` option to `GridGenerator` to prevent lifeExpectancy boilerplate
  - File: `src/classes/Generators/InstanceGenerators/GridGenerator.ts`
  - Change: Add an `immortal?: boolean` field to `GridGeneratorProps` (default `false`). In `GridGenerator.populate(collection)`, after adding each vehicle to the collection, if `props.immortal === true`, set `vehicle.lifeExpectancy = Infinity`. This replaces the post-populate boilerplate loop in `SpringGridsCanvas.vue`.
  - Context: Every spring-grid canvas must currently run nested `for...of` loops after `gen.populate()` to set `lifeExpectancy = Infinity` on every vehicle. Forgetting this causes the frame-250 crash fixed in Sprint 1. Putting the option in the generator makes the safe path the easy path. After adding this, update `SpringGridsCanvas.vue` to pass `immortal: true` in `GridGeneratorProps` and remove the manual loops.

- [ ] Fix `BranchingCollection.update()` — reorder to allow end-of-life branching
  - File: `src/classes/EntityManagement/VehicleCollections/BranchingCollection.ts`, method `update()`
  - Change: Currently: (1) `super.update()` culls dead vehicles, then (2) the branching loop runs on the surviving vehicles. Restructure to: (1) snapshot `this.vehicles` before culling, (2) run the branching loop over the snapshot, (3) call `super.update()`. This ensures vehicles at the end of their life still get a chance to branch before being culled.
  - Context: `super.update()` calls `vehicle.update()` and then filters out vehicles where `age >= lifeExpectancy`. The branching formula is weighted toward older vehicles (higher probability). If a vehicle reaches end-of-life, it is already removed before branching fires on it — the highest-probability branching moment is never reached. **Caveat:** After this change, verify the visual output of `BranchingSpheresCanvas` and `BranchingUpwardCanvas` — the new branches will have their forces applied one frame later (they are created before `super.update()` runs). This is expected and should be aesthetically imperceptible, but confirm before shipping.

- [ ] Cache `Camera3D` orthonormal basis to avoid per-call recomputation
  - File: `src/classes/Core/Camera3D.ts`
  - Change: Add three private fields: `private _forward: P5.Vector`, `private _right: P5.Vector`, `private _up: P5.Vector`, and `private _basisDirty = true`. In `project()`, replace the inline forward/right/up computation with a check: if `_basisDirty`, recompute and cache, then set `_basisDirty = false`. In `setPosition()`, `lookAt()`, and `setFOV()`, set `_basisDirty = true`.
  - Context: Lines ~76–80 of `Camera3D.project()` recompute `forward`, `right`, and `camUp` via `P5.Vector.sub`, `.normalize()`, and `.cross()` on every call. At 1000 vehicles × 40fps this is 40,000 redundant basis computations per second. The basis only changes when camera position or look-at changes — which is typically once per frame at most, not once per vehicle. The Pinia store wraps the camera in `markRaw()` specifically because this is a known hot path. **Caveat:** If a canvas animates the camera position inside the draw loop (e.g. `camera.setPosition(...)` every frame), `_basisDirty` will be set and cleared each frame — identical performance to today, no regression.

---

## Sprint 5 — Renderer Architecture Alignment
**Goal:** Fix the three renderer violations of the established architecture rules: push/pop batching, delegation hierarchy, and internal sync pattern.
**Rationale:** These bring the renderer layer into compliance with its own stated design rules and prevent the same violations from being treated as valid precedents in future renderers.
**Sources:** [SE] [AR] [CD]

### Tasks

- [ ] Batch push/pop in `DotRenderer.renderPoints()` — one pair per batch, not per point
  - File: `src/classes/Rendering/GeometryRenderers/DotRenderer.ts`
  - Change: Move `p5.push()` and `p5.noStroke()` outside the loop. Move `p5.pop()` after the loop. Inside the loop, call `p5.fill(r, g, b)` and `p5.ellipse(...)` only — no push/pop per iteration.
  - Context: Currently every dot draw wraps in its own `push()`/`pop()` pair. At 1000 vehicles × 40fps = 40,000 state save/restore pairs/second on a large canvas. Fill and stroke settings are constant across the entire batch (same color, `noStroke()`), so only size changes per point — which does not require state save/restore. **Caveat:** This is safe only if `DotRenderer` guarantees uniform color per `renderPoints()` call. If a subclass needs per-point color variation, it must override `renderPoints()` with its own push/pop logic. Add a comment to the class marking this assumption.

- [ ] Refactor `TaperingCircleRenderer` to extend `DotRenderer` or delegate for distance scaling
  - File: `src/classes/Rendering/VehicleRenderers/VehicleTaperingCircleRenderer.ts`
  - Change: The class currently reimplements the distance-scaling formula `(dotSize * referenceDistance) / distanceToCamera` inline. At minimum, extract a protected method `scaledSize(worldPos: P5.Vector): number` on `DotRenderer` and call it from `TaperingCircleRenderer`. Alternatively, extend `DotRenderer` and override `renderPoints()` to implement the tapering trail rendering with history lookup. The goal is that the distance-scaling formula exists in exactly one place.
  - Context: The architecture rules state: "every renderer — geometry, vehicle, or physics — should ultimately draw by calling a GeometryRenderer. No renderer other than a GeometryRenderer should issue raw p5 draw calls directly." `TaperingCircleRenderer` issues raw `p5.ellipse()` calls and independently replicates the scaling math. Also note the class file is named `VehicleTaperingCircleRenderer.ts` but the internal class is named `TaperingCircleRenderer` — align the class name with the filename.

- [ ] Move `SpringRenderer` construction inside `p5.setup()` in `SpringGridsCanvas`
  - File: `src/components/SpringGridsCanvas.vue`, lines ~179–184
  - Change: Find `const springRenderer = new SpringRenderer(...)` inside the `sketch(p5)` closure but outside `p5.setup = () => {...}`. Move this line (and any companion initialization) inside the `p5.setup` block, alongside all other renderer constructions.
  - Context: All other renderer instances in all canvas components are constructed inside `p5.setup()`. This one exception deviates from the convention documented in the p5 patterns rules and will confuse future canvas authors about the correct location for renderer initialization. In practice it works because `p5` is available as a closure argument, but it runs before the canvas element is created.

- [ ] Fix `SpringRenderer` — eliminate the dual-source-of-truth for `LineRenderer` properties
  - File: `src/classes/Rendering/PhysicsRenderers/SpringRenderer.ts`
  - Change: Find the `syncLineRendererProps()` method (or equivalent inline property re-assignment) called at the top of `renderSprings()`. Instead, make `SpringRenderer.color`, `SpringRenderer.camera`, `SpringRenderer.strokeWeightValue`, and `SpringRenderer.referenceDistance` use get/set accessors that forward directly to the internal `LineRenderer`. Remove the sync method.
  - Context: Currently `SpringRenderer` holds its own copies of these properties and copies them into `lineRenderer` on every render call. This creates two mutable sources of truth that must be kept in sync manually. The get/set proxy pattern (used by other mesh renderers) is the established alternative: the outer class doesn't store the value at all — it just forwards reads and writes to the inner renderer.

---

## Sprint 6 — System-Level Stability
**Goal:** Fix two cross-canvas state issues that will cause silent interference as the codebase grows: the global `p5.noiseDetail()` conflict and the Pinia store state bleeding across navigation.
**Rationale:** Both issues are latent rather than currently breaking, but both will cause hard-to-debug failures once a second canvas uses `NoiseSystem` + `WindSystem` simultaneously, or once users navigate between canvases with different dimensions.
**Sources:** [AR] [CD]

### Tasks

- [ ] Fix `NoiseSystem` and `WindSystem` global `p5.noiseDetail()` conflict
  - Files: `src/classes/Core/NoiseSystem.ts` (line ~83, ~95, ~136), `src/classes/Core/WindSystem.ts` (line ~56)
  - Change: In `NoiseSystem`, move the `p5.noiseDetail()` call from the property setters (`set octaves(...)`, `set falloff(...)`) into the `sample()` method. Call `p5.noiseDetail(this._octaves, this._falloff)` at the top of `sample()` before sampling. Do the same in `WindSystem.calculateWindAtCoords()`. This way each system re-applies its own settings immediately before each use, rather than trying to hold global state.
  - Context: `p5.noiseDetail()` is a global p5 setting. If `NoiseSystem` (octaves=5) and `WindSystem` (octaves=4) both exist, the last `set` call wins globally — both systems sample with whichever octave count was most recently written. `WorldEventTracking1Canvas` already uses both simultaneously. The per-sample call overhead is trivial (it sets two integers) and eliminates the conflict entirely. Add a JSDoc note on both classes explaining that `p5.noiseDetail()` is re-applied on each sample call for isolation.

- [ ] Extend `resetInitialization()` in the Pinia store to reset canvas dimensions and camera
  - File: `src/stores/app.ts`
  - Change: Find the `resetInitialization()` action. Currently it resets only `initialized` and `pauseCanvas`. Add resets for `canvasWidth`, `canvasHeight` (to their default values, e.g. 4600×4600), and `camera` (reset `Camera3D` to its default position/lookAt). Also audit whether `cameraInitPos` is a store field or a canvas-local variable — if it's in the store, reset it too.
  - Context: Pages like `spring-grids.vue` call `canvasDims(6000, 6000)` in `onMounted`, setting global store dimensions to spring-grid-specific values. If the user navigates back to the gallery and opens a different canvas, the store still holds the spring-grid dimensions. The next canvas reads these in `p5.setup()` via `canvasWidth.value` / `canvasHeight.value` and creates a 6000×6000 canvas instead of its intended size. Extending `resetInitialization()` closes this gap. Verify each canvas page's `onMounted` to confirm which store fields it writes, and ensure all of them are reset.
