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
    this.timeScale = 0.01;
    this.time = undefined;
    this.uvSeparation = 50000;
    this.setNoiseDetail(4);
  }

  setNoiseDetail(octaves: number, falloff = 0.6) {
    this.p5.noiseDetail(octaves, falloff);
  }

  /**
   * Computes wind as fBm curl noise.
   * Adjust `useFBM` to toggle layered noise or single-scale.
   */
  // a method from chatgpt to determine 3D perlin noise fields.  No clue how it works
  calculateWindAtCoords(pos: P5.Vector, multiplier = 1): P5.Vector {
    const scale = this.noiseScale;
    const eps = 0.001;

    const x = pos.x * scale + this.p5.frameCount * this.timeScale;
    const y = pos.y * scale + this.p5.frameCount * this.timeScale;
    const z = pos.z * scale + this.p5.frameCount * this.timeScale;

    // Define vector-valued field F = [N1, N2, N3] using offset noise
    const N1 = (xi: number, yi: number, zi: number) =>
      this.p5.noise(xi, yi, zi);
    const N2 = (xi: number, yi: number, zi: number) =>
      this.p5.noise(xi + 31.416, yi + 47.853, zi + 12.793); // offset to decorrelate
    const N3 = (xi: number, yi: number, zi: number) =>
      this.p5.noise(xi + 99.123, yi + 65.432, zi + 77.789);

    // Partial derivatives via central differences
    const dN3_dy = (N3(x, y + eps, z) - N3(x, y - eps, z)) / (2 * eps);
    const dN2_dz = (N2(x, y, z + eps) - N2(x, y, z - eps)) / (2 * eps);

    const dN1_dz = (N1(x, y, z + eps) - N1(x, y, z - eps)) / (2 * eps);
    const dN3_dx = (N3(x + eps, y, z) - N3(x - eps, y, z)) / (2 * eps);

    const dN2_dx = (N2(x + eps, y, z) - N2(x - eps, y, z)) / (2 * eps);
    const dN1_dy = (N1(x, y + eps, z) - N1(x, y - eps, z)) / (2 * eps);

    // Curl: ∇ × F
    const curl = new P5.Vector(
      dN3_dy - dN2_dz, // ∂N3/∂y - ∂N2/∂z
      dN1_dz - dN3_dx, // ∂N1/∂z - ∂N3/∂x
      dN2_dx - dN1_dy, // ∂N2/∂x - ∂N1/∂y
    );

    if (curl.magSq() < 1e-6) {
      return new P5.Vector(0, 0, 0);
    }

    return curl.normalize().mult(multiplier);
  }
}
