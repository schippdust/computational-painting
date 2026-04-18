<script setup lang="ts">
import P5 from 'p5';
import { drawAxes, pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { CoordinateSystem } from '@/classes/Geometry/CoordinateSystem';
import { Circle } from '@/classes/Geometry/Circle';
import { Line } from '@/classes/Geometry/Line';
import { Sphere } from '@/classes/Geometry/Sphere';

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
} from '@/classes/Generators/ProgressiveGenerators/CircleGenerator';
import {
  BrushStrokeSystem,
  type BrushtrokeSystemProps,
} from '@/classes/EntityManagement/VehicleSystems/BrushStrokeSystem';
import { VehicleDotRenderer } from '@/classes/Rendering/VehicleRenderers/VehicleDotRenderer';

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
const cameraPos = new P5.Vector(2000, -2000, 4000); // angled
const cameraFocus = new P5.Vector(0, 0, 0);
const fovDegrees = 80;
appStore.setCameraPosition(cameraPos);
appStore.setCameraTarget(cameraFocus);
appStore.setCameraFOV(fovDegrees);

onMounted(() => {
  function getSketchParams() {
    return {};
  }
  let dotRenderer: VehicleDotRenderer;
  let testGenerator: CircleGenerator;
  const generatorProps: CircleGeneratorProps = {
    startAngle: 0,
    endAngle: Math.PI * 3.5,
    angleStep: Math.PI / 1000,
    velocityAtGeneration: new P5.Vector(5, 0, 15),
  };
  const brushStrokeSystemProps: BrushtrokeSystemProps = {
    branchContinuityProbability: 0.5,
    secondaryBranchProbability: 0.04,
    offsetScatterPotential: 0.1,
    brushPhysProps: createGenericPhysicalProps(),
  };
  const vehicleCollection = new VehicleCollection();

  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(0);
      p5.frameRate(frameRate.value);
      const circle = new Circle(
        CoordinateSystem.fromOriginAndNormal(
          new P5.Vector(0, 0, 0),
          new P5.Vector(0, 0, 1),
        ),
        1200,
      );
      testGenerator = new CircleGenerator(p5, circle, generatorProps);
      dotRenderer = new VehicleDotRenderer(
        p5,
        3,
        15000,
        [255, 255, 255],
        camera.value,
      );
    };

    p5.draw = () => {
      p5.stroke(255);
      const brushSystem = new BrushStrokeSystem(
        p5,
        new P5.Vector(0, 0, 0),
        undefined,
        brushStrokeSystemProps,
      );
      const vehicleProps = createGenericPhysicalProps();
      vehicleProps.maxVelocity = 1000;
      const testVehicle = new Vehicle(p5, new P5.Vector(0, 0, 0), vehicleProps);
      testGenerator.generateVehicle(testVehicle);
      if (testGenerator.generatedVehicles.vehicles.length > 1) {
        testGenerator.generatedVehicles.flock(2000);
      }

      testGenerator.generatedVehicles.update();
      dotRenderer.renderVehicles(testGenerator.generatedVehicles.vehicles);
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
  />
  <div>{{ frameRate }} fps</div>
  <div>{{ numberOfFrames }} frames</div>
  <div>{{ numberOfVehicles }} number of vehicles</div>
</template>
