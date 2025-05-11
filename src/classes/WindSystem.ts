import P5 from 'p5';

export class WindSystem {
  private p5: P5;
  private uvSeparation: number;
  public noiseScale: number;
  public timeScale: number;
  public time: number | undefined;

  constructor(p5: P5) {
    this.p5 = p5;
    this.noiseScale = 0.01;
    this.timeScale = 0.03;
    this.time = undefined;
    this.uvSeparation = 50000;
    this.setNoiseDetail(4);
  }

  setNoiseDetail(octaves: number, falloff = 0.6) {
    this.p5.noiseDetail(octaves, falloff);
  }

  calculateWindAtCoords(coords: P5.Vector, multiplier = 1) {
    let calcTime = this.p5.frameCount;
    if (this.time != undefined) {
      calcTime = this.time; //option to manage time manually if desired
    }
    let uNoise = this.p5.noise(
      coords.x * this.noiseScale + calcTime * this.timeScale,
      coords.y * this.noiseScale + calcTime * this.timeScale,
      coords.z * this.noiseScale + calcTime * this.timeScale,
    );
    let vNoise = this.p5.noise(
      coords.x * this.noiseScale +
        calcTime * this.timeScale +
        this.uvSeparation,
      coords.y * this.noiseScale +
        calcTime * this.timeScale +
        this.uvSeparation,
      coords.z * this.noiseScale +
        calcTime * this.timeScale +
        this.uvSeparation,
    );

    // because noise rarely approaches 0 or 1 and has a more guassian
    // distribution around 0.5, I will multiply by 3PI then find the sin
    // This creates a smooth distribution from -1 to 1
    // which can be remapped to 0 to 1
    // const u = this.p5.map(Math.sin(uNoise * 6 * Math.PI), -1, 1, 0, 1);
    // const v = this.p5.map(Math.sin(vNoise * 6 * Math.PI), -1, 1, 0, 1);

    // // random point on sphere from ChatGPT, appears to work
    // const theta = 2 * Math.PI * u;
    // const phi = Math.acos(2 * v - 1);

    // const x = multiplier * Math.sin(phi) * Math.cos(theta);
    // const y = multiplier * Math.sin(phi) * Math.sin(theta);
    // const z = multiplier * Math.cos(phi);

    /////////////////////////////////////
    // const u = uNoise; // in [0, 1]
    // const v = vNoise; // in [0, 1]

    // const theta = 2 * Math.PI * u;
    // const phi = Math.acos(1 - 2 * v); // correct for uniform sampling

    // const x = multiplier * Math.sin(phi) * Math.cos(theta);
    // const y = multiplier * Math.sin(phi) * Math.sin(theta);
    // const z = multiplier * Math.cos(phi);
    /////////////////////////////////////////

    // Use 3D Perlin noise to define a *single* direction vector.
    const theta = this.p5.noise(coords.x * this.noiseScale, coords.y * this.noiseScale, coords.z * this.noiseScale) * 2 * Math.PI;
    const phi = this.p5.noise(coords.x * this.noiseScale + 100, coords.y * this.noiseScale + 100, coords.z * this.noiseScale + 100) * Math.PI;

    const xDir = Math.sin(phi) * Math.cos(theta);
    const yDir = Math.sin(phi) * Math.sin(theta);
    const zDir = Math.cos(phi);

    const dir = this.p5.createVector(xDir, yDir, zDir).normalize().mult(multiplier);

    // const windForce = new P5.Vector(x, y, z);

    //temp return function until wind calcs are determined
    return dir;
  }
}
