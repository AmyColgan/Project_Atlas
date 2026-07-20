import { BiomeType } from "../types";

export const HILLS_LEVEL = 0.52;
export const MOUNTAINS_LEVEL = 0.74;
export const FOREST_SUITABILITY_LEVEL = 0.55;

/**
 * `forestSuitability` must come from a *low-frequency* field (a handful of
 * cycles across the whole map) so forests form a few contiguous clusters.
 * The previous per-tile-independent high-frequency moisture noise produced
 * speckle — every tile rolling its own biome independently of its
 * neighbors — which reads as random confetti rather than believable regions.
 */
export function classifyBiome(
  height: number,
  forestSuitability: number,
  waterLevel: number,
  isLakeTile: boolean
): BiomeType {
  if (isLakeTile || height < waterLevel) return "water";
  if (height < HILLS_LEVEL) return forestSuitability > FOREST_SUITABILITY_LEVEL ? "forest" : "plains";
  if (height < MOUNTAINS_LEVEL) return "hills";
  return "mountains";
}
