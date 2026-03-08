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

let cameraPos = new P5.Vector(8000, -8000, 9000); // angled
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
  const maxVehicles = 3000;
  const persistentSteerForceMagnitude = 1; // Magnitude of radial outward persistent steer force
  const flockingSearchRadius = 5000;
  const friction = 0.2;

  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(255);
      p5.frameRate(frameRate.value);

      // Initialize the sphere for point generation
      generationSphere = new Sphere(
        CoordinateSystem.fromOriginAndNormal(
          new P5.Vector(0, 0, 0),
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
      dotRenderer = new DotRenderer(p5, 5, [0, 0, 0], camera.value);
      dotRenderer.dotSize = 1;
    };

    p5.draw = () => {
      // Remove dead vehicles before processing
      branchingCollection.applyWind(windSystem, 0.1, 0.01);
      // Update all vehicles with forces and behaviors (persistent steer forces applied in vehicle.update())

      // Update the branching collection (handles branching)
      if (branchingCollection.vehicles.length > 1) {
        console.log('flocking');
        branchingCollection.flock(flockingSearchRadius, 1.5, 0.1, 0.1);
      }
      branchingCollection.update();

      function generateNewVehicle() {
        const newPosition = generationSphere.randomPointInside();
        const newVehicle = new Vehicle(
          p5,
          newPosition,
          createGenericPhysicalProps(),
        );
        newVehicle.lifeExpectancy = 750;
        newVehicle.env.friction = friction;
        // Set initial velocity upward
        newVehicle.velocity = new P5.Vector(0, 0, initialVelocityMagnitude);
        newVehicle.desiredSeparation = flockingSearchRadius;
        newVehicle.phys.maxSteerForce = 1;

        // Calculate persistent steer force direction from sphere center to vehicle position
        const sphereCenter = generationSphere.coordinateSystem.getPosition();
        let steerDirection = P5.Vector.sub(newPosition, sphereCenter);

        // If vehicle is at sphere center, use random direction
        if (steerDirection.mag() < 0.001) {
          steerDirection = P5.Vector.random3D();
        } else {
          steerDirection.normalize();
        }

        // Create and assign persistent steer force with configured magnitude
        const persistentSteerForce = steerDirection.mult(
          persistentSteerForceMagnitude,
        );
        newVehicle.addPersistentSteerForce(persistentSteerForce);

        branchingCollection.vehicles.push(newVehicle);
      }

      // Generate new vehicles only if we're below the maximum
      while (branchingCollection.vehicles.length < 100) {
        generateNewVehicle();
      }
      if (branchingCollection.vehicles.length < maxVehicles) {
        generateNewVehicle();
        generateNewVehicle();
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
