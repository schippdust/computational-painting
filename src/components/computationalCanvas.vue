<script setup lang="ts">
import P5 from 'p5';
import { drawAxes, pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { CoordinateSystem } from '@/classes/Geometry/CoordinateSystem';
import { Circle } from '@/classes/Geometry/Circle';
import { Line } from '@/classes/Geometry/Line';
import { Sphere } from '@/classes/Geometry/Sphere';
import '@/classes/Geometry/VectorOverloads';

import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
import { PixelManager } from '@/classes/Core/PixelManager';
import {
  createGenericPhysicalProps,
  Vehicle,
} from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { VehicleCollection } from '@/classes/EntityManagement/Extensible/VehicleCollection';
import { WindSystem } from '@/classes/Core/WindSystem';
import {
  CircleGenerator,
  type CircleGeneratorProps,
} from '@/classes/Generators/CircleGenerator';
import {
  BrushStrokeSystem,
  type BrushtrokeSystemProps,
} from '@/classes/EntityManagement/VehicleSystems/BrushStrokeSystem';

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

console.log(typeof P5.Vector.prototype.scatter);

onMounted(() => {
  function getSketchParams() {
    return {};
  }
  let pm: PixelManager;
  let ws: WindSystem;
  let testGenerator: CircleGenerator;
  let generatorProps: CircleGeneratorProps = {
    startAngle: 0,
    endAngle: Math.PI * 2,
    angleStep: Math.PI / 100,
    velocityAtGeneration: new P5.Vector(0, 0, 0),
  };
  let brushStrokeSystemProps: BrushtrokeSystemProps = {
    branchContinuityProbability: 0.5,
    secondaryBranchProbability: 0.04,
    offsetScatterPotential: 0.1,
    brushPhysProps: createGenericPhysicalProps(),
  };
  const vehicleCollection = new VehicleCollection();

  const sketch = (p5: P5) => {
    p5.setup = () => {
      // pm = new PixelManager(p5);
      // ws = new WindSystem(p5);
      // ws.noiseScale = 0.0001;
      // ws.timeScale = 0.001;
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(0);
      p5.frameRate(frameRate.value);
      let circle = new Circle(
        CoordinateSystem.fromOriginAndNormal(
          new P5.Vector(0, 0, 0),
          new P5.Vector(0, 0, 1),
        ),
        100,
      );

      testGenerator = new CircleGenerator(p5, circle, generatorProps);
    };

    p5.draw = () => {
      p5.stroke(255);
      let brushSystem = new BrushStrokeSystem(
        p5,
        new P5.Vector(0, 0, 0),
        undefined,
        brushStrokeSystemProps,
      );
      let testVehicle = new Vehicle(p5, new P5.Vector(0, 0, 0));
      testGenerator.generateVehicle(testVehicle);
      testGenerator.generatedVehicles.update();
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
