import { TerrainTileData } from "../types";

/**
 * A tile's resting surface height for placing markers/units. The continuous
 * ground mesh blends height from nearby tile centers, but at a tile's own
 * exact position that blend is dominated by the tile's own (zero-distance,
 * highest-weight) contribution — close enough that using the tile's own
 * domain height directly, with no further blending, reads correctly.
 */
export function tileSurfaceHeight(tile: TerrainTileData, maxElevation: number): number {
  return tile.height * maxElevation;
}
