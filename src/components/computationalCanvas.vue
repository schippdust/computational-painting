<script setup lang="ts">
import P5 from 'p5';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
const appStore = useAppStore();
const { canvasHeight, canvasWidth, threadSpacing, threadWidth, pauseCanvas } =
  storeToRefs(appStore);

onMounted(() => {
  function getSketchParams() {
    return {};
  }

  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(150);
      p5.frameRate(20);
    };

    p5.draw = () => {};

    p5.mouseDragged = () => {
      p5.fill(0);
      p5.stroke(0);
      p5.circle(p5.mouseX, p5.mouseY, 10);
    };

    p5.keyPressed = () => {
      if (p5.key == ' ') {
        if (pauseCanvas.value) {
          console.log('Spacebar Pressed: Unpausing Canvas');
          p5.loop();
        } else {
          console.log('Spacebar Pressed: Pausing Canvas');
          p5.noLoop();
        }
        appStore.togglePause();
      }
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
