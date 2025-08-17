import P5 from 'p5';

export class PixelManager {
  private p5: P5;
  private pixels: number[];

  constructor(p5: P5) {
    this.p5 = p5;
    this.pixels = [];
  }

  loadPixels() {
    this.p5.loadPixels();
    this.pixels = this.p5.pixels;
  }

  circle(coords: P5.Vector, radius: number, color: P5.Color) {
    let coordsOut: P5.Vector[] = [];
    let x = Math.round(coords.x);
    let y = Math.round(coords.y);
    let roundedCoords = new P5.Vector(x, y);
    for (let i = x - radius; i < x + radius; i++) {
      for (let j = y - radius; j < y + radius; j++) {
        let secondVect = new P5.Vector(i, j);
        let xInBounds = secondVect.x <= this.p5.width && secondVect.x >= 0;
        let yInBounds = secondVect.y <= this.p5.height && secondVect.y >= 0;
        if (!xInBounds || !yInBounds) {
          continue;
        }
        let distance = P5.Vector.dist(roundedCoords, secondVect);
        if (distance <= radius) {
          coordsOut.push(secondVect);
        }
      }
    }
    this.setPixels(coordsOut, color);
  }

  setPixels(coords: P5.Vector[], color: P5.Color) {
    let d = this.p5.pixelDensity();
    // console.log('pixel density',d)
    // console.log('pixel count',this.pixels.length)

    for (let vect of coords) {
      for (let i = 0; i < d; i += 1) {
        for (let j = 0; j < d; j += 1) {
          let index =
            4 * ((vect.y * d + j) * this.p5.width * d + (vect.x * d + i));
          let r = index;
          let g = index + 1;
          let b = index + 2;
          let a = index + 3;
          let colorRef = color as any;
          // console.log('before',this.pixels[r],this.pixels[g],this.pixels[b],this.pixels[a])
          // console.log('setting color',r,g,b,a,colorRef)
          // console.log(colorRef)
          this.pixels[r] = colorRef.levels[0];
          this.pixels[g] = colorRef.levels[1];
          this.pixels[b] = colorRef.levels[2];
          this.pixels[a] = colorRef.levels[3];
          // console.log('after',this.pixels[r],this.pixels[g],this.pixels[b],this.pixels[a])
        }
      }
    }
  }

  updatePixels() {
    this.p5.updatePixels();
  }
}
