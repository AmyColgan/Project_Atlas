import { hexKey } from "../utils/hex";
import { HexTile } from "../map/hexGrid";
import { City, Faction, WorldState } from "./types";

export interface WorldSaveFile {
  version: 1;
  savedAt: number;
  seed: number;
  turn: number;
  tiles: HexTile[];
  factions: Faction[];
  cities: City[];
}

export function serializeWorld(world: WorldState, savedAt: number): WorldSaveFile {
  return {
    version: 1,
    savedAt,
    seed: world.seed,
    turn: world.turn,
    tiles: Array.from(world.map.values()),
    factions: world.factions,
    cities: world.cities,
  };
}

export function deserializeWorld(save: WorldSaveFile): WorldState {
  const map = new Map(save.tiles.map((tile) => [hexKey(tile.coord), tile]));
  return {
    seed: save.seed,
    turn: save.turn,
    map,
    factions: save.factions,
    cities: save.cities,
  };
}

const SAVE_KEY = "project-atlas.save";

export function saveToLocalStorage(world: WorldState, savedAt: number): void {
  const save = serializeWorld(world, savedAt);
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function loadFromLocalStorage(): WorldState | null {
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  return deserializeWorld(JSON.parse(raw) as WorldSaveFile);
}

export function exportWorldAsJson(world: WorldState, savedAt: number): string {
  return JSON.stringify(serializeWorld(world, savedAt), null, 2);
}

export function importWorldFromJson(json: string): WorldState {
  return deserializeWorld(JSON.parse(json) as WorldSaveFile);
}
