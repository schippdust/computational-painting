<script setup lang="ts">
import P5 from 'p5';
import { pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { VehicleDotRenderer } from '@/classes/Rendering/VehicleRenderers/VehicleDotRenderer';
import { Sphere } from '@/classes/Geometry/Sphere';
import { CoordinateSystem } from '@/classes/Geometry/CoordinateSystem';
import {
  Vehicle,
  createGenericPhysicalProps,
} from '@/classes/MarkMakingEntities/Extensible/Vehicle';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

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

watch(backgroundColor, (newColor) => {
  p5Instance?.background(newColor);
});

onUnmounted(() => {
  p5Instance?.remove();
  p5Instance = null;
  dotRenderer = null;
});

onMounted(() => {
  const sphereRadius = 3000;
  const initialSpeed = 8;
  const vehicleLifespan = 500;
  const vehicleFriction = 0.02;
  const maxVehicles = 800;

  // Single sphere centered at the world origin.
  const sphere = new Sphere(
    CoordinateSystem.fromOriginAndNormal(
      new P5.Vector(0, 0, 0),
      new P5.Vector(0, 0, 1),
    ),
    sphereRadius,
  );

  let vehicles: Vehicle[] = [];
  let silhouetteRendered = false;

  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(backgroundColor.value);
      p5.frameRate(frameRate.value);

      dotRenderer = new VehicleDotRenderer(
        p5,
        4,
        sphereRadius * 4,
        hexToRgb(primaryColor.value),
        camera.value,
      );
    };

    p5.draw = () => {
      // Draw the sphere silhouette once on the first frame.
      if (!silhouetteRendered && camera.value) {
        p5.stroke(primaryColor.value);
        p5.strokeWeight(1);
        const silhouette = sphere.silhouetteCircle(camera.value.pos);
        silhouette.renderSegmentCount = 120;
        const projected = camera.value.renderLines(silhouette.renderSegments);
        for (const seg of projected) seg.render2D(p5);
        silhouetteRendered = true;
      }

      // Remove vehicles that have exceeded their lifespan.
      vehicles = vehicles.filter((v) => !v.isDead);

      // Spawn one new vehicle per frame up to the population cap.
      if (vehicles.length < maxVehicles) {
        const surfacePoint = sphere.randomPointOnSurface();

        // Outward velocity: from sphere center toward the surface point.
        const outward = P5.Vector.sub(surfacePoint, sphere.centerPoint)
          .normalize()
          .mult(initialSpeed);

        const vehicle = new Vehicle(
          p5,
          surfacePoint,
          createGenericPhysicalProps(),
        );
        vehicle.lifeExpectancy = vehicleLifespan;
        vehicle.env.friction = vehicleFriction;
        vehicle.velocity = outward;

        vehicles.push(vehicle);
      }

      // Advance all vehicles one physics step.
      for (const v of vehicles) v.update();

      // Split by occlusion relative to the current camera position.
      const camPos = camera.value.pos;
      const visible: Vehicle[] = [];
      const occluded: Vehicle[] = [];
      for (const v of vehicles) {
        if (sphere.isPointObscured(v.coordSystem.getPosition(), camPos)) {
          occluded.push(v);
        } else {
          visible.push(v);
        }
      }

      // Render: primary color for visible, secondary for occluded.
      if (dotRenderer) {
        dotRenderer.color = hexToRgb(primaryColor.value);
        dotRenderer.renderVehicles(visible);

        dotRenderer.color = hexToRgb(secondaryColor.value);
        dotRenderer.renderVehicles(occluded);
      }

      numberOfFrames.value++;
      numberOfVehicles.value = vehicles.length;
    };

    p5.keyPressed = () => {
      pressSpaceToPause(p5);
    };
  };

  const canvasElement = document.getElementById(
    'sphere-emission-canvas',
  ) as HTMLElement;
  p5Instance = new P5(sketch, canvasElement);
});
</script>

<template>
  <div
    id="sphere-emission-canvas"
    style="overflow-y: auto; overflow-x: auto; line-height: 0"
  ></div>
</template>
