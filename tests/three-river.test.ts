import { describe, expect, it } from "vitest";
import { hexKey } from "../src/utils/hex";
import { DEFAULT_TERRAIN_CONFIG, generateTerrainField } from "../src/three/generation/terrainGenerator";

const SAMPLE_SEEDS = [1, 2, 42, 1337, 999999, 123456];

describe("river carving — connectivity and termination", () => {
  it.each(SAMPLE_SEEDS)("every river tile's chain reaches a terminus without cycling, for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const tileByKey = new Map(field.tiles.map((t) => [hexKey(t.coord), t]));
    const riverTiles = field.tiles.filter((t) => t.isRiver);
    expect(riverTiles.length).toBeGreaterThan(0);

    for (const source of riverTiles) {
      const visited = new Set<string>();
      let current = source;
      let guard = 0;

      while (guard++ < field.tiles.length + 1) {
        const key = hexKey(current.coord);
        expect(visited.has(key)).toBe(false); // no cycles
        visited.add(key);

        if (current.riverFlowTo === null) break; // reached a terminus
        const next = tileByKey.get(hexKey(current.riverFlowTo));
        expect(next).toBeDefined();
        current = next!;
      }

      expect(guard).toBeLessThanOrEqual(field.tiles.length);
    }
  });

  it.each(SAMPLE_SEEDS)("height is non-increasing along each river's downstream chain, for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const tileByKey = new Map(field.tiles.map((t) => [hexKey(t.coord), t]));
    const riverTiles = field.tiles.filter((t) => t.isRiver);

    for (const tile of riverTiles) {
      if (tile.riverFlowTo === null) continue;
      const next = tileByKey.get(hexKey(tile.riverFlowTo));
      expect(next).toBeDefined();
      // Equal is allowed at a lake/sea boundary tie; the walk never climbs.
      expect(next!.height).toBeLessThanOrEqual(tile.height + 1e-9);
    }
  });

  it.each(SAMPLE_SEEDS)("every river chain terminates at a lake or below the water level, for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const tileByKey = new Map(field.tiles.map((t) => [hexKey(t.coord), t]));
    const riverTiles = field.tiles.filter((t) => t.isRiver);

    const terminals = riverTiles.filter((t) => t.riverFlowTo === null);
    expect(terminals.length).toBeGreaterThan(0);

    for (const terminal of terminals) {
      const reachedWater = terminal.isLake || terminal.height < field.waterLevel;
      expect(reachedWater).toBe(true);
    }

    // Every non-terminal river tile's downstream neighbor must itself be a
    // real, present tile (no dangling references).
    for (const tile of riverTiles) {
      if (tile.riverFlowTo === null) continue;
      expect(tileByKey.has(hexKey(tile.riverFlowTo))).toBe(true);
    }
  });
});
