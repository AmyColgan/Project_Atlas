import { hexKey } from "../../utils/hex";
import { TerrainTileData } from "../types";

export type TerrainIndex = Map<string, TerrainTileData>;

export function buildTerrainIndex(tiles: TerrainTileData[]): TerrainIndex {
  const index: TerrainIndex = new Map();
  for (const tile of tiles) index.set(hexKey(tile.coord), tile);
  return index;
}
