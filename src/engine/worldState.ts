import { createPrng, Prng } from "../utils/prng";
import { AxialCoord, hexNeighbors } from "../utils/hex";
import {
  DEFAULT_MAP_CONFIG,
  generateHexMap,
  getTile,
  HexMap,
  isHexEligibleForCity,
} from "../map/hexGrid";
import { City, Faction, WorldState } from "./types";

const FACTION_COLORS = ["#e8b34f", "#4fd1c5", "#c65b7c", "#7c9fe8", "#8fd15b", "#b48fe8"];
const FACTION_NAMES = ["Rome", "Carthage", "Egypt", "Persia", "Athens", "Kush"];

const SEARCH_BOUND = 400;

function findEligibleStartTile(map: HexMap, near: AxialCoord): AxialCoord {
  const visited = new Set<string>();
  let frontier: AxialCoord[] = [near];

  while (frontier.length > 0) {
    const next: AxialCoord[] = [];
    for (const coord of frontier) {
      const key = `${coord.q},${coord.r}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (isHexEligibleForCity(getTile(map, coord))) return coord;
      next.push(...hexNeighbors(coord));
    }
    frontier = next;
    if (visited.size > SEARCH_BOUND) break;
  }

  return near;
}

/**
 * Milestone 1 test world: one faction, one city, so the rendering shell
 * and save system have real data to display and persist. Milestone 2
 * replaces this with procedural generation of all 4-8 civilizations.
 */
export function createTestWorld(seed: number): WorldState {
  const prng: Prng = createPrng(seed);
  const map = generateHexMap(DEFAULT_MAP_CONFIG, prng);

  const centerRow = Math.floor(DEFAULT_MAP_CONFIG.rows / 2);
  const centerCol = Math.floor(DEFAULT_MAP_CONFIG.columns / 2);
  const centerCoord: AxialCoord = { q: centerCol - Math.floor(centerRow / 2), r: centerRow };

  const startCoord = findEligibleStartTile(map, centerCoord);
  const startTile = getTile(map, startCoord);
  if (startTile) startTile.ownerFactionId = "faction-0";

  const faction: Faction = {
    id: "faction-0",
    name: FACTION_NAMES[0],
    color: FACTION_COLORS[0],
    cityIds: ["city-0"],
    resources: { food: 100, wood: 50, iron: 20, wealth: 75 },
  };

  const city: City = {
    id: "city-0",
    factionId: faction.id,
    name: `${FACTION_NAMES[0]} Prime`,
    coord: startCoord,
    population: 10,
    isCapital: true,
  };

  return {
    seed,
    turn: 1,
    map,
    factions: [faction],
    cities: [city],
  };
}
