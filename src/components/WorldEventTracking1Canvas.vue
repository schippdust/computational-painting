<script setup lang="ts">
import P5 from 'p5';
import { pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { VehicleDotRenderer } from '@/classes/Rendering/VehicleRenderers/VehicleDotRenderer';
import {
  Vehicle,
  createGenericPhysicalProps,
} from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { VehicleCollection } from '@/classes/EntityManagement/Extensible/VehicleCollection';
import { WindSystem } from '@/classes/Core/WindSystem';
import { WorldSpaceOcTree } from '@/classes/Core/WorldSpaceOcTree';
import { BBox } from '@/classes/Geometry/BBox';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
import { WorldSpaceOcTreeRenderer } from '@/classes/Rendering/PhysicsRenderers/WorldSpaceOcTreeRenderer';

const props = defineProps<{
  initialVehicleCount: number;
  worldSpaceInitialDim: number;
  numberOfVehiclesPerFrame: number;
}>();

const initialVehicleCount = toRef(props, 'initialVehicleCount');
const worldSpaceInitialDim = toRef(props, 'worldSpaceInitialDim');
const numberOfVehiclesPerFrame = toRef(props, 'numberOfVehiclesPerFrame');

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

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(hex);
  return m
    ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
    : [255, 255, 255];
}

const frameRate = ref(40);
const numberOfFrames = ref(0);
const numberOfVehicles = ref(0);

defineExpose({ frameRate, numberOfFrames, numberOfVehicles });

let p5Instance: P5 | null = null;
let dotRenderer: VehicleDotRenderer | null = null;
let ocTreeRenderer: WorldSpaceOcTreeRenderer | null = null;

watch(pauseCanvas, (paused) => {
  if (!p5Instance) return;
  if (paused) p5Instance.noLoop();
  else p5Instance.loop();
});

watch(primaryColor, (newColor) => {
  if (dotRenderer) dotRenderer.color = hexToRgb(newColor);
});

watch(secondaryColor, (newColor) => {
  if (ocTreeRenderer) ocTreeRenderer.color = hexToRgb(newColor);
});

watch(backgroundColor, (newColor) => {
  p5Instance?.background(newColor);
});

onUnmounted(() => {
  p5Instance?.remove();
  p5Instance = null;
  dotRenderer = null;
  ocTreeRenderer = null;
});

onMounted(() => {
  const VEHICLE_LIFESPAN = 300;
  const VEHICLE_FRICTION = 0.02;
  const EVENT_NAME = 'Vehicle Present';

  let collection: VehicleCollection;
  let windSystem: WindSystem;
  let ocTree: WorldSpaceOcTree;

  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(backgroundColor.value);
      p5.frameRate(frameRate.value);

      dotRenderer = new VehicleDotRenderer(
        p5,
        2,
        worldSpaceInitialDim.value * 2,
        hexToRgb(primaryColor.value),
        camera.value,
      );

      ocTreeRenderer = new WorldSpaceOcTreeRenderer(
        p5,
        hexToRgb(secondaryColor.value),
        2,
        camera.value,
        worldSpaceInitialDim.value * 2,
      );

      windSystem = new WindSystem(p5);
      windSystem.specificTime = 100;
      windSystem.noiseScale = 0.0005;
      windSystem.setNoiseDetail(5, 0.5);

      const half = worldSpaceInitialDim.value / 2;
      ocTree = new WorldSpaceOcTree(BBox.cube(new P5.Vector(0, 0, 0), half));
      ocTree.trackWorldEvents(EVENT_NAME, 10000);

      const initialPositions = ocTree.randomPointsByActivity(
        EVENT_NAME,
        initialVehicleCount.value,
        0,
      );

      const initialVehicles = initialPositions.map((pos) => {
        const v = new Vehicle(p5, pos, createGenericPhysicalProps());
        v.lifeExpectancy = VEHICLE_LIFESPAN;
        v.env.friction = VEHICLE_FRICTION;
        v.phys.mass = 100;
        return v;
      });

      collection = new VehicleCollection(initialVehicles);

      for (const pos of initialPositions) {
        ocTree.logPointEvent(pos, EVENT_NAME);
      }
    };

    p5.draw = () => {
      // p5.background(backgroundColor.value);
      const spawnPositions = ocTree.randomPointsByActivity(
        EVENT_NAME,
        numberOfVehiclesPerFrame.value,
        0.9,
      );

      const newVehicles = spawnPositions.map((pos) => {
        const v = new Vehicle(p5, pos, createGenericPhysicalProps());
        v.lifeExpectancy = VEHICLE_LIFESPAN;
        v.env.friction = VEHICLE_FRICTION;
        v.phys.mass = 100;
        return v;
      });

      collection.addVehicle(newVehicles, false);

      collection.applyWind(windSystem, 0, 10).update();

      for (const v of collection.vehicles) {
        ocTree.logPointEvent(v.coordSystem.getPosition(), EVENT_NAME);
      }

      dotRenderer?.renderVehicles(collection.vehicles);
      // ocTreeRenderer?.renderOcTree(ocTree);

      numberOfFrames.value++;
      numberOfVehicles.value = collection.vehicles.length;
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
