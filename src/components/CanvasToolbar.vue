<script setup lang="ts">
import { mergeProps } from 'vue';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const appStore = useAppStore();
const { pauseCanvas, darkMode, primaryColor, secondaryColor, backgroundColor } =
  storeToRefs(appStore);

const props = defineProps<{
  zoom: number;
  /** Current frame count from the active canvas component. Used by automation to know when a run is complete. */
  currentFrame?: number;
}>();

const emit = defineEmits<{
  'update:zoom': [value: number];
  fit: [];
  reset: [];
  /** Fired when a run completes. The page should download the canvas and then call resetCanvas(). */
  'automate-capture': [filename: string];
  /** Fired when all runs are done. The page should navigate home. */
  'automate-complete': [];
}>();

// Expanded = icon-only toolbar (default). Condensed = thin strip + floating toggle.
const expanded = ref(true);

const ZOOM_STEP = 0.05;
const ZOOM_MIN = 0.05;
const ZOOM_MAX = 4;

function zoomIn() {
  emit(
    'update:zoom',
    Math.min(ZOOM_MAX, parseFloat((props.zoom + ZOOM_STEP).toFixed(2))),
  );
}
function zoomOut() {
  emit(
    'update:zoom',
    Math.max(ZOOM_MIN, parseFloat((props.zoom - ZOOM_STEP).toFixed(2))),
  );
}
function zoomReset() {
  emit('update:zoom', 1);
}

const zoomLabel = computed(() => `${Math.round(props.zoom * 100)}%`);

// ─── Color pickers ────────────────────────────────────────────────────────────
// Only one picker may be open at a time. tempColor holds the in-progress value
// until the user confirms; cancelling (or clicking outside) discards it.

const primaryMenuOpen = ref(false);
const secondaryMenuOpen = ref(false);
const backgroundMenuOpen = ref(false);
const tempColor = ref('#ffffff');

watch(primaryMenuOpen, (open) => {
  if (open) {
    secondaryMenuOpen.value = false;
    backgroundMenuOpen.value = false;
    tempColor.value = primaryColor.value;
  }
});

watch(secondaryMenuOpen, (open) => {
  if (open) {
    primaryMenuOpen.value = false;
    backgroundMenuOpen.value = false;
    tempColor.value = secondaryColor.value;
  }
});

watch(backgroundMenuOpen, (open) => {
  if (open) {
    primaryMenuOpen.value = false;
    secondaryMenuOpen.value = false;
    tempColor.value = backgroundColor.value;
  }
});

function confirmColor(key: 'primary' | 'secondary' | 'background') {
  if (key === 'primary') {
    appStore.setPrimaryColor(tempColor.value);
    primaryMenuOpen.value = false;
  } else if (key === 'secondary') {
    appStore.setSecondaryColor(tempColor.value);
    secondaryMenuOpen.value = false;
  } else {
    appStore.setBackgroundColor(tempColor.value);
    backgroundMenuOpen.value = false;
  }
}

function cancelColor(key: 'primary' | 'secondary' | 'background') {
  if (key === 'primary') primaryMenuOpen.value = false;
  else if (key === 'secondary') secondaryMenuOpen.value = false;
  else backgroundMenuOpen.value = false;
}

// ─── Dark mode ────────────────────────────────────────────────────────────────
// Canvas page toggle: preserve user's chosen colors (applyColorDefaults = false).
// The home page toggle (applyColorDefaults = true) resets to mode defaults.

function toggleDarkMode() {
  appStore.setDarkMode(!darkMode.value, false);
}

// ─── Automation ───────────────────────────────────────────────────────────────
// Watches currentFrame prop. When a run reaches targetFrames, fires automate-capture
// so the page can download the canvas and reset. After all runs, fires automate-complete.

const automationMenuOpen = ref(false);
const automating = ref(false);
const targetFrames = ref(300);
const totalRuns = ref(5);
const automationFilename = ref('output');
const currentRun = ref(1);
// Guards against double-triggering while the canvas is resetting (frame briefly
// stays above threshold until the new component mounts and resets it to 0).
const runTriggered = ref(false);

const automationProgress = computed(() =>
  Math.min(
    100,
    Math.round(((props.currentFrame ?? 0) / targetFrames.value) * 100),
  ),
);

function startAutomation() {
  currentRun.value = 1;
  runTriggered.value = false;
  automating.value = true;
  automationMenuOpen.value = false;
}

function stopAutomation() {
  automating.value = false;
}

watch(
  () => props.currentFrame,
  (frame = 0) => {
    if (!automating.value) return;

    // The canvas resets to frame 0 after each run. Clear the guard once the
    // new component has started (frame is back near zero).
    if (frame <= 1) {
      runTriggered.value = false;
    }

    // Trigger once per run when the threshold is reached.
    if (!runTriggered.value && frame >= targetFrames.value) {
      runTriggered.value = true;
      const paddedRun = String(currentRun.value).padStart(3, '0');
      emit('automate-capture', `${paddedRun}-${automationFilename.value}`);
      currentRun.value++;
      if (currentRun.value > totalRuns.value) {
        automating.value = false;
        emit('automate-complete');
      }
    }
  },
);
</script>

<template>
  <!-- Thin strip shown when condensed -->
  <div
    class="canvas-toolbar"
    :class="{ 'canvas-toolbar--condensed': !expanded }"
  >
    <template v-if="expanded">
      <!-- Collapse -->
      <v-tooltip text="Collapse toolbar" location="right">
        <template #activator="{ props: tip }">
          <v-btn
            variant="text"
            icon="mdi-chevron-left"
            density="compact"
            v-bind="tip"
            @click="expanded = false"
          />
        </template>
      </v-tooltip>

      <v-divider class="my-1 w-100" />

      <!-- Play / Pause -->
      <v-tooltip
        :text="`${pauseCanvas ? 'Play' : 'Pause'} — or press Spacebar`"
        location="right"
      >
        <template #activator="{ props: tip }">
          <v-btn
            variant="text"
            :icon="pauseCanvas ? 'mdi-play' : 'mdi-pause'"
            density="compact"
            v-bind="tip"
            @click="appStore.togglePause()"
          />
        </template>
      </v-tooltip>

      <v-divider class="my-1 w-100" />

      <!-- Zoom In -->
      <v-tooltip text="Zoom in  ( + )" location="right">
        <template #activator="{ props: tip }">
          <v-btn
            variant="text"
            icon="mdi-plus"
            density="compact"
            v-bind="tip"
            @click="zoomIn"
          />
        </template>
      </v-tooltip>

      <!-- Zoom % label — click to reset -->
      <v-tooltip text="Reset zoom  ( 0 )" location="right">
        <template #activator="{ props: tip }">
          <span class="zoom-pct" v-bind="tip" @click="zoomReset">{{
            zoomLabel
          }}</span>
        </template>
      </v-tooltip>

      <!-- Zoom Out -->
      <v-tooltip text="Zoom out  ( − )" location="right">
        <template #activator="{ props: tip }">
          <v-btn
            variant="text"
            icon="mdi-minus"
            density="compact"
            v-bind="tip"
            @click="zoomOut"
          />
        </template>
      </v-tooltip>

      <v-divider class="my-1 w-100" />

      <!-- Fit to view -->
      <v-tooltip text="Fit to view" location="right">
        <template #activator="{ props: tip }">
          <v-btn
            variant="text"
            icon="mdi-fit-to-page-outline"
            density="compact"
            v-bind="tip"
            @click="emit('fit')"
          />
        </template>
      </v-tooltip>

      <v-divider class="my-1 w-100" />

      <!-- Primary color -->
      <v-menu
        v-model="primaryMenuOpen"
        :close-on-content-click="false"
        location="end"
      >
        <template #activator="{ props: menuProps }">
          <v-tooltip text="Primary color" location="right">
            <template #activator="{ props: tip }">
              <v-btn
                class="color-picker-btn"
                density="compact"
                variant="text"
                v-bind="mergeProps(menuProps, tip)"
              >
                <div class="color-picker-btn__content">
                  <v-icon size="18">mdi-format-color-fill</v-icon>
                  <div
                    class="color-picker-btn__swatch"
                    :style="{ background: primaryColor }"
                  />
                </div>
              </v-btn>
            </template>
          </v-tooltip>
        </template>
        <v-card min-width="280">
          <v-color-picker v-model="tempColor" :modes="['hex', 'rgb']" />
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" size="small" @click="cancelColor('primary')"
              >Cancel</v-btn
            >
            <v-btn variant="flat" size="small" @click="confirmColor('primary')"
              >Apply</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-menu>

      <div class="color-gap" />

      <!-- Secondary color -->
      <v-menu
        v-model="secondaryMenuOpen"
        :close-on-content-click="false"
        location="end"
      >
        <template #activator="{ props: menuProps }">
          <v-tooltip text="Secondary color" location="right">
            <template #activator="{ props: tip }">
              <v-btn
                class="color-picker-btn"
                density="compact"
                variant="text"
                v-bind="mergeProps(menuProps, tip)"
              >
                <div class="color-picker-btn__content">
                  <v-icon size="18">mdi-format-color-fill</v-icon>
                  <div
                    class="color-picker-btn__swatch"
                    :style="{ background: secondaryColor }"
                  />
                </div>
              </v-btn>
            </template>
          </v-tooltip>
        </template>
        <v-card min-width="280">
          <v-color-picker v-model="tempColor" :modes="['hex', 'rgb']" />
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" size="small" @click="cancelColor('secondary')"
              >Cancel</v-btn
            >
            <v-btn
              variant="flat"
              size="small"
              @click="confirmColor('secondary')"
              >Apply</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-menu>

      <div class="color-gap" />

      <!-- Background color -->
      <v-menu
        v-model="backgroundMenuOpen"
        :close-on-content-click="false"
        location="end"
      >
        <template #activator="{ props: menuProps }">
          <v-tooltip text="Background color" location="right">
            <template #activator="{ props: tip }">
              <v-btn
                class="color-picker-btn"
                density="compact"
                variant="text"
                v-bind="mergeProps(menuProps, tip)"
              >
                <div class="color-picker-btn__content">
                  <v-icon size="18">mdi-format-color-fill</v-icon>
                  <div
                    class="color-picker-btn__swatch"
                    :style="{ background: backgroundColor }"
                  />
                </div>
              </v-btn>
            </template>
          </v-tooltip>
        </template>
        <v-card min-width="280">
          <v-color-picker v-model="tempColor" :modes="['hex', 'rgb']" />
          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              size="small"
              @click="cancelColor('background')"
              >Cancel</v-btn
            >
            <v-btn
              variant="flat"
              size="small"
              @click="confirmColor('background')"
              >Apply</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-menu>

      <v-divider class="my-1 w-100" />

      <!-- Canvas-specific tools -->
      <slot />

      <!-- Push bottom actions to the bottom -->
      <div class="toolbar-spacer" />

      <v-divider class="my-1 w-100" />

      <!-- Restart canvas -->
      <v-tooltip text="Restart canvas" location="right">
        <template #activator="{ props: tip }">
          <v-btn
            variant="text"
            icon="mdi-refresh"
            density="compact"
            v-bind="tip"
            @click="emit('reset')"
          />
        </template>
      </v-tooltip>

      <v-divider class="my-1 w-100" />

      <!-- Automate iteration -->
      <v-menu
        v-model="automationMenuOpen"
        :close-on-content-click="false"
        location="end"
      >
        <template #activator="{ props: menuProps }">
          <v-tooltip
            :text="automating ? 'Automation running' : 'Automate iteration'"
            location="right"
          >
            <template #activator="{ props: tip }">
              <v-btn
                variant="text"
                :icon="
                  automating ? 'mdi-stop-circle-outline' : 'mdi-robot-outline'
                "
                density="compact"
                :color="automating ? 'error' : undefined"
                v-bind="mergeProps(menuProps, tip)"
              />
            </template>
          </v-tooltip>
        </template>

        <v-card min-width="260" class="automation-card">
          <v-card-title class="text-subtitle-2 pt-3 pb-1 px-4"
            >Automate Iteration</v-card-title
          >
          <v-card-text class="pt-1 px-4">
            <!-- Running state: show progress -->
            <template v-if="automating">
              <div class="text-body-2 mb-1">
                Run {{ currentRun - 1 }} /
                {{ totalRuns }}
              </div>
              <div class="text-caption text-medium-emphasis mb-2">
                Frame {{ currentFrame ?? 0 }} / {{ targetFrames }}
              </div>
              <v-progress-linear
                :model-value="automationProgress"
                color="primary"
                rounded
                height="6"
                class="mb-1"
              />
            </template>

            <!-- Config state -->
            <template v-else>
              <v-text-field
                v-model.number="targetFrames"
                label="Frames per run"
                type="number"
                :min="1"
                density="compact"
                variant="outlined"
                hide-details
                class="mb-3"
              />
              <v-text-field
                v-model.number="totalRuns"
                label="Number of runs"
                type="number"
                :min="1"
                density="compact"
                variant="outlined"
                hide-details
                class="mb-3"
              />
              <v-text-field
                v-model="automationFilename"
                label="File name"
                density="compact"
                variant="outlined"
                hide-details
              />
            </template>
          </v-card-text>
          <v-card-actions class="px-4 pb-3">
            <v-spacer />
            <template v-if="automating">
              <v-btn
                variant="flat"
                color="error"
                size="small"
                @click="stopAutomation"
                >Stop</v-btn
              >
            </template>
            <template v-else>
              <v-btn
                variant="text"
                size="small"
                @click="automationMenuOpen = false"
                >Cancel</v-btn
              >
              <v-btn variant="flat" size="small" @click="startAutomation"
                >Start</v-btn
              >
            </template>
          </v-card-actions>
        </v-card>
      </v-menu>

      <v-divider class="my-1 w-100" />

      <!-- Dark mode toggle -->
      <v-tooltip
        :text="darkMode ? 'Switch to light mode' : 'Switch to dark mode'"
        location="right"
      >
        <template #activator="{ props: tip }">
          <v-btn
            variant="text"
            :icon="darkMode ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            density="compact"
            v-bind="tip"
            @click="toggleDarkMode"
          />
        </template>
      </v-tooltip>
    </template>
  </div>

  <!-- Floating expand button — fixed to viewport, visible only when condensed -->
  <v-btn
    v-if="!expanded"
    class="toolbar-float-expand"
    variant="elevated"
    icon="mdi-chevron-right"
    density="compact"
    size="small"
    @click="expanded = true"
  />
</template>

<style scoped>
.canvas-toolbar {
  width: 48px;
  min-height: 100%;
  background: rgb(var(--v-theme-surface));
  border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 2px;
  transition: width 0.2s ease;
  overflow: hidden;
  flex-shrink: 0;
  z-index: 10;
}

.canvas-toolbar--condensed {
  width: 4px;
  padding: 0;
}

.zoom-pct {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  min-width: 36px;
  text-align: center;
  cursor: pointer;
  user-select: none;
  color: rgba(var(--v-theme-on-surface), 0.6);
  line-height: 1.6;
}

.zoom-pct:hover {
  color: rgb(var(--v-theme-on-surface));
}

/* Color picker buttons */
.color-picker-btn__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.color-picker-btn__swatch {
  width: 18px;
  height: 4px;
  border-radius: 2px;
  border: 1px solid rgba(128, 128, 128, 0.35);
}

/* 3px vertical gap between the three color picker buttons */
.color-gap {
  height: 3px;
  flex-shrink: 0;
}

/* Pushes bottom actions to the bottom of the toolbar */
.toolbar-spacer {
  flex: 1;
}

/* Floating expand button — sits in the upper-left corner of the viewport */
.toolbar-float-expand {
  position: fixed !important;
  top: 8px;
  left: 8px;
  z-index: 100;
  border-radius: 6px !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45) !important;
}

.automation-card {
  font-size: 0.875rem;
}
</style>
