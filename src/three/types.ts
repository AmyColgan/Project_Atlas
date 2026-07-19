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
