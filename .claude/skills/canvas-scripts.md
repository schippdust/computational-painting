# Canvas Scripts

Scaffold, parameterize, and delete canvas iterations using the `npm run` scripts in `scripts/` — never hand-write these mechanics (a new canvas's boilerplate, a parameter's four wiring points, a canvas's removal from the registry) when a script already does it atomically and consistently.

**Invoke when:** the user asks to create/scaffold a new canvas, add or edit a canvas parameter (slider, numeric input, or color picker), or delete/remove a canvas — whether they name the npm script directly or just describe the outcome (e.g. "add a friction slider to spring-grids", "get rid of the old-experiment canvas").

---

## Creating a New Canvas

```bash
npm run new-canvas -- <kebab-name> ["description"] [--group "Group Name"] [--template blank|<source-kebab>]
# e.g.
npm run new-canvas -- wind-particles "Particles steered by curl noise" --group "Wind Fields"
```

- `--template blank` (default) — minimal boilerplate with a `VehicleDotRenderer` stub, ready for `setup`/`draw` TODOs.
- `--template <source-kebab>` — clones an existing canvas's component + page verbatim, substituting every name reference. Use this when the request is "a variant of X" rather than a blank sketch.
- No `--group` → placed in "Uncategorized".

Creates three things: `src/components/<PascalName>Canvas.vue` (sketch boilerplate or clone), `src/pages/<kebab-name>.vue` (route page with `CanvasToolbar` + `CanvasInitOverlay`), and a registry entry in `src/canvasRegistry.ts` (drives the landing-page gallery). The route is live at `http://localhost:3000/<kebab-name>` as soon as the dev server is running. Aborts without writing anything if any target file already exists.

## Renaming a Canvas

```bash
npm run rename-canvas -- <current-kebab> [new-kebab] [--group "New Group"]
# e.g.
npm run rename-canvas -- spring-grids spring-lattice
npm run rename-canvas -- spring-grids --group "Lattice Experiments"  # group-only update
```

Renames the component file, page file, and registry `id`/`title` together, updating internal references (element id, import, tag) in both files. Omitting `[new-kebab]` (or passing the current name) updates only the registry `group` — no files are renamed. Aborts without writing anything if the source doesn't exist, a target already exists, or the registry doesn't contain the old id.

## Adding / Editing Canvas Parameters

Each parameter type has a `create-*` script (add) and an `edit-*` script (modify in place), plus one shared `delete-param` for all types. All operate on an existing canvas by its kebab route name.

### Create

```bash
npm run create-slider -- <canvas> <name> <min> <value> <max> [--step N] [--reactive false]
npm run create-input -- <canvas> <name> <value> [--reactive false]
npm run create-color-picker -- <canvas> <name> [default-hex] [--reactive false]
```

Each adds, in one step: a `ref` in the page script, the prop binding on the canvas tag, a control in the init overlay (always), a control in the toolbar menu (unless `--reactive false`), and the `defineProps`/`toRef` wiring in the component. `--reactive false` makes the parameter init-only — set once before the canvas starts, not live-adjustable. This matches the "Add a parameter" convention in [p5-patterns.md](../rules/p5-patterns.md).

Examples:

```bash
npm run create-slider -- branching-upward friction 0 0.2 1
npm run create-input -- spring-grids grid-size 20
npm run create-color-picker -- branching-upward accent-color #ff6600
npm run create-slider -- my-canvas max-agents 0 1000 5000 --reactive false
```

### Edit

```bash
npm run edit-slider -- <canvas> <name> [--name new-name] [--min N] [--max N] [--value N] [--step N] [--reactive true|false]
npm run edit-input -- <canvas> <name> [--name new-name] [--value N] [--reactive true|false]
npm run edit-color-picker -- <canvas> <name> [--name new-name] [--value '#rrggbb'] [--reactive true|false]
```

At least one option is required. `--name` renames the parameter everywhere (code name + visual label) in one pass — don't hand-rename a parameter across the four wiring points. `--reactive` moves a parameter between the toolbar (`true`) and init-only (`false`) after the fact.

### Delete

```bash
npm run delete-param -- <canvas> <name>
```

Detects the parameter's type automatically and removes all four wiring points (page ref, canvas tag prop, init overlay control, toolbar menu control, component prop/toRef) plus the `defineProps` block entirely if it's left empty.

## Deleting a Canvas

```bash
npm run delete-canvas -- <kebab-name> --yes
# e.g.
npm run delete-canvas -- old-experiment --yes
```

Removes the canvas's component, page, and registry entry together. **Omitting `--yes` is a dry run** — it prints exactly what would be deleted and changes nothing, since this isn't reversible outside git. Deletes whatever pieces it finds even if some are already missing (e.g. a registry entry with no matching component file).
