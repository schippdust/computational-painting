<script setup lang="ts">
import P5 from 'p5';
import { pressSpaceToPause } from '@/classes/Rendering/DrawingUtils';
import { MeshBuilders } from '@/classes/Mesh/Mesh3D';
import type { Mesh3D } from '@/classes/Mesh/Mesh3D';
import { MeshSilhouetteRenderer } from '@/classes/Rendering/GeometryRenderers/MeshSilhouetteRenderer';
import { MeshWireRenderer } from '@/classes/Rendering/GeometryRenderers/MeshWireRenderer';
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

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(hex);
  return m
    ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
    : [255, 255, 255];
}

const frameRate = ref(20);
const numberOfFrames = ref(0);
const numberOfVehicles = ref(0);
defineExpose({ frameRate, numberOfFrames, numberOfVehicles });

let p5Instance: P5 | null = null;
let silhouetteRenderer: MeshSilhouetteRenderer | null = null;
let wireRenderer: MeshWireRenderer | null = null;

watch(pauseCanvas, (paused) => {
  if (!p5Instance) return;
  if (paused) p5Instance.noLoop();
  else p5Instance.loop();
});

watch(primaryColor, (newColor) => {
  if (silhouetteRenderer) silhouetteRenderer.color = hexToRgb(newColor);
});

watch(secondaryColor, (newColor) => {
  if (wireRenderer) wireRenderer.color = hexToRgb(newColor);
});

watch(backgroundColor, (newColor) => {
  p5Instance?.background(newColor);
});

onUnmounted(() => {
  p5Instance?.remove();
  p5Instance = null;
  silhouetteRenderer = null;
  wireRenderer = null;
});

onMounted(() => {
  const meshes: Mesh3D[] = [];
  let orbitMesh: Mesh3D | null = null;

  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(backgroundColor.value);
      p5.frameRate(frameRate.value);

      // Store default (0,0,1000)→(0,0,0) is degenerate: forward ∥ up vector.
      camera.value.setPosition(new P5.Vector(0, -1400, 600));
      camera.value.lookAt(new P5.Vector(0, 0, 0));

      // Scene: an icosphere at the origin and a box offset on +X. Self-occlusion
      // + cross-occlusion exercises the full silhouette + clipping path.
      const sphere = MeshBuilders.icosphere(260, 2).setPosition(
        new P5.Vector(0, 0, 0),
      );
      const box = MeshBuilders.box(320, 320, 320).setPosition(
        new P5.Vector(450, 0, 0),
      );
      orbitMesh = MeshBuilders.icosphere(140, 1).setPosition(
        new P5.Vector(-450, 0, 0),
      );

      meshes.push(sphere, box, orbitMesh);

      silhouetteRenderer = new MeshSilhouetteRenderer(
        p5,
        hexToRgb(primaryColor.value),
        camera.value,
        2,
        1500,
      );
      wireRenderer = new MeshWireRenderer(
        p5,
        hexToRgb(secondaryColor.value),
        camera.value,
        1,
        1500,
        30,
      );
    };

    p5.draw = () => {
      if (!silhouetteRenderer || !wireRenderer) return;

      // Slowly orbit one mesh so silhouette/occlusion updates frame-to-frame.
      if (orbitMesh) {
        const t = numberOfFrames.value * 0.02;
        orbitMesh.setPosition(
          new P5.Vector(Math.cos(t) * 500, Math.sin(t) * 500, 0),
        );
      }

      // Silhouettes use the full scene as occluders so cross-mesh occlusion
      // and back-side self-occlusion are both clipped out.
      silhouetteRenderer.renderSilhouettes(meshes, meshes, 12);

      // Crease wires with a 30° threshold: the box emits its hard edges,
      // the icosphere is smooth so most triangle edges are suppressed.
      // Re-using `meshes` as occluders drops hidden back-side wires.
      wireRenderer.renderWires(meshes, meshes, 10);

      numberOfFrames.value++;
      numberOfVehicles.value = meshes.length;
    };

    p5.keyPressed = () => {
      pressSpaceToPause(p5);
    };
  };

  const canvasElement = document.getElementById(
    'mesh-occlusion-test-canvas',
  ) as HTMLElement;
  p5Instance = new P5(sketch, canvasElement);
});
</script>

<template>
  <div
    id="mesh-occlusion-test-canvas"
    style="overflow-y: auto; overflow-x: auto; line-height: 0"
  />
</template>
