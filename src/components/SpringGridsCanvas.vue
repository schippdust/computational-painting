<script setup lang="ts">
import P5 from 'p5';
import { pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { DotRenderer } from '@/classes/Rendering/Renderers/DotRenderer';
import { VehicleCollection } from '@/classes/EntityManagement/Extensible/VehicleCollection';
import { GridGenerator } from '@/classes/Generators/InstanceGenerators/GridGenerator';
import { createGenericPhysicalProps } from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  /** Fixed at canvas init — number of grid rows. */
  gridRows: number;
  /** Fixed at canvas init — number of grid columns. */
  gridCols: number;
  /** Fixed at canvas init — world-space distance between adjacent vehicles. */
  gridSpacing: number;
  /** Fixed at canvas init — number of attractor points (3–10). */
  numAttractors: number;
  /** Reactive — Hooke's law spring constant k. */
  springStiffness: number;
  /** Reactive — velocity damping coefficient along the spring axis. */
  springDamping: number;
  /** Reactive — seek multiplier applied to vehicles within attractor range. */
  attractorStrength: number;
  /** Reactive — world-space radius around each attractor that pulls vehicles. */
  attractorRange: number;
}>();

const appStore = useAppStore();
const {
  canvasHeight,
  canvasWidth,
  pauseCanvas,
  camera,
  primaryColor,
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
let dotRenderer: DotRenderer | null = null;

watch(pauseCanvas, (paused) => {
  if (!p5Instance) return;
  if (paused) p5Instance.noLoop();
  else p5Instance.loop();
});

watch(primaryColor, (newColor) => {
  if (dotRenderer) dotRenderer.color = hexToRgb(newColor);
});

onUnmounted(() => {
  p5Instance?.remove();
  p5Instance = null;
  dotRenderer = null;
});

onMounted(() => {
  let gen: GridGenerator | null = null;
  const collection = new VehicleCollection();
  const attractors: P5.Vector[] = [];

  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(backgroundColor.value);
      p5.frameRate(frameRate.value);

      const gridWidth = (props.gridCols - 1) * props.gridSpacing;
      const gridHeight = (props.gridRows - 1) * props.gridSpacing;
      const maxDim = Math.max(gridWidth, gridHeight);

      // Center the grid at the world origin in the XY plane.
      const origin = new P5.Vector(-gridWidth / 2, -gridHeight / 2, 0);

      // Light, responsive vehicles: mass=1 so force = acceleration directly.
      const vehicleProps = createGenericPhysicalProps();
      vehicleProps.mass = 1;
      vehicleProps.maxSteerForce = 50;
      vehicleProps.useMaxVelocity = true;
      vehicleProps.maxVelocity = 20;

      gen = new GridGenerator(
        p5,
        {
          rows: props.gridRows,
          cols: props.gridCols,
          spacing: props.gridSpacing,
          origin,
          stiffness: props.springStiffness,
          damping: props.springDamping,
        },
        vehicleProps,
      );
      gen.populate(collection);

      // Immortal vehicles with light friction — springs provide the primary damping.
      for (const row of gen.grid) {
        for (const v of row) {
          v.lifeExpectancy = Infinity;
          v.env.friction = 0.04;
        }
      }

      // Attractors: random positions within a sphere 2× the widest grid dimension.
      const attractorRadius = 2 * maxDim;
      for (let i = 0; i < props.numAttractors; i++) {
        const dir = P5.Vector.random3D();
        const r = p5.random(attractorRadius * 0.5, attractorRadius);
        attractors.push(dir.mult(r));
      }

      dotRenderer = new DotRenderer(
        p5,
        6,
        maxDim * 2,
        hexToRgb(primaryColor.value),
        camera.value,
      );
    };

    p5.draw = () => {
      if (!gen) return;

      // This is a live simulation — clear each frame so the current grid state is visible.
      p5.background(backgroundColor.value);

      // Push current reactive prop values into the spring objects each frame.
      for (const s of gen.springs) {
        s.stiffness = props.springStiffness;
        s.damping = props.springDamping;
      }

      // Apply attractor seek forces to vehicles within range, before collection.update()
      // so they enter the standard force-accumulation pipeline alongside spring forces.
      for (const v of collection.vehicles) {
        for (const attractor of attractors) {
          if (P5.Vector.dist(v.coords, attractor) < props.attractorRange) {
            v.seek(attractor, props.attractorStrength);
          }
        }
      }

      // Spring forces + vehicle physics integration.
      collection.update();

      dotRenderer?.renderVehicles(collection.vehicles);

      numberOfFrames.value++;
      numberOfVehicles.value = collection.count;
    };

    p5.keyPressed = () => {
      pressSpaceToPause(p5);
    };
  };

  const canvasElement = document.getElementById(
    'spring-grids-canvas',
  ) as HTMLElement;
  p5Instance = new P5(sketch, canvasElement);
});
</script>

<template>
  <div
    id="spring-grids-canvas"
    style="overflow-y: auto; overflow-x: auto; line-height: 0"
  ></div>
</template>
