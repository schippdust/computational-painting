<script setup lang="ts">
import BranchingUpwardCanvas from '@/components/BranchingUpwardCanvas.vue';
import CanvasToolbar from '@/components/CanvasToolbar.vue';
import CanvasInitOverlay from '@/components/CanvasInitOverlay.vue';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const router = useRouter();
const appStore = useAppStore();
const {
  initialized,
  canvasWidth,
  canvasHeight,
  cameraInitPos,
  cameraInitTarget,
  cameraInitFOV,
  darkMode,
} = storeToRefs(appStore);

// Set camera defaults for this canvas before the overlay is shown.
appStore.setCameraInitPos(8000, -8000, 9000);
appStore.setCameraInitTarget(0, 0, 0);
appStore.setCameraInitFOV(50);

function goHome() {
  appStore.resetInitialization();
  router.push('/');
}

const generationCircleRadius = ref(2000);
const falloff = ref(0.001);
const maxStartingVelocity = ref(25);

const paramMenuOpen = ref(false);
const zoom = ref(1);

const canvasKey = ref(0);

function resetCanvas() {
  canvasKey.value++;
}
const canvasRef = ref<{ numberOfFrames: number } | null>(null);
const currentFrame = computed(() => canvasRef.value?.numberOfFrames ?? 0);

function handleAutomateCapture(filename: string) {
  const canvas = document.querySelector(
    '#branching-upward-canvas canvas',
  ) as HTMLCanvasElement;
  if (canvas) {
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
  setTimeout(() => resetCanvas(), 50);
}

function handleAutomateComplete() {
  goHome();
}
const ZOOM_STEP = 0.05;
const ZOOM_MIN = 0.05;
const ZOOM_MAX = 4;

// Points at the inner scroll container, not the outer wrapper.
// clientWidth/clientHeight here exclude any visible scrollbar — correct for fit math.
const canvasAreaRef = ref<HTMLElement | null>(null);

// Track vertical scrollbar width so the home button stays 8px from its left edge.
const scrollbarWidth = ref(0);
let resizeObserver: ResizeObserver | null = null;

function handleFit() {
  if (!canvasAreaRef.value) return;
  const fitW = canvasAreaRef.value.clientWidth / canvasWidth.value;
  const fitH = canvasAreaRef.value.clientHeight / canvasHeight.value;
  // Floor to 3 decimal places — rounding up would make the canvas fractionally
  // larger than the container and trigger a scrollbar.
  zoom.value = Math.floor(Math.min(fitW, fitH) * 1000) / 1000;
}

// Fit the canvas to the viewport as soon as the init overlay is confirmed.
watch(initialized, (isInit) => {
  if (isInit) nextTick(() => handleFit());
});

function handleKeydown(e: KeyboardEvent) {
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement
  )
    return;
  if (e.key === '+' || e.key === '=') {
    zoom.value = Math.min(
      ZOOM_MAX,
      parseFloat((zoom.value + ZOOM_STEP).toFixed(2)),
    );
  } else if (e.key === '-') {
    zoom.value = Math.max(
      ZOOM_MIN,
      parseFloat((zoom.value - ZOOM_STEP).toFixed(2)),
    );
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
        (canvasAreaRef.value?.clientWidth ?? 0);
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
      :current-frame="currentFrame"
      @fit="handleFit"
      @reset="resetCanvas"
      @automate-capture="handleAutomateCapture"
      @automate-complete="handleAutomateComplete"
    >
      <!-- Parameters menu -->
      <v-menu
        v-model="paramMenuOpen"
        :close-on-content-click="false"
        location="end"
      >
        <template #activator="{ props: menuProps }">
          <v-tooltip text="Canvas parameters" location="right">
            <template #activator="{ props: tip }">
              <v-btn
                variant="text"
                icon="mdi-tune"
                density="compact"
                v-bind="{ ...menuProps, ...tip }"
                @click="menuProps.onClick"
              />
            </template>
          </v-tooltip>
        </template>
        <v-card min-width="260">
          <v-card-text class="pt-3">
            <v-slider
              v-model="generationCircleRadius"
              label="Generation Circle Radius"
              :min="100"
              :max="10000"
              :step="100"
              hide-details
              class="mb-4"
            />
            <v-slider
              v-model="falloff"
              label="Falloff"
              :min="0.0001"
              :max="0.01"
              :step="0.0001"
              hide-details
              class="mb-4"
            />
            <v-slider
              v-model="maxStartingVelocity"
              label="Max Starting Velocity"
              :min="1"
              :max="100"
              :step="1"
              hide-details
            />
          </v-card-text>
        </v-card>
      </v-menu>
    </canvas-toolbar>

    <!-- Outer wrapper: position:relative, no overflow — anchors the UI overlay -->
    <div
      class="canvas-area"
      :style="{ background: darkMode ? '#2d2d2d' : '#f0f0f0' }"
    >
      <!-- Scrollable canvas layer — ref used for fit measurements -->
      <div ref="canvasAreaRef" class="canvas-scroll">
        <div class="canvas-zoom-wrapper" :style="{ zoom: zoom }">
          <branching-upward-canvas
            ref="canvasRef"
            v-if="initialized"
            :key="canvasKey"
            :generation-circle-radius="generationCircleRadius"
            :falloff="falloff"
            :max-starting-velocity="maxStartingVelocity"
          />
        </div>
      </div>

      <!-- Non-scrolling UI overlay — sits above the canvas, doesn't move with scroll -->
      <div
        class="canvas-ui-layer"
        :style="{ paddingRight: `${8 + scrollbarWidth}px` }"
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

      <canvas-init-overlay v-if="!initialized" :width="560">
        <v-divider class="my-3" />
        <p class="text-subtitle-2 mb-2">Parameters</p>

        <v-slider
          v-model="generationCircleRadius"
          label="Generation Circle Radius"
          :min="100"
          :max="10000"
          :step="100"
          thumb-label
          hide-details
          class="mb-2"
        />
        <v-slider
          v-model="falloff"
          label="Falloff"
          :min="0.0001"
          :max="0.01"
          :step="0.0001"
          thumb-label
          hide-details
          class="mb-2"
        />
        <v-slider
          v-model="maxStartingVelocity"
          label="Max Starting Velocity"
          :min="1"
          :max="100"
          :step="1"
          thumb-label
          hide-details
          class="mb-3"
        />

        <v-divider class="my-3" />
        <p class="text-subtitle-2 mb-2">Camera</p>

        <p class="text-caption text-medium-emphasis mb-1">Position</p>
        <v-row dense class="mb-2">
          <v-col>
            <v-text-field
              variant="outlined"
              label="X"
              type="number"
              density="compact"
              hide-details
              :model-value="cameraInitPos.x"
              @update:model-value="
                (v) =>
                  appStore.setCameraInitPos(
                    +v,
                    cameraInitPos.y,
                    cameraInitPos.z,
                  )
              "
            />
          </v-col>
          <v-col>
            <v-text-field
              variant="outlined"
              label="Y"
              type="number"
              density="compact"
              hide-details
              :model-value="cameraInitPos.y"
              @update:model-value="
                (v) =>
                  appStore.setCameraInitPos(
                    cameraInitPos.x,
                    +v,
                    cameraInitPos.z,
                  )
              "
            />
          </v-col>
          <v-col>
            <v-text-field
              variant="outlined"
              label="Z"
              type="number"
              density="compact"
              hide-details
              :model-value="cameraInitPos.z"
              @update:model-value="
                (v) =>
                  appStore.setCameraInitPos(
                    cameraInitPos.x,
                    cameraInitPos.y,
                    +v,
                  )
              "
            />
          </v-col>
        </v-row>

        <p class="text-caption text-medium-emphasis mb-1">Look At</p>
        <v-row dense class="mb-2">
          <v-col>
            <v-text-field
              variant="outlined"
              label="X"
              type="number"
              density="compact"
              hide-details
              :model-value="cameraInitTarget.x"
              @update:model-value="
                (v) =>
                  appStore.setCameraInitTarget(
                    +v,
                    cameraInitTarget.y,
                    cameraInitTarget.z,
                  )
              "
            />
          </v-col>
          <v-col>
            <v-text-field
              variant="outlined"
              label="Y"
              type="number"
              density="compact"
              hide-details
              :model-value="cameraInitTarget.y"
              @update:model-value="
                (v) =>
                  appStore.setCameraInitTarget(
                    cameraInitTarget.x,
                    +v,
                    cameraInitTarget.z,
                  )
              "
            />
          </v-col>
          <v-col>
            <v-text-field
              variant="outlined"
              label="Z"
              type="number"
              density="compact"
              hide-details
              :model-value="cameraInitTarget.z"
              @update:model-value="
                (v) =>
                  appStore.setCameraInitTarget(
                    cameraInitTarget.x,
                    cameraInitTarget.y,
                    +v,
                  )
              "
            />
          </v-col>
        </v-row>

        <v-row dense>
          <v-col cols="4">
            <v-text-field
              variant="outlined"
              label="Field of View (°)"
              type="number"
              density="compact"
              hide-details
              :model-value="cameraInitFOV"
              @update:model-value="(v) => appStore.setCameraInitFOV(+v)"
            />
          </v-col>
        </v-row>
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
