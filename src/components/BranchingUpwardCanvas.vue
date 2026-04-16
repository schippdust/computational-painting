<script setup lang="ts">
import P5 from 'p5';
import { pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { CoordinateSystem } from '@/classes/Geometry/CoordinateSystem';
import { Sphere } from '@/classes/Geometry/Sphere';

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
import { VehicleDotRenderer } from '@/classes/Rendering/VehicleRenderers/VehicleDotRenderer';
import { dot } from 'mathjs';
import { Circle } from '@/classes/Geometry/Circle';
import { Line } from '@/classes/Geometry/Line';
import { LineRenderer } from '@/classes/Rendering/GeometryRenderers/LineRenderer';

const props = defineProps<{
  generationCircleRadius: number;
  falloff: number;
}>();

const generationCircleRadius = toRef(props, 'generationCircleRadius');
const falloff = toRef(props, 'falloff');

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

// Expose stats so the parent page can display them in the toolbar slot if desired.
defineExpose({ frameRate, numberOfFrames, numberOfVehicles });

// Keep the p5 loop in sync with the store's pause state (toggled by toolbar or spacebar).
let p5Instance: P5 | null = null;
let dotRenderer: VehicleDotRenderer | null = null;
let lineRenderer: LineRenderer | null = null;

watch(pauseCanvas, (paused) => {
  if (!p5Instance) return;
  if (paused) p5Instance.noLoop();
  else p5Instance.loop();
});

// Update dot color immediately when primaryColor changes — future marks use the new color.
watch(primaryColor, (newColor) => {
  if (dotRenderer) dotRenderer.color = hexToRgb(newColor);
});

watch(secondaryColor, (newColor) => {
  if (lineRenderer) lineRenderer.color = hexToRgb(newColor);
});

// Clearing the canvas with the new background color when backgroundColor changes.
watch(backgroundColor, (newColor) => {
  p5Instance?.background(newColor);
});

onUnmounted(() => {
  // p5.remove() stops the animation loop, removes the canvas element from the DOM,
  // and frees all p5 event listeners — full cleanup on navigation.
  p5Instance?.remove();
  p5Instance = null;
  dotRenderer = null;
  lineRenderer = null;
});

onMounted(() => {
  let branchingCollection: BranchingCollection;
  let windSystem: WindSystem;
  // let generationSpheres: Sphere[] = [];
  // let renderingSpheres: Sphere[] = [];
  // let silhouettesRendered = false;
  let initialVelocityMagnitude = 5;
  const maxVehicles = 1000;
  const persistentSteerForceMagnitude = 0.5; // Magnitude of radial outward persistent steer force
  const flockingSearchRadius = 1500;
  const friction = 0.2;

  // const numberOfSpheres = 5;
  // const individualSphereMinRadius = 1000;
  // const individualSphereMaxRadius = 3000;
  // const sphereBoundsRadius = 15000;

  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(backgroundColor.value);
      p5.frameRate(frameRate.value);

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
      dotRenderer = new VehicleDotRenderer(
        p5,
        5,
        15000,
        hexToRgb(primaryColor.value),
        camera.value,
      );
      dotRenderer.dotSize = 1;

      lineRenderer = new LineRenderer(
        p5,
        hexToRgb(secondaryColor.value),
        5,
        camera.value,
      );
    };

    p5.draw = () => {
      const testCircle = new Circle(
        CoordinateSystem.fromOriginAndNormal(
          new P5.Vector(0, 0, 0),
          new P5.Vector(0, 1, 0),
        ),
        generationCircleRadius.value,
      );
      testCircle.renderSegments;
      if (lineRenderer) {
        lineRenderer.renderLines(testCircle.renderSegments);
      }

      // Render silhouettes once on first frame

      // Remove dead vehicles before processing
      // branchingCollection.applyWind(windSystem, 1, 1);
      // Update all vehicles with forces and behaviors (persistent steer forces applied in vehicle.update())
      /*
      // Update the branching collection (handles branching)
      if (branchingCollection.vehicles.length > 1) {
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

        branchingCollection.addVehicle(newVehicle, false);
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
      if (dotRenderer) {
        dotRenderer.renderVehicles(visibleVehicles);
        if (Math.random() < 0.005) {
          dotRenderer.dotSize = 5;
          dotRenderer.renderVehicles(visibleVehicles);
          dotRenderer.dotSize = 1;
        }
      }
*/
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
    'branching-upward-canvas',
  ) as HTMLElement;

  p5Instance = new P5(sketch, canvasElement);
});
</script>

<template>
  <div
    id="branching-upward-canvas"
    style="overflow-y: auto; overflow-x: auto; line-height: 0"
  ></div>
</template>
