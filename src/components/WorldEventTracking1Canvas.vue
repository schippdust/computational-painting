<script setup lang="ts">
import P5 from 'p5';
import { pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { VehicleDotRenderer } from '@/classes/Rendering/VehicleRenderers/VehicleDotRenderer';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

// Import side-effect overloads if you need v.scatter() / v.rotate() on P5.Vector:
// import '@/classes/Geometry/VectorOverloads';

const appStore = useAppStore();
const {
  canvasHeight,
  canvasWidth,
  pauseCanvas,
  camera,
  primaryColor,
  secondaryColor,
  backgroundColor,
} = storeToRefs(appStore);

/** Convert a CSS hex color string to a p5-compatible [r, g, b] array. */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(hex);
  return m
    ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
    : [255, 255, 255];
}

const frameRate = ref(40);
const numberOfFrames = ref(0);
const numberOfVehicles = ref(0);

// Expose stats so the toolbar automation feature can track frame count.
defineExpose({ frameRate, numberOfFrames, numberOfVehicles });

// Keep the p5 loop in sync with the store's pause state (toggled by toolbar or spacebar).
let p5Instance: P5 | null = null;
let dotRenderer: VehicleDotRenderer | null = null;

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

      dotRenderer = new VehicleDotRenderer(
        p5,
        5,
        15000,
        hexToRgb(primaryColor.value),
        camera.value,
      );

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

  const canvasElement = document.getElementById(
    'world-event-tracking-1-canvas',
  ) as HTMLElement;
  p5Instance = new P5(sketch, canvasElement);
});
</script>

<template>
  <div
    id="world-event-tracking-1-canvas"
    style="overflow-y: auto; overflow-x: auto; line-height: 0"
  ></div>
</template>
