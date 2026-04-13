#!/usr/bin/env node
/**
 * Rename an existing computational canvas iteration.
 *
 * Usage:
 *   node scripts/rename-canvas.mjs <current-kebab> <new-kebab> [--group "New Group"]
 *   npm run rename-canvas -- <current-kebab> <new-kebab> [--group "New Group"]
 *
 * Examples:
 *   npm run rename-canvas -- spring-grids spring-lattice
 *   npm run rename-canvas -- spring-grids spring-lattice --group "Lattice Experiments"
 *
 * What gets updated:
 *   src/components/<OldPascal>Canvas.vue  →  renamed to  src/components/<NewPascal>Canvas.vue
 *   src/pages/<old-kebab>.vue             →  renamed to  src/pages/<new-kebab>.vue
 *   Internal references in both files (element id, getElementById, querySelector, import, tag)
 *   Registry entry: id, title, and optionally group
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  unlinkSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ─── Arg parsing ──────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);

let oldRawName;
let newRawName;
let newGroup;

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--group') {
    newGroup = rawArgs[++i];
  } else if (!oldRawName) {
    oldRawName = rawArgs[i];
  } else if (!newRawName) {
    newRawName = rawArgs[i];
  }
}

if (!oldRawName || !newRawName) {
  console.error('Error: both current and new canvas names are required.\n');
  console.error(
    'Usage: node scripts/rename-canvas.mjs <current-kebab> <new-kebab> [--group "New Group"]',
  );
  process.exit(1);
}

// ─── Name transforms ──────────────────────────────────────────────────────────

function toKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
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

const oldKebab = toKebab(oldRawName);
const oldPascal = toPascal(oldKebab);
const newKebab = toKebab(newRawName);
const newPascal = toPascal(newKebab);
const newTitle = toTitle(newKebab);

if (oldKebab === newKebab) {
  console.error(
    'Error: current and new names are identical after normalisation.',
  );
  process.exit(1);
}

// ─── Resolve paths ────────────────────────────────────────────────────────────

const oldComponentPath = resolve(root, `src/components/${oldPascal}Canvas.vue`);
const oldPagePath = resolve(root, `src/pages/${oldKebab}.vue`);
const newComponentPath = resolve(root, `src/components/${newPascal}Canvas.vue`);
const newPagePath = resolve(root, `src/pages/${newKebab}.vue`);
const registryPath = resolve(root, 'src/canvasRegistry.ts');

// ─── Pre-flight checks ────────────────────────────────────────────────────────

if (!existsSync(oldComponentPath)) {
  console.error(
    `Error: component not found: src/components/${oldPascal}Canvas.vue`,
  );
  process.exit(1);
}
if (!existsSync(oldPagePath)) {
  console.error(`Error: page not found: src/pages/${oldKebab}.vue`);
  process.exit(1);
}
if (existsSync(newComponentPath)) {
  console.error(
    `Error: target already exists: src/components/${newPascal}Canvas.vue`,
  );
  process.exit(1);
}
if (existsSync(newPagePath)) {
  console.error(`Error: target already exists: src/pages/${newKebab}.vue`);
  process.exit(1);
}

const registrySource = readFileSync(registryPath, 'utf8');
if (!registrySource.includes(`id: '${oldKebab}'`)) {
  console.error(`Error: no registry entry found with id '${oldKebab}'.`);
  process.exit(1);
}
if (registrySource.includes(`id: '${newKebab}'`)) {
  console.error(
    `Error: registry already contains an entry with id '${newKebab}'.`,
  );
  process.exit(1);
}

// ─── Update file contents ─────────────────────────────────────────────────────
// Two substitutions cover all internal name references:
//   1. Element ID:       "<oldKebab>-canvas"  →  "<newKebab>-canvas"
//      (used in id=, getElementById, querySelector)
//   2. Component class:  "<oldPascal>Canvas"  →  "<newPascal>Canvas"
//      (used in import statement and template tag in the page)

const newComponentContent = readFileSync(oldComponentPath, 'utf8').replaceAll(
  `${oldKebab}-canvas`,
  `${newKebab}-canvas`,
);

const newPageContent = readFileSync(oldPagePath, 'utf8')
  .replaceAll(`${oldPascal}Canvas`, `${newPascal}Canvas`)
  .replaceAll(`${oldKebab}-canvas`, `${newKebab}-canvas`);

// ─── Update registry ──────────────────────────────────────────────────────────
// Replace id and title in the existing entry. Optionally update group.

let newRegistry = registrySource
  .replace(`id: '${oldKebab}'`, `id: '${newKebab}'`)
  .replace(`title: '${toTitle(oldKebab)}'`, `title: '${newTitle}'`);

if (newGroup) {
  // Replace the group line within the entry that has the matching (now updated) id.
  // We find the entry block by the new id and swap just its group line.
  newRegistry = newRegistry.replace(
    new RegExp(`(id: '${newKebab}'[\\s\\S]*?group: ')[^']*(')`),
    `$1${newGroup}$2`,
  );
}

// ─── Apply all changes ────────────────────────────────────────────────────────
// Write updated content to the new paths, then delete the old files.

writeFileSync(newComponentPath, newComponentContent);
writeFileSync(newPagePath, newPageContent);
writeFileSync(registryPath, newRegistry);

// Remove old files only after writes succeed.
unlinkSync(oldComponentPath);
unlinkSync(oldPagePath);

// ─── Report ───────────────────────────────────────────────────────────────────

console.log(
  `✓ Renamed component  src/components/${oldPascal}Canvas.vue  →  ${newPascal}Canvas.vue`,
);
console.log(
  `✓ Renamed page       src/pages/${oldKebab}.vue  →  ${newKebab}.vue`,
);
console.log(
  `✓ Updated registry   id: '${oldKebab}'  →  '${newKebab}'${newGroup ? `  group: '${newGroup}'` : ''}`,
);
console.log(`\nRoute is now live at: http://localhost:3000/${newKebab}`);
