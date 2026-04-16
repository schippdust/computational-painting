#!/usr/bin/env node
/**
 * Shared utilities for the create, edit, and delete-param scripts.
 *
 * Conventions:
 *  - Every exported function is pure (string in → string out) except resolveCanvas and
 *    the assert* functions, which read files / call process.exit on failure.
 *  - "page" refers to src/pages/<kebab>.vue
 *  - "component" refers to src/components/<Pascal>Canvas.vue
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ─── Name transforms ──────────────────────────────────────────────────────────

export function toKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

export function toPascal(kebab) {
  return kebab
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

export function toCamel(kebab) {
  const p = toPascal(kebab);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

export function toTitle(kebab) {
  return kebab
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// ─── Canvas resolution ────────────────────────────────────────────────────────

/** Resolve a raw canvas name/path to file paths + sources. Exits if files not found. */
export function resolveCanvas(rawPath) {
  const kebab = toKebab(rawPath);
  const pascal = toPascal(kebab);
  const pagePath = resolve(rootDir, `src/pages/${kebab}.vue`);
  const componentPath = resolve(rootDir, `src/components/${pascal}Canvas.vue`);

  if (!existsSync(pagePath)) {
    console.error(`Error: page not found: src/pages/${kebab}.vue`);
    process.exit(1);
  }
  if (!existsSync(componentPath)) {
    console.error(
      `Error: component not found: src/components/${pascal}Canvas.vue`,
    );
    process.exit(1);
  }

  return {
    kebab,
    pascal,
    pagePath,
    componentPath,
    pageSrc: readFileSync(pagePath, 'utf8'),
    componentSrc: readFileSync(componentPath, 'utf8'),
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Exit with an error if camelName already exists as a ref in the page or a prop
 * in the component's defineProps block. Catches duplicates across all control types.
 */
export function assertNoDuplicate(camelName, pageSrc, componentSrc) {
  if (pageSrc.includes(`const ${camelName} = ref(`)) {
    console.error(
      `Error: parameter '${camelName}' already exists in the page.`,
    );
    process.exit(1);
  }
  const propsBlock = componentSrc.match(/defineProps<\{([\s\S]*?)\}>\(\)/);
  if (propsBlock && propsBlock[1].includes(`${camelName}:`)) {
    console.error(
      `Error: parameter '${camelName}' already exists in the component props.`,
    );
    process.exit(1);
  }
}

/** Exit with an error if camelName does NOT exist as a ref in the page. */
export function assertParamExists(camelName, pageSrc) {
  if (!pageSrc.includes(`const ${camelName} = ref(`)) {
    console.error(`Error: parameter '${camelName}' not found in this canvas.`);
    process.exit(1);
  }
}

/**
 * Exit with an error if camelName is not the expectedType ('slider' | 'input' | 'color').
 * Used by edit-* scripts to catch mismatched script/type pairs.
 */
export function assertParamIsType(camelName, pageSrc, expectedType) {
  assertParamExists(camelName, pageSrc);
  const actual = detectParamType(pageSrc, camelName);
  if (actual !== expectedType) {
    const scriptName = actual ? `edit-${actual}` : 'unknown';
    console.error(
      `Error: '${camelName}' is a ${actual ?? 'unknown'} parameter, not a ${expectedType}.\n` +
        `Use \`npm run ${scriptName}\` instead.`,
    );
    process.exit(1);
  }
}

// ─── Type detection ───────────────────────────────────────────────────────────

/**
 * Detect the control type of a parameter by inspecting page template markup.
 * Returns 'slider' | 'input' | 'color' | null.
 *
 * Order matters: color is checked first because color pickers also contain
 * `v-model="camelName"` in their <v-color-picker> component.
 */
export function detectParamType(pageSrc, camelName) {
  if (pageSrc.includes(`:color="${camelName}"`)) return 'color';
  if (pageSrc.includes(`v-model.number="${camelName}"`)) return 'input';
  if (pageSrc.includes(`v-model="${camelName}"`)) return 'slider';
  return null;
}

// ─── Template markers (emitted by new-canvas for fresh canvases) ──────────────

const TOOLBAR_SLOT = '<!-- Add canvas-specific toolbar items here via slot -->';
const INIT_SLOT = '<!-- Add canvas-specific init settings here via slot -->';

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE operations
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Page: add ref ────────────────────────────────────────────────────────────

/**
 * Insert `const <camelName> = ref(<refValue>);` into the page script.
 * Priority: before paramMenuOpen (keeps params grouped) → before zoom (fresh canvas,
 * also seeds paramMenuOpen so the toolbar menu has something to bind to).
 */
export function addPageRef(pageSrc, camelName, refValue) {
  const declaration = `const ${camelName} = ref(${refValue});`;

  if (pageSrc.includes('const paramMenuOpen = ref(false)')) {
    return insertLineBefore(
      pageSrc,
      'const paramMenuOpen = ref(false)',
      declaration,
    );
  }
  if (pageSrc.includes('const zoom = ref(')) {
    return insertLineBefore(
      pageSrc,
      'const zoom = ref(',
      `${declaration}\nconst paramMenuOpen = ref(false);\n`,
    );
  }

  console.error(
    'Error: could not find a ref insertion point in the page script.\n' +
      'Expected `const paramMenuOpen = ref(false)` or `const zoom = ref(` to be present.',
  );
  process.exit(1);
}

// ─── Page: add canvas tag prop ────────────────────────────────────────────────

/** Add `:kebab-name="camelName"` to the canvas component tag, after :key="canvasKey". */
export function addCanvasTagProp(pageSrc, camelName) {
  const kebabProp = toKebab(camelName);
  const lines = pageSrc.split('\n');
  const keyIdx = lines.findIndex((l) => l.includes(':key="canvasKey"'));
  if (keyIdx === -1) {
    console.error(
      'Error: could not find `:key="canvasKey"` in the canvas tag.',
    );
    process.exit(1);
  }
  const indent = lines[keyIdx].match(/^(\s*)/)[1];
  lines.splice(keyIdx + 1, 0, `${indent}:${kebabProp}="${camelName}"`);
  return lines.join('\n');
}

// ─── Page: add to init overlay ────────────────────────────────────────────────

/**
 * Add a control block (8-space indent) to the init overlay Parameters section.
 * Creates the section if it doesn't exist yet (fresh canvas).
 */
export function addToInitOverlay(pageSrc, controlBlock) {
  if (pageSrc.includes(INIT_SLOT)) {
    const section = [
      `        <v-divider class="my-3" />`,
      `        <p class="text-subtitle-2 mb-2">Parameters</p>`,
      ``,
      controlBlock,
    ].join('\n');
    return pageSrc.replace(INIT_SLOT, section);
  }

  const headIdx = pageSrc.indexOf('>Parameters</p>');
  if (headIdx !== -1) {
    const afterHead = headIdx + '>Parameters</p>'.length;
    const nextDivider = pageSrc.indexOf('<v-divider', afterHead);
    if (nextDivider !== -1) {
      return (
        pageSrc.slice(0, nextDivider) +
        controlBlock +
        '\n' +
        pageSrc.slice(nextDivider)
      );
    }
    const closeTag = pageSrc.indexOf('</canvas-init-overlay>', afterHead);
    if (closeTag !== -1) {
      return (
        pageSrc.slice(0, closeTag) +
        controlBlock +
        '\n        ' +
        pageSrc.slice(closeTag)
      );
    }
  }

  console.error(
    'Error: could not find the Parameters section or init-overlay slot in the page template.',
  );
  process.exit(1);
}

// ─── Page: add to toolbar menu ────────────────────────────────────────────────

/**
 * Add a control block (12-space indent) to the toolbar parameters menu.
 * Creates the full menu structure if it doesn't exist yet (fresh canvas).
 */
export function addToToolbarMenu(pageSrc, controlBlock) {
  if (pageSrc.includes(TOOLBAR_SLOT)) {
    const menu = [
      `      <!-- Parameters menu -->`,
      `      <v-menu`,
      `        v-model="paramMenuOpen"`,
      `        :close-on-content-click="false"`,
      `        location="end"`,
      `      >`,
      `        <template #activator="{ props: menuProps }">`,
      `          <v-tooltip text="Canvas parameters" location="right">`,
      `            <template #activator="{ props: tip }">`,
      `              <v-btn`,
      `                variant="text"`,
      `                icon="mdi-tune"`,
      `                density="compact"`,
      `                v-bind="{ ...menuProps, ...tip }"`,
      `                @click="menuProps.onClick"`,
      `              />`,
      `            </template>`,
      `          </v-tooltip>`,
      `        </template>`,
      `        <v-card min-width="260">`,
      `          <v-card-text class="pt-3">`,
      controlBlock,
      `          </v-card-text>`,
      `        </v-card>`,
      `      </v-menu>`,
    ].join('\n');
    return pageSrc.replace(TOOLBAR_SLOT, menu);
  }

  const cardTextOpen = pageSrc.indexOf('<v-card-text class="pt-3">');
  if (cardTextOpen !== -1) {
    const cardTextClose = pageSrc.indexOf('</v-card-text>', cardTextOpen);
    if (cardTextClose !== -1) {
      return (
        pageSrc.slice(0, cardTextClose) +
        controlBlock +
        '\n' +
        pageSrc.slice(cardTextClose)
      );
    }
  }

  console.error(
    'Error: could not find the toolbar menu or slot placeholder in the page template.',
  );
  process.exit(1);
}

// ─── Component: add prop + toRef ─────────────────────────────────────────────

/**
 * Add a typed prop + toRef to the component. Creates defineProps from scratch if absent.
 */
export function addComponentParam(componentSrc, camelName, tsType) {
  const propLine = `  ${camelName}: ${tsType};`;
  const toRefLine = `const ${camelName} = toRef(props, '${camelName}');`;

  if (componentSrc.includes('defineProps<{')) {
    const closeIdx = componentSrc.indexOf('}>()');
    if (closeIdx === -1) {
      console.error(
        'Error: found `defineProps<{` but could not find its closing `}>()` in the component.',
      );
      process.exit(1);
    }
    let src =
      componentSrc.slice(0, closeIdx) +
      `${propLine}\n` +
      componentSrc.slice(closeIdx);

    const lines = src.split('\n');
    let lastToRefIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('= toRef(props,')) lastToRefIdx = i;
    }

    if (lastToRefIdx !== -1) {
      lines.splice(lastToRefIdx + 1, 0, toRefLine);
    } else {
      const closeLineIdx = lines.findIndex((l) => l.includes('}>()'));
      lines.splice(closeLineIdx + 1, 0, toRefLine);
    }
    return lines.join('\n');
  }

  const anchor = 'const appStore = useAppStore();';
  const anchorIdx = componentSrc.indexOf(anchor);
  if (anchorIdx === -1) {
    console.error(
      'Error: could not find `const appStore = useAppStore();` to anchor the new defineProps block.',
    );
    process.exit(1);
  }
  const block = `const props = defineProps<{\n${propLine}\n}>();\n\n${toRefLine}\n\n`;
  return (
    componentSrc.slice(0, anchorIdx) + block + componentSrc.slice(anchorIdx)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT operations
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Page: edit ref default value ────────────────────────────────────────────

/**
 * Replace the default value in `const <camelName> = ref(oldValue);` with newValue.
 * newValue should already be formatted for source (e.g. numbers as-is, strings quoted).
 */
export function editPageRef(pageSrc, camelName, newValue) {
  const pattern = new RegExp(`(const ${camelName} = ref\\()([^)]+)(\\))`);
  if (!pattern.test(pageSrc)) {
    console.error(
      `Error: could not find \`const ${camelName} = ref(...)\` in page script.`,
    );
    process.exit(1);
  }
  return pageSrc.replace(pattern, `$1${newValue}$3`);
}

// ─── Page: edit slider attributes ────────────────────────────────────────────

/**
 * Edit one or more attributes inside all v-slider blocks bound to camelName.
 * attrs is an object: { label, min, max, step } — only provided keys are updated.
 * Updates both the init overlay and toolbar occurrences in one pass.
 */
export function editSliderAttributes(pageSrc, camelName, attrs) {
  let src = pageSrc;
  const vModelStr = `v-model="${camelName}"`;

  if (attrs.label !== undefined) {
    src = editAttrInSelfClosingBlocks(
      src,
      'v-slider',
      vModelStr,
      /label="[^"]*"/,
      `label="${attrs.label}"`,
    );
  }
  if (attrs.min !== undefined) {
    src = editAttrInSelfClosingBlocks(
      src,
      'v-slider',
      vModelStr,
      /:min="[^"]*"/,
      `:min="${attrs.min}"`,
    );
  }
  if (attrs.max !== undefined) {
    src = editAttrInSelfClosingBlocks(
      src,
      'v-slider',
      vModelStr,
      /:max="[^"]*"/,
      `:max="${attrs.max}"`,
    );
  }
  if (attrs.step !== undefined) {
    src = editAttrInSelfClosingBlocks(
      src,
      'v-slider',
      vModelStr,
      /:step="[^"]*"/,
      `:step="${attrs.step}"`,
    );
  }
  return src;
}

// ─── Page: edit input label ───────────────────────────────────────────────────

/** Edit the label inside all v-text-field blocks bound (via v-model.number) to camelName. */
export function editInputLabel(pageSrc, camelName, newLabel) {
  return editAttrInSelfClosingBlocks(
    pageSrc,
    'v-text-field',
    `v-model.number="${camelName}"`,
    /label="[^"]*"/,
    `label="${newLabel}"`,
  );
}

// ─── Page: edit color picker label ───────────────────────────────────────────

/**
 * Replace the label text in all `<p class="text-caption...">Label</p>` elements
 * that immediately precede the color picker button for camelName.
 */
export function editColorPickerLabel(pageSrc, camelName, newLabel) {
  let result = pageSrc;
  let searchFrom = 0;

  while (true) {
    const colorIdx = result.indexOf(`:color="${camelName}"`, searchFrom);
    if (colorIdx === -1) break;

    const pOpen = result.lastIndexOf('<p class="text-caption', colorIdx);
    if (pOpen === -1) {
      searchFrom = colorIdx + 1;
      continue;
    }

    const contentStart = result.indexOf('>', pOpen) + 1;
    const contentEnd = result.indexOf('</p>', pOpen);
    if (contentEnd === -1 || contentEnd > colorIdx) {
      searchFrom = colorIdx + 1;
      continue;
    }

    result =
      result.slice(0, contentStart) + newLabel + result.slice(contentEnd);
    searchFrom = contentStart + newLabel.length;
  }

  return result;
}

// ─── Rename param (name + label together) ────────────────────────────────────

/**
 * Rename a parameter across both files — code name AND visual label.
 *
 * Updates in pageSrc:
 *   - `const oldName = ref(` → `const newName = ref(`
 *   - Canvas tag prop binding (kebab form)
 *   - v-model / v-model.number / :color / {{ oldName }} in template
 *   - Visual label text (derived from newName via toTitle)
 *
 * Updates in componentSrc:
 *   - `oldName: type;` inside defineProps
 *   - `const oldName = toRef(props, 'oldName')`
 *
 * Returns { pageSrc, componentSrc } with all substitutions applied.
 * Does NOT check for duplicate names — callers must call assertNoDuplicate first.
 */
export function renameParam(
  pageSrc,
  componentSrc,
  oldCamel,
  newCamel,
  paramType,
) {
  const oldKebab = toKebab(oldCamel);
  const newKebab = toKebab(newCamel);
  const newLabel = toTitle(newKebab);

  // ── Page ──────────────────────────────────────────────────────────────────

  let p = pageSrc;

  // Script: ref declaration name
  p = p.replace(`const ${oldCamel} = ref(`, `const ${newCamel} = ref(`);

  // Canvas tag: prop binding (both the kebab attribute name and the camel value)
  p = p.replace(`:${oldKebab}="${oldCamel}"`, `:${newKebab}="${newCamel}"`);

  // Template: v-model bindings (slider + color picker use plain v-model, input uses .number)
  p = p.replaceAll(`v-model="${oldCamel}"`, `v-model="${newCamel}"`);
  p = p.replaceAll(
    `v-model.number="${oldCamel}"`,
    `v-model.number="${newCamel}"`,
  );

  // Template: color picker specifics
  p = p.replaceAll(`:color="${oldCamel}"`, `:color="${newCamel}"`);
  p = p.replaceAll(`{{ ${oldCamel} }}`, `{{ ${newCamel} }}`);

  // Template: update visual label (runs after v-model rename so finders use newCamel)
  if (paramType === 'slider') {
    p = editSliderAttributes(p, newCamel, { label: newLabel });
  } else if (paramType === 'input') {
    p = editInputLabel(p, newCamel, newLabel);
  } else if (paramType === 'color') {
    p = editColorPickerLabel(p, newCamel, newLabel);
  }

  // ── Component ─────────────────────────────────────────────────────────────

  let c = componentSrc;

  // defineProps prop type line (handles both number and string)
  c = c
    .replace(`  ${oldCamel}: number;`, `  ${newCamel}: number;`)
    .replace(`  ${oldCamel}: string;`, `  ${newCamel}: string;`);

  // toRef declaration (both const name and the string key)
  c = c.replace(
    `const ${oldCamel} = toRef(props, '${oldCamel}')`,
    `const ${newCamel} = toRef(props, '${newCamel}')`,
  );

  return { pageSrc: p, componentSrc: c };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE operations
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Page: delete ref ────────────────────────────────────────────────────────

/** Remove the `const <camelName> = ref(...);` line from the page script. */
export function deletePageRef(pageSrc, camelName) {
  const lines = pageSrc.split('\n');
  const idx = lines.findIndex((l) =>
    new RegExp(`^const ${camelName} = ref\\(`).test(l.trimStart()),
  );
  if (idx !== -1) lines.splice(idx, 1);
  return lines.join('\n');
}

// ─── Page: delete canvas tag prop ────────────────────────────────────────────

/** Remove the `:<kebab-name>="<camelName>"` line from the canvas component tag. */
export function deleteCanvasTagProp(pageSrc, camelName) {
  const kebabProp = toKebab(camelName);
  const lines = pageSrc.split('\n');
  const idx = lines.findIndex((l) =>
    l.includes(`:${kebabProp}="${camelName}"`),
  );
  if (idx !== -1) lines.splice(idx, 1);
  return lines.join('\n');
}

// ─── Page: delete slider blocks ──────────────────────────────────────────────

/** Remove all `<v-slider ... v-model="camelName" ... />` blocks (init overlay + toolbar). */
export function deleteSliderBlocks(pageSrc, camelName) {
  return removeSelfClosingBlocks(pageSrc, 'v-slider', `v-model="${camelName}"`);
}

// ─── Page: delete input blocks ───────────────────────────────────────────────

/** Remove all `<v-text-field ... v-model.number="camelName" ... />` blocks. */
export function deleteInputBlocks(pageSrc, camelName) {
  return removeSelfClosingBlocks(
    pageSrc,
    'v-text-field',
    `v-model.number="${camelName}"`,
  );
}

// ─── Page: delete color picker blocks ────────────────────────────────────────

/**
 * Remove all color picker blocks for camelName — each block is:
 *   `<p class="text-caption...">Label</p>`
 *   `<v-menu :close-on-content-click="false">...<v-color-picker v-model="camelName" .../>...</v-menu>`
 */
export function deleteColorPickerBlocks(pageSrc, camelName) {
  let result = pageSrc;

  while (result.includes(`:color="${camelName}"`)) {
    const lines = result.split('\n');
    const colorIdx = lines.findIndex((l) =>
      l.includes(`:color="${camelName}"`),
    );
    if (colorIdx === -1) break;

    // Walk back to the <p class="text-caption..."> label line
    let pIdx = colorIdx;
    while (
      pIdx > 0 &&
      !lines[pIdx].trimStart().startsWith('<p class="text-caption')
    )
      pIdx--;
    if (!lines[pIdx].trimStart().startsWith('<p class="text-caption')) {
      console.error(
        `Error: could not find label <p> tag for color picker '${camelName}'.`,
      );
      process.exit(1);
    }

    // Walk forward to the <v-menu :close-on-content-click (the inner picker menu)
    let menuOpenIdx = pIdx + 1;
    while (
      menuOpenIdx < lines.length &&
      !lines[menuOpenIdx].trimStart().startsWith('<v-menu')
    )
      menuOpenIdx++;
    if (menuOpenIdx >= lines.length) {
      console.error(
        `Error: could not find <v-menu for color picker '${camelName}'.`,
      );
      process.exit(1);
    }

    // Count nesting to find the matching </v-menu>
    let depth = 0;
    let closeIdx = menuOpenIdx;
    while (closeIdx < lines.length) {
      if (lines[closeIdx].includes('<v-menu')) depth++;
      if (lines[closeIdx].includes('</v-menu>')) {
        depth--;
        if (depth === 0) break;
      }
      closeIdx++;
    }
    if (depth !== 0) {
      console.error(
        `Error: unmatched </v-menu> when removing color picker '${camelName}'.`,
      );
      process.exit(1);
    }

    lines.splice(pIdx, closeIdx - pIdx + 1);
    result = lines.join('\n');
  }

  return result;
}

// ─── Component: delete prop + toRef ─────────────────────────────────────────

/**
 * Remove `camelName: type;` from defineProps and `const camelName = toRef(...)`.
 * If defineProps is left empty afterwards, removes the entire `const props = ...` block.
 */
export function deleteComponentParam(componentSrc, camelName) {
  const lines = componentSrc.split('\n');

  // Remove toRef line
  const toRefIdx = lines.findIndex((l) =>
    l.includes(`= toRef(props, '${camelName}')`),
  );
  if (toRefIdx !== -1) lines.splice(toRefIdx, 1);

  // Remove prop type line
  const propPattern = new RegExp(`^\\s+${camelName}:\\s+(number|string);\\s*$`);
  const propIdx = lines.findIndex((l) => propPattern.test(l));
  if (propIdx !== -1) lines.splice(propIdx, 1);

  let result = lines.join('\n');

  // If defineProps is now empty, remove the entire const props = ... block
  if (/const props = defineProps<\{\s*\}>\(\);/.test(result)) {
    result = result.replace(/const props = defineProps<\{\s*\}>\(\);\n?/, '');
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal helpers (not exported)
// ═══════════════════════════════════════════════════════════════════════════════

/** Insert newText as line(s) immediately before the first line containing anchor. */
function insertLineBefore(src, anchor, newText) {
  const lines = src.split('\n');
  const idx = lines.findIndex((l) => l.includes(anchor));
  if (idx === -1) return src;
  lines.splice(idx, 0, newText);
  return lines.join('\n');
}

/**
 * Find every `<tagName ... identifyingStr ... />` block in src and remove it.
 * Loops until no more occurrences exist (handles init overlay + toolbar both).
 */
function removeSelfClosingBlocks(src, tagName, identifyingStr) {
  let result = src;

  while (result.includes(identifyingStr)) {
    const lines = result.split('\n');
    const identIdx = lines.findIndex((l) => l.includes(identifyingStr));
    if (identIdx === -1) break;

    // Walk back to the opening <tagName line
    let openIdx = identIdx;
    while (openIdx > 0 && !lines[openIdx].trimStart().startsWith(`<${tagName}`))
      openIdx--;
    if (!lines[openIdx].trimStart().startsWith(`<${tagName}`)) {
      console.error(
        `Error: could not find <${tagName}> opening tag for '${identifyingStr}'.`,
      );
      process.exit(1);
    }

    // Walk forward to the closing /> line
    let closeIdx = identIdx;
    while (closeIdx < lines.length && lines[closeIdx].trim() !== '/>')
      closeIdx++;
    if (closeIdx >= lines.length) {
      console.error(
        `Error: could not find closing /> for '${identifyingStr}'.`,
      );
      process.exit(1);
    }

    lines.splice(openIdx, closeIdx - openIdx + 1);
    result = lines.join('\n');
  }

  return result;
}

/**
 * Find every `<tagName ... vModelStr ... />` block and replace the first match of
 * pattern with replacement inside each block.
 */
function editAttrInSelfClosingBlocks(
  src,
  tagName,
  vModelStr,
  pattern,
  replacement,
) {
  let result = src;
  let searchFrom = 0;

  while (true) {
    const vModelIdx = result.indexOf(vModelStr, searchFrom);
    if (vModelIdx === -1) break;

    const tagStart = result.lastIndexOf(`<${tagName}`, vModelIdx);
    if (tagStart === -1) {
      searchFrom = vModelIdx + 1;
      continue;
    }

    const tagEnd = result.indexOf('/>', vModelIdx) + 2;
    const block = result.slice(tagStart, tagEnd);
    const newBlock = block.replace(pattern, replacement);

    result = result.slice(0, tagStart) + newBlock + result.slice(tagEnd);
    searchFrom = tagStart + newBlock.length;
  }

  return result;
}
