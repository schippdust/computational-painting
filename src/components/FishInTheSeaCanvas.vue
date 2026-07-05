<script setup lang="ts">
import P5 from 'p5';
import { pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { hexToRgb } from '@/classes/Core/Color';
import { VehicleDotRenderer } from '@/classes/Rendering/VehicleRenderers/VehicleDotRenderer';
import { VehicleCollection } from '@/classes/EntityManagement/Extensible/VehicleCollection';
import {
  Vehicle,
  createGenericPhysicalProps,
} from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import {
  ViewBoundary,
  createGenericViewBoundaryProps,
} from '@/classes/Core/ViewBoundary';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const appStore = useAppStore();
const {
  canvasHeight,
  canvasWidth,
  pauseCanvas,
  camera,
  primaryColor,
  backgroundColor,
} = storeToRefs(appStore);

// Sprint 1 baseline — fixed until Sprint 6 exposes these as canvas parameters.
const fishCount = 150;
const spawnHalfExtentXY = 1600;
const spawnHalfDepth = 600;
const neighborDistance = 300;
// Separation weighted highest, cohesion/alignment lower — flock()'s own defaults
// (0.5 / 5 / 5) favor clustering so heavily that a tight school can fully converge
// (identical positions + velocities → zero net force → frozen, see Sprint 1 addendum).
const separateMultiplier = 2;
const alignMultiplier = 1.2;
const cohereMultiplier = 1;
// Comfortably inside the camera's visible XY radius at this height/FOV (~2550) so
// fish start turning back before they'd leave frame.
const viewBoundaryComfortRadius = 1600;
const viewBoundaryRampWidth = 700;
// Organic curvature so isolated fish (no flocking neighbors) don't drift in a
// dead-straight line — see Sprint 1 addendum.
const wanderOptions = {
  radius: 300,
  distance: 400,
  maxArcLength: 40,
  multiplier: 0.6,
  noiseScale: 0.005,
};

const frameRate = ref(40);
const numberOfFrames = ref(0);
const numberOfVehicles = ref(0);

// Expose stats so the toolbar automation feature can track frame count.
defineExpose({ frameRate, numberOfFrames, numberOfVehicles });

// Keep the p5 loop in sync with the store's pause state (toggled by toolbar or spacebar).
let p5Instance: P5 | null = null;
let dotRenderer: VehicleDotRenderer | null = null;
let school: VehicleCollection | null = null;
let viewBoundary: ViewBoundary | null = null;

watch(pauseCanvas, (paused) => {
  if (!p5Instance) return;
  if (paused) p5Instance.noLoop();
  else p5Instance.loop();
});

// Update dot color when primaryColor changes — future marks use the new color.
watch(primaryColor, (newColor) => {
  if (dotRenderer) dotRenderer.color = hexToRgb(newColor);
});

onUnmounted(() => {
  p5Instance?.remove();
  p5Instance = null;
  dotRenderer = null;
  school = null;
  viewBoundary = null;
});

onMounted(() => {
  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(backgroundColor.value);
      p5.frameRate(frameRate.value);

      // Overhead view looks straight down (-Z), which is parallel to the
      // camera's default up (0,0,1) and degenerates the projection basis.
      // Give it a horizontal up before anything projects through it.
      camera.value.setUp(new P5.Vector(0, 1, 0));

      school = new VehicleCollection();

      const vehicleProps = createGenericPhysicalProps();
      vehicleProps.mass = 5;
      vehicleProps.maxSteerForce = 20;
      vehicleProps.useMaxVelocity = true;
      vehicleProps.maxVelocity = 10;

      for (let i = 0; i < fishCount; i++) {
        const coords = new P5.Vector(
          p5.random(-spawnHalfExtentXY, spawnHalfExtentXY),
          p5.random(-spawnHalfExtentXY, spawnHalfExtentXY),
          p5.random(-spawnHalfDepth, spawnHalfDepth),
        );
        const fish = new Vehicle(p5, coords, vehicleProps);
        // Start already swimming — a random XY-plane heading, not from rest.
        fish.velocity = P5.Vector.random2D().mult(
          vehicleProps.maxVelocity * 0.5,
        );
        fish.lifeExpectancy = Infinity;
        // Wider than the default (40) so separation activates well before fish
        // can converge to the same point — see Sprint 1 addendum.
        fish.desiredSeparation = 120;
        school.addVehicle(fish, false);
      }
      school.buildOcTree();

      const boundaryProps = createGenericViewBoundaryProps();
      boundaryProps.comfortRadius = viewBoundaryComfortRadius;
      boundaryProps.rampWidth = viewBoundaryRampWidth;
      viewBoundary = new ViewBoundary(boundaryProps);

      dotRenderer = new VehicleDotRenderer(
        p5,
        6,
        1500,
        hexToRgb(primaryColor.value),
        camera.value,
      );
    };

    p5.draw = () => {
      if (!school) return;

      school.flock(
        neighborDistance,
        separateMultiplier,
        alignMultiplier,
        cohereMultiplier,
      );
      school.wander3dAll(wanderOptions);
      if (viewBoundary) viewBoundary.applyAll(school);
      school.update();

      if (dotRenderer) {
        dotRenderer.renderVehicles(school.vehicles);
      }

      numberOfFrames.value++;
      numberOfVehicles.value = school.count;
    };

    p5.keyPressed = () => {
      pressSpaceToPause(p5);
    };
  };

  const canvasElement = document.getElementById(
    'fish-in-the-sea-canvas',
  ) as HTMLElement;
  p5Instance = new P5(sketch, canvasElement);
});
</script>

<template>
  <div
    id="fish-in-the-sea-canvas"
    style="overflow-y: auto; overflow-x: auto; line-height: 0"
  />
</template>
