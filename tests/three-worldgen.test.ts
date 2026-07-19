import { describe, expect, it } from "vitest";
import { DEFAULT_TERRAIN_CONFIG, generateTerrainField } from "../src/three/generation/terrainGenerator";
import { pickExplorerTile, pickSettlementTile } from "../src/three/generation/placement";
import { BiomeType } from "../src/three/types";

const ALL_BIOMES: BiomeType[] = ["water", "plains", "forest", "hills", "mountains"];
const SAMPLE_SEEDS = [1, 2, 42, 1337, 999999, 123456];

function biomeCounts(seed: number) {
  const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
  const counts: Partial<Record<BiomeType, number>> = {};
  for (const tile of field.tiles) counts[tile.biome] = (counts[tile.biome] ?? 0) + 1;
  return counts;
}

describe("terrain generation determinism", () => {
  it("produces identical terrain for the same seed", () => {
    const a = generateTerrainField(1337, DEFAULT_TERRAIN_CONFIG);
    const b = generateTerrainField(1337, DEFAULT_TERRAIN_CONFIG);

    expect(a.tiles.map((t) => ({ id: t.id, biome: t.biome, height: t.height }))).toEqual(
      b.tiles.map((t) => ({ id: t.id, biome: t.biome, height: t.height }))
    );
  });

  it("produces different terrain for different seeds", () => {
    const a = generateTerrainField(1, DEFAULT_TERRAIN_CONFIG);
    const b = generateTerrainField(2, DEFAULT_TERRAIN_CONFIG);

    const aBiomes = a.tiles.map((t) => t.biome);
    const bBiomes = b.tiles.map((t) => t.biome);
    expect(aBiomes).not.toEqual(bBiomes);
  });

  it("generates the exact tile count implied by rows * columns", () => {
    const field = generateTerrainField(1337, DEFAULT_TERRAIN_CONFIG);
    expect(field.tiles).toHaveLength(DEFAULT_TERRAIN_CONFIG.rows * DEFAULT_TERRAIN_CONFIG.columns);
  });
});

describe("terrain biome coverage", () => {
  it.each(SAMPLE_SEEDS)("includes all five required biomes for seed %d", (seed) => {
    const counts = biomeCounts(seed);
    for (const biome of ALL_BIOMES) {
      expect(counts[biome] ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("settlement and explorer placement", () => {
  it.each(SAMPLE_SEEDS)("places the capital on walkable, unclaimed ground for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const settlement = pickSettlementTile(field.tiles);
    expect(settlement.biome).not.toBe("water");
  });

  it.each(SAMPLE_SEEDS)("places the explorer on walkable, non-water ground for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const settlement = pickSettlementTile(field.tiles);
    const explorer = pickExplorerTile(field.tiles, settlement);
    expect(explorer.biome).not.toBe("water");
  });

  it.each(SAMPLE_SEEDS)("never places the explorer on the same tile as the capital for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const settlement = pickSettlementTile(field.tiles);
    const explorer = pickExplorerTile(field.tiles, settlement);
    expect(explorer.id).not.toBe(settlement.id);
  });

  it.each(SAMPLE_SEEDS)("keeps both placements within the generated map bounds for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const settlement = pickSettlementTile(field.tiles);
    const explorer = pickExplorerTile(field.tiles, settlement);
    const validIds = new Set(field.tiles.map((t) => t.id));

    expect(validIds.has(settlement.id)).toBe(true);
    expect(validIds.has(explorer.id)).toBe(true);

    for (const tile of [settlement, explorer]) {
      expect(tile.coord.r).toBeGreaterThanOrEqual(0);
      expect(tile.coord.r).toBeLessThan(DEFAULT_TERRAIN_CONFIG.rows);
      const rowOffset = Math.floor(tile.coord.r / 2);
      const col = tile.coord.q + rowOffset;
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(DEFAULT_TERRAIN_CONFIG.columns);
    }
  });

  it("produces a deterministic placement for a fixed seed", () => {
    const fieldA = generateTerrainField(1337, DEFAULT_TERRAIN_CONFIG);
    const fieldB = generateTerrainField(1337, DEFAULT_TERRAIN_CONFIG);

    const settlementA = pickSettlementTile(fieldA.tiles);
    const settlementB = pickSettlementTile(fieldB.tiles);
    expect(settlementA.id).toBe(settlementB.id);

    const explorerA = pickExplorerTile(fieldA.tiles, settlementA);
    const explorerB = pickExplorerTile(fieldB.tiles, settlementB);
    expect(explorerA.id).toBe(explorerB.id);
  });
});
