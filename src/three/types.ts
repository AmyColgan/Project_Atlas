import { AxialCoord } from "../utils/hex";

export type BiomeType = "water" | "plains" | "forest" | "hills" | "mountains";

export interface TerrainTileData {
  id: string;
  coord: AxialCoord;
  biome: BiomeType;
  /** Normalized 0..1 height used to derive world-space elevation. */
  height: number;
  worldX: number;
  worldZ: number;

  /** A river runs across this tile; does not override `biome`. */
  isRiver: boolean;
  /** Downstream neighbor along the river; null at a mouth/lake/terminus. */
  riverFlowTo: AxialCoord | null;
  /** Inland water body; when true `biome` is forced to "water". */
  isLake: boolean;
  lakeId: string | null;
  /** Touches an ocean (not lake) tile below water level. */
  isCoast: boolean;
  /** Near a river, lake, or coast — preferred for farms/settlement. */
  isFertile: boolean;
}

export interface TerrainField {
  tiles: TerrainTileData[];
  hexSize: number;
  maxElevation: number;
  waterLevel: number;
}

export type SelectableKind = "tile" | "capital" | "explorer";

export interface SelectableRef {
  kind: SelectableKind;
  id: string;
}
