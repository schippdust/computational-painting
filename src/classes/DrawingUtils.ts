import { Camera3D } from './Camera3D';
import P5 from 'p5';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
const appStore = useAppStore();
const { pauseCanvas } = storeToRefs(appStore);

export function drawAxes(p5: P5, camera: Camera3D, axisLength: number) {
  let centerPoint = camera.project(new P5.Vector(0, 0, 0));
  let xEnd = camera.project(new P5.Vector(axisLength, 0, 0));
  let yEnd = camera.project(new P5.Vector(0, axisLength, 0));
  let zEnd = camera.project(new P5.Vector(0, 0, axisLength));
  if (centerPoint && xEnd && yEnd && zEnd) {
    p5.stroke(255, 0, 0);
    p5.line(centerPoint.x, centerPoint.y, xEnd.x, xEnd.y);
    p5.stroke(0, 255, 0);
    p5.line(centerPoint.x, centerPoint.y, yEnd.x, yEnd.y);
    p5.stroke(0, 0, 255);
    p5.line(centerPoint.x, centerPoint.y, zEnd.x, zEnd.y);
  }
}

export function pressSpaceToPause(p5: P5) {
  if (p5.key == ' ') {
    if (pauseCanvas.value) {
      console.log('Spacebar Pressed: Unpausing Canvas');
      p5.loop();
    } else {
      console.log('Spacebar Pressed: Pausing Canvas');
      p5.noLoop();
    }
    appStore.togglePause();
  }
}

export function randomPointOnCircleOrSphere(
  center: P5.Vector,
  radius: number,
  is3D: boolean,
): P5.Vector {
  if (is3D) {
    // Random point on a sphere using spherical coordinates
    const u = Math.random();
    const v = Math.random();

    const theta = 2 * Math.PI * u; // azimuthal angle
    const phi = Math.acos(2 * v - 1); // polar angle

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    return P5.Vector.add(center, new P5.Vector(x, y, z));
  } else {
    // Random point on a circle
    const angle = Math.random() * 2 * Math.PI;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);

    return P5.Vector.add(center, new P5.Vector(x, y, 0)); // Z = 0 for 2D
  }
}
