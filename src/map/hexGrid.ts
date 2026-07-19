import { AxialCoord, hexKey } from "../utils/hex";
import { Prng } from "../utils/prng";

/**
 * Milestone 1 scope: a lightweight seeded terrain scatter, just enough
 * visual variation to satisfy the M1 visual bar. Milestone 2 replaces
 * pickTerrain/generateHexMap's body with a real Perlin/Simplex heightmap
 * generator — nothing outside this file needs to change when that happens.
 */

export type TerrainType = "plains" | "hills" | "mountains" | "ocean";

export interface HexTile {
  coord: AxialCoord;
  terrain: TerrainType;
  ownerFactionId: string | null;
}

export interface MapConfig {
  columns: number;
  rows: number;
}

export const DEFAULT_MAP_CONFIG: MapConfig = { columns: 40, rows: 40 };

const TERRAIN_WEIGHTS: ReadonlyArray<{ terrain: TerrainType; weight: number }> = [
  { terrain: "plains", weight: 55 },
  { terrain: "hills", weight: 20 },
  { terrain: "ocean", weight: 15 },
  { terrain: "mountains", weight: 10 },
];

function pickTerrain(prng: Prng): TerrainType {
  const total = TERRAIN_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = prng.next() * total;
  for (const entry of TERRAIN_WEIGHTS) {
    if (roll < entry.weight) return entry.terrain;
    roll -= entry.weight;
  }
  return "plains";
}

export type HexMap = Map<string, HexTile>;

export function generateHexMap(config: MapConfig, prng: Prng): HexMap {
  const tiles: HexMap = new Map();
  const { columns, rows } = config;

  for (let row = 0; row < rows; row++) {
    const rowOffset = Math.floor(row / 2);
    for (let col = 0; col < columns; col++) {
      const coord: AxialCoord = { q: col - rowOffset, r: row };
      tiles.set(hexKey(coord), { coord, terrain: pickTerrain(prng), ownerFactionId: null });
    }
  }

  return tiles;
}

export function getTile(map: HexMap, coord: AxialCoord): HexTile | undefined {
  return map.get(hexKey(coord));
}

/**
 * Reserved for Settler-driven city founding (not implemented until a later
 * milestone). Land-only and unclaimed for now; later milestones may add
 * distance-from-existing-city or resource-adjacency rules.
 */
export function isHexEligibleForCity(tile: HexTile | undefined): boolean {
  if (!tile) return false;
  if (tile.terrain === "ocean") return false;
  if (tile.ownerFactionId !== null) return false;
  return true;
}
