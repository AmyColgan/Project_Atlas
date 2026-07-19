import { AxialCoord, hexDistance } from "../../utils/hex";
import { TerrainTileData } from "../types";

export const VISION_RADIUS = 2;

export type VisibilityState = "unexplored" | "explored" | "visible";

/** Every tile within `radius` hex steps of any of the given centers. */
export function computeVisibleTileIds(
  tiles: readonly TerrainTileData[],
  centers: readonly AxialCoord[],
  radius = VISION_RADIUS
): Set<string> {
  const visible = new Set<string>();
  for (const tile of tiles) {
    for (const center of centers) {
      if (hexDistance(tile.coord, center) <= radius) {
        visible.add(tile.id);
        break;
      }
    }
  }
  return visible;
}

export function resolveVisibility(
  tileId: string,
  visibleIds: ReadonlySet<string>,
  exploredIds: ReadonlySet<string>
): VisibilityState {
  if (visibleIds.has(tileId)) return "visible";
  if (exploredIds.has(tileId)) return "explored";
  return "unexplored";
}
