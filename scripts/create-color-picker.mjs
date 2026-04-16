#!/usr/bin/env node
/**
 * Add a color-picker parameter to an existing canvas.
 *
 * Usage:
 *   npm run create-color-picker -- <path> <name> [default-hex]
 *
 * Examples:
 *   npm run create-color-picker -- branching-upward accent-color
 *   npm run create-color-picker -- branching-upward accent-color #ff6600
 *
 * What gets added:
 *   Page script   — `const <name> = ref('<hex>');`
 *   Canvas tag    — `:<kebab-name>="<name>"`
 *   Init overlay  — color swatch button + v-color-picker in the Parameters section
 *   Toolbar menu  — color swatch button + v-color-picker in the parameters menu (created if absent)
 *   Component     — `<name>: string` in defineProps, `const <name> = toRef(props, '<name>')`
 *
 * The color value is a reactive hex string (e.g. '#ff6600').
 * Convert to an [r,g,b] array in your sketch with hexToRgb(<name>.value).
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

const [rawPath, rawName, rawDefault] = process.argv.slice(2);

if (!rawPath || !rawName) {
  console.error(
    'Usage: npm run create-color-picker -- <path> <name> [default-hex]\n' +
      'Example: npm run create-color-picker -- branching-upward accent-color #ff6600',
  );
  process.exit(1);
}

const defaultHex = rawDefault ?? '#ffffff';

if (!/^#[0-9a-fA-F]{6}$/.test(defaultHex)) {
  console.error(
    `Error: default color '${defaultHex}' is not a valid 6-digit hex (e.g. #ff6600).`,
  );
  process.exit(1);
}

const camelName = toCamel(toKebab(rawName));
const label = toTitle(toKebab(rawName));

// ─── Load canvas files ────────────────────────────────────────────────────────

const { kebab, pascal, pagePath, componentPath, pageSrc, componentSrc } =
  resolveCanvas(rawPath);

assertNoDuplicate(camelName, pageSrc, componentSrc);

// ─── Build control blocks ─────────────────────────────────────────────────────
//
// Each block is a button (showing the current color) that opens a sub-menu
// containing a v-color-picker. The sub-menu uses a local v-model so it doesn't
// conflict with the outer paramMenuOpen.

// Init overlay — 8-space indent
const initBlock = [
  `        <p class="text-caption text-medium-emphasis mb-1">${label}</p>`,
  `        <v-menu :close-on-content-click="false">`,
  `          <template #activator="{ props: _cp }">`,
  `            <v-btn`,
  `              v-bind="_cp"`,
  `              :color="${camelName}"`,
  `              variant="tonal"`,
  `              size="small"`,
  `              block`,
  `              class="mb-3"`,
  `            >{{ ${camelName} }}</v-btn>`,
  `          </template>`,
  `          <v-color-picker v-model="${camelName}" mode="hex" hide-inputs />`,
  `        </v-menu>`,
].join('\n');

// Toolbar menu — 12-space indent
const toolbarBlock = [
  `            <p class="text-caption text-medium-emphasis mb-1">${label}</p>`,
  `            <v-menu :close-on-content-click="false">`,
  `              <template #activator="{ props: _cp }">`,
  `                <v-btn`,
  `                  v-bind="_cp"`,
  `                  :color="${camelName}"`,
  `                  variant="tonal"`,
  `                  size="small"`,
  `                  block`,
  `                  class="mb-4"`,
  `                >{{ ${camelName} }}</v-btn>`,
  `              </template>`,
  `              <v-color-picker v-model="${camelName}" mode="hex" hide-inputs />`,
  `            </v-menu>`,
].join('\n');

// ─── Apply changes ────────────────────────────────────────────────────────────

let newPageSrc = pageSrc;
newPageSrc = addPageRef(newPageSrc, camelName, `'${defaultHex}'`);
newPageSrc = addCanvasTagProp(newPageSrc, camelName);
newPageSrc = addToInitOverlay(newPageSrc, initBlock);
newPageSrc = addToToolbarMenu(newPageSrc, toolbarBlock);

const newComponentSrc = addComponentParam(componentSrc, camelName, 'string');

writeFileSync(pagePath, newPageSrc);
writeFileSync(componentPath, newComponentSrc);

// ─── Report ───────────────────────────────────────────────────────────────────

console.log(`✓ Added color   '${camelName}'  (default ${defaultHex})`);
console.log(`  Page:      src/pages/${kebab}.vue`);
console.log(`  Component: src/components/${pascal}Canvas.vue`);
console.log(`\nUse ${camelName}.value (hex string) inside your sketch.`);
console.log(`Convert to RGB with: hexToRgb(${camelName}.value)`);
