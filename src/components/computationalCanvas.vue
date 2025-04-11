<script setup lang="ts">
import P5 from 'p5';
import { drawAxes, pressSpaceToPause } from '@/types and classes/DrawingUtils';

import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

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

let cameraPos = new P5.Vector(800, -500, 1000);
let cameraFocus = new P5.Vector(0, 0, 0);
let fovDegrees = 50;
appStore.setCameraPosition(cameraPos);
appStore.setCameraTarget(cameraFocus);
// appStore.setCameraFOV(fovDegrees);

onMounted(() => {
  function getSketchParams() {
    return {};
  }
  let cycleRadians = 0;
  let cycleIncrement = 0.05;
  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(0);
      p5.frameRate(20);
    };

    p5.draw = () => {
      p5.stroke(255, 255, 255);
      p5.background(p5.color(0, 0, 0, 10));

      let pos = new P5.Vector(
        (Math.cos(cycleRadians) * canvasWidth.value) / 2,
        (Math.sin(cycleRadians) * canvasHeight.value) / 2,
        0,
      );

      let renderPos = camera.value.project(pos);
      if (renderPos) {
        p5.circle(renderPos.x, renderPos.y, 2);
      }

      if (axisVisibility.value) {
        drawAxes(p5, camera.value, 100);
      }

      cycleRadians += cycleIncrement;
    };

    p5.mouseDragged = () => {};

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
  <div id="computational-canvas"></div>
</template>
