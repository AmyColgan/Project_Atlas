import { createPrng } from "../../utils/prng";
import { AxialCoord, axialToPixel } from "../../utils/hex";
import { ValueNoise2D } from "./noise";
import { BiomeType, TerrainField, TerrainTileData } from "../types";

export interface TerrainGenerationConfig {
  columns: number;
  rows: number;
  hexSize: number;
  maxElevation: number;
  /** Normalized (0..1) height threshold below which tiles become water. */
  waterLevel: number;
}

export const DEFAULT_TERRAIN_CONFIG: TerrainGenerationConfig = {
  columns: 22,
  rows: 16,
  hexSize: 1.15,
  maxElevation: 5.5,
  waterLevel: 0.3,
};

const HILLS_LEVEL = 0.52;
const MOUNTAINS_LEVEL = 0.74;
const FOREST_MOISTURE_LEVEL = 0.55;

function gaussianBump(worldX: number, worldZ: number, centerX: number, centerZ: number, radius: number): number {
  const dx = worldX - centerX;
  const dz = worldZ - centerZ;
  const distSq = dx * dx + dz * dz;
  return Math.exp(-distSq / (2 * radius * radius));
}

function classifyBiome(heightNorm: number, moisture: number): BiomeType {
  if (heightNorm < DEFAULT_TERRAIN_CONFIG.waterLevel) return "water";
  if (heightNorm < HILLS_LEVEL) return moisture > FOREST_MOISTURE_LEVEL ? "forest" : "plains";
  if (heightNorm < MOUNTAINS_LEVEL) return "hills";
  return "mountains";
}

/**
 * Builds a small, deterministic terrain field for the 3D prototype. This is
 * intentionally independent from `src/map/hexGrid.ts` (the 2D simulation's
 * terrain) — the prototype's world generation isn't wired to game state yet.
 *
 * A seeded mountain bump and lake dip are blended into the base fractal noise
 * so a small area reliably contains all five target biomes rather than
 * leaving it to chance.
 */
export function generateTerrainField(seed: number, config: TerrainGenerationConfig = DEFAULT_TERRAIN_CONFIG): TerrainField {
  const { columns, rows, hexSize, maxElevation, waterLevel } = config;

  const heightPrng = createPrng(seed);
  const moisturePrng = createPrng(seed ^ 0x9e3779b9);
  const featurePrng = createPrng(seed ^ 0x2545f491);

  const heightNoise = new ValueNoise2D(heightPrng, 16);
  const moistureNoise = new ValueNoise2D(moisturePrng, 12);

  const coords: AxialCoord[] = [];
  for (let row = 0; row < rows; row++) {
    const rowOffset = Math.floor(row / 2);
    for (let col = 0; col < columns; col++) {
      coords.push({ q: col - rowOffset, r: row });
    }
  }

  const positions = coords.map((coord) => axialToPixel(coord, hexSize));

  const minX = Math.min(...positions.map((p) => p.x));
  const maxX = Math.max(...positions.map((p) => p.x));
  const minZ = Math.min(...positions.map((p) => p.y));
  const maxZ = Math.max(...positions.map((p) => p.y));

  const mountainCenter = {
    x: minX + (maxX - minX) * (0.3 + featurePrng.next() * 0.4),
    z: minZ + (maxZ - minZ) * (0.15 + featurePrng.next() * 0.3),
  };
  const lakeCenter = {
    x: minX + (maxX - minX) * (0.3 + featurePrng.next() * 0.4),
    z: minZ + (maxZ - minZ) * (0.6 + featurePrng.next() * 0.3),
  };

  const spanX = maxX - minX || 1;
  const spanZ = maxZ - minZ || 1;
  const noiseFrequency = 4.5;

  const rawHeights = positions.map((pos) => {
    const nx = ((pos.x - minX) / spanX) * noiseFrequency;
    const nz = ((pos.y - minZ) / spanZ) * noiseFrequency;
    const base = heightNoise.fbm(nx, nz, 4, 0.5);

    const mountainBump = gaussianBump(pos.x, pos.y, mountainCenter.x, mountainCenter.z, spanX * 0.14) * 0.95;
    const lakeDip = gaussianBump(pos.x, pos.y, lakeCenter.x, lakeCenter.z, spanX * 0.12) * 0.7;

    return base + mountainBump - lakeDip;
  });

  const minHeight = Math.min(...rawHeights);
  const maxHeight = Math.max(...rawHeights);
  const heightRange = maxHeight - minHeight || 1;

  const tiles: TerrainTileData[] = coords.map((coord, i) => {
    const heightNorm = (rawHeights[i] - minHeight) / heightRange;
    const nx = ((positions[i].x - minX) / spanX) * 6;
    const nz = ((positions[i].y - minZ) / spanZ) * 6;
    // Lattice values (and thus fbm output) are already in [0, 1] — no remapping needed.
    const moisture = moistureNoise.fbm(nx, nz, 3, 0.5);

    return {
      id: `tile-${coord.q}-${coord.r}`,
      coord,
      biome: classifyBiome(heightNorm, moisture),
      height: heightNorm,
      worldX: positions[i].x,
      worldZ: positions[i].y,
    };
  });

  return { tiles, hexSize, maxElevation, waterLevel };
}
