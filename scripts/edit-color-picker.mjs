#!/usr/bin/env node
/**
 * Edit properties of an existing color picker parameter.
 *
 * Usage:
 *   npm run edit-color-picker -- <path> <name> [options]
 *
 * Options (all optional, at least one required):
 *   --name  "new-name"    Rename the parameter (updates code name + visual label together)
 *   --value "#rrggbb"     Update the default hex color value
 *
 * Examples:
 *   npm run edit-color-picker -- branching-upward accent-color --value "#ff6600"
 *   npm run edit-color-picker -- branching-upward accent-color --name stroke-color
 */

import { writeFileSync } from 'node:fs';
import {
  toKebab,
  toCamel,
  resolveCanvas,
  assertNoDuplicate,
  assertParamIsType,
  editPageRef,
  renameParam,
} from './canvas-param-utils.mjs';

// ─── Args ─────────────────────────────────────────────────────────────────────

const [rawPath, rawName, ...rest] = process.argv.slice(2);

if (!rawPath || !rawName) {
  console.error(
    'Usage: npm run edit-color-picker -- <path> <name> [--name "new-name"] [--value "#rrggbb"]\n' +
      'Example: npm run edit-color-picker -- branching-upward accent-color --value "#ff6600"',
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
  console.error('Available: --name --value');
  process.exit(1);
}

if (opts.value !== undefined && !/^#[0-9a-fA-F]{6}$/.test(opts.value)) {
  console.error(
    `Error: --value must be a 6-digit hex color (e.g. #ff6600). Got '${opts.value}'.`,
  );
  process.exit(1);
}

const oldCamel = toCamel(toKebab(rawName));
const newCamel = opts.name ? toCamel(toKebab(opts.name)) : oldCamel;

// ─── Load + validate ──────────────────────────────────────────────────────────

let { kebab, pascal, pagePath, componentPath, pageSrc, componentSrc } =
  resolveCanvas(rawPath);

assertParamIsType(oldCamel, pageSrc, 'color');

if (newCamel !== oldCamel) {
  assertNoDuplicate(newCamel, pageSrc, componentSrc);
}

// ─── Apply changes ────────────────────────────────────────────────────────────

let newPageSrc = pageSrc;
let newComponentSrc = componentSrc;
const changes = [];

// Rename first so value edit references the final camel name
if (newCamel !== oldCamel) {
  ({ pageSrc: newPageSrc, componentSrc: newComponentSrc } = renameParam(
    newPageSrc,
    newComponentSrc,
    oldCamel,
    newCamel,
    'color',
  ));
  changes.push(`name → ${newCamel}`);
}

if (opts.value !== undefined) {
  // Color refs are stored as quoted strings: ref('#ffffff')
  newPageSrc = editPageRef(newPageSrc, newCamel, `'${opts.value}'`);
  changes.push(`default value → ${opts.value}`);
}

writeFileSync(pagePath, newPageSrc);
if (newCamel !== oldCamel) writeFileSync(componentPath, newComponentSrc);

// ─── Report ───────────────────────────────────────────────────────────────────

console.log(`✓ Updated color picker '${oldCamel}': ${changes.join(', ')}`);
console.log(`  Page: src/pages/${kebab}.vue`);
if (newCamel !== oldCamel)
  console.log(`  Component: src/components/${pascal}Canvas.vue`);
