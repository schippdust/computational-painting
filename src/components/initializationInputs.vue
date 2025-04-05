<script setup lang="ts">
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
const appStore = useAppStore();
const { canvasHeight, canvasWidth, threadSpacing, threadWidth } =
  storeToRefs(appStore);

function updateCanvasWidth(event: string) {
  let numericalEvent = Number(event);
  if (isNaN(numericalEvent) || numericalEvent <= 0) {
    return;
  } else {
    appStore.setCanvasDims(numericalEvent, canvasHeight.value);
  }
}

function updateCanvasHeight(event: string) {
  let numericalEvent = Number(event);
  if (isNaN(numericalEvent) || numericalEvent <= 0) {
    return;
  } else {
    appStore.setCanvasDims(canvasWidth.value, numericalEvent);
  }
}

function setThreadWidth(event: string) {
  let numericalEvent = Number(event);
  if (isNaN(numericalEvent) || numericalEvent <= 0) {
    return;
  } else {
    appStore.setThreadWidth(numericalEvent);
  }
}

function setThreadSpacing(event: string) {
  let numericalEvent = Number(event);
  if (isNaN(numericalEvent) || numericalEvent <= 0) {
    return;
  } else {
    appStore.setThreadSpacing(numericalEvent);
  }
}
</script>
<template>
  <v-container>
    <v-row>
      <v-col>
        <div class="text-h5">Setup Canvas</div>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-text-field
          variant="outlined"
          label="Canvas Width (Pixels)"
          type="number"
          :model-value="canvasWidth"
          @update:model-value="updateCanvasWidth($event)"
        />
      </v-col>
      <v-col>
        <v-text-field
          variant="outlined"
          label="Canvas Height (Pixels)"
          type="number"
          :model-value="canvasHeight"
          @update:model-value="updateCanvasHeight($event)"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-text-field
          variant="outlined"
          label="Thread Thickness (Pixels)"
          type="number"
          :model-value="threadWidth"
          @update:model-value="setThreadWidth($event)"
        />
      </v-col>
      <v-col>
        <v-text-field
          variant="outlined"
          label="Thread Spacing (Pixels)"
          type="number"
          :model-value="threadSpacing"
          @update:model-value="setThreadSpacing($event)"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="3">
        <v-btn variant="outlined" @click="appStore.initializeCanvas()">
          Initialize Canvas
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
