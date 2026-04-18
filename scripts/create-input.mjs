#!/usr/bin/env node
/**
 * Add a numeric text-field parameter to an existing canvas.
 *
 * Usage:
 *   npm run create-input -- <path> <name> <value> [--reactive false]
 *
 * Examples:
 *   npm run create-input -- branching-upward max-vehicles 1000
 *   npm run create-input -- spring-grids grid-size 20
 *   npm run create-input -- my-canvas seed 42 --reactive false
 *
 * What gets added:
 *   Page script   — `const <name> = ref(<value>);`
 *   Canvas tag    — `:<kebab-name>="<name>"`
 *   Init overlay  — v-text-field (type="number") in the Parameters section (always)
 *   Toolbar menu  — v-text-field (type="number") in the parameters menu (only if --reactive is not false)
 *   Component     — `<name>: number` in defineProps, `const <name> = toRef(props, '<name>')`
 *
 * Options:
 *   --reactive bool  'true' (default) adds to toolbar for live adjustment while drawing;
 *                    'false' shows in init overlay only — not adjustable after canvas starts
 *
 * Use create-input instead of create-slider when the parameter has no meaningful
 * min/max range, or when precise numeric entry is preferred over a slider.
 */

import { writeFileSync } from 'node:fs';
import {
  toKebab,
  toCamel,
  toTitle,
  resolveCanvas,
  assertNoDuplicate,
  addPageRef,
  addCanvasTagProp,
  addToInitOverlay,
  addToToolbarMenu,
  addComponentParam,
} from './canvas-param-utils.mjs';

// ─── Args ─────────────────────────────────────────────────────────────────────

const [rawPath, rawName, rawValue, ...rest] = process.argv.slice(2);

if (!rawPath || !rawName || rawValue === undefined) {
  console.error(
    'Usage: npm run create-input -- <path> <name> <value> [--reactive false]\n' +
      'Example: npm run create-input -- branching-upward max-vehicles 1000',
  );
  process.exit(1);
}

const value = parseFloat(rawValue);

if (isNaN(value)) {
  console.error('Error: value must be a number.');
  process.exit(1);
}

const opts = {};
for (let i = 0; i < rest.length; i++) {
  if (
    rest[i].startsWith('--') &&
    rest[i + 1] !== undefined &&
    !rest[i + 1].startsWith('--')
  ) {
    opts[rest[i].slice(2)] = rest[i + 1];
    i++;
  }
}

if (
  opts.reactive !== undefined &&
  opts.reactive !== 'true' &&
  opts.reactive !== 'false'
) {
  console.error(
    `Error: --reactive must be 'true' or 'false' (got '${opts.reactive}').`,
  );
  process.exit(1);
}

const reactive = opts.reactive !== 'false';

const camelName = toCamel(toKebab(rawName));
const label = toTitle(toKebab(rawName));

// ─── Load canvas files ────────────────────────────────────────────────────────

const { kebab, pascal, pagePath, componentPath, pageSrc, componentSrc } =
  resolveCanvas(rawPath);

assertNoDuplicate(camelName, pageSrc, componentSrc);

// ─── Build control blocks ─────────────────────────────────────────────────────

// Init overlay — 8-space indent
const initBlock = [
  `        <v-text-field`,
  `          v-model.number="${camelName}"`,
  `          label="${label}"`,
  `          type="number"`,
  `          density="compact"`,
  `          hide-details`,
  `          class="mb-2"`,
  `        />`,
].join('\n');

// Toolbar menu — 12-space indent
const toolbarBlock = [
  `            <v-text-field`,
  `              v-model.number="${camelName}"`,
  `              label="${label}"`,
  `              type="number"`,
  `              density="compact"`,
  `              hide-details`,
  `              class="mb-4"`,
  `            />`,
].join('\n');

// ─── Apply changes ────────────────────────────────────────────────────────────

let newPageSrc = pageSrc;
newPageSrc = addPageRef(newPageSrc, camelName, value, {
  addMenuOpen: reactive,
});
newPageSrc = addCanvasTagProp(newPageSrc, camelName);
newPageSrc = addToInitOverlay(newPageSrc, initBlock);
if (reactive) newPageSrc = addToToolbarMenu(newPageSrc, toolbarBlock);

const newComponentSrc = addComponentParam(componentSrc, camelName, 'number');

writeFileSync(pagePath, newPageSrc);
writeFileSync(componentPath, newComponentSrc);

// ─── Report ───────────────────────────────────────────────────────────────────

console.log(`✓ Added input   '${camelName}'  (default ${value})`);
console.log(`  Page:      src/pages/${kebab}.vue`);
console.log(`  Component: src/components/${pascal}Canvas.vue`);
console.log(`\nUse ${camelName}.value inside your sketch.`);
