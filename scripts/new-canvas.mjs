#!/usr/bin/env node
/**
 * Scaffold a new computational canvas iteration.
 *
 * Usage:
 *   node scripts/new-canvas.mjs <kebab-name> [description] [--group "Group Name"]
 *   npm run new-canvas -- <kebab-name> [description] [--group "Group Name"]
 *
 * Examples:
 *   npm run new-canvas -- wind-particles "Particles steered by curl noise" --group "Wind Fields"
 *   npm run new-canvas -- branching-lines --group "Branching Spheres"
 *   npm run new-canvas -- my-canvas   # no group → placed in "Uncategorized"
 *
 * Creates:
 *   src/components/<PascalName>Canvas.vue   — p5 sketch boilerplate
 *   src/pages/<kebab-name>.vue              — route page with toolbar + init overlay
 *   Appends an entry to src/canvasRegistry.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ─── Arg parsing ──────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);

let rawName;
let groupArg;
const descWords = [];

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--group') {
    groupArg = rawArgs[++i];
  } else if (!rawName) {
    rawName = rawArgs[i];
  } else {
    descWords.push(rawArgs[i]);
  }
}

if (!rawName) {
  console.error('Error: canvas name is required.\n');
  console.error(
    'Usage: node scripts/new-canvas.mjs <kebab-name> [description] [--group "Group Name"]',
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

const kebabName = toKebab(rawName);
const pascalName = toPascal(kebabName);
const title = toTitle(kebabName);
const group = groupArg ?? 'Uncategorized';
const description =
  descWords.join(' ') || `${title} — a new computational canvas iteration.`;
const today = new Date().toISOString().split('T')[0];
const canvasElementId = `${kebabName}-canvas`;

// ─── Guard: don't overwrite ───────────────────────────────────────────────────

const componentPath = resolve(root, `src/components/${pascalName}Canvas.vue`);
const pagePath = resolve(root, `src/pages/${kebabName}.vue`);

for (const p of [componentPath, pagePath]) {
  if (existsSync(p)) {
    console.error(`File already exists: ${p}\nAborting to avoid overwriting.`);
    process.exit(1);
  }
}

// ─── Canvas component ─────────────────────────────────────────────────────────
// Boilerplate: p5 instance mode, camera + store wiring, pause sync watcher,
// frame counter, and defineExpose for stats.

const componentContent = `\
<script setup lang="ts">
import P5 from 'p5';
import { pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { DotRenderer } from '@/classes/Rendering/Renderers/DotRenderer';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

// Import side-effect overloads if you need v.scatter() / v.rotate() on P5.Vector:
// import '@/classes/Geometry/VectorOverloads';

const appStore = useAppStore();
const { canvasHeight, canvasWidth, pauseCanvas, camera, primaryColor, secondaryColor, backgroundColor } =
  storeToRefs(appStore);

/** Convert a CSS hex color string to a p5-compatible [r, g, b] array. */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
}

const frameRate = ref(40);
const numberOfFrames = ref(0);
const numberOfVehicles = ref(0);

// Expose stats so the parent page can display them in the toolbar slot if desired.
defineExpose({ frameRate, numberOfFrames, numberOfVehicles });

// Keep the p5 loop in sync with the store's pause state (toggled by toolbar or spacebar).
let p5Instance: P5 | null = null;
let dotRenderer: DotRenderer | null = null;

watch(pauseCanvas, (paused) => {
  if (!p5Instance) return;
  if (paused) p5Instance.noLoop();
  else p5Instance.loop();
});

// Update dot color when primaryColor changes — future marks use the new color.
watch(primaryColor, (newColor) => {
  if (dotRenderer) dotRenderer.color = hexToRgb(newColor);
});

// Clear the canvas with the new background color when backgroundColor changes.
watch(backgroundColor, (newColor) => {
  p5Instance?.background(newColor);
});

onUnmounted(() => {
  p5Instance?.remove();
  p5Instance = null;
  dotRenderer = null;
});

onMounted(() => {
  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(backgroundColor.value);
      p5.frameRate(frameRate.value);

      dotRenderer = new DotRenderer(p5, 5, 15000, hexToRgb(primaryColor.value), camera.value);

      // TODO: initialize geometry, collections
    };

    p5.draw = () => {
      // TODO: update vehicles

      if (dotRenderer) {
        // Render visible vehicles with primary color, occluded with secondary:
        // dotRenderer.color = hexToRgb(primaryColor.value);
        // dotRenderer.renderVehicles(visibleVehicles);
        // dotRenderer.color = hexToRgb(secondaryColor.value);
        // dotRenderer.renderVehicles(occludedVehicles);
      }

      numberOfFrames.value++;
    };

    p5.keyPressed = () => {
      pressSpaceToPause(p5);
    };
  };

  const canvasElement = document.getElementById('${canvasElementId}') as HTMLElement;
  p5Instance = new P5(sketch, canvasElement);
});
</script>

<template>
  <div id="${canvasElementId}" style="overflow-y: auto; overflow-x: auto; line-height: 0"></div>
</template>
`;

// ─── Route page ───────────────────────────────────────────────────────────────
// Full-viewport flex layout: collapsible toolbar on the left, canvas area on the right.
// The init overlay is shown over the canvas area until the user confirms settings.

const pageContent = `\
<script setup lang="ts">
import ${pascalName}Canvas from '@/components/${pascalName}Canvas.vue';
import CanvasToolbar from '@/components/CanvasToolbar.vue';
import CanvasInitOverlay from '@/components/CanvasInitOverlay.vue';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const router = useRouter();
const appStore = useAppStore();
const { initialized, canvasWidth, canvasHeight, darkMode } = storeToRefs(appStore);

function goHome() {
  appStore.resetInitialization();
  router.push('/');
}

const zoom = ref(1);
const ZOOM_STEP = 0.05;
const ZOOM_MIN = 0.05;
const ZOOM_MAX = 4;

// Points at the inner scroll container — clientWidth/clientHeight exclude any visible scrollbar.
const canvasAreaRef = ref<HTMLElement | null>(null);

// Track vertical scrollbar width so the home button stays 8px from its left edge.
const scrollbarWidth = ref(0);
let resizeObserver: ResizeObserver | null = null;

function handleFit() {
  if (!canvasAreaRef.value) return;
  const fitW = canvasAreaRef.value.clientWidth / canvasWidth.value;
  const fitH = canvasAreaRef.value.clientHeight / canvasHeight.value;
  zoom.value = Math.floor(Math.min(fitW, fitH) * 1000) / 1000;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.key === '+' || e.key === '=') {
    zoom.value = Math.min(ZOOM_MAX, parseFloat((zoom.value + ZOOM_STEP).toFixed(2)));
  } else if (e.key === '-') {
    zoom.value = Math.max(ZOOM_MIN, parseFloat((zoom.value - ZOOM_STEP).toFixed(2)));
  } else if (e.key === '0') {
    zoom.value = 1;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  if (canvasAreaRef.value) {
    const update = () => {
      scrollbarWidth.value =
        (canvasAreaRef.value?.offsetWidth ?? 0) -
        (canvasAreaRef.value?.clientWidth  ?? 0);
    };
    resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(canvasAreaRef.value);
    update();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  resizeObserver?.disconnect();
  resizeObserver = null;
  // Uncomment to re-show the init overlay when the user navigates away and back:
  // appStore.resetInitialization();
});
</script>

<template>
  <div class="canvas-page">
    <canvas-toolbar
      v-model:zoom="zoom"
      @fit="handleFit"
    >
      <!-- Add canvas-specific toolbar items here via slot -->
    </canvas-toolbar>

    <!-- Outer wrapper: position:relative, no overflow — anchors the UI overlay -->
    <div class="canvas-area" :style="{ background: darkMode ? '#2d2d2d' : '#f0f0f0' }">

      <!-- Scrollable canvas layer — ref used for fit measurements -->
      <div ref="canvasAreaRef" class="canvas-scroll">
        <div class="canvas-zoom-wrapper" :style="{ zoom: zoom }">
          <${pascalName}Canvas v-if="initialized" />
        </div>
      </div>

      <!-- Non-scrolling UI overlay — sits above the canvas, doesn't move with scroll -->
      <div
        class="canvas-ui-layer"
        :style="{ paddingRight: \`\${8 + scrollbarWidth}px\` }"
      >
        <v-tooltip text="Return to gallery" location="left">
          <template #activator="{ props: tip }">
            <v-btn
              class="home-btn"
              variant="elevated"
              icon="mdi-home"
              density="compact"
              size="small"
              v-bind="tip"
              @click="goHome"
            />
          </template>
        </v-tooltip>
      </div>

      <canvas-init-overlay v-if="!initialized">
        <!-- Add canvas-specific init settings here via slot -->
      </canvas-init-overlay>
    </div>
  </div>
</template>

<style scoped>
.canvas-page {
  display: flex;
  position: fixed;
  inset: 0;
}

/* Non-scrolling wrapper — anchors the absolute children */
.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  /* background is set dynamically via :style binding — dark grey in dark mode, light grey in light mode */
}

/* The actual scroll container — fills the canvas-area exactly */
.canvas-scroll {
  position: absolute;
  inset: 0;
  overflow: auto;
}

.canvas-zoom-wrapper {
  display: inline-block;
  vertical-align: top;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.35);
}

/* Overlay layer for UI chrome — never scrolls, always covers full canvas-area */
.canvas-ui-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding-top: 8px;
  /* padding-right is set dynamically to account for vertical scrollbar width */
}

.home-btn {
  pointer-events: auto;
  border-radius: 6px !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45) !important;
}
</style>
`;

// ─── Registry entry ───────────────────────────────────────────────────────────

const registryPath = resolve(root, 'src/canvasRegistry.ts');

if (!existsSync(registryPath)) {
  console.error(`Registry not found at ${registryPath}. Has it been created?`);
  process.exit(1);
}

const newEntry = `  {
    id: '${kebabName}',
    title: '${title}',
    description: '${description}',
    createdAt: '${today}',
    group: '${group}',
  },`;

const registrySource = readFileSync(registryPath, 'utf8');

if (registrySource.includes(`id: '${kebabName}'`)) {
  console.error(
    `Registry already contains an entry with id '${kebabName}'. Aborting.`,
  );
  process.exit(1);
}

const trimmed = registrySource.trimEnd();
if (!trimmed.endsWith('];')) {
  console.error(
    'Could not locate the end of canvasRegistry array.\n' +
      'Make sure src/canvasRegistry.ts ends with the closing ];\n' +
      'You can add the entry manually:\n\n' +
      newEntry,
  );
  process.exit(1);
}
const updatedRegistry = trimmed.slice(0, -2) + `\n${newEntry}\n];\n`;

// ─── Write files ──────────────────────────────────────────────────────────────

writeFileSync(componentPath, componentContent);
console.log(`✓ Created component  src/components/${pascalName}Canvas.vue`);

writeFileSync(pagePath, pageContent);
console.log(`✓ Created page       src/pages/${kebabName}.vue`);

writeFileSync(registryPath, updatedRegistry);
console.log(`✓ Updated registry   src/canvasRegistry.ts  (group: "${group}")`);

console.log(`
Next steps:
  1. Fill in the TODO sections in src/components/${pascalName}Canvas.vue
  2. Run the dev server: npm run dev
  3. Navigate to http://localhost:3000/${kebabName}
`);
