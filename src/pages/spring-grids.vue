<script setup lang="ts">
import SpringGridsCanvas from '@/components/SpringGridsCanvas.vue';
import CanvasToolbar from '@/components/CanvasToolbar.vue';
import CanvasInitOverlay from '@/components/CanvasInitOverlay.vue';
import ToolbarNumericInput from '@/components/ToolbarNumericInput.vue';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const router = useRouter();
const appStore = useAppStore();
const {
  initialized,
  canvasWidth,
  canvasHeight,
  darkMode,
  cameraInitPos,
  cameraInitFOV,
} = storeToRefs(appStore);

function goHome() {
  appStore.resetInitialization();
  router.push('/');
}

const canvasKey = ref(0);
const zoom = ref(1);

function resetCanvas() {
  canvasKey.value++;
}

const canvasRef = ref<{ numberOfFrames: number } | null>(null);
const currentFrame = computed(() => canvasRef.value?.numberOfFrames ?? 0);

function handleAutomateCapture(filename: string) {
  const canvas = document.querySelector(
    '#spring-grids-canvas canvas',
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

const canvasAreaRef = ref<HTMLElement | null>(null);
const scrollbarWidth = ref(0);
let resizeObserver: ResizeObserver | null = null;

function handleFit() {
  if (!canvasAreaRef.value) return;
  const fitW = canvasAreaRef.value.clientWidth / canvasWidth.value;
  const fitH = canvasAreaRef.value.clientHeight / canvasHeight.value;
  zoom.value = Math.floor(Math.min(fitW, fitH) * 1000) / 1000;
}

watch(initialized, (isInit) => {
  if (isInit) nextTick(() => handleFit());
});

// ─── Init-time params (fixed when Start Drawing is clicked) ───────────────────
const gridRows = ref(15);
const gridCols = ref(15);
const gridLayers = ref(4);
const gridSpacing = ref(100);
const numAttractors = ref(8);

// ─── Runtime params (reactive, toolbar-adjustable while simulation runs) ──────
const springStiffness = ref(100);
const springDamping = ref(0.2);
const attractorStrength = ref(0.05);
const attractorRange = ref(750);

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
  // Defaults suited for a top-down view of an XY-plane spring grid.
  appStore.setCanvasDims(6000, 6000);
  appStore.setCameraInitPos(2000, 2400, 1700);
  appStore.setCameraInitTarget(0, 0, 0);
  appStore.setCameraInitFOV(60);

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
      <!-- Spring parameters -->
      <v-divider class="my-1 w-100" />
      <toolbar-numeric-input
        v-model="springStiffness"
        label="Spring Stiffness"
        icon="mdi-tune-variant"
        tooltip-text="Spring stiffness (k)"
        :min="0"
        :max="5"
        :step="0.01"
      />
      <toolbar-numeric-input
        v-model="springDamping"
        label="Spring Damping"
        icon="mdi-waves"
        tooltip-text="Spring damping"
        :min="0"
        :max="1"
        :step="0.01"
      />
      <!-- Attractor parameters -->
      <v-divider class="my-1 w-100" />
      <toolbar-numeric-input
        v-model="attractorStrength"
        label="Attractor Strength"
        icon="mdi-magnet"
        tooltip-text="Attractor strength"
        :min="0"
        :max="5"
        :step="0.01"
      />
      <toolbar-numeric-input
        v-model="attractorRange"
        label="Attractor Range"
        icon="mdi-target-variant"
        tooltip-text="Attractor range"
        :min="0"
        :max="10000"
        :step="50"
      />
    </canvas-toolbar>

    <div
      class="canvas-area"
      :style="{ background: darkMode ? '#2d2d2d' : '#f0f0f0' }"
    >
      <div ref="canvasAreaRef" class="canvas-scroll">
        <div class="canvas-zoom-wrapper" :style="{ zoom: zoom }">
          <SpringGridsCanvas
            v-if="initialized"
            ref="canvasRef"
            :key="canvasKey"
            :grid-rows="gridRows"
            :grid-cols="gridCols"
            :grid-layers="gridLayers"
            :grid-spacing="gridSpacing"
            :num-attractors="numAttractors"
            :spring-stiffness="springStiffness"
            :spring-damping="springDamping"
            :attractor-strength="attractorStrength"
            :attractor-range="attractorRange"
          />
        </div>
      </div>

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
        <!-- Grid settings -->
        <v-divider class="mb-4" />
        <div class="text-subtitle-2 mb-3">Grid</div>
        <v-row dense>
          <v-col>
            <v-text-field
              :model-value="gridRows"
              variant="outlined"
              label="Rows"
              type="number"
              density="compact"
              :min="2"
              :max="50"
              @update:model-value="
                (v) => (gridRows = Math.max(2, Math.round(Number(v))))
              "
            />
          </v-col>
          <v-col>
            <v-text-field
              :model-value="gridCols"
              variant="outlined"
              label="Columns"
              type="number"
              density="compact"
              :min="2"
              :max="50"
              @update:model-value="
                (v) => (gridCols = Math.max(2, Math.round(Number(v))))
              "
            />
          </v-col>
          <v-col>
            <v-text-field
              :model-value="gridLayers"
              variant="outlined"
              label="Layers"
              type="number"
              density="compact"
              :min="1"
              :max="20"
              @update:model-value="
                (v) => (gridLayers = Math.max(1, Math.round(Number(v))))
              "
            />
          </v-col>
          <v-col>
            <v-text-field
              :model-value="gridSpacing"
              variant="outlined"
              label="Spacing"
              type="number"
              density="compact"
              :min="20"
              :max="500"
              @update:model-value="
                (v) => (gridSpacing = Math.max(20, Number(v)))
              "
            />
          </v-col>
        </v-row>

        <!-- Spring settings -->
        <v-divider class="mb-4 mt-2" />
        <div class="text-subtitle-2 mb-3">Springs</div>
        <v-row dense>
          <v-col>
            <v-text-field
              :model-value="springStiffness"
              variant="outlined"
              label="Stiffness"
              type="number"
              density="compact"
              :min="0"
              :max="5"
              :step="0.01"
              @update:model-value="(v) => (springStiffness = Number(v))"
            />
          </v-col>
          <v-col>
            <v-text-field
              :model-value="springDamping"
              variant="outlined"
              label="Damping"
              type="number"
              density="compact"
              :min="0"
              :max="1"
              :step="0.01"
              @update:model-value="(v) => (springDamping = Number(v))"
            />
          </v-col>
        </v-row>

        <!-- Attractor settings -->
        <v-divider class="mb-4 mt-2" />
        <div class="text-subtitle-2 mb-3">Attractors</div>
        <v-row dense>
          <v-col cols="12">
            <v-slider
              v-model="numAttractors"
              :min="3"
              :max="10"
              :step="1"
              thumb-label="always"
              label="Count"
              density="compact"
              class="mt-4 mb-1"
            />
          </v-col>
        </v-row>
        <v-row dense>
          <v-col>
            <v-text-field
              :model-value="attractorStrength"
              variant="outlined"
              label="Strength"
              type="number"
              density="compact"
              :min="0"
              :max="5"
              :step="0.01"
              @update:model-value="(v) => (attractorStrength = Number(v))"
            />
          </v-col>
          <v-col>
            <v-text-field
              :model-value="attractorRange"
              variant="outlined"
              label="Range"
              type="number"
              density="compact"
              :min="0"
              :max="10000"
              :step="50"
              @update:model-value="(v) => (attractorRange = Number(v))"
            />
          </v-col>
        </v-row>

        <!-- Camera settings -->
        <v-divider class="mb-4 mt-2" />
        <div class="text-subtitle-2 mb-3">Camera</div>
        <v-row dense>
          <v-col>
            <v-text-field
              variant="outlined"
              label="Position X"
              type="number"
              density="compact"
              :model-value="cameraInitPos.x"
              @update:model-value="
                appStore.setCameraInitPos(
                  Number($event),
                  cameraInitPos.y,
                  cameraInitPos.z,
                )
              "
            />
          </v-col>
          <v-col>
            <v-text-field
              variant="outlined"
              label="Position Y"
              type="number"
              density="compact"
              :model-value="cameraInitPos.y"
              @update:model-value="
                appStore.setCameraInitPos(
                  cameraInitPos.x,
                  Number($event),
                  cameraInitPos.z,
                )
              "
            />
          </v-col>
          <v-col>
            <v-text-field
              variant="outlined"
              label="Position Z"
              type="number"
              density="compact"
              :model-value="cameraInitPos.z"
              @update:model-value="
                appStore.setCameraInitPos(
                  cameraInitPos.x,
                  cameraInitPos.y,
                  Number($event),
                )
              "
            />
          </v-col>
          <v-col>
            <v-text-field
              variant="outlined"
              label="Field of View (°)"
              type="number"
              density="compact"
              :model-value="cameraInitFOV"
              @update:model-value="appStore.setCameraInitFOV(Number($event))"
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

.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

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

.canvas-ui-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding-top: 8px;
}

.home-btn {
  pointer-events: auto;
  border-radius: 6px !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45) !important;
}
</style>
