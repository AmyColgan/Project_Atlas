import { TerrainTileData } from "../types";

const WALKABLE_BIOMES = new Set(["plains", "forest", "hills"]);

function centroid(tiles: TerrainTileData[]): { x: number; z: number } {
  const x = tiles.reduce((sum, t) => sum + t.worldX, 0) / tiles.length;
  const z = tiles.reduce((sum, t) => sum + t.worldZ, 0) / tiles.length;
  return { x, z };
}

function distanceSq(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

/** Picks a settlement site near the map's center, favoring plains/forest ground. */
export function pickSettlementTile(tiles: TerrainTileData[]): TerrainTileData {
  const center = centroid(tiles);
  const candidates = tiles.filter((t) => t.biome === "plains" || t.biome === "forest");
  const pool = candidates.length > 0 ? candidates : tiles.filter((t) => WALKABLE_BIOMES.has(t.biome));
  const source = pool.length > 0 ? pool : tiles;

  return source.reduce((best, tile) =>
    distanceSq(tile.worldX, tile.worldZ, center.x, center.z) < distanceSq(best.worldX, best.worldZ, center.x, center.z)
      ? tile
      : best
  );
}

/** Picks a walkable tile a short distance away from the settlement for the explorer unit. */
export function pickExplorerTile(tiles: TerrainTileData[], settlement: TerrainTileData): TerrainTileData {
  const walkable = tiles.filter((t) => WALKABLE_BIOMES.has(t.biome) && t.id !== settlement.id);
  const source = walkable.length > 0 ? walkable : tiles.filter((t) => t.id !== settlement.id);
  const minDist = 2.5;

  const farEnough = source.filter(
    (t) => Math.sqrt(distanceSq(t.worldX, t.worldZ, settlement.worldX, settlement.worldZ)) > minDist
  );
  const pool = farEnough.length > 0 ? farEnough : source;

  return pool.reduce((best, tile) =>
    distanceSq(tile.worldX, tile.worldZ, settlement.worldX, settlement.worldZ) <
    distanceSq(best.worldX, best.worldZ, settlement.worldX, settlement.worldZ)
      ? tile
      : best
  );
}
