import { createPrng, Prng } from "../../utils/prng";
import { TerrainTileData } from "../types";

export type DiscoveryType = "ancient-ruins" | "natural-landmark" | "abandoned-camp" | "resource-deposit";

export const DISCOVERY_TYPES: readonly DiscoveryType[] = [
  "ancient-ruins",
  "natural-landmark",
  "abandoned-camp",
  "resource-deposit",
];

export interface DiscoveryReward {
  kind: "movement-cache" | "lore";
  description: string;
  movementPointsGranted?: number;
}

export interface Discovery {
  id: string;
  tileId: string;
  type: DiscoveryType;
  name: string;
  description: string;
  reward: DiscoveryReward;
  completed: boolean;
}

const NAME_PARTS: Record<DiscoveryType, { prefixes: string[]; nouns: string[] }> = {
  "ancient-ruins": {
    prefixes: ["Forgotten", "Sunken", "Weathered", "Silent"],
    nouns: ["Ruins", "Colonnade", "Archway", "Stones"],
  },
  "natural-landmark": {
    prefixes: ["Whispering", "Lone", "Sunlit", "Hollow"],
    nouns: ["Bluff", "Grove", "Spire", "Falls"],
  },
  "abandoned-camp": {
    prefixes: ["Cold", "Deserted", "Scattered", "Quiet"],
    nouns: ["Campsite", "Bivouac", "Encampment", "Outpost"],
  },
  "resource-deposit": {
    prefixes: ["Rich", "Glittering", "Hidden", "Untouched"],
    nouns: ["Vein", "Deposit", "Seam", "Lode"],
  },
};

const DESCRIPTIONS: Record<DiscoveryType, string[]> = {
  "ancient-ruins": [
    "Toppled columns rise from the undergrowth, carved with symbols no one here can read.",
    "A cracked archway still stands, guarding a stairway that vanishes into rubble.",
  ],
  "natural-landmark": [
    "Wind moves through the rock in a low, constant note, as if the land itself were singing.",
    "A formation unlike anything nearby — travelers will remember this place.",
  ],
  "abandoned-camp": [
    "Cold ash and a few broken tools are all that remain of whoever camped here.",
    "A lean-to has half-collapsed, but the fire pit still holds its shape.",
  ],
  "resource-deposit": [
    "A seam of raw material glints beneath the surface, worth marking on any map.",
    "Untouched and easy to reach — a future settlement would do well to remember this spot.",
  ],
};

function buildReward(type: DiscoveryType): DiscoveryReward {
  switch (type) {
    case "abandoned-camp":
      return {
        kind: "movement-cache",
        description: "Leftover supplies restore some of the explorer's stamina.",
        movementPointsGranted: 2,
      };
    case "ancient-ruins":
      return { kind: "lore", description: "A record for the chronicle — nothing more, but no less valuable." };
    case "natural-landmark":
      return { kind: "lore", description: "Worth remembering, if nothing else." };
    case "resource-deposit":
    default:
      return { kind: "lore", description: "Marked for whoever settles this land next." };
  }
}

/**
 * Deterministically scatters one discovery per required type across walkable,
 * non-excluded tiles. Seeded independently from terrain/moisture noise so
 * regenerating discoveries never shifts terrain, and vice versa.
 */
export function generateDiscoveries(
  seed: number,
  tiles: readonly TerrainTileData[],
  excludeTileIds: ReadonlySet<string>
): Discovery[] {
  const prng: Prng = createPrng(seed ^ 0x51ed270b);
  const candidates = tiles.filter((t) => t.biome !== "water" && !excludeTileIds.has(t.id));

  const discoveries: Discovery[] = [];
  const usedTileIds = new Set<string>();

  for (const type of DISCOVERY_TYPES) {
    const pool = candidates.filter((t) => !usedTileIds.has(t.id));
    if (pool.length === 0) continue;

    const tile = pool[prng.nextInt(pool.length)];
    usedTileIds.add(tile.id);

    const parts = NAME_PARTS[type];
    const name = `${prng.pick(parts.prefixes)} ${prng.pick(parts.nouns)}`;
    const description = prng.pick(DESCRIPTIONS[type]);

    discoveries.push({
      id: `discovery-${type}-${tile.id}`,
      tileId: tile.id,
      type,
      name,
      description,
      reward: buildReward(type),
      completed: false,
    });
  }

  return discoveries;
}
