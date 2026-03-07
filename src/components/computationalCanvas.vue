<script setup lang="ts">
import P5 from 'p5';
import { pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { CoordinateSystem } from '@/classes/Geometry/CoordinateSystem';
import { Sphere } from '@/classes/Geometry/Sphere';
import '@/classes/Geometry/VectorOverloads';

import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
import {
  createGenericPhysicalProps,
  Vehicle,
} from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { WindSystem } from '@/classes/Core/WindSystem';
import {
  BranchingCollection,
  createGenericBranchingCollectionProps,
} from '@/classes/EntityManagement/VehicleCollections/BranchingCollection';
import { DotRenderer } from '@/classes/Rendering/Renderers/DotRenderer';

const appStore = useAppStore();
const { canvasHeight, canvasWidth, pauseCanvas, camera } =
  storeToRefs(appStore);

const frameRate = ref(40);
const numberOfFrames = ref(0);
const numberOfVehicles = ref(0);

let cameraPos = new P5.Vector(4000, -4000, 6000); // angled
let cameraFocus = new P5.Vector(0, 0, 0);
let fovDegrees = 80;
appStore.setCameraPosition(cameraPos);
appStore.setCameraTarget(cameraFocus);
appStore.setCameraFOV(fovDegrees);

onMounted(() => {
  let dotRenderer: DotRenderer;
  let branchingCollection: BranchingCollection;
  let windSystem: WindSystem;
  let generationSphere: Sphere;
  let initialVelocityMagnitude = 5;
  const maxVehicles = 2000;
  const flockingSearchRadius = 2000;

  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(0);
      p5.frameRate(frameRate.value);

      // Initialize the sphere for point generation
      generationSphere = new Sphere(
        CoordinateSystem.fromOriginAndNormal(
          new P5.Vector(0, 0, -2500),
          new P5.Vector(0, 0, 1),
        ),
        5000,
      );

      // Initialize the branching collection with default props
      branchingCollection = new BranchingCollection(
        [],
        createGenericBranchingCollectionProps(),
      );

      // Initialize wind system
      windSystem = new WindSystem(p5);
      windSystem.noiseScale = 1;
      windSystem.setNoiseDetail(2, 0.5);

      // Initialize renderer
      dotRenderer = new DotRenderer(p5, 3, [255, 255, 255], camera.value);
      dotRenderer.dotSize = 1;
    };

    p5.draw = () => {
      p5.stroke(255);

      // Remove dead vehicles before processing

      // Update all vehicles with forces and behaviors
      for (const vehicle of branchingCollection.vehicles) {
        // Apply wind force
        // vehicle.applyWind(windSystem);

        // Apply desired upward movement (seek upward)
        const upwardTarget = vehicle.coords.copy().add(new P5.Vector(0, 0, 1));
        vehicle.seak(upwardTarget, 1);
      }

      // Update the branching collection (handles branching)
      if (branchingCollection.vehicles.length > 1) {
        console.log('flocking');
        branchingCollection.flock(flockingSearchRadius, 0.001, 0.001, 0.001);
      }
      branchingCollection.update();

      // Generate new vehicles only if we're below the maximum
      if (branchingCollection.vehicles.length < maxVehicles) {
        const newPosition = generationSphere.randomPointInside();
        const newVehicle = new Vehicle(
          p5,
          newPosition,
          createGenericPhysicalProps(),
        );
        newVehicle.lifeExpectancy = 750;
        newVehicle.env.friction = 0.2;
        // Set initial velocity upward
        newVehicle.velocity = new P5.Vector(0, 0, initialVelocityMagnitude);
        newVehicle.desiredSeparation = flockingSearchRadius / 1.5;
        branchingCollection.vehicles.push(newVehicle);
      }

      // Render all vehicles
      dotRenderer.renderVehicles(branchingCollection.vehicles);

      // Update UI values
      numberOfFrames.value++;
      numberOfVehicles.value = branchingCollection.vehicles.length;
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
