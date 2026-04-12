# Coding Conventions

## Vue SFCs

- `<script setup lang="ts">` **always comes before** `<template>` — no exceptions.
- Use `defineProps` / `defineEmits` / `storeToRefs` patterns from Composition API.
- Auto-imports are active for Vue Composition API (`ref`, `computed`, `onMounted`, etc.) — no explicit import needed.
- Component names in templates are kebab-case by convention (`<computational-canvas />`).

## TypeScript

- Use constructor parameter shorthand for class properties:
  ```ts
  constructor(private sketch: P5, public dotSize: number = 5) {}
  ```
- Prefer `const` over `let` wherever the binding is not reassigned.
- Use `type` imports for interfaces that are only needed at compile time: `import type { WindSystem } from '...'`
- Use `@/` path alias for all imports from `src/` (not relative `../../`).
- `P5.Vector` (capital P5, static class) is used throughout — not `p5.Vector`.

## Class Design

- **Method chaining**: mutating methods return `this`. Document this consistently in JSDoc:
  > "This method mutates the instance and returns it for method chaining."
- **Factory functions**: default property objects use `createGeneric*()` naming:
  ```ts
  export function createGenericPhysicalProps(): VehiclePhysicalProps { ... }
  ```
- **Extensible base classes** live in `Extensible/` subfolders and are designed to be subclassed. Concrete implementations live in sibling files or subfolders.
- **Static factory constructors** are preferred over complex constructor overloads:
  ```ts
  CoordinateSystem.fromOriginAndNormal(origin, normal);
  CoordinateSystem.fromOriginNormalX(origin, normal, xAxis);
  ```

## JSDoc

Every public method and constructor should have a JSDoc block. Standard format:

```ts
/**
 * One-line summary.
 * Extended explanation if needed.
 * @param paramName Description
 * @returns Description of return value
 */
```

Mark methods that mutate-and-chain explicitly. Mark pure/side-effect-free methods where relevant.

## p5 Usage

- Always use **instance mode**: `new P5(sketch, element)` — never global mode.
- The p5 instance is passed as `sketch: P5` to class constructors that need canvas access.
- Keep all p5 canvas setup and draw logic inside the `onMounted` callback of Vue components.
- Use `p5.push()` / `p5.pop()` to isolate drawing state changes within renderer methods.

## Naming

- Class files: `PascalCase.ts`
- Interface/type files: co-located with their primary class
- Props interfaces: `*Props` suffix (e.g., `BranchingCollectionProps`, `LineGeneratorProps`)
- Store files: camelCase (`app.ts`)
- Vue components: camelCase filename, kebab-case in templates
