# Computational Painters Canvas — Claude Guide

A generative art application where physics-driven agents leave permanent marks on a 2D canvas as they traverse 3D space. Visual complexity accumulates over time rather than existing all at once — think of it as time-lapse drawing rather than real-time rendering.

## Rules Files

| File | Contents |
|------|----------|
| [Architecture](.claude/rules/architecture.md) | Tech stack, app structure, data flow, drawing philosophy |
| [Conventions](.claude/rules/conventions.md) | TypeScript/Vue style, naming, method chaining, JSDoc |
| [Classes](.claude/rules/classes.md) | Class hierarchy, folder anatomy, extension patterns |
| [p5 Patterns](.claude/rules/p5-patterns.md) | p5.js usage patterns specific to this project |

## Commands

```bash
npm run dev        # start Vite dev server
npm run build      # type-check + build
npm run type-check # vue-tsc only
npm run lint       # ESLint with auto-fix
npm run format     # Prettier
```

## Quick Orientation

- Canvas components live in `src/components/` — each is a self-contained p5 sketch mounted on `onMounted`
- Pages in `src/pages/` use file-based routing (unplugin-vue-router); `index.vue` gates on `appStore.initialized`
- All class logic is in `src/classes/` — see the Classes rules file for the folder breakdown
- The Pinia store (`src/stores/app.ts`) is the bridge between Vue and p5: it holds `Camera3D`, canvas dimensions, and pause state
