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
npm run new-canvas -- <kebab-name> ["description"]
# e.g.
npm run new-canvas -- wind-particles "Particles steered by curl noise wind fields"
```

Scaffolds a component, a route page, and a registry entry in one step. See [CLAUDE.md](CLAUDE.md) for details.

## Project Documentation

The `.claude/` directory contains detailed technical documentation for this codebase:

| File                                          | Contents                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                        | Top-level guide: quick orientation, commands, scaffolding                   |
| [Architecture](.claude/rules/architecture.md) | Drawing philosophy, tech stack, data flow, folder structure, Pinia store    |
| [Conventions](.claude/rules/conventions.md)   | TypeScript and Vue style, naming, method chaining, JSDoc patterns           |
| [Classes](.claude/rules/classes.md)           | Full class hierarchy, folder anatomy, extension patterns, key relationships |
| [p5 Patterns](.claude/rules/p5-patterns.md)   | p5.js instance mode, canvas size, coordinate systems, noise/randomness      |

## Key Concepts

**Why p5.js instead of Three.js?** The output is a persistent 2D canvas — marks accumulate frame by frame without limit. Three.js redraws from GPU state each frame and cannot cheaply represent unlimited accumulating detail. p5.js retains everything ever drawn, so visual density is bounded only by time.

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
| Routing             | unplugin-vue-router (file-based) |
