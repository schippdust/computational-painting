<script setup lang="ts">
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const props = withDefaults(defineProps<{ width?: number }>(), { width: 480 });

const appStore = useAppStore();
const { canvasHeight, canvasWidth } = storeToRefs(appStore);

function updateWidth(val: string) {
  const n = Number(val);
  if (!isNaN(n) && n > 0) appStore.setCanvasDims(n, canvasHeight.value);
}

function updateHeight(val: string) {
  const n = Number(val);
  if (!isNaN(n) && n > 0) appStore.setCanvasDims(canvasWidth.value, n);
}
</script>

<template>
  <!--
    Scoped to the nearest positioned ancestor (the canvas-area div).
    The canvas component is not yet mounted — the overlay sits over a dark background.
  -->
  <v-overlay
    model-value
    contained
    scrim="black"
    :opacity="0.88"
    class="canvas-init-overlay"
  >
    <v-card :width="props.width" class="init-card">
      <v-card-title class="pt-5 px-6 text-h6">Setup Canvas</v-card-title>

      <v-card-text class="px-6 pb-2">
        <!-- Global settings: canvas dimensions -->
        <v-row>
          <v-col>
            <v-text-field
              variant="outlined"
              label="Canvas Width (px)"
              type="number"
              density="compact"
              :model-value="canvasWidth"
              @update:model-value="updateWidth($event)"
            />
          </v-col>
          <v-col>
            <v-text-field
              variant="outlined"
              label="Canvas Height (px)"
              type="number"
              density="compact"
              :model-value="canvasHeight"
              @update:model-value="updateHeight($event)"
            />
          </v-col>
        </v-row>

        <!-- Canvas-specific settings injected by the page -->
        <slot />
      </v-card-text>

      <v-card-actions class="px-6 pb-5">
        <v-spacer />
        <v-btn
          variant="flat"
          color="primary"
          @click="appStore.initializeCanvas()"
        >
          Start Drawing
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-overlay>
</template>

<style scoped>
.canvas-init-overlay :deep(.v-overlay__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.init-card {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}
</style>
