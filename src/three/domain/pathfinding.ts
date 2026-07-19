import { AxialCoord, hexDistance, hexKey, hexNeighbors } from "../../utils/hex";
import { TerrainTileData } from "../types";
import { BIOME_MOVEMENT_COST, isPassableBiome } from "./movementCost";
import { TerrainIndex } from "./hexIndex";

export function isPassableTile(tile: TerrainTileData | undefined): tile is TerrainTileData {
  return !!tile && isPassableBiome(tile.biome);
}

export interface PathResult {
  /** Steps from (but excluding) the start tile through the goal tile, inclusive. */
  path: AxialCoord[];
  cost: number;
}

/**
 * A* over the hex grid, weighted by per-biome movement cost. hexDistance is an
 * admissible heuristic here because the cheapest possible biome (plains) costs
 * exactly 1 movement point per step.
 */
export function findPath(index: TerrainIndex, start: AxialCoord, goal: AxialCoord): PathResult | null {
  const startKey = hexKey(start);
  const goalKey = hexKey(goal);
  if (startKey === goalKey) return { path: [], cost: 0 };

  const startTile = index.get(startKey);
  const goalTile = index.get(goalKey);
  if (!startTile || !isPassableTile(goalTile)) return null;

  const openSet = new Set<string>([startKey]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[startKey, 0]]);
  const fScore = new Map<string, number>([[startKey, hexDistance(start, goal)]]);

  while (openSet.size > 0) {
    let currentKey: string | null = null;
    let bestF = Infinity;
    for (const key of openSet) {
      const f = fScore.get(key) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        currentKey = key;
      }
    }
    if (currentKey === null) break;

    if (currentKey === goalKey) {
      return { path: reconstructPath(cameFrom, currentKey, index), cost: gScore.get(currentKey) ?? 0 };
    }

    openSet.delete(currentKey);
    const currentTile = index.get(currentKey);
    if (!currentTile) continue;
    const currentG = gScore.get(currentKey) ?? Infinity;

    for (const neighborCoord of hexNeighbors(currentTile.coord)) {
      const neighborKey = hexKey(neighborCoord);
      const neighborTile = index.get(neighborKey);
      if (!isPassableTile(neighborTile)) continue;

      const tentativeG = currentG + BIOME_MOVEMENT_COST[neighborTile.biome];
      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + hexDistance(neighborCoord, goal));
        openSet.add(neighborKey);
      }
    }
  }

  return null;
}

function reconstructPath(cameFrom: Map<string, string>, goalKey: string, index: TerrainIndex): AxialCoord[] {
  const path: AxialCoord[] = [];
  let key: string | undefined = goalKey;
  while (key && cameFrom.has(key)) {
    const tile = index.get(key);
    if (tile) path.unshift(tile.coord);
    key = cameFrom.get(key);
  }
  return path;
}

export interface ReachableEntry {
  coord: AxialCoord;
  cost: number;
}

/**
 * Uniform-cost search (Dijkstra) from `start` out to a movement-point budget.
 * Unlike findPath this has no single destination to bias toward, so plain
 * Dijkstra (A* with a zero heuristic) is the natural fit for "every tile the
 * unit could reach this turn" rather than a single shortest path.
 */
export function findReachableTiles(index: TerrainIndex, start: AxialCoord, budget: number): Map<string, ReachableEntry> {
  const startKey = hexKey(start);
  const result = new Map<string, ReachableEntry>();
  const startTile = index.get(startKey);
  if (!startTile) return result;

  result.set(startKey, { coord: start, cost: 0 });
  const bestCost = new Map<string, number>([[startKey, 0]]);
  const frontier: string[] = [startKey];

  while (frontier.length > 0) {
    // Grids here top out around a few hundred tiles, so a plain O(n) extraction
    // is simpler and plenty fast — no need for a binary heap at this scale.
    frontier.sort((a, b) => (bestCost.get(a) ?? Infinity) - (bestCost.get(b) ?? Infinity));
    const currentKey = frontier.shift();
    if (!currentKey) break;
    const currentCost = bestCost.get(currentKey) ?? Infinity;
    const currentTile = index.get(currentKey);
    if (!currentTile) continue;

    for (const neighborCoord of hexNeighbors(currentTile.coord)) {
      const neighborKey = hexKey(neighborCoord);
      const neighborTile = index.get(neighborKey);
      if (!isPassableTile(neighborTile)) continue;

      const newCost = currentCost + BIOME_MOVEMENT_COST[neighborTile.biome];
      if (newCost > budget) continue;
      if (newCost < (bestCost.get(neighborKey) ?? Infinity)) {
        bestCost.set(neighborKey, newCost);
        result.set(neighborKey, { coord: neighborCoord, cost: newCost });
        frontier.push(neighborKey);
      }
    }
  }

  return result;
}
