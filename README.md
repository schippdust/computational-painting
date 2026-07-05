# Computational Painters Canvas

A generative art application where physics-driven agents leave permanent marks on a 2D canvas as they traverse 3D space. Visual complexity accumulates over time — marks are never cleared, so the canvas is a growing record of every agent's path rather than a snapshot of the current scene.

Built with Vue 3, p5.js, and TypeScript.

## Getting Started

```bash
npm install
npm run dev       # dev server at http://localhost:3000
npm run build     # type-check + production build
npm run type-check
npm run lint
npm run format
```

## Creating a New Canvas

```bash
npm run new-canvas -- <kebab-name> ["description"] [--group "Group Name"]
# e.g.
npm run new-canvas -- wind-particles "Particles steered by curl noise wind fields" --group "Wind Fields"
```

Scaffolds a component, a route page, and a registry entry in one step.

```bash
npm run rename-canvas -- <current-kebab> [new-kebab] [--group "New Group"]
```

Renames an existing canvas's component, page, and registry entry together (or just re-groups it if no new name is given). See the [Canvas Scripts](.claude/skills/canvas-scripts.md) skill for full details on all of these scripts, including the parameter family below.

```bash
npm run delete-canvas -- <kebab-name> --yes
```

Removes a canvas's component, page, and registry entry together. Running it without `--yes` prints what would be deleted and makes no changes — a dry run by default, since deletion isn't reversible outside of git.

## Adding Canvas Parameters

A family of scripts adds or edits a live-adjustable parameter (component prop, toolbar control, and init-overlay control) on an existing canvas in one step:

```bash
npm run create-slider -- <canvas> <name> <min> <value> <max> [--step N] [--reactive false]
npm run create-input -- <canvas> <name> <value> [--reactive false]
npm run create-color-picker -- <canvas> <name> [default-hex] [--reactive false]
npm run edit-slider -- <canvas> <name> [--min N] [--max N] [--step N] [--value N]
npm run edit-input -- <canvas> <name> [--value V]
npm run edit-color-picker -- <canvas> <name> [--default-hex '#rrggbb']
npm run delete-param -- <canvas> <name>
```

`--reactive false` makes a parameter init-only (set once before the canvas starts, not live-adjustable). See [p5 Patterns](.claude/rules/p5-patterns.md) for the underlying convention these scripts follow.

## Project Documentation

The `.claude/` directory contains detailed technical documentation for this codebase:

| File                                          | Contents                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                        | Top-level guide: quick orientation, commands, scaffolding                                                 |
| [Architecture](.claude/rules/architecture.md) | Drawing philosophy, tech stack, data flow, folder structure, Pinia store                                  |
| [Conventions](.claude/rules/conventions.md)   | TypeScript and Vue style, naming, method chaining, JSDoc patterns                                         |
| [Classes](.claude/rules/classes.md)           | Class hierarchy, folder anatomy, library preference, composability, extension patterns, key relationships |
| [p5 Patterns](.claude/rules/p5-patterns.md)   | p5.js instance mode, canvas size, coordinate systems, noise/randomness, adding parameters                 |
| [p5 Vehicles](.claude/rules/p5-vehicles.md)   | Vehicle/VehicleCollection physics pipeline, force ordering, springs, lifetime                             |
| [p5 Rendering](.claude/rules/p5-rendering.md) | Renderer folder layout, distance scaling, camera projection, draw order                                   |

There's also a **Development Team** skill (`.claude/skills/development-team.md`) — say "ask the team to..." or "code review" to spawn Architect / Software Engineer / Computational Designer agents in parallel and get a sprint plan saved to `.claude/plans/`.

## Key Concepts

**Why p5.js instead of Three.js for drawing?** The output is a persistent 2D canvas — marks accumulate frame by frame without limit. Three.js redraws from GPU state each frame and cannot cheaply represent unlimited accumulating detail. p5.js retains everything ever drawn, so visual density is bounded only by time. Three.js is still used internally (see `src/classes/Mesh/`) for mesh-specific geometry work — BVH raycasting, silhouette/wireframe extraction — but its output is always converted back to p5 `Line`/`P5.Vector` primitives before anything is drawn to the canvas.

**Agents ("vehicles")** move through 3D world space using Reynolds steering (seek, flock, separate, align) and other physical modifiers, leaving marks based on their properties at each draw loop.

## Tech Stack

| Layer               | Library                          |
| ------------------- | -------------------------------- |
| UI framework        | Vue 3 (Composition API)          |
| Language            | TypeScript ~5.8                  |
| Build               | Vite 6                           |
| State               | Pinia 3                          |
| Canvas / simulation | p5.js 2.x (instance mode)        |
| UI components       | Vuetify 4                        |
| Math / matrices     | mathjs                           |
| 3D mesh geometry    | three.js + three-mesh-bvh        |
| Color utilities     | d3 (`d3-color`)                  |
| Routing             | unplugin-vue-router (file-based) |
