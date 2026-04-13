# Computational Painters Canvas — Claude Guide

A generative art application where physics-driven agents leave permanent marks on a 2D canvas as they traverse 3D space. Visual complexity accumulates over time rather than existing all at once — think of it as time-lapse drawing rather than real-time rendering.

## Rules Files

| File                                          | Contents                                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [Architecture](.claude/rules/architecture.md) | Tech stack, app structure, data flow, drawing philosophy                                                                           |
| [Conventions](.claude/rules/conventions.md)   | TypeScript/Vue style, naming, method chaining, JSDoc                                                                               |
| [Classes](.claude/rules/classes.md)           | Class hierarchy, folder anatomy, extension patterns                                                                                |
| [p5 Patterns](.claude/rules/p5-patterns.md)   | p5.js usage patterns specific to this project                                                                                      |
| [p5 Vehicles](.claude/rules/p5-vehicles.md)   | Vehicle/VehicleCollection physics pipeline, force ordering, springs, lifetime, flat-grid caveats                                   |
| [p5 Rendering](.claude/rules/p5-rendering.md) | Renderer folder layout, GeometryRenderers vs VehicleRenderers vs PhysicsRenderers, distance scaling, camera projection, draw order |

## Commands

```bash
npm run dev        # start Vite dev server
npm run build      # type-check + build
npm run type-check # vue-tsc only
npm run lint       # ESLint with auto-fix
npm run format     # Prettier
```

## Scaffolding a New Canvas

Use the `new-canvas` script to create a new iteration in one step:

```bash
npm run new-canvas -- <kebab-name> ["description"] [--group "Group Name"]
# e.g.
npm run new-canvas -- wind-particles "Particles steered by curl noise" --group "Wind Fields"
npm run new-canvas -- branching-lines --group "Branching Spheres"
npm run new-canvas -- my-canvas   # no --group → placed in "Uncategorized"
```

This creates three things:

1. **`src/components/<PascalName>Canvas.vue`** — p5 sketch boilerplate with `setup`/`draw`/`keyPressed` stubs, camera + store wiring, pause sync watcher, `defineExpose` for stats, and a frame counter. Fill in the `TODO` sections.
2. **`src/pages/<kebab-name>.vue`** — full-viewport route page with `CanvasToolbar` on the left, `CanvasInitOverlay` shown until the user confirms canvas settings, and the canvas component mounted after.
3. **Registry entry in `src/canvasRegistry.ts`** — drives the gallery on the landing page (`/`). The `group` field clusters this iteration under its theme in the accordion gallery.

The route is live immediately at `http://localhost:3000/<kebab-name>` once the dev server is running. The script will abort without writing anything if any of the target files already exist.

## Renaming a Canvas

Use the `rename-canvas` script to rename an existing iteration in one step:

```bash
npm run rename-canvas -- <current-kebab> <new-kebab> [--group "New Group"]
# e.g.
npm run rename-canvas -- spring-grids spring-lattice
npm run rename-canvas -- spring-grids spring-lattice --group "Lattice Experiments"
```

What gets updated:

1. **`src/components/<OldPascal>Canvas.vue`** — renamed to `src/components/<NewPascal>Canvas.vue`; internal element IDs updated.
2. **`src/pages/<old-kebab>.vue`** — renamed to `src/pages/<new-kebab>.vue`; import and component tag updated.
3. **Registry entry in `src/canvasRegistry.ts`** — `id`, `title`, and optionally `group` are replaced in place.

The script will abort without writing anything if the source files don't exist, the targets already exist, or the registry doesn't contain the old id.

## Quick Orientation

- Canvas components live in `src/components/` — each is a self-contained p5 sketch mounted on `onMounted`
- Pages in `src/pages/` use file-based routing (unplugin-vue-router); `index.vue` gates on `appStore.initialized`
- All class logic is in `src/classes/` — see the Classes rules file for the folder breakdown
- The Pinia store (`src/stores/app.ts`) is the bridge between Vue and p5: it holds `Camera3D`, canvas dimensions, and pause state
