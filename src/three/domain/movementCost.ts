import { BiomeType, TerrainTileData } from "../types";

/** Movement points required to enter a tile of this biome. Water is impassable. */
export const BIOME_MOVEMENT_COST: Record<BiomeType, number> = {
  plains: 1,
  forest: 2,
  hills: 2,
  mountains: 3,
  water: Infinity,
};

/** Extra cost to cross into a river tile — a minor, legible obstacle without a bridge/ford mechanic. */
export const RIVER_CROSSING_SURCHARGE = 1;

export function isPassableBiome(biome: BiomeType): boolean {
  return BIOME_MOVEMENT_COST[biome] !== Infinity;
}

/**
 * The single source of truth for "cost to enter this tile." A river runs
 * across a tile without overriding its biome, so the surcharge must be
 * applied explicitly here rather than left as a decorative-only overlay.
 */
export function getMovementCost(tile: Pick<TerrainTileData, "biome" | "isRiver">): number {
  const base = BIOME_MOVEMENT_COST[tile.biome];
  if (base === Infinity) return Infinity;
  return tile.isRiver ? base + RIVER_CROSSING_SURCHARGE : base;
}
