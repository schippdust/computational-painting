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
const numberOfFrames = ref(0);
const numberOfVehicles = ref(0);

// let cameraPos = new P5.Vector(5000, 0, 0); // vertical
// let cameraPos = new P5.Vector(0, 10, 7500); // horizonta
let cameraPos = new P5.Vector(2000, -2000, 4000); // angled
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
  const grid: P5.Vector[][][] = [];
  const gridSize = 7; // Define the size of the grid
  const spacing = 300; // Define the spacing between points
  for (let i = 0; i < gridSize; i++) {
    grid[i] = [];
    for (let j = 0; j < gridSize; j++) {
      grid[i][j] = [];
      for (let k = 0; k < gridSize; k++) {
        grid[i][j][k] = new P5.Vector(
          i * spacing - (spacing * gridSize) / 2,
          j * spacing - (spacing * gridSize) / 2,
          k * spacing - (spacing * gridSize) / 2,
        );
      }
    }
  }
  const gridVehicles = new VehicleCollection();

  const sketch = (p5: P5) => {
    p5.setup = () => {
      pm = new PixelManager(p5);
      ws = new WindSystem(p5);
      ws.noiseScale = 0.0001;
      ws.timeScale = 0.001;
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(0);
      p5.frameRate(frameRate.value);
      for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
          for (let k = 0; k < grid[i][j].length; k++) {
            const v = grid[i][j][k];
            const renderVehicle = new TestRenderVehicle(p5, v);
            renderVehicle.lifeExpectancy = 100000;
            renderVehicle.phys.mass = 1000;
            gridVehicles.addVehicle(renderVehicle, false);
          }
        }
      }
      console.log('Grid vehicles initialized:', gridVehicles.vehicles.length);
    };

    p5.draw = () => {
      p5.stroke(255);
      gridVehicles.vehicles.forEach((v) => {
        let renderPos = camera.value.project(v.coords);
        if (renderPos) {
          p5.circle(renderPos.x, renderPos.y, 5);
        }
      });
      gridVehicles
        .applyWind(ws, 10, 750)
        .separate(500, 1000)
        .alignToNeighbors(1000, 500)
        .update();
      numberOfVehicles.value = gridVehicles.vehicles.length;
      numberOfFrames.value++;
    };

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
  <div>{{ numberOfFrames }} frames</div>
  <div>{{ numberOfVehicles }} number of vehicles</div>
</template>
