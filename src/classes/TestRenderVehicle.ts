import type { Camera3D } from './Camera3D';
import { Vehicle } from './Vehicle';
import { Line } from './Line';
import P5, { Camera } from 'p5';
import { Circle } from './Circle';

export class TestRenderVehicle extends Vehicle {
  update(): TestRenderVehicle {
    // only required if I'm modifying the update function to track
    // additional information that can be used for rendering
    super.update();

    return this;
  }
  renderAxes(camera: Camera3D): TestRenderVehicle {
    const yLineStart = new P5.Vector(0, 10, 0);
    const yLineEnd = new P5.Vector(0, -10, 0);
    const xLineStart = new P5.Vector(10, 0, 0);
    const xLineEnd = new P5.Vector(-10, 0, 0);
    const zLineStart = new P5.Vector(0, 0, -10);
    const zLineEnd = new P5.Vector(0, 0, 10);
    const localPoints = [
      yLineStart,
      yLineEnd,
      xLineStart,
      xLineEnd,
      zLineStart,
      zLineEnd,
    ];
    const pts = this.coordSystem.transformLocalPointsToWorldCs(localPoints);

    const lines = [
      new Line(pts[0], pts[1]),
      new Line(pts[2], pts[3]),
      new Line(pts[4], pts[5]),
    ];

    // render lines as xyz axes
    this.p5.stroke(0, 255, 0);
    lines[0].renderProjected(this.p5, camera);
    this.p5.stroke(255, 0, 0);
    lines[1].renderProjected(this.p5, camera);
    this.p5.stroke(0, 0, 255);
    lines[2].renderProjected(this.p5, camera);
    return this;
  }

  renderArrow(camera: Camera3D): TestRenderVehicle {
    const wingDepth = -30;
    const bodyDepth = -15;
    const wingLength = 20;
    const bodyHeight = 10;
    const centerPoint = new P5.Vector(0, 0, 0);
    const leftWing = new P5.Vector(-1 * wingLength, 0, wingDepth);
    const rightWing = new P5.Vector(wingLength, 0, wingDepth);
    const bodyTop = new P5.Vector(0, bodyHeight, bodyDepth);
    const bodyBottom = new P5.Vector(0, bodyHeight * -1, bodyDepth);
    const pts = this.coordSystem.transformLocalPointsToWorldCs([
      centerPoint,
      leftWing,
      rightWing,
      bodyTop,
      bodyBottom,
    ]);
    const lines = [
      new Line(pts[0], pts[1]),
      new Line(pts[0], pts[2]),
      new Line(pts[0], pts[3]),
      new Line(pts[0], pts[4]),
    ];

    for (const line of lines) {
      line.renderProjected(this.p5, camera);
    }

    return this;
  }

  render(camera: Camera3D): TestRenderVehicle {
    const renderCircle = new Circle(this.coordSystem, 10);
    renderCircle.renderSegmentCount = 8;
    renderCircle.renderProjected(this.p5, camera);
    return this;
  }
}
