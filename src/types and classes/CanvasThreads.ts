import { mapNumber } from '@/stores/utilityFunctions';
import { Vector } from 'p5';
import p5 from 'p5';

export class CanvasThreads {
  threadSpacing: number;
  threadWidth: number;
  threadCountX: number;
  threadCountY: number;
  canvasWidth: number;
  canvasHeight: number;

  constructor(
    threadSpacing: number,
    threadWidth: number,
    canvasWidth: number,
    canvasHeight: number,
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.threadSpacing = threadSpacing;
    this.threadWidth = threadWidth;
    this.threadCountX = canvasWidth / (threadSpacing + threadWidth);
    this.threadCountY = canvasHeight / (threadSpacing + threadWidth);
  }

  //thread width _ _ | _ _ _ thread spacing
  calcOpacityAtPoint(point: Vector): number {
    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x > this.canvasWidth ||
      point.y > this.canvasHeight
    ) {
      return 0;
    }

    const threadPatternXPos = point.x % (this.threadSpacing + this.threadWidth);
    const threadPatternYPos = point.y % (this.threadSpacing + this.threadWidth);
    const xOpacity = this.calcOpacityByParam(threadPatternXPos);
    const yOpacity = this.calcOpacityByParam(threadPatternYPos);

    return (xOpacity + yOpacity) / 2;
  }

  calcOpacityAtPointGivenVector(point: Vector, direction: Vector) {
    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x > this.canvasWidth ||
      point.y > this.canvasHeight
    ) {
      return 0;
    }

    const threadPatternXPos = point.x % (this.threadSpacing + this.threadWidth);
    const threadPatternYPos = point.y % (this.threadSpacing + this.threadWidth);
    const baseXOpacity = this.calcOpacityByParam(threadPatternXPos);
    const baseYOpacity = this.calcOpacityByParam(threadPatternYPos);

    const centerPoint = new p5.Vector(
      this.threadWidth / 2,
      this.threadWidth / 2,
    );
    const patternPoint = new p5.Vector(threadPatternXPos, threadPatternYPos);
    const vectorToPatternPoint = p5.Vector.sub(
      patternPoint,
      centerPoint,
    ).normalize();
    const normalizedDirection = direction.copy().normalize();

    const dotProduct = p5.Vector.dot(vectorToPatternPoint, normalizedDirection);
    const adjustedDotProduct = mapNumber(dotProduct, -1, 1, 1, 0);
    return ((baseXOpacity + baseYOpacity) / 2) * adjustedDotProduct;
  }

  private calcOpacityByParam(param: number): number {
    if (param < 0) {
      return 0;
    } else if (param <= this.threadWidth / 2) {
      return mapNumber(param, 0, this.threadWidth / 2, 0.75, 1);
    } else if (param < this.threadWidth) {
      return mapNumber(param, this.threadWidth / 2, this.threadWidth, 1, 0.75);
    } else if (param < this.threadSpacing / 2 + this.threadWidth) {
      return mapNumber(
        param,
        this.threadWidth,
        this.threadWidth + this.threadSpacing / 2,
        0.5,
        0,
      );
    } else if (param < this.threadWidth + this.threadSpacing) {
      return mapNumber(
        param,
        this.threadWidth + this.threadSpacing / 2,
        this.threadWidth + this.threadSpacing,
        0,
        0.5,
      );
    } else {
      return 0;
    }
  }
}
