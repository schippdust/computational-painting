import { Camera3D } from './Camera3D';
import P5 from 'p5';
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
