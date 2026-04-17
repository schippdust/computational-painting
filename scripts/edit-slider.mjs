#!/usr/bin/env node
/**
 * Edit properties of an existing slider parameter.
 *
 * Usage:
 *   npm run edit-slider -- <path> <name> [options]
 *
 * Options (all optional, at least one required):
 *   --name  "new-name"    Rename the parameter (updates code name + visual label together)
 *   --min   <number>      Update the minimum value
 *   --max   <number>      Update the maximum value
 *   --value <number>      Update the default ref value
 *   --step  <number>      Update the slider step
 *
 * Examples:
 *   npm run edit-slider -- branching-upward friction --name viscosity
 *   npm run edit-slider -- branching-upward friction --min 0 --max 2 --value 0.5
 *   npm run edit-slider -- branching-upward noise-scale --step 0.0001
 */

import { writeFileSync } from 'node:fs';
import {
  toKebab,
  toCamel,
  resolveCanvas,
  assertNoDuplicate,
  assertParamIsType,
  editPageRef,
  editSliderAttributes,
  renameParam,
} from './canvas-param-utils.mjs';

// ─── Args ─────────────────────────────────────────────────────────────────────

const [rawPath, rawName, ...rest] = process.argv.slice(2);

if (!rawPath || !rawName) {
  console.error(
    'Usage: npm run edit-slider -- <path> <name> [--name "new-name"] [--min N] [--max N] [--value N] [--step N]\n' +
      'Example: npm run edit-slider -- branching-upward friction --name viscosity --min 0 --max 2',
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

if (Object.keys(opts).length === 0) {
  console.error('No options provided — nothing to change.');
  console.error('Available: --name --min --max --value --step');
  process.exit(1);
}

const numericOpts = ['min', 'max', 'value', 'step'];
for (const key of numericOpts) {
  if (opts[key] !== undefined && isNaN(parseFloat(opts[key]))) {
    console.error(`Error: --${key} must be a number (got '${opts[key]}').`);
    process.exit(1);
  }
}

const oldCamel = toCamel(toKebab(rawName));
const newCamel = opts.name ? toCamel(toKebab(opts.name)) : oldCamel;

// ─── Load + validate ──────────────────────────────────────────────────────────

let { kebab, pascal, pagePath, componentPath, pageSrc, componentSrc } =
  resolveCanvas(rawPath);

assertParamIsType(oldCamel, pageSrc, 'slider');

if (newCamel !== oldCamel) {
  assertNoDuplicate(newCamel, pageSrc, componentSrc);
}

// ─── Apply changes ────────────────────────────────────────────────────────────

let newPageSrc = pageSrc;
let newComponentSrc = componentSrc;
const changes = [];

// Rename first so attribute edits reference the final camel name
if (newCamel !== oldCamel) {
  ({ pageSrc: newPageSrc, componentSrc: newComponentSrc } = renameParam(
    newPageSrc,
    newComponentSrc,
    oldCamel,
    newCamel,
    'slider',
  ));
  changes.push(`name → ${newCamel}`);
}

if (opts.value !== undefined) {
  newPageSrc = editPageRef(newPageSrc, newCamel, parseFloat(opts.value));
  changes.push(`default value → ${opts.value}`);
}

const attrEdits = {};
if (opts.min !== undefined) {
  attrEdits.min = parseFloat(opts.min);
  changes.push(`min → ${opts.min}`);
}
if (opts.max !== undefined) {
  attrEdits.max = parseFloat(opts.max);
  changes.push(`max → ${opts.max}`);
}
if (opts.step !== undefined) {
  attrEdits.step = parseFloat(opts.step);
  changes.push(`step → ${opts.step}`);
}

if (Object.keys(attrEdits).length > 0) {
  newPageSrc = editSliderAttributes(newPageSrc, newCamel, attrEdits);
}

writeFileSync(pagePath, newPageSrc);
if (newCamel !== oldCamel) writeFileSync(componentPath, newComponentSrc);

// ─── Report ───────────────────────────────────────────────────────────────────

console.log(`✓ Updated slider '${oldCamel}': ${changes.join(', ')}`);
console.log(`  Page: src/pages/${kebab}.vue`);
if (newCamel !== oldCamel)
  console.log(`  Component: src/components/${pascal}Canvas.vue`);
