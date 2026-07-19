import { AxialCoord } from "../utils/hex";

/**
 * Reserved gameplay action types. Milestone 1 defines the shape only —
 * no handler dispatches or executes these yet. Player command wiring
 * begins in Milestone 3 (gameplay/); Settler-driven expansion begins
 * once city founding is implemented (see docs/specifications/mvp_specification.md).
 */
export type GameplayActionType = "FOUND_CITY";

export interface FoundCityAction {
  type: "FOUND_CITY";
  factionId: string;
  coord: AxialCoord;
}

export type GameplayAction = FoundCityAction;
