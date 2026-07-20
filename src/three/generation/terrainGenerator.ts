import { createPrng } from "../../utils/prng";
import { AxialCoord, axialToPixel, hexDistance, hexKey, hexNeighbors } from "../../utils/hex";
import { ValueNoise2D } from "./noise";
import {
  continentFalloff,
  createPassConfig,
  createSpineConfig,
  passDampening,
  rescaleToThreshold,
  ridgeContribution,
  WorldBounds,
} from "./heightfield";
import { detectBasins, carveRivers } from "./hydrology";
import { classifyBiome, FOREST_SUITABILITY_LEVEL } from "./biomes";
import { TerrainField, TerrainTileData } from "../types";

export interface TerrainGenerationConfig {
  columns: number;
  rows: number;
  hexSize: number;
  maxElevation: number;
  /** Normalized (0..1) height threshold below which tiles become ocean. */
  waterLevel: number;
}

export const DEFAULT_TERRAIN_CONFIG: TerrainGenerationConfig = {
  columns: 40,
  rows: 30,
  hexSize: 1.15,
  maxElevation: 5.5,
  waterLevel: 0.3,
};

const FERTILE_RADIUS = 2;

/**
 * Builds a coherent regional terrain field for the living-world vertical
 * slice: one continent (base fBm), one mountain range along a seeded spine
 * (not a radial blob, not unconstrained ridge noise — both can produce
 * disconnected lumps depending on seed), a forced lowland pass through it,
 * forest clusters from a low-frequency suitability field, at least one river
 * (strict-descent carve) and at least one lake (real basin detection, not
 * an authored dip's assumed location).
 *
 * Deterministic: every independent random process gets its own `seed ^
 * const` substream so tuning one never perturbs another.
 */
export function generateTerrainField(seed: number, config: TerrainGenerationConfig = DEFAULT_TERRAIN_CONFIG): TerrainField {
  const { columns, rows, hexSize, maxElevation, waterLevel } = config;

  const heightPrng = createPrng(seed);
  const forestPrng = createPrng(seed ^ 0x9e3779b9);
  const featurePrng = createPrng(seed ^ 0x2545f491);
  const riverPrng = createPrng(seed ^ 0x27d4eb2f);

  const heightNoise = new ValueNoise2D(heightPrng, 16);
  const forestNoise = new ValueNoise2D(forestPrng, 8);

  const coords: AxialCoord[] = [];
  for (let row = 0; row < rows; row++) {
    const rowOffset = Math.floor(row / 2);
    for (let col = 0; col < columns; col++) {
      coords.push({ q: col - rowOffset, r: row });
    }
  }

  const positions = coords.map((coord) => axialToPixel(coord, hexSize));
  const bounds: WorldBounds = {
    minX: Math.min(...positions.map((p) => p.x)),
    maxX: Math.max(...positions.map((p) => p.x)),
    minZ: Math.min(...positions.map((p) => p.y)),
    maxZ: Math.max(...positions.map((p) => p.y)),
  };
  const spanX = bounds.maxX - bounds.minX || 1;
  const spanZ = bounds.maxZ - bounds.minZ || 1;

  const spine = createSpineConfig(featurePrng, bounds);
  const pass = createPassConfig(featurePrng, bounds);
  const ridgeWiggleNoise = new ValueNoise2D(featurePrng, 8);

  const lakeBiasCenter = {
    x: bounds.minX + spanX * (0.15 + featurePrng.next() * 0.2),
    z: bounds.minZ + spanZ * (0.6 + featurePrng.next() * 0.3),
  };
  const lakeBiasRadius = spanX * 0.1;

  const noiseFrequency = 4.5;
  const forestFrequency = 1.6;

  // Target fractions pinned via rescaleToThreshold below, not hand-tuned
  // noise amplitudes against fixed absolute thresholds — the latter is
  // fragile and seed-sensitive (a bit more ridge weight and suddenly half
  // the map is "ocean," or none of it is).
  const TARGET_OCEAN_FRACTION = 0.22;
  const TARGET_FOREST_FRACTION = 0.35;
  const CONTINENT_WEIGHT = 0.45;

  const rawBase = positions.map((pos) => {
    const nx = ((pos.x - bounds.minX) / spanX) * noiseFrequency;
    const nz = ((pos.y - bounds.minZ) / spanZ) * noiseFrequency;
    return heightNoise.fbm(nx, nz, 4, 0.5);
  });

  const rawCombined = positions.map((pos, i) => {
    const ridge = ridgeContribution(pos.x, pos.y, spine, ridgeWiggleNoise) * passDampening(pos.x, pos.y, spine, pass);
    const continent = continentFalloff(pos.x, pos.y, bounds) * CONTINENT_WEIGHT;

    const dx = pos.x - lakeBiasCenter.x;
    const dz = pos.y - lakeBiasCenter.z;
    const lakeBias = 0.35 * Math.exp(-(dx * dx + dz * dz) / (2 * lakeBiasRadius * lakeBiasRadius));

    // continentFalloff/ridge/lakeBias shape *which* tiles are lowest/highest
    // (edges vs. interior, along the spine); the exact overall ocean/land
    // split is pinned below, not left to depend on these weights.
    return rawBase[i] + continent + ridge - lakeBias;
  });
  const heights = rescaleToThreshold(rawCombined, TARGET_OCEAN_FRACTION, waterLevel);

  const rawForestSuitability = positions.map((pos) => {
    const nx = ((pos.x - bounds.minX) / spanX) * forestFrequency;
    const nz = ((pos.y - bounds.minZ) / spanZ) * forestFrequency;
    return forestNoise.fbm(nx, nz, 3, 0.5);
  });
  // Pinned the same way: raw fbm's mean drifts per seed, which made a fixed
  // FOREST_SUITABILITY_LEVEL threshold flip between "almost no forest" and
  // "mostly forest" depending on seed instead of a consistent proportion.
  const forestSuitability = rescaleToThreshold(rawForestSuitability, 1 - TARGET_FOREST_FRACTION, FOREST_SUITABILITY_LEVEL);

  const heightSamples = coords.map((coord, i) => ({ coord, height: heights[i] }));
  const basinIdByKey = detectBasins(heightSamples, waterLevel);
  const { riverFlowToByKey, extraBasinIdByKey } = carveRivers(heightSamples, basinIdByKey, waterLevel, riverPrng);
  for (const [key, id] of extraBasinIdByKey) basinIdByKey.set(key, id);

  const tiles: TerrainTileData[] = coords.map((coord, i) => {
    const key = hexKey(coord);
    const height = heights[i];
    const lakeId = basinIdByKey.get(key) ?? null;
    const isLake = lakeId !== null;
    const biome = classifyBiome(height, forestSuitability[i], waterLevel, isLake);

    return {
      id: `tile-${coord.q}-${coord.r}`,
      coord,
      biome,
      height,
      worldX: positions[i].x,
      worldZ: positions[i].y,
      isRiver: riverFlowToByKey.has(key),
      riverFlowTo: riverFlowToByKey.get(key) ?? null,
      isLake,
      lakeId,
      isCoast: false,
      isFertile: false,
    };
  });

  const tileByKey = new Map(tiles.map((t) => [hexKey(t.coord), t]));

  const waterInfluenceTiles = tiles.filter((t) => t.isRiver || t.isLake || t.biome === "water");
  for (const tile of tiles) {
    if (tile.biome === "water") continue;
    tile.isCoast = hexNeighbors(tile.coord).some((n) => {
      const neighbor = tileByKey.get(hexKey(n));
      return !!neighbor && neighbor.biome === "water" && !neighbor.isLake;
    });
  }

  for (const tile of tiles) {
    if (tile.biome !== "plains") continue;
    tile.isFertile = waterInfluenceTiles.some((wt) => hexDistance(tile.coord, wt.coord) <= FERTILE_RADIUS);
  }

  return { tiles, hexSize, maxElevation, waterLevel };
}
