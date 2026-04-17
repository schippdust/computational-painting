#!/usr/bin/env node
/**
 * Add a slider parameter to an existing canvas.
 *
 * Usage:
 *   npm run create-slider -- <path> <name> <min> <value> <max> [--step <number>]
 *
 * Examples:
 *   npm run create-slider -- branching-upward friction 0 0.2 1
 *   npm run create-slider -- spring-grids stiffness 0 50 500
 *   npm run create-slider -- my-canvas noise-scale 0.0001 0.001 0.01
 *   npm run create-slider -- my-canvas speed 0 10 100 --step 0.5
 *
 * What gets added:
 *   Page script   — `const <name> = ref(<value>);`
 *   Canvas tag    — `:<kebab-name>="<name>"`
 *   Init overlay  — v-slider in the Parameters section
 *   Toolbar menu  — v-slider in the parameters menu (created if absent)
 *   Component     — `<name>: number` in defineProps, `const <name> = toRef(props, '<name>')`
 *
 * The step is inferred from the precision of min/value/max unless --step is provided:
 *   - All integers → proportional integer step
 *   - Any decimal  → one decimal place finer than the finest value given
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

const [rawPath, rawName, rawMin, rawValue, rawMax, ...rest] =
  process.argv.slice(2);

if (
  !rawPath ||
  !rawName ||
  rawMin === undefined ||
  rawValue === undefined ||
  rawMax === undefined
) {
  console.error(
    'Usage: npm run create-slider -- <path> <name> <min> <value> <max> [--step N]\n' +
      'Example: npm run create-slider -- branching-upward friction 0 0.2 1',
  );
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

if (opts.step !== undefined && isNaN(parseFloat(opts.step))) {
  console.error(`Error: --step must be a number (got '${opts.step}').`);
  process.exit(1);
}

const min = parseFloat(rawMin);
const value = parseFloat(rawValue);
const max = parseFloat(rawMax);

if (isNaN(min) || isNaN(value) || isNaN(max)) {
  console.error('Error: min, value, and max must be numbers.');
  process.exit(1);
}
if (min >= max) {
  console.error('Error: min must be less than max.');
  process.exit(1);
}
if (value < min || value > max) {
  console.error(
    `Error: value (${value}) must be between min (${min}) and max (${max}).`,
  );
  process.exit(1);
}

const camelName = toCamel(toKebab(rawName));
const label = toTitle(toKebab(rawName));

// ─── Load canvas files ────────────────────────────────────────────────────────

const { kebab, pascal, pagePath, componentPath, pageSrc, componentSrc } =
  resolveCanvas(rawPath);

assertNoDuplicate(camelName, pageSrc, componentSrc);

// ─── Infer step ───────────────────────────────────────────────────────────────

function decimalPlaces(n) {
  const s = n.toString();
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

function inferStep(min, value, max) {
  if (
    Number.isInteger(min) &&
    Number.isInteger(value) &&
    Number.isInteger(max)
  ) {
    const range = max - min;
    if (range <= 20) return 1;
    if (range <= 200) return 5;
    // Largest power of 10 that keeps ≥ 10 steps across the range
    return Math.pow(10, Math.max(0, Math.floor(Math.log10(range)) - 1));
  }
  const maxDP = Math.max(
    decimalPlaces(min),
    decimalPlaces(value),
    decimalPlaces(max),
  );
  return Math.pow(10, -(maxDP + 1));
}

const step =
  opts.step !== undefined ? parseFloat(opts.step) : inferStep(min, value, max);

// ─── Build control blocks ─────────────────────────────────────────────────────

// Init overlay — 8-space indent, with thumb-label
const initBlock = [
  `        <v-slider`,
  `          v-model="${camelName}"`,
  `          label="${label}"`,
  `          :min="${min}"`,
  `          :max="${max}"`,
  `          :step="${step}"`,
  `          thumb-label`,
  `          hide-details`,
  `          class="mb-2"`,
  `        />`,
].join('\n');

// Toolbar menu — 12-space indent, label above slider, no thumb-label (compact card)
const toolbarBlock = [
  `            <p class="text-caption text-medium-emphasis mb-n2">${label}</p>`,
  `            <v-slider`,
  `              v-model="${camelName}"`,
  `              :min="${min}"`,
  `              :max="${max}"`,
  `              :step="${step}"`,
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

console.log(
  `✓ Added slider  '${camelName}'  (${min} → ${max}, default ${value}, step ${step})`,
);
console.log(`  Page:      src/pages/${kebab}.vue`);
console.log(`  Component: src/components/${pascal}Canvas.vue`);
console.log(`\nUse ${camelName}.value inside your sketch.`);
