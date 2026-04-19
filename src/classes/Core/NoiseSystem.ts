import P5 from 'p5';

/**
 * A static 3D noise field that maps world-space positions to smooth, consistent P5.Vectors.
 * Unlike WindSystem there is no time dimension — the field is frozen in space and produces
 * the same output for the same input position throughout a sketch's lifetime.
 *
 * Intended workflow:
 *   setup: configure properties (noiseScale, octaves, seed, etc.), call sample() or sampleScalar()
 *   draw:  call sample(pos) to get a direction/magnitude at any world coordinate
 *
 * Three independent noise channels (decorrelated by channelOffsets) drive the x, y, z
 * components of the output vector. Each channel samples p5.noise() at the scaled,
 * shifted input coordinate. When `center` is true the [0,1] noise range is remapped
 * to [-1,1] before any further scaling, which is almost always what you want for flow fields.
 *
 * Because p5.noiseDetail() and p5.noiseSeed() are global, setting `octaves`, `falloff`,
 * or `noiseSeed` on any NoiseSystem instance affects all p5 noise calls in the sketch.
 */
export class NoiseSystem {
  // ── Private backing fields ────────────────────────────────────────────────

  private _noiseScale: number = 0.01;
  private _outputScale: number = 1;
  private _octaves: number = 4;
  private _falloff: number = 0.5;
  private _normalize: boolean = false;
  private _center: boolean = true;
  private _noiseSeed: number | null = null;
  private _offset: P5.Vector = new P5.Vector(0, 0, 0);
  private _outputOffset: P5.Vector = new P5.Vector(0, 0, 0);
  private _channelOffsets: [P5.Vector, P5.Vector, P5.Vector] = [
    new P5.Vector(0, 0, 0),
    new P5.Vector(31.416, 47.853, 12.793),
    new P5.Vector(99.123, 65.432, 77.789),
  ];

  /**
   * Creates a new NoiseSystem and applies the initial noise detail settings.
   * @param p5 The p5 instance used for noise sampling
   */
  constructor(private readonly p5: P5) {
    this._applyNoiseDetail();
  }

  // ── Public get/set properties ─────────────────────────────────────────────

  /**
   * Scale applied to input coordinates before noise sampling.
   * Smaller values produce larger, smoother patterns; larger values produce finer detail.
   * @default 0.01
   */
  get noiseScale(): number {
    return this._noiseScale;
  }
  set noiseScale(v: number) {
    this._noiseScale = v;
  }

  /**
   * Multiplier applied to the output vector after optional normalization.
   * Controls the magnitude of the returned vectors.
   * @default 1
   */
  get outputScale(): number {
    return this._outputScale;
  }
  set outputScale(v: number) {
    this._outputScale = v;
  }

  /**
   * Number of Perlin noise octaves (layers of fBm detail).
   * Setting this immediately calls p5.noiseDetail() — the change is global.
   * @default 4
   */
  get octaves(): number {
    return this._octaves;
  }
  set octaves(v: number) {
    this._octaves = v;
    this._applyNoiseDetail();
  }

  /**
   * Amplitude falloff ratio between successive noise octaves.
   * Lower values (e.g. 0.3) give sharper, more turbulent fields;
   * higher values (e.g. 0.75) give smoother, more flowing ones.
   * Setting this immediately calls p5.noiseDetail() — the change is global.
   * @default 0.5
   */
  get falloff(): number {
    return this._falloff;
  }
  set falloff(v: number) {
    this._falloff = v;
    this._applyNoiseDetail();
  }

  /**
   * When true, the output vector is normalized to unit length before outputScale
   * is applied, giving direction-only output (magnitude = outputScale everywhere).
   * @default false
   */
  get normalize(): boolean {
    return this._normalize;
  }
  set normalize(v: boolean) {
    this._normalize = v;
  }

  /**
   * When true, raw noise values in [0, 1] are remapped to [-1, 1] before any
   * further processing, centering the field around zero. Almost always desirable
   * for flow fields and direction vectors.
   * @default true
   */
  get center(): boolean {
    return this._center;
  }
  set center(v: boolean) {
    this._center = v;
  }

  /**
   * Seed for p5.noiseSeed(). Setting this produces a reproducible noise field.
   * Set to null to leave the seed unspecified (non-deterministic).
   * Setting this immediately calls p5.noiseSeed() — the change is global.
   * @default null
   */
  get noiseSeed(): number | null {
    return this._noiseSeed;
  }
  set noiseSeed(v: number | null) {
    this._noiseSeed = v;
    if (v !== null) {
      this.p5.noiseSeed(v);
    }
  }

  /**
   * Additive offset applied to the scaled input coordinates before noise sampling.
   * Shifts the region of the noise domain being sampled; useful for giving multiple
   * NoiseSystem instances independent but overlapping domains.
   * @default (0, 0, 0)
   */
  get offset(): P5.Vector {
    return this._offset;
  }
  set offset(v: P5.Vector) {
    this._offset = v;
  }

  /**
   * Additive offset applied to the final output vector after scaling.
   * Can introduce a global bias or drift direction into the field.
   * @default (0, 0, 0)
   */
  get outputOffset(): P5.Vector {
    return this._outputOffset;
  }
  set outputOffset(v: P5.Vector) {
    this._outputOffset = v;
  }

  /**
   * Decorrelation offsets applied to the noise coordinates for each of the three
   * output channels (x, y, z). Channel 0 defaults to (0,0,0); channels 1 and 2
   * use large irrational-ish offsets so their noise fields are visually independent.
   * Replace any or all three to fully control channel decorrelation.
   * @default [(0,0,0), (31.4,47.9,12.8), (99.1,65.4,77.8)]
   */
  get channelOffsets(): [P5.Vector, P5.Vector, P5.Vector] {
    return this._channelOffsets;
  }
  set channelOffsets(v: [P5.Vector, P5.Vector, P5.Vector]) {
    this._channelOffsets = v;
  }

  // ── Sampling ──────────────────────────────────────────────────────────────

  /**
   * Samples the noise field at a world-space position and returns a 3D vector.
   * Each component is driven by an independent noise channel at the same spatial
   * coordinate, decorrelated by channelOffsets. The result has center, normalize,
   * outputScale, and outputOffset applied in that order.
   * @param pos World-space position to sample
   * @returns A P5.Vector representing the noise field value at that position
   */
  sample(pos: P5.Vector): P5.Vector {
    const sx = pos.x * this._noiseScale + this._offset.x;
    const sy = pos.y * this._noiseScale + this._offset.y;
    const sz = pos.z * this._noiseScale + this._offset.z;

    const [o0, o1, o2] = this._channelOffsets;

    let vx = this.p5.noise(sx + o0.x, sy + o0.y, sz + o0.z);
    let vy = this.p5.noise(sx + o1.x, sy + o1.y, sz + o1.z);
    let vz = this.p5.noise(sx + o2.x, sy + o2.y, sz + o2.z);

    if (this._center) {
      vx = vx * 2 - 1;
      vy = vy * 2 - 1;
      vz = vz * 2 - 1;
    }

    const result = new P5.Vector(vx, vy, vz);

    if (this._normalize && result.magSq() > 1e-10) {
      result.normalize();
    }

    return result.mult(this._outputScale).add(this._outputOffset);
  }

  /**
   * Samples a single scalar value from one noise channel at a world-space position.
   * The raw p5.noise() value in [0, 1] is returned (or remapped to [-1, 1] when
   * `center` is true). outputScale and outputOffset are NOT applied — this returns
   * the raw channel value for use as a weight, density, or threshold.
   * @param pos          World-space position to sample
   * @param channelIndex Which output channel's noise to sample (0 = x, 1 = y, 2 = z; default: 0)
   * @returns A scalar noise value
   */
  sampleScalar(pos: P5.Vector, channelIndex: number = 0): number {
    const sx = pos.x * this._noiseScale + this._offset.x;
    const sy = pos.y * this._noiseScale + this._offset.y;
    const sz = pos.z * this._noiseScale + this._offset.z;

    const o = this._channelOffsets[Math.max(0, Math.min(2, channelIndex))];
    const raw = this.p5.noise(sx + o.x, sy + o.y, sz + o.z);

    return this._center ? raw * 2 - 1 : raw;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Applies current octave and falloff values to p5.noiseDetail(). */
  private _applyNoiseDetail(): void {
    this.p5.noiseDetail(this._octaves, this._falloff);
  }
}
