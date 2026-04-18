#!/usr/bin/env node
/**
 * Edit properties of an existing numeric input parameter.
 *
 * Usage:
 *   npm run edit-input -- <path> <name> [options]
 *
 * Options (all optional, at least one required):
 *   --name     "new-name"    Rename the parameter (updates code name + visual label together)
 *   --value    <number>      Update the default ref value
 *   --reactive true|false    Move parameter between toolbar (true) and init-only (false)
 *
 * Examples:
 *   npm run edit-input -- branching-upward max-vehicles --value 2000
 *   npm run edit-input -- branching-upward max-vehicles --name max-agents
 *   npm run edit-input -- branching-upward seed --reactive false
 */

import { writeFileSync } from 'node:fs';
import {
  toKebab,
  toCamel,
  toTitle,
  resolveCanvas,
  assertNoDuplicate,
  assertParamIsType,
  editPageRef,
  renameParam,
  ensureParamMenuOpen,
  isParamInToolbar,
  isToolbarEmpty,
  removeParamFromToolbar,
  addToToolbarMenu,
} from './canvas-param-utils.mjs';

// ─── Args ─────────────────────────────────────────────────────────────────────

const [rawPath, rawName, ...rest] = process.argv.slice(2);

if (!rawPath || !rawName) {
  console.error(
    'Usage: npm run edit-input -- <path> <name> [--name "new-name"] [--value N]\n' +
      'Example: npm run edit-input -- branching-upward max-vehicles --name max-agents',
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
  console.error('Available: --name --value --reactive');
  process.exit(1);
}

if (opts.value !== undefined && isNaN(parseFloat(opts.value))) {
  console.error(`Error: --value must be a number (got '${opts.value}').`);
  process.exit(1);
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

const oldCamel = toCamel(toKebab(rawName));
const newCamel = opts.name ? toCamel(toKebab(opts.name)) : oldCamel;

// ─── Load + validate ──────────────────────────────────────────────────────────

let { kebab, pascal, pagePath, componentPath, pageSrc, componentSrc } =
  resolveCanvas(rawPath);

assertParamIsType(oldCamel, pageSrc, 'input');

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
    'input',
  ));
  changes.push(`name → ${newCamel}`);
}

if (opts.value !== undefined) {
  newPageSrc = editPageRef(newPageSrc, newCamel, parseFloat(opts.value));
  changes.push(`default value → ${opts.value}`);
}

if (opts.reactive !== undefined) {
  const reactiveValue = opts.reactive === 'true';
  const currentlyReactive = isParamInToolbar(newPageSrc, newCamel, 'input');

  if (reactiveValue && !currentlyReactive) {
    const label = toTitle(toKebab(newCamel));
    const toolbarBlock = [
      `            <v-text-field`,
      `              v-model.number="${newCamel}"`,
      `              label="${label}"`,
      `              type="number"`,
      `              density="compact"`,
      `              hide-details`,
      `              class="mb-4"`,
      `            />`,
    ].join('\n');
    newPageSrc = ensureParamMenuOpen(newPageSrc);
    newPageSrc = addToToolbarMenu(newPageSrc, toolbarBlock);
    changes.push('reactive → true');
  } else if (!reactiveValue && currentlyReactive) {
    newPageSrc = removeParamFromToolbar(newPageSrc, newCamel, 'input');
    if (isToolbarEmpty(newPageSrc)) {
      console.log(
        '  ⚠ No reactive params remain — toolbar menu is now empty.',
      );
    }
    changes.push('reactive → false');
  }
}

writeFileSync(pagePath, newPageSrc);
if (newCamel !== oldCamel) writeFileSync(componentPath, newComponentSrc);

// ─── Report ───────────────────────────────────────────────────────────────────

console.log(`✓ Updated input '${oldCamel}': ${changes.join(', ')}`);
console.log(`  Page: src/pages/${kebab}.vue`);
if (newCamel !== oldCamel)
  console.log(`  Component: src/components/${pascal}Canvas.vue`);
