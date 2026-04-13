<script setup lang="ts">
import P5 from 'p5';
import { pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { VehicleDotRenderer } from '@/classes/Rendering/VehicleRenderers/VehicleDotRenderer';
import { VehicleCollection } from '@/classes/EntityManagement/Extensible/VehicleCollection';
import { GridGenerator } from '@/classes/Generators/InstanceGenerators/GridGenerator';
import { createGenericPhysicalProps } from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { Sphere } from '@/classes/Geometry/Sphere';
import { CoordinateSystem } from '@/classes/Geometry/CoordinateSystem';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
import { SphereRenderer } from '@/classes/Rendering/GeometryRenderers/SphereRenderer';
import { SpringRenderer } from '@/classes/Rendering/PhysicsRenderers/SpringRenderer';
import { he } from 'vuetify/locale';

const props = defineProps<{
  /** Fixed at canvas init — number of grid rows. */
  gridRows: number;
  /** Fixed at canvas init — number of grid columns. */
  gridCols: number;
  /** Fixed at canvas init — number of Z layers (depth). */
  gridLayers: number;
  /** Fixed at canvas init — world-space distance between adjacent vehicles on every axis. */
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
let dotRenderer: VehicleDotRenderer | null = null;

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
  const springVehicles = new VehicleCollection();
  const springAttractors: P5.Vector[] = [];

  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(backgroundColor.value);
      p5.frameRate(frameRate.value);

      const gridWidth = (props.gridCols - 1) * props.gridSpacing;
      const gridHeight = (props.gridRows - 1) * props.gridSpacing;
      const gridDepth = (props.gridLayers - 1) * props.gridSpacing;
      const maxDim = Math.max(gridWidth, gridHeight, gridDepth);

      // Center the grid volume at the world origin.
      const origin = new P5.Vector(
        -gridWidth / 2,
        -gridHeight / 2,
        -gridDepth / 2,
      );

      // Light, responsive vehicles: mass=1 so force = acceleration directly.
      const vehicleProps = createGenericPhysicalProps();
      vehicleProps.mass = 250;
      vehicleProps.maxSteerForce = 360;
      vehicleProps.useMaxVelocity = true;
      vehicleProps.maxVelocity = 50;

      gen = new GridGenerator(
        p5,
        {
          rows: props.gridRows,
          cols: props.gridCols,
          layers: props.gridLayers,
          spacing: props.gridSpacing,
          origin,
          stiffness: props.springStiffness,
          damping: props.springDamping,
          // connectDiagonals: true,
        },
        vehicleProps,
      );
      gen.populate(springVehicles);

      // Vehicles must be immortal — the default lifeExpectancy is 150 frames, after which
      // the collection becomes empty and buildOcTree() throws "Cannot construct OcTree with
      // no vehicles", crashing the draw loop permanently.
      for (const layer of gen.grid) {
        for (const row of layer) {
          for (const v of row) {
            v.lifeExpectancy = 250;
            v.env.friction = 0.04;
          }
        }
      }

      // Attractors: random positions on the surface of a sphere sized to the grid's maximum
      // dimension. With a 3D grid the attractors are distributed in 3D space so forces act
      // in all directions across the volume.
      const generatorSphere = new Sphere(
        CoordinateSystem.fromOriginAndNormal(
          new P5.Vector(0, 0, 0),
          new P5.Vector(0, 0, 1),
        ),
        maxDim,
      );
      for (let i = 0; i < props.numAttractors; i++) {
        springAttractors.push(generatorSphere.randomPointOnSurface());
      }

      dotRenderer = new VehicleDotRenderer(
        p5,
        6,
        1000,
        hexToRgb(primaryColor.value),
        camera.value,
      );

      // Draw attractor range spheres once onto the background so they persist as
      // reference markers without compounding every frame on the accumulating canvas.
      const attractorSphereRenderer = new SphereRenderer(
        p5,
        hexToRgb(primaryColor.value),
        camera.value,
        4,
        1500,
      );
      attractorSphereRenderer.renderSilhouette(
        springAttractors.map(
          (pos) =>
            new Sphere(
              CoordinateSystem.fromOriginAndNormal(pos, new P5.Vector(0, 0, 1)),
              props.attractorRange,
            ),
        ),
        50,
      );
    };

    const springRenderer = new SpringRenderer(
      p5,
      hexToRgb(primaryColor.value),
      camera.value,
      2,
    );

    p5.draw = () => {
      // p5.background(backgroundColor.value);
      if (!gen) return;

      // Push current reactive prop values into the spring objects each frame.
      for (const s of gen.springs) {
        s.stiffness = props.springStiffness;
        s.damping = props.springDamping;
      }

      springVehicles.arrive(springAttractors, props.attractorRange);
      springVehicles.applySprings();
      springVehicles.update();

      // dotRenderer?.renderVehicles(springVehicles.vehicles);
      if (numberOfFrames.value % 8 === 0) {
        // Render every 3rd frame to improve performance by reducing expensive spring rendering calls.
        // dotRenderer?.renderVehicles(springVehicles.vehicles);
        springRenderer.renderSprings(gen.springs);
      }

      numberOfFrames.value++;
      numberOfVehicles.value = springVehicles.count;
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
