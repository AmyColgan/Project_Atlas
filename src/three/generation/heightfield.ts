import { Prng } from "../../utils/prng";
import { ValueNoise2D } from "./noise";

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface SpineConfig {
  originX: number;
  originZ: number;
  /** Direction of the range's long axis, radians. */
  angle: number;
  /** Lateral wiggle amplitude, in world units. */
  wiggleAmplitude: number;
  /** Perpendicular falloff radius — how wide the range reads. */
  ridgeWidth: number;
  /** Peak height contribution at the spine's centerline. */
  ridgeHeight: number;
}

/**
 * A single coherent mountain range, not a radial blob and not unconstrained
 * ridge noise (both of which can produce zero, one, or several disconnected
 * lumps depending on seed). A seeded axis through the map, perturbed by a
 * low-frequency 1D wiggle, guarantees exactly one connected range that still
 * reads as organic rather than a straight line.
 */
export function createSpineConfig(prng: Prng, bounds: WorldBounds): SpineConfig {
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const span = Math.max(width, depth);

  return {
    originX: centerX + (prng.next() - 0.5) * width * 0.25,
    originZ: centerZ + (prng.next() - 0.5) * depth * 0.25,
    angle: prng.next() * Math.PI,
    wiggleAmplitude: span * 0.07,
    ridgeWidth: span * 0.09,
    ridgeHeight: 1,
  };
}

function wiggleOffset(alongAxis: number, wiggleNoise: ValueNoise2D, spine: SpineConfig): number {
  const t = alongAxis * 0.05;
  return (wiggleNoise.fbm(t, 0, 3, 0.5) * 2 - 1) * spine.wiggleAmplitude;
}

/** Perpendicular distance from (x, z) to the spine's wiggled centerline. */
export function distanceToSpine(x: number, z: number, spine: SpineConfig, wiggleNoise: ValueNoise2D): number {
  const dirX = Math.cos(spine.angle);
  const dirZ = Math.sin(spine.angle);
  const relX = x - spine.originX;
  const relZ = z - spine.originZ;

  const alongAxis = relX * dirX + relZ * dirZ;
  const perp = relX * -dirZ + relZ * dirX;

  const wiggled = perp - wiggleOffset(alongAxis, wiggleNoise, spine);
  return Math.abs(wiggled);
}

export function ridgeContribution(x: number, z: number, spine: SpineConfig, wiggleNoise: ValueNoise2D): number {
  const distance = distanceToSpine(x, z, spine, wiggleNoise);
  return spine.ridgeHeight * Math.exp(-(distance * distance) / (2 * spine.ridgeWidth * spine.ridgeWidth));
}

/** Position along the spine's own axis, in the same units distanceToSpine uses. */
export function alongSpineAxis(x: number, z: number, spine: SpineConfig): number {
  const dirX = Math.cos(spine.angle);
  const dirZ = Math.sin(spine.angle);
  return (x - spine.originX) * dirX + (z - spine.originZ) * dirZ;
}

export interface PassConfig {
  /** Position along the spine's axis where the pass is centered. */
  alongAxisT: number;
  halfWidth: number;
}

/** A deliberate lowland gap through the range — guarantees a walkable route exists. */
export function createPassConfig(prng: Prng, bounds: WorldBounds): PassConfig {
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
  return {
    alongAxisT: (prng.next() - 0.5) * span * 0.3,
    halfWidth: span * 0.06,
  };
}

/** 0 at the pass's center (ridge fully suppressed) smoothly rising to 1 outside its window. */
export function passDampening(x: number, z: number, spine: SpineConfig, pass: PassConfig): number {
  const t = alongSpineAxis(x, z, spine);
  const distance = Math.abs(t - pass.alongAxisT);
  if (distance > pass.halfWidth) return 1;
  const f = distance / pass.halfWidth;
  return f * f * (3 - 2 * f);
}

/**
 * Raises the map's interior and lets the outer ring sink, so ocean forms a
 * coastline around one landmass instead of scattering as inland pockets
 * wherever noise happens to dip low. Without this, uniform-ish noise puts
 * "ocean" anywhere it's locally low — including deep in the interior, where
 * it should read as a lake, not open sea.
 */
export function continentFalloff(x: number, z: number, bounds: WorldBounds): number {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const maxRadius = Math.min(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2;

  const dx = x - centerX;
  const dz = z - centerZ;
  const t = Math.sqrt(dx * dx + dz * dz) / maxRadius;

  const innerRatio = 0.55;
  const outerRatio = 1.05;
  if (t < innerRatio) return 1;
  if (t > outerRatio) return 0;
  const f = (t - innerRatio) / (outerRatio - innerRatio);
  return 1 - f * f * (3 - 2 * f);
}

/**
 * Percentile-clamped normalization: unlike raw min-max, one oversized
 * feature (the ridge, a lake dip) can't compress the rest of the height
 * range and destabilize biome thresholds on other seeds.
 */
export function normalizePercentile(values: number[], lowPercentile = 0.02, highPercentile = 0.98): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const lowIndex = Math.floor(sorted.length * lowPercentile);
  const highIndex = Math.min(sorted.length - 1, Math.ceil(sorted.length * highPercentile));
  const low = sorted[lowIndex];
  const high = sorted[highIndex];
  const range = high - low || 1;

  return values.map((v) => Math.min(1, Math.max(0, (v - low) / range)));
}

/**
 * Rescales a field with a two-piece linear map so that exactly
 * `fractionBelow` of values land at or below `threshold`, and the rest
 * spread across (threshold, 1]. Hand-tuning noise amplitudes against fixed
 * absolute thresholds is fragile and seed-sensitive (a bit more ridge
 * weight and suddenly half the map is "ocean," or none of it is); pinning
 * the target fraction directly is what actually controls "how much of the
 * map is ocean/forest," independent of how the underlying noise happens to
 * be scaled.
 */
export function rescaleToThreshold(values: number[], fractionBelow: number, threshold: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const cutoffIndex = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * fractionBelow)));
  const cutoff = sorted[cutoffIndex];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const belowRange = cutoff - min || 1;
  const aboveRange = max - cutoff || 1;

  return values.map((v) => {
    if (v <= cutoff) {
      const t = (v - min) / belowRange;
      return t * threshold;
    }
    const t = (v - cutoff) / aboveRange;
    return threshold + t * (1 - threshold);
  });
}
