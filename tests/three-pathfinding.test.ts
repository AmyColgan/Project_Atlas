import { describe, expect, it } from "vitest";
import { AxialCoord, axialToPixel } from "../src/utils/hex";
import { BiomeType, TerrainTileData } from "../src/three/types";
import { buildTerrainIndex } from "../src/three/domain/hexIndex";
import { findPath, findReachableTiles } from "../src/three/domain/pathfinding";
import { BIOME_MOVEMENT_COST, isPassableBiome } from "../src/three/domain/movementCost";

const HEX_SIZE = 1;

function tile(q: number, r: number, biome: BiomeType): TerrainTileData {
  const coord: AxialCoord = { q, r };
  const pixel = axialToPixel(coord, HEX_SIZE);
  return { id: `tile-${q}-${r}`, coord, biome, height: 0.5, worldX: pixel.x, worldZ: pixel.y };
}

describe("movement cost table", () => {
  it("marks water impassable and every other biome passable with a positive cost", () => {
    expect(isPassableBiome("water")).toBe(false);
    for (const biome of ["plains", "forest", "hills", "mountains"] as BiomeType[]) {
      expect(isPassableBiome(biome)).toBe(true);
      expect(BIOME_MOVEMENT_COST[biome]).toBeGreaterThan(0);
      expect(Number.isFinite(BIOME_MOVEMENT_COST[biome])).toBe(true);
    }
  });
});

describe("findPath (A*)", () => {
  it("returns an empty, zero-cost path when start equals goal", () => {
    const tiles = [tile(0, 0, "plains")];
    const index = buildTerrainIndex(tiles);
    const result = findPath(index, { q: 0, r: 0 }, { q: 0, r: 0 });
    expect(result).toEqual({ path: [], cost: 0 });
  });

  it("sums per-tile biome cost along a straight plains line", () => {
    const tiles = [tile(0, 0, "plains"), tile(1, 0, "plains"), tile(2, 0, "plains")];
    const index = buildTerrainIndex(tiles);
    const result = findPath(index, { q: 0, r: 0 }, { q: 2, r: 0 });

    expect(result).not.toBeNull();
    expect(result!.cost).toBe(2);
    expect(result!.path).toEqual([{ q: 1, r: 0 }, { q: 2, r: 0 }]);
  });

  it("prefers a cheaper, longer route over a costlier direct route through mountains", () => {
    // Direct: (0,0) -> (1,0) mountain -> (2,0) plains, cost 3+1=4
    // Detour: (0,0) -> (0,1) plains -> (1,1) plains -> (2,0) plains, cost 1+1+1=3
    const tiles = [
      tile(0, 0, "plains"),
      tile(1, 0, "mountains"),
      tile(2, 0, "plains"),
      tile(0, 1, "plains"),
      tile(1, 1, "plains"),
    ];
    const index = buildTerrainIndex(tiles);
    const result = findPath(index, { q: 0, r: 0 }, { q: 2, r: 0 });

    expect(result).not.toBeNull();
    expect(result!.cost).toBe(3);
    expect(result!.path.some((c) => c.q === 1 && c.r === 0)).toBe(false);
  });

  it("returns null when the goal is water", () => {
    const tiles = [tile(0, 0, "plains"), tile(1, 0, "water")];
    const index = buildTerrainIndex(tiles);
    expect(findPath(index, { q: 0, r: 0 }, { q: 1, r: 0 })).toBeNull();
  });

  it("returns null when water completely separates start from goal", () => {
    const tiles = [
      tile(0, 0, "plains"),
      tile(1, 0, "water"),
      tile(1, 1, "water"),
      tile(0, 1, "water"),
      tile(1, -1, "water"),
      tile(0, -1, "water"),
      tile(-1, 0, "water"),
      tile(2, 0, "plains"),
    ];
    const index = buildTerrainIndex(tiles);
    expect(findPath(index, { q: 0, r: 0 }, { q: 2, r: 0 })).toBeNull();
  });

  it("is deterministic across repeated calls with the same inputs", () => {
    const tiles = [
      tile(0, 0, "plains"),
      tile(1, 0, "forest"),
      tile(2, 0, "hills"),
      tile(0, 1, "plains"),
      tile(1, 1, "plains"),
    ];
    const index = buildTerrainIndex(tiles);
    const a = findPath(index, { q: 0, r: 0 }, { q: 2, r: 0 });
    const b = findPath(index, { q: 0, r: 0 }, { q: 2, r: 0 });
    expect(a).toEqual(b);
  });
});

describe("findReachableTiles (uniform-cost search)", () => {
  it("always includes the start tile at cost 0", () => {
    const tiles = [tile(0, 0, "plains")];
    const index = buildTerrainIndex(tiles);
    const reachable = findReachableTiles(index, { q: 0, r: 0 }, 3);
    expect(reachable.get("0,0")).toEqual({ coord: { q: 0, r: 0 }, cost: 0 });
  });

  it("never includes a tile whose cost exceeds the budget", () => {
    const tiles = [
      tile(0, 0, "plains"),
      tile(1, 0, "plains"),
      tile(2, 0, "mountains"),
      tile(3, 0, "mountains"),
    ];
    const index = buildTerrainIndex(tiles);
    const budget = 3;
    const reachable = findReachableTiles(index, { q: 0, r: 0 }, budget);

    for (const entry of reachable.values()) {
      expect(entry.cost).toBeLessThanOrEqual(budget);
    }
    // (3,0) mountains would require plains(1) + mountains(3) + mountains(3) = 7 > budget
    expect(reachable.has("3,0")).toBe(false);
  });

  it("never includes water tiles", () => {
    const tiles = [tile(0, 0, "plains"), tile(1, 0, "water"), tile(0, 1, "plains")];
    const index = buildTerrainIndex(tiles);
    const reachable = findReachableTiles(index, { q: 0, r: 0 }, 5);
    expect(reachable.has("1,0")).toBe(false);
  });

  it("returns an empty map for a budget of 0 except the start tile", () => {
    const tiles = [tile(0, 0, "plains"), tile(1, 0, "plains")];
    const index = buildTerrainIndex(tiles);
    const reachable = findReachableTiles(index, { q: 0, r: 0 }, 0);
    expect(reachable.size).toBe(1);
    expect(reachable.has("0,0")).toBe(true);
  });
});
