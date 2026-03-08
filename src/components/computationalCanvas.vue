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
import { dot } from 'mathjs';

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
  let generationSpheres: Sphere[] = [];
  let renderingSpheres: Sphere[] = [];
  let silhouettesRendered = false;
  let initialVelocityMagnitude = 5;
  const maxVehicles = 3000;
  const persistentSteerForceMagnitude = 0.5; // Magnitude of radial outward persistent steer force
  const flockingSearchRadius = 5000;
  const friction = 0.2;
  const numberOfSpheres = 5;
  const individualSphereMinRadius = 1000;
  const individualSphereMaxRadius = 3000;
  const sphereBoundsRadius = 15000;

  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(255);
      p5.frameRate(frameRate.value);

      // Initialize multiple spheres for point generation
      for (let i = 0; i < numberOfSpheres; i++) {
        // Generate random centerpoint within sphereBoundsRadius distance from origin
        const randomDirection = P5.Vector.random3D();
        const randomDistance = Math.random() * sphereBoundsRadius;
        const sphereCenter = randomDirection.mult(randomDistance);

        // Generate random radius between min and max
        const sphereRadius =
          Math.random() *
            (individualSphereMaxRadius - individualSphereMinRadius) +
          individualSphereMinRadius;

        // Create sphere with random center and radius
        const sphere = new Sphere(
          CoordinateSystem.fromOriginAndNormal(
            sphereCenter,
            new P5.Vector(0, 0, 1),
          ),
          sphereRadius,
        );
        generationSpheres.push(sphere);

        // Create rendering sphere with 1/4 the radius
        const renderingSphere = new Sphere(
          CoordinateSystem.fromOriginAndNormal(
            sphereCenter,
            new P5.Vector(0, 0, 1),
          ),
          sphereRadius / 2,
        );
        renderingSpheres.push(renderingSphere);
      }

      // Initialize the branching collection with default props
      branchingCollection = new BranchingCollection(
        [],
        createGenericBranchingCollectionProps(),
      );

      // Initialize wind system
      windSystem = new WindSystem(p5);
      windSystem.noiseScale = 1.5;
      windSystem.setNoiseDetail(4, 0.2);

      // Initialize renderer
      dotRenderer = new DotRenderer(p5, 5, [0, 0, 0], camera.value);
      dotRenderer.dotSize = 1;
    };

    p5.draw = () => {
      // Render silhouettes once on first frame
      if (!silhouettesRendered && camera.value) {
        p5.strokeWeight(2);
        const cameraPos = camera.value.pos;
        for (let i = 0; i < renderingSpheres.length; i++) {
          const renderingSphere = renderingSpheres[i];
          const silhouetteCircle = renderingSphere.sillhouetteCircle(cameraPos);
          silhouetteCircle.renderSegmentCount = 100;

          // Get all visible segments by checking against other rendering spheres
          let visibleSegments = [...silhouetteCircle.renderSegments]; // Copy all segments

          // For each other rendering sphere, check if it obscures any segments
          for (let j = 0; j < renderingSpheres.length; j++) {
            if (i === j) continue; // Skip the sphere whose silhouette we're rendering

            const otherSphere = renderingSpheres[j];
            const newVisibleSegments = [];

            // Check each currently visible segment against the other sphere
            for (const segment of visibleSegments) {
              const obscuredSegments = otherSphere.obscureLine(
                segment,
                cameraPos,
              );
              newVisibleSegments.push(...obscuredSegments);
            }

            visibleSegments = newVisibleSegments;
          }

          // Render all visible segments
          const projectedSegments = camera.value.renderLines(visibleSegments);
          for (const segment of projectedSegments) {
            segment.render2D(p5);
          }
        }
        silhouettesRendered = true;
      }

      // Remove dead vehicles before processing
      // branchingCollection.applyWind(windSystem, 1, 1);
      // Update all vehicles with forces and behaviors (persistent steer forces applied in vehicle.update())

      // Update the branching collection (handles branching)
      if (branchingCollection.vehicles.length > 1) {
        console.log('flocking');
        branchingCollection.flock(flockingSearchRadius, 1.5, 0.1, 0.2);
      }
      branchingCollection.update();

      function generateNewVehicle() {
        // Pick a random sphere from the array
        const selectedSphere =
          generationSpheres[
            Math.floor(Math.random() * generationSpheres.length)
          ];
        const newPosition = selectedSphere.randomPointInside();
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
        const sphereCenter = selectedSphere.coordinateSystem.getPosition();
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

      // Filter vehicles to hide those obscured by rendering spheres
      const cameraPos = camera.value.pos;
      const visibleVehicles = branchingCollection.vehicles.filter((vehicle) => {
        for (const renderingSphere of renderingSpheres) {
          if (
            renderingSphere.isPointObscured(
              vehicle.coordSystem.getPosition(),
              cameraPos,
            )
          ) {
            return false; // Vehicle is obscured
          }
        }
        return true; // Vehicle is visible
      });

      // Render visible vehicles
      dotRenderer.renderVehicles(visibleVehicles);
      if (Math.random() < 0.005) {
        dotRenderer.dotSize = 5;
        dotRenderer.renderVehicles(visibleVehicles);
        dotRenderer.dotSize = 1;
      }

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
