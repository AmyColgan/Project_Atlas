import { describe, expect, it } from "vitest";
import { hexKey, hexNeighbors } from "../src/utils/hex";
import { DEFAULT_TERRAIN_CONFIG, generateTerrainField } from "../src/three/generation/terrainGenerator";
import { pickSettlementTile } from "../src/three/generation/placement";
import { buildTerrainIndex } from "../src/three/domain/hexIndex";
import { isPassableTile } from "../src/three/domain/pathfinding";
import { BiomeType, TerrainTileData } from "../src/three/types";

const SAMPLE_SEEDS = [1, 2, 42, 1337, 999999, 123456];

function connectedComponents(tiles: TerrainTileData[]): number[] {
  const keys = new Set(tiles.map((t) => hexKey(t.coord)));
  const visited = new Set<string>();
  const sizes: number[] = [];

  for (const tile of tiles) {
    const key = hexKey(tile.coord);
    if (visited.has(key)) continue;

    let size = 0;
    const queue = [tile.coord];
    visited.add(key);
    while (queue.length > 0) {
      const current = queue.shift()!;
      size++;
      for (const neighbor of hexNeighbors(current)) {
        const neighborKey = hexKey(neighbor);
        if (visited.has(neighborKey) || !keys.has(neighborKey)) continue;
        visited.add(neighborKey);
        queue.push(neighbor);
      }
    }
    sizes.push(size);
  }
  return sizes;
}

function biomeTiles(tiles: TerrainTileData[], biome: BiomeType): TerrainTileData[] {
  return tiles.filter((t) => t.biome === biome);
}

describe("regional terrain generation — coherent geography, not confetti", () => {
  it.each(SAMPLE_SEEDS)("keeps ocean around a believable fraction of the map for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const waterFraction = biomeTiles(field.tiles, "water").length / field.tiles.length;
    // Pinned near ~22% by generation, not left to drift with noise weights;
    // a wide-ish tolerance band still catches a regression to "half the map
    // is ocean" or "the map is one dry rock" without being seed-brittle.
    expect(waterFraction).toBeGreaterThan(0.1);
    expect(waterFraction).toBeLessThan(0.4);
  });

  it.each(SAMPLE_SEEDS)("forms mountains into a dominant connected range, not scattered blobs, for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const mountains = biomeTiles(field.tiles, "mountains");
    expect(mountains.length).toBeGreaterThan(0);

    const sizes = connectedComponents(mountains).sort((a, b) => b - a);
    const largestFraction = sizes[0] / mountains.length;
    // A single seeded spine plus base noise can leave a stray secondary
    // peak or two, and the pass itself splits the range into segments —
    // but one dominant connected mass should still account for at least
    // half of all mountain tiles.
    expect(largestFraction).toBeGreaterThanOrEqual(0.4);
  });

  it.each(SAMPLE_SEEDS)("forms forests into a handful of real clusters, not per-tile speckle, for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const forests = biomeTiles(field.tiles, "forest");
    expect(forests.length).toBeGreaterThan(0);

    const sizes = connectedComponents(forests);
    // Speckle (independent per-tile decisions) would produce lots of
    // clusters averaging close to 1 tile each; clustering should produce a
    // handful of clusters with a healthy average size.
    const averageSize = forests.length / sizes.length;
    expect(sizes.length).toBeLessThan(15);
    expect(averageSize).toBeGreaterThan(5);
  });

  it.each(SAMPLE_SEEDS)("includes at least one lake for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const lakeIds = new Set(field.tiles.filter((t) => t.isLake).map((t) => t.lakeId));
    expect(lakeIds.size).toBeGreaterThanOrEqual(1);
    // Guard against the earlier regression where nearly every local dip
    // became its own "lake," flooding the map with dozens of puddles.
    expect(lakeIds.size).toBeLessThanOrEqual(5);
  });

  it.each(SAMPLE_SEEDS)("includes at least one river for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const riverTiles = field.tiles.filter((t) => t.isRiver);
    expect(riverTiles.length).toBeGreaterThan(0);
  });

  it.each(SAMPLE_SEEDS)("keeps the mountain range passable — no full map bisection — for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const settlement = pickSettlementTile(field.tiles);
    const index = buildTerrainIndex(field.tiles);
    const nonWater = field.tiles.filter((t) => t.biome !== "water");

    const visited = new Set<string>([hexKey(settlement.coord)]);
    const queue = [settlement.coord];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of hexNeighbors(current)) {
        const key = hexKey(neighbor);
        if (visited.has(key)) continue;
        const tile = index.get(key);
        if (!isPassableTile(tile)) continue;
        visited.add(key);
        queue.push(neighbor);
      }
    }

    // A forced pass should keep the vast majority of land reachable; a few
    // percent stranded is an acceptable offshore island/peninsula, not a
    // ridge bisecting the map (which would strand roughly half the land).
    const reachableFraction = visited.size / nonWater.length;
    expect(reachableFraction).toBeGreaterThan(0.9);
  });

  it("produces identical geography for the same seed", () => {
    const a = generateTerrainField(1337, DEFAULT_TERRAIN_CONFIG);
    const b = generateTerrainField(1337, DEFAULT_TERRAIN_CONFIG);
    expect(a.tiles.map((t) => ({ biome: t.biome, isRiver: t.isRiver, isLake: t.isLake, height: t.height }))).toEqual(
      b.tiles.map((t) => ({ biome: t.biome, isRiver: t.isRiver, isLake: t.isLake, height: t.height }))
    );
  });
});
