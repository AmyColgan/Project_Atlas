import { Prng } from "../../utils/prng";

/**
 * Small deterministic value-noise field. Not a general-purpose noise library —
 * just enough lattice smoothing to give the prototype terrain natural-looking
 * bumps from a seeded PRNG, without pulling in an external noise dependency.
 */
export class ValueNoise2D {
  private readonly lattice: Float32Array;
  private readonly size: number;

  constructor(prng: Prng, latticeSize = 24) {
    this.size = latticeSize;
    this.lattice = new Float32Array(latticeSize * latticeSize);
    for (let i = 0; i < this.lattice.length; i++) {
      this.lattice[i] = prng.next();
    }
  }

  private sample(ix: number, iy: number): number {
    const wrapped = ((ix % this.size) + this.size) % this.size;
    const wrappedY = ((iy % this.size) + this.size) % this.size;
    return this.lattice[wrappedY * this.size + wrapped];
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  /** Samples the lattice at (x, y) where x/y are in lattice-cell units. */
  private noise(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = this.smoothstep(x - x0);
    const ty = this.smoothstep(y - y0);

    const v00 = this.sample(x0, y0);
    const v10 = this.sample(x0 + 1, y0);
    const v01 = this.sample(x0, y0 + 1);
    const v11 = this.sample(x0 + 1, y0 + 1);

    const top = v00 + (v10 - v00) * tx;
    const bottom = v01 + (v11 - v01) * tx;
    return top + (bottom - top) * ty;
  }

  /** Fractal Brownian motion: layers several noise octaves for natural variation. */
  fbm(x: number, y: number, octaves = 4, persistence = 0.5): number {
    let total = 0;
    let amplitude = 1;
    let maxAmplitude = 0;
    let frequency = 1;

    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxAmplitude += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxAmplitude;
  }
}
