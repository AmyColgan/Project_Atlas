import { BiomeType } from "../types";

/** Movement points required to enter a tile of this biome. Water is impassable. */
export const BIOME_MOVEMENT_COST: Record<BiomeType, number> = {
  plains: 1,
  forest: 2,
  hills: 2,
  mountains: 3,
  water: Infinity,
};

export function isPassableBiome(biome: BiomeType): boolean {
  return BIOME_MOVEMENT_COST[biome] !== Infinity;
}
