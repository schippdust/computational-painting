#!/usr/bin/env node
/**
 * Add a numeric text-field parameter to an existing canvas.
 *
 * Usage:
 *   npm run create-input -- <path> <name> <value>
 *
 * Examples:
 *   npm run create-input -- branching-upward max-vehicles 1000
 *   npm run create-input -- spring-grids grid-size 20
 *
 * What gets added:
 *   Page script   — `const <name> = ref(<value>);`
 *   Canvas tag    — `:<kebab-name>="<name>"`
 *   Init overlay  — v-text-field (type="number") in the Parameters section
 *   Toolbar menu  — v-text-field (type="number") in the parameters menu (created if absent)
 *   Component     — `<name>: number` in defineProps, `const <name> = toRef(props, '<name>')`
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

const [rawPath, rawName, rawValue] = process.argv.slice(2);

if (!rawPath || !rawName || rawValue === undefined) {
  console.error(
    'Usage: npm run create-input -- <path> <name> <value>\n' +
      'Example: npm run create-input -- branching-upward max-vehicles 1000',
  );
  process.exit(1);
}

const value = parseFloat(rawValue);

if (isNaN(value)) {
  console.error('Error: value must be a number.');
  process.exit(1);
}

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
newPageSrc = addPageRef(newPageSrc, camelName, value);
newPageSrc = addCanvasTagProp(newPageSrc, camelName);
newPageSrc = addToInitOverlay(newPageSrc, initBlock);
newPageSrc = addToToolbarMenu(newPageSrc, toolbarBlock);

const newComponentSrc = addComponentParam(componentSrc, camelName, 'number');

writeFileSync(pagePath, newPageSrc);
writeFileSync(componentPath, newComponentSrc);

// ─── Report ───────────────────────────────────────────────────────────────────

console.log(`✓ Added input   '${camelName}'  (default ${value})`);
console.log(`  Page:      src/pages/${kebab}.vue`);
console.log(`  Component: src/components/${pascal}Canvas.vue`);
console.log(`\nUse ${camelName}.value inside your sketch.`);
