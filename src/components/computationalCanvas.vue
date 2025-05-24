<script setup lang="ts">
import P5 from 'p5';
import { drawAxes, pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { CoordinateSystem } from '@/classes/Geometry/CoordinateSystem';
import { Circle } from '@/classes/Geometry/Circle';
import { Line } from '@/classes/Geometry/Line';

import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
import { PixelManager } from '@/classes/SystemsAndManagement/PixelManager';
import { Vehicle } from '@/classes/Agents/Vehicle';
import { TestRenderVehicle } from '@/classes/Rendering/TestRenderVehicle';
import { VehicleCollection } from '@/classes/SystemsAndManagement/VehicleCollection';
import { WindSystem } from '@/classes/SystemsAndManagement/WindSystem';

type ColorScheme = 'Black on White' | 'White on Black';

const appStore = useAppStore();
const {
  canvasHeight,
  canvasWidth,
  threadSpacing,
  threadWidth,
  pauseCanvas,
  camera,
  axisVisibility,
} = storeToRefs(appStore);

const frameRate = ref(40);
const numberOfVehicles = ref(0);

let cameraPos = new P5.Vector(5000, 0, 0);
// let cameraPos = new P5.Vector(0, 10, 7500);
let cameraFocus = new P5.Vector(0, 0, 0);
let fovDegrees = 80;
appStore.setCameraPosition(cameraPos);
appStore.setCameraTarget(cameraFocus);
appStore.setCameraFOV(fovDegrees);

onMounted(() => {
  function getSketchParams() {
    return {};
  }
  let pm: PixelManager;
  let ws: WindSystem;
  const vehicleCollection = new VehicleCollection();

  const sketch = (p5: P5) => {
    p5.setup = () => {
      pm = new PixelManager(p5);
      ws = new WindSystem(p5);
      ws.noiseScale = 0.0001;
      ws.timeScale = 1;
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(0);
      p5.frameRate(frameRate.value);
    };

    p5.draw = () => {};

    p5.mousePressed = () => {};
    p5.mouseDragged = () => {};

    p5.mouseReleased = () => {};

    p5.keyPressed = () => {
      pressSpaceToPause(p5);
    };
  };

  const canvasElement = document.getElementById(
    'computational-canvas',
  ) as HTMLElement;

  new P5(sketch, canvasElement);
});
</script>

<template>
  <div
    id="computational-canvas"
    style="overflow-y: auto; overflow-x: auto"
  ></div>
  <div>{{ frameRate }} fps</div>
  <div>{{ numberOfVehicles }} number of vehicles</div>
</template>
