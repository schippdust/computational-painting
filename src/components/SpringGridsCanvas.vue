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
      const maxDim = Math.max(gridWidth, gridHeight);

      // Center the grid at the world origin in the XY plane.
      const origin = new P5.Vector(-gridWidth / 2, -gridHeight / 2, 0);

      // Light, responsive vehicles: mass=1 so force = acceleration directly.
      const vehicleProps = createGenericPhysicalProps();
      vehicleProps.mass = 3;
      vehicleProps.maxSteerForce = 20;
      vehicleProps.useMaxVelocity = true;
      vehicleProps.maxVelocity = 25;

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
      gen.populate(springVehicles);

      // Vehicles must be immortal — the default lifeExpectancy is 150 frames, after which
      // the collection becomes empty and buildOcTree() throws "Cannot construct OcTree with
      // no vehicles", crashing the draw loop permanently.
      for (const row of gen.grid) {
        for (const v of row) {
          v.lifeExpectancy = Infinity;
          v.env.friction = 0.04;
        }
      }

      // Attractors: random positions in the XY plane (Z=0) at 0.5–2× the widest grid dimension.
      // Constraining to Z=0 ensures all attractors are coplanar with the grid and reliably
      // within attractorRange — random3D() would scatter most attractors above/below the plane.
      const attractorGenSphereRadius = maxDim;
      const generatorSphere = new Sphere(
        CoordinateSystem.fromOriginAndNormal(
          new P5.Vector(0, 0, 0),
          new P5.Vector(0, 0, 1),
        ),
        attractorGenSphereRadius,
      );
      for (let i = 0; i < props.numAttractors; i++) {
        // randomPointOnSurface concentrates samples near the equator (phi ≈ π/2),
        // so r_xy ≈ sphereRadius after z=0 — attractors land outside the grid perimeter.
        // randomPointInside spreads samples through the full volume, often placing attractors
        // near the origin (inside the grid), which makes corner vehicles with fewer springs
        // always escape first toward the same central point every run.
        const position = generatorSphere.randomPointOnSurface();
        position.z = 0; // attractors must be coplanar with the grid — 3D positions send forces in ±Z which the XY springs resist, appearing as no lateral movement from the top-down camera
        springAttractors.push(position);
      }

      dotRenderer = new VehicleDotRenderer(
        p5,
        6,
        3000,
        hexToRgb(primaryColor.value),
        camera.value,
      );

      // Draw attractor range spheres once onto the background so they persist as
      // reference markers without compounding every frame on the accumulating canvas.
      const [pr, pg, pb] = hexToRgb(primaryColor.value);
      p5.push();
      p5.stroke(pr, pg, pb);
      p5.strokeWeight(1);
      p5.noFill();
      for (const attractor of springAttractors) {
        const sphere = new Sphere(
          CoordinateSystem.fromOriginAndNormal(
            attractor,
            new P5.Vector(0, 0, 1),
          ),
          props.attractorRange,
        );
        const silhouette = sphere.silhouetteCircle(camera.value.pos);
        silhouette.renderSegmentCount = 64;
        const projected = camera.value.renderLines(silhouette.renderSegments);
        for (const seg of projected) seg.render2D(p5);
      }
      p5.pop();
    };

    p5.draw = () => {
      if (!gen) return;

      // Push current reactive prop values into the spring objects each frame.
      for (const s of gen.springs) {
        s.stiffness = props.springStiffness;
        s.damping = props.springDamping;
      }

      springVehicles.seek(
        springAttractors,
        props.attractorStrength,
        props.attractorRange,
      );
      springVehicles.applySprings();
      springVehicles.update();

      dotRenderer?.renderVehicles(springVehicles.vehicles);
      // console.log(springVehicles.vehicles.map(v => v.coords));

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
