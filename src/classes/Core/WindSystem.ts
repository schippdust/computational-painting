import P5 from 'p5';

/**
 * A wind simulation system using Perlin noise and curl noise (fBm).
 * Generates realistic wind fields that vary over space and time.
 * Wind is computed as the curl of three-dimensional Perlin noise for divergence-free flow.
 * Based on curl noise techniques for generating vortical flow patterns suitable for fluid dynamics.
 */
export class WindSystem {
  /**
   * Scale factor for spatial noise sampling.
   * Smaller values create larger-scale wind patterns; larger values create more detailed variation.
   * @default 0.01
   */
  public noiseScale: number = 0.01;

  /**
   * Scale factor for temporal noise progression.
   * Controls how quickly the wind field evolves over time.
   * @default 0.01
   */
  public timeScale: number = 0.01;

  // Arbitrary offsets used to decorrelate the three noise components (N1, N2, N3)
  // These values ensure the curl noise produces low-correlation, realistic flow patterns
  private readonly NOISE_OFFSET_N2 = [31.416, 47.853, 12.793];
  private readonly NOISE_OFFSET_N3 = [99.123, 65.432, 77.789];

  /**
   * Creates a new WindSystem.
   * @param p5 The p5 instance for accessing noise and frame count
   */
  constructor(private p5: P5) {
    this.setNoiseDetail(4);
  }

  /**
   * Configures the detail of the Perlin noise function.
   * Higher octaves and appropriate falloff create more detailed, realistic wind patterns.
   * @param octaves The number of noise octaves for layered (fBm) noise
   * @param falloff The amplitude falloff ratio between octaves (default: 0.6)
   */
  setNoiseDetail(octaves: number, falloff = 0.6) {
    this.p5.noiseDetail(octaves, falloff);
  }

  /**
   * Computes wind velocity at a specific position using curl noise (fBm).
   * Combines eddy wind (local turbulence) with directional wind (global flow).
   * Wind magnitude can optionally vary with time for more dynamic effects.
   * The curl of Perlin noise is divergence-free, creating realistic vortex-free flow.
   * @param pos The position in world space at which to sample wind
   * @param directionalWindMultiplier Scale factor for the global wind direction component (default: 1)
   * @param eddyMultiplier Scale factor for local turbulence/eddy patterns (default: 1)
   * @param strengthVariability If true, scales wind magnitude by time-varying noise (default: true)
   * @returns A 3D wind velocity vector at the specified position
   */
  calculateWindAtCoords(
    pos: P5.Vector,
    directionalWindMultiplier = 1,
    eddyMultiplier = 1,
    strengthVariability = true,
  ): P5.Vector {
    const eddyWind = this.calculateNoiseAtCoords(pos, eddyMultiplier);
    const directionalWind = this.calculateNoiseAtCoords(
      new P5.Vector(0, 0, 0),
      directionalWindMultiplier,
    );
    const time = this.p5.frameCount * this.timeScale;
    const strengthMult = this.p5.noise(time, time, time);
    const cumulativeWind = P5.Vector.add(eddyWind, directionalWind);
    if (strengthVariability) {
      cumulativeWind.mult(strengthMult);
    }
    return cumulativeWind;
  }

  /**
   * Computes the curl of 3D Perlin noise at a given position.
   * Curl (∇ × F) produces divergence-free flow suitable for fluid simulation.
   * Uses finite differences to approximate partial derivatives of three offset Perlin components.
   * @param pos The position in space to sample noise curl
   * @param multiplier Scaling factor for the resulting curl vector (default: 1)
   * @returns A curl vector representing local wind flow at the position
   * @private
   */
  private calculateNoiseAtCoords(pos: P5.Vector, multiplier = 1) {
    const scale = this.noiseScale;
    const eps = 0.001;

    const x = pos.x * scale + this.p5.frameCount * this.timeScale;
    const y = pos.y * scale + this.p5.frameCount * this.timeScale;
    const z = pos.z * scale + this.p5.frameCount * this.timeScale;

    // Define vector-valued field F = [N1, N2, N3] using offset noise
    const N1 = (xi: number, yi: number, zi: number) =>
      this.p5.noise(xi, yi, zi);
    const N2 = (xi: number, yi: number, zi: number) =>
      this.p5.noise(
        xi + this.NOISE_OFFSET_N2[0],
        yi + this.NOISE_OFFSET_N2[1],
        zi + this.NOISE_OFFSET_N2[2],
      );
    const N3 = (xi: number, yi: number, zi: number) =>
      this.p5.noise(
        xi + this.NOISE_OFFSET_N3[0],
        yi + this.NOISE_OFFSET_N3[1],
        zi + this.NOISE_OFFSET_N3[2],
      );

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

    return curl.mult(multiplier);
  }
}
