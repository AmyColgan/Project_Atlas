import { createPrng } from "../../utils/prng";
import { TerrainField } from "../types";

export type PropKind = "tree-small" | "tree-medium" | "tree-large" | "rock" | "shrub" | "boulder";

export interface PropPlacement {
  kind: PropKind;
  tileId: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
}

const TREE_SIZES: PropKind[] = ["tree-small", "tree-medium", "tree-large"];

/**
 * Deterministic scatter of decorative props across biomes — a handful per
 * tile with randomized offset/rotation/scale, not one prop per tile (which
 * reads as a grid, not a forest). Pure placement data; the component layer
 * turns this into instanced meshes.
 */
export function generateVegetationPlacements(field: TerrainField, seed: number): PropPlacement[] {
  const prng = createPrng(seed ^ 0x6a09e667);
  const placements: PropPlacement[] = [];
  const hexRadius = field.hexSize * 0.85;

  for (const tile of field.tiles) {
    if (tile.biome === "water") continue;

    let count = 0;
    let kinds: PropKind[] = [];

    if (tile.biome === "forest") {
      count = 2 + prng.nextInt(3); // 2-4 trees
      kinds = TREE_SIZES;
    } else if (tile.biome === "plains") {
      if (prng.next() < 0.18) {
        count = 1;
        kinds = ["shrub"];
      }
    } else if (tile.biome === "hills") {
      if (prng.next() < 0.22) {
        count = 1 + prng.nextInt(2);
        kinds = ["rock"];
      }
    } else if (tile.biome === "mountains") {
      count = 1 + prng.nextInt(2);
      kinds = ["boulder", "rock"];
    }

    for (let i = 0; i < count; i++) {
      const angle = prng.next() * Math.PI * 2;
      const distance = prng.next() * hexRadius * 0.75;
      const kind = kinds[prng.nextInt(kinds.length)];

      placements.push({
        kind,
        tileId: tile.id,
        x: tile.worldX + Math.cos(angle) * distance,
        y: tile.height * field.maxElevation,
        z: tile.worldZ + Math.sin(angle) * distance,
        rotationY: prng.next() * Math.PI * 2,
        scale: 0.8 + prng.next() * 0.5,
      });
    }
  }

  return placements;
}
