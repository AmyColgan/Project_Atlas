import { describe, expect, it } from "vitest";
import { AxialCoord, axialToPixel } from "../src/utils/hex";
import { BiomeType, TerrainTileData } from "../src/three/types";
import { computeVisibleTileIds, resolveVisibility, VISION_RADIUS } from "../src/three/domain/visibility";
import { DISCOVERY_TYPES, generateDiscoveries } from "../src/three/domain/discovery";
import { createChronicleEntry } from "../src/three/domain/chronicle";
import { DEFAULT_TERRAIN_CONFIG, generateTerrainField } from "../src/three/generation/terrainGenerator";
import { pickExplorerTile, pickSettlementTile } from "../src/three/generation/placement";

const HEX_SIZE = 1;

function tile(q: number, r: number, biome: BiomeType = "plains"): TerrainTileData {
  const coord: AxialCoord = { q, r };
  const pixel = axialToPixel(coord, HEX_SIZE);
  return {
    id: `tile-${q}-${r}`,
    coord,
    biome,
    height: 0.5,
    worldX: pixel.x,
    worldZ: pixel.y,
    isRiver: false,
    riverFlowTo: null,
    isLake: false,
    lakeId: null,
    isCoast: false,
    isFertile: false,
  };
}

function ring(center: AxialCoord, radius: number): AxialCoord[] {
  const coords: AxialCoord[] = [];
  for (let q = -radius - 1; q <= radius + 1; q++) {
    for (let r = -radius - 1; r <= radius + 1; r++) {
      coords.push({ q: center.q + q, r: center.r + r });
    }
  }
  return coords;
}

describe("fog of war visibility", () => {
  it("marks tiles within the vision radius of a single center as visible", () => {
    const center = { q: 0, r: 0 };
    const tiles = ring(center, VISION_RADIUS).map((c) => tile(c.q, c.r));
    const visible = computeVisibleTileIds(tiles, [center]);

    for (const t of tiles) {
      const distance = Math.max(Math.abs(t.coord.q), Math.abs(t.coord.r), Math.abs(-t.coord.q - t.coord.r));
      if (distance <= VISION_RADIUS) expect(visible.has(t.id)).toBe(true);
    }
  });

  it("does not mark tiles beyond the vision radius as visible", () => {
    const center = { q: 0, r: 0 };
    const farTile = tile(VISION_RADIUS + 5, 0);
    const visible = computeVisibleTileIds([tile(0, 0), farTile], [center]);
    expect(visible.has(farTile.id)).toBe(false);
  });

  it("unions visibility across multiple centers (e.g. capital + explorer)", () => {
    const capitalCenter = { q: 0, r: 0 };
    const explorerCenter = { q: 10, r: 0 };
    const nearExplorer = tile(10, 0);
    const visible = computeVisibleTileIds([tile(0, 0), nearExplorer], [capitalCenter, explorerCenter]);
    expect(visible.has(nearExplorer.id)).toBe(true);
  });

  it("resolves visible > explored > unexplored precedence correctly", () => {
    const visibleIds = new Set(["a"]);
    const exploredIds = new Set(["a", "b"]);
    expect(resolveVisibility("a", visibleIds, exploredIds)).toBe("visible");
    expect(resolveVisibility("b", visibleIds, exploredIds)).toBe("explored");
    expect(resolveVisibility("c", visibleIds, exploredIds)).toBe("unexplored");
  });
});

describe("discovery generation", () => {
  const SAMPLE_SEEDS = [1, 2, 42, 1337, 999999];

  it.each(SAMPLE_SEEDS)("includes at least one of every required discovery type for seed %d", (seed) => {
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const settlement = pickSettlementTile(field.tiles);
    const explorer = pickExplorerTile(field.tiles, settlement);
    const discoveries = generateDiscoveries(seed, field.tiles, new Set([settlement.id, explorer.id]));

    const foundTypes = new Set(discoveries.map((d) => d.type));
    for (const type of DISCOVERY_TYPES) {
      expect(foundTypes.has(type)).toBe(true);
    }
  });

  it("never places a discovery on water, the capital, or the explorer's tile", () => {
    const seed = 1337;
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const settlement = pickSettlementTile(field.tiles);
    const explorer = pickExplorerTile(field.tiles, settlement);
    const discoveries = generateDiscoveries(seed, field.tiles, new Set([settlement.id, explorer.id]));

    for (const discovery of discoveries) {
      expect(discovery.tileId).not.toBe(settlement.id);
      expect(discovery.tileId).not.toBe(explorer.id);
      const tileData = field.tiles.find((t) => t.id === discovery.tileId);
      expect(tileData?.biome).not.toBe("water");
    }
  });

  it("never places two discoveries on the same tile", () => {
    const seed = 1337;
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const settlement = pickSettlementTile(field.tiles);
    const explorer = pickExplorerTile(field.tiles, settlement);
    const discoveries = generateDiscoveries(seed, field.tiles, new Set([settlement.id, explorer.id]));

    const tileIds = discoveries.map((d) => d.tileId);
    expect(new Set(tileIds).size).toBe(tileIds.length);
  });

  it("is deterministic for the same seed and starts every discovery uncompleted", () => {
    const seed = 1337;
    const field = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
    const settlement = pickSettlementTile(field.tiles);
    const explorer = pickExplorerTile(field.tiles, settlement);
    const exclude = new Set([settlement.id, explorer.id]);

    const a = generateDiscoveries(seed, field.tiles, exclude);
    const b = generateDiscoveries(seed, field.tiles, exclude);
    expect(a).toEqual(b);
    for (const discovery of a) expect(discovery.completed).toBe(false);
  });
});

describe("chronicle entries", () => {
  it("produces a structured entry (not a raw string) with a stable id derived from sequence + kind", () => {
    const entry = createChronicleEntry({
      sequence: 3,
      kind: "discovery",
      summary: "The explorer found something.",
      location: { q: 1, r: 2 },
      discoveryId: "discovery-ancient-ruins-tile-1-2",
      rewardText: "A record for the chronicle.",
    });

    expect(entry.id).toBe("chronicle-3-discovery");
    expect(entry.sequence).toBe(3);
    expect(entry.kind).toBe("discovery");
    expect(entry.location).toEqual({ q: 1, r: 2 });
    expect(typeof entry.summary).toBe("string");
  });
});
