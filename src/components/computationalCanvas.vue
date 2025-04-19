<script setup lang="ts">
import P5 from 'p5';
import { drawAxes, pressSpaceToPause } from '@/classes/DrawingUtils';
import { CoordinateSystem } from '@/classes/CoordinateSystem';
import { Circle } from '@/classes/Circle';
import { Line } from '@/classes/Line';

import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
import { PixelManager } from '@/classes/PixelManager';
import { Vehicle } from '@/classes/Vehicle';
import { VehicleCollection } from '@/classes/VehicleCollection';

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

const frameRate = ref(100);

// let cameraPos = new P5.Vector(800, -500, 1000);
let cameraPos = new P5.Vector(0, 10, 7500);
let cameraFocus = new P5.Vector(0, 0, 0);
let fovDegrees = 80;
appStore.setCameraPosition(cameraPos);
appStore.setCameraTarget(cameraFocus);
appStore.setCameraFOV(fovDegrees);

onMounted(() => {
  function getSketchParams() {
    return {};
  }
  let cycleRadians = 0;
  let cycleIncrement = 0.01;
  let pm: PixelManager;
  let isMouseDragging: boolean = false;
  const vehicleCollection = new VehicleCollection();
  const sketch = (p5: P5) => {
    p5.setup = () => {
      pm = new PixelManager(p5);
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(0);
      p5.frameRate(60);
    };

    p5.draw = () => {
      console.log('new loop');
      p5.stroke(255);
      // p5.background(p5.color(255, 255, 255, 1));

      const centerPoint = new P5.Vector(0, 0, 0);
      const zUp = new P5.Vector(0, 0, 1);

      const pos = new P5.Vector(
        (Math.cos(cycleRadians) * canvasWidth.value) / 2,
        (Math.sin(cycleRadians) * canvasWidth.value) / 2,
        0,
      );

      const direction = P5.Vector.sub(pos.copy(), centerPoint.copy());
      direction.rotate(p5.HALF_PI * -1, zUp);
      const currentCoords = CoordinateSystem.fromOriginAndNormal(
        pos.copy(),
        direction.copy(),
      );
      const circle = new Circle(currentCoords, 150);
      circle.renderProjected(p5, camera.value);

      const edgePoints = circle.randomPointsOnSurface(2);
      // console.log(edgePoints);
      const vehicles: Vehicle[] = [];

      for (const pt of edgePoints) {
        const v = new Vehicle(p5, pt.copy());
        v.phys.mass = 15;
        v.phys.maxVelocity = 50;
        v.phys.maxSteerForce = 10;
        v.lifeExpectancy = 1500;
        v.env.friction = null;

        const motionFromCenter = P5.Vector.sub(pt.copy(), pos.copy()).copy();

        v.setVelocity(motionFromCenter.copy());
        vehicles.push(v);
      }

      vehicleCollection.addVehicle(vehicles, false);

      vehicleCollection.update();
      vehicleCollection.vehicles.forEach((v) => {
        const location = camera.value.project(v.coords.copy());
        if (location == null) {
          return;
        }
        p5.point(location.x, location.y);
      });

      const renderPos = camera.value.project(pos.copy());
      if (renderPos) {
        p5.circle(renderPos.x, renderPos.y, 2);
      }

      if (axisVisibility.value) {
        drawAxes(p5, camera.value, 100);
      }

      cycleRadians += cycleIncrement;

      // Utility Functions
      frameRate.value = Math.round(p5.frameRate());
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
</template>
