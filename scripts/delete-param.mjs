#!/usr/bin/env node
/**
 * Delete a parameter (slider, input, or color picker) from an existing canvas.
 *
 * Usage:
 *   npm run delete-param -- <path> <name>
 *
 * Examples:
 *   npm run delete-param -- branching-upward friction
 *   npm run delete-param -- branching-upward accent-color
 *
 * Removes:
 *   Page script   — `const <name> = ref(...);`
 *   Canvas tag    — `:<kebab-name>="<name>"`
 *   Init overlay  — the full control block (slider / input / color picker)
 *   Toolbar menu  — the full control block
 *   Component     — `<name>: type` from defineProps, `const <name> = toRef(...)`
 *                   If defineProps is left empty, removes the entire block.
 */

import { writeFileSync } from 'node:fs';
import {
  toKebab,
  toCamel,
  resolveCanvas,
  assertParamExists,
  detectParamType,
  deletePageRef,
  deleteCanvasTagProp,
  deleteSliderBlocks,
  deleteInputBlocks,
  deleteColorPickerBlocks,
  deleteComponentParam,
} from './canvas-param-utils.mjs';

// ─── Args ─────────────────────────────────────────────────────────────────────

const [rawPath, rawName] = process.argv.slice(2);

if (!rawPath || !rawName) {
  console.error(
    'Usage: npm run delete-param -- <path> <name>\n' +
      'Example: npm run delete-param -- branching-upward friction',
  );
  process.exit(1);
}

const camelName = toCamel(toKebab(rawName));

// ─── Load + validate ──────────────────────────────────────────────────────────

const { kebab, pascal, pagePath, componentPath, pageSrc, componentSrc } =
  resolveCanvas(rawPath);

assertParamExists(camelName, pageSrc);

const paramType = detectParamType(pageSrc, camelName);
if (!paramType) {
  console.error(
    `Error: '${camelName}' exists as a ref but its control type could not be detected.\n` +
      'Expected to find a v-slider, v-text-field, or color picker block in the template.',
  );
  process.exit(1);
}

// ─── Apply changes ────────────────────────────────────────────────────────────

let newPageSrc = pageSrc;

// Remove page script ref
newPageSrc = deletePageRef(newPageSrc, camelName);

// Remove canvas tag prop binding
newPageSrc = deleteCanvasTagProp(newPageSrc, camelName);

// Remove control blocks (both init overlay and toolbar occurrences)
if (paramType === 'slider') {
  newPageSrc = deleteSliderBlocks(newPageSrc, camelName);
} else if (paramType === 'input') {
  newPageSrc = deleteInputBlocks(newPageSrc, camelName);
} else if (paramType === 'color') {
  newPageSrc = deleteColorPickerBlocks(newPageSrc, camelName);
}

const newComponentSrc = deleteComponentParam(componentSrc, camelName);

writeFileSync(pagePath, newPageSrc);
writeFileSync(componentPath, newComponentSrc);

// ─── Report ───────────────────────────────────────────────────────────────────

console.log(`✓ Deleted ${paramType} parameter '${camelName}'`);
console.log(`  Page:      src/pages/${kebab}.vue`);
console.log(`  Component: src/components/${pascal}Canvas.vue`);
