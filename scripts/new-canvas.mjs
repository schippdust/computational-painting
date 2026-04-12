#!/usr/bin/env node
/**
 * Scaffold a new computational canvas iteration.
 *
 * Usage:
 *   node scripts/new-canvas.mjs <kebab-name> [description words...]
 *   npm run new-canvas -- <kebab-name> [description words...]
 *
 * Examples:
 *   node scripts/new-canvas.mjs wind-particles "Particles steered by curl noise wind fields"
 *   node scripts/new-canvas.mjs branching-lines
 *
 * Creates:
 *   src/components/<PascalName>Canvas.vue   — p5 sketch boilerplate
 *   src/pages/<kebab-name>.vue              — route page with init gate
 *   Appends an entry to src/canvasRegistry.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ─── Arg parsing ──────────────────────────────────────────────────────────────

const [, , rawName, ...descWords] = process.argv;

if (!rawName) {
  console.error('Error: canvas name is required.\n');
  console.error(
    'Usage: node scripts/new-canvas.mjs <kebab-name> [description]',
  );
  process.exit(1);
}

// ─── Name transforms ──────────────────────────────────────────────────────────

function toKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase → camel-case
    .replace(/[\s_]+/g, '-') // spaces/underscores → hyphens
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, ''); // strip anything else
}

function toPascal(kebab) {
  return kebab
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function toTitle(kebab) {
  return kebab
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

const kebabName = toKebab(rawName);
const pascalName = toPascal(kebabName);
const title = toTitle(kebabName);
const description =
  descWords.join(' ') || `${title} — a new computational canvas iteration.`;
const today = new Date().toISOString().split('T')[0];
const canvasElementId = `${kebabName}-canvas`;

// ─── Guard: don't overwrite ───────────────────────────────────────────────────

const componentPath = resolve(root, `src/components/${pascalName}Canvas.vue`);
const pagePath = resolve(root, `src/pages/${kebabName}.vue`);

for (const p of [componentPath, pagePath]) {
  if (existsSync(p)) {
    console.error(`File already exists: ${p}\nAborting to avoid overwriting.`);
    process.exit(1);
  }
}

// ─── Canvas component ─────────────────────────────────────────────────────────
// Boilerplate includes: p5 instance mode setup, camera + store wiring, frame counter.
// The draw loop is intentionally empty — fill it in.

const componentContent = `\
<script setup lang="ts">
import P5 from 'p5';
import { pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

// Import side-effect overloads if you need v.scatter() / v.rotate() on P5.Vector:
// import '@/classes/Geometry/VectorOverloads';

const appStore = useAppStore();
const { canvasHeight, canvasWidth, camera } = storeToRefs(appStore);

const frameRate = ref(40);
const numberOfFrames = ref(0);
const numberOfVehicles = ref(0);

onMounted(() => {
  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(0);
      p5.frameRate(frameRate.value);

      // TODO: initialize geometry, collections, renderers
    };

    p5.draw = () => {
      // TODO: apply forces, update collections, render vehicles

      numberOfFrames.value++;
    };

    p5.keyPressed = () => {
      pressSpaceToPause(p5);
    };
  };

  const canvasElement = document.getElementById('${canvasElementId}') as HTMLElement;
  new P5(sketch, canvasElement);
});
</script>

<template>
  <div id="${canvasElementId}" style="overflow-y: auto; overflow-x: auto"></div>
  <div>{{ frameRate }} fps</div>
  <div>{{ numberOfFrames }} frames</div>
  <div>{{ numberOfVehicles }} vehicles</div>
</template>
`;

// ─── Route page ───────────────────────────────────────────────────────────────
// Wraps the canvas component with the initialization gate (canvas size picker).

const pageContent = `\
<script setup lang="ts">
import ${pascalName}Canvas from '@/components/${pascalName}Canvas.vue';
import initializationInputs from '@/components/initializationInputs.vue';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
const appStore = useAppStore();
const { initialized } = storeToRefs(appStore);
</script>

<template>
  <${pascalName}Canvas v-if="initialized" />
  <initializationInputs v-else />
</template>
`;

// ─── Registry entry ───────────────────────────────────────────────────────────
// Appends to the canvasRegistry array in src/canvasRegistry.ts.
// Relies on the file ending with the pattern:  \n];\n

const registryPath = resolve(root, 'src/canvasRegistry.ts');

if (!existsSync(registryPath)) {
  console.error(`Registry not found at ${registryPath}. Has it been created?`);
  process.exit(1);
}

const newEntry = `  {
    id: '${kebabName}',
    title: '${title}',
    description: '${description}',
    createdAt: '${today}',
  },`;

const registrySource = readFileSync(registryPath, 'utf8');

if (registrySource.includes(`id: '${kebabName}'`)) {
  console.error(
    `Registry already contains an entry with id '${kebabName}'. Aborting.`,
  );
  process.exit(1);
}

// Insert before the closing ]; by trimming trailing whitespace and appending
const trimmed = registrySource.trimEnd();
if (!trimmed.endsWith('];')) {
  console.error(
    'Could not locate the end of canvasRegistry array.\n' +
      'Make sure src/canvasRegistry.ts ends with the closing ];\n' +
      'You can add the entry manually:\n\n' +
      newEntry,
  );
  process.exit(1);
}
const updatedRegistry = trimmed.slice(0, -2) + `\n${newEntry}\n];\n`;

// ─── Write files ──────────────────────────────────────────────────────────────

writeFileSync(componentPath, componentContent);
console.log(`✓ Created component  src/components/${pascalName}Canvas.vue`);

writeFileSync(pagePath, pageContent);
console.log(`✓ Created page       src/pages/${kebabName}.vue`);

writeFileSync(registryPath, updatedRegistry);
console.log(`✓ Updated registry   src/canvasRegistry.ts`);

console.log(`
Next steps:
  1. Fill in the TODO sections in src/components/${pascalName}Canvas.vue
  2. Run the dev server: npm run dev
  3. Navigate to http://localhost:3000/${kebabName}
`);
