import P5 from 'p5';

export class PixelManager {
  private pixels: number[];

  constructor(private p5: P5) {
    this.p5 = p5;
    this.pixels = [];
  }

  loadPixels() {
    this.p5.loadPixels();
    this.pixels = this.p5.pixels;
  }

  circle(coords: P5.Vector, radius: number, color: P5.Color) {
    const coordsOut: P5.Vector[] = [];
    const x = Math.round(coords.x);
    const y = Math.round(coords.y);
    const roundedCoords = new P5.Vector(x, y);
    for (let i = x - radius; i < x + radius; i++) {
      for (let j = y - radius; j < y + radius; j++) {
        const secondVect = new P5.Vector(i, j);
        const xInBounds = secondVect.x <= this.p5.width && secondVect.x >= 0;
        const yInBounds = secondVect.y <= this.p5.height && secondVect.y >= 0;
        if (!xInBounds || !yInBounds) {
          continue;
        }
        const distance = P5.Vector.dist(roundedCoords, secondVect);
        if (distance <= radius) {
          coordsOut.push(secondVect);
        }
      }
    }
    this.setPixels(coordsOut, color);
  }

  setPixels(coords: P5.Vector[], color: P5.Color) {
    const d = this.p5.pixelDensity();
    // console.log('pixel density',d)
    // console.log('pixel count',this.pixels.length)

    for (const vect of coords) {
      for (let i = 0; i < d; i += 1) {
        for (let j = 0; j < d; j += 1) {
          const index =
            4 * ((vect.y * d + j) * this.p5.width * d + (vect.x * d + i));
          const r = index;
          const g = index + 1;
          const b = index + 2;
          const a = index + 3;
          const colorRef = color as any;
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
