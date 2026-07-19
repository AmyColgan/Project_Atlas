import { AxialCoord } from "../utils/hex";
import { HexMap } from "../map/hexGrid";

export interface ResourceStock {
  food: number;
  wood: number;
  iron: number;
  wealth: number;
}

export interface City {
  id: string;
  factionId: string;
  name: string;
  coord: AxialCoord;
  population: number;
  isCapital: boolean;
}

export interface Faction {
  id: string;
  name: string;
  color: string;
  cityIds: string[];
  resources: ResourceStock;
}

export interface WorldState {
  seed: number;
  turn: number;
  map: HexMap;
  factions: Faction[];
  cities: City[];
}

/** Immutable snapshot shape handed to the rendering layer each frame. */
export interface WorldSnapshot {
  turn: number;
  map: HexMap;
  factions: readonly Faction[];
  cities: readonly City[];
}

export function toSnapshot(world: WorldState): WorldSnapshot {
  return {
    turn: world.turn,
    map: world.map,
    factions: world.factions,
    cities: world.cities,
  };
}
