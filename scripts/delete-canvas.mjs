#!/usr/bin/env node
/**
 * Delete an existing computational canvas iteration.
 *
 * Usage:
 *   node scripts/delete-canvas.mjs <kebab-name> --yes
 *   npm run delete-canvas -- <kebab-name> --yes
 *
 * Examples:
 *   npm run delete-canvas -- old-experiment --yes
 *
 * What gets removed:
 *   src/components/<PascalName>Canvas.vue
 *   src/pages/<kebab-name>.vue
 *   Its entry in src/canvasRegistry.ts
 *
 * This is destructive — running without --yes prints what would be deleted
 * and exits without changing anything. Re-run with --yes to actually delete.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ─── Arg parsing ──────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);

let rawName;
let confirmed = false;

for (const arg of rawArgs) {
  if (arg === '--yes' || arg === '-y') {
    confirmed = true;
  } else if (!rawName) {
    rawName = arg;
  }
}

if (!rawName) {
  console.error('Error: canvas name is required.\n');
  console.error('Usage: node scripts/delete-canvas.mjs <kebab-name> --yes');
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

const kebabName = toKebab(rawName);
const pascalName = toPascal(kebabName);

// ─── Resolve paths ────────────────────────────────────────────────────────────

const componentPath = resolve(root, `src/components/${pascalName}Canvas.vue`);
const pagePath = resolve(root, `src/pages/${kebabName}.vue`);
const registryPath = resolve(root, 'src/canvasRegistry.ts');

const componentExists = existsSync(componentPath);
const pageExists = existsSync(pagePath);

if (!existsSync(registryPath)) {
  console.error(`Registry not found at ${registryPath}. Has it been created?`);
  process.exit(1);
}

const registrySource = readFileSync(registryPath, 'utf8');
const hasRegistryEntry = registrySource.includes(`id: '${kebabName}'`);

if (!componentExists && !pageExists && !hasRegistryEntry) {
  console.error(
    `Error: no canvas found with id '${kebabName}' — nothing to delete.`,
  );
  process.exit(1);
}

// ─── Dry run unless --yes ─────────────────────────────────────────────────────

console.log(`Canvas '${kebabName}' — the following would be deleted:`);
if (componentExists) {
  console.log(`  - src/components/${pascalName}Canvas.vue`);
} else {
  console.log(
    `  - src/components/${pascalName}Canvas.vue  (not found, skipping)`,
  );
}
if (pageExists) {
  console.log(`  - src/pages/${kebabName}.vue`);
} else {
  console.log(`  - src/pages/${kebabName}.vue  (not found, skipping)`);
}
if (hasRegistryEntry) {
  console.log(
    `  - registry entry  id: '${kebabName}'  in src/canvasRegistry.ts`,
  );
} else {
  console.log(`  - registry entry  (not found, skipping)`);
}

if (!confirmed) {
  console.log(
    `\nThis is a dry run — nothing was deleted. Re-run with --yes to confirm:\n` +
      `  npm run delete-canvas -- ${kebabName} --yes`,
  );
  process.exit(0);
}

// ─── Apply deletion ───────────────────────────────────────────────────────────

if (hasRegistryEntry) {
  const entryPattern = new RegExp(
    `\\n\\s*\\{\\s*\\n\\s*id: '${kebabName}'[\\s\\S]*?\\n\\s*\\},`,
  );
  const updatedRegistry = registrySource.replace(entryPattern, '');
  if (updatedRegistry === registrySource) {
    console.error(
      `Warning: found id: '${kebabName}' in the registry but couldn't isolate its entry block — ` +
        `leaving src/canvasRegistry.ts unchanged. Remove it manually.`,
    );
  } else {
    writeFileSync(registryPath, updatedRegistry);
  }
}

if (componentExists) unlinkSync(componentPath);
if (pageExists) unlinkSync(pagePath);

// ─── Report ───────────────────────────────────────────────────────────────────

console.log(`\n✓ Deleted canvas '${kebabName}'.`);
