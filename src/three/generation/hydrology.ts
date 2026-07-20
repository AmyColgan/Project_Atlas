import { AxialCoord, hexKey, hexNeighbors } from "../../utils/hex";
import { Prng } from "../../utils/prng";

interface HeightSample {
  coord: AxialCoord;
  height: number;
}

/**
 * Flood-fill basin detection: the source of truth for lake placement is the
 * final, real height field (local minima), not an authored dip's location —
 * once a ridge and river carving are layered on, an authored gaussian dip is
 * no longer guaranteed to still be the lowest point nearby.
 *
 * Hex-grid terrain at this density has *many* small local minima (ordinary
 * texture, not "a lake"). Detect every candidate basin, but only the
 * `maxLakes` lowest become real lakes — the rest stay ordinary depressed
 * land — so the map reads as "a couple of notable lakes," not dozens of
 * puddles.
 */
export function detectBasins(
  tiles: HeightSample[],
  waterLevel: number,
  maxLakes = 2,
  maxBasinSize = 6
): Map<string, string> {
  const heightByKey = new Map(tiles.map((t) => [hexKey(t.coord), t.height]));
  const consideredForOtherBasins = new Set<string>();
  const candidateBasins: { id: string; minHeight: number; tileKeys: string[] }[] = [];
  let basinCounter = 0;

  const inlandAscending = tiles.filter((t) => t.height >= waterLevel).sort((a, b) => a.height - b.height);

  for (const tile of inlandAscending) {
    const key = hexKey(tile.coord);
    if (consideredForOtherBasins.has(key)) continue;

    const isLocalMinimum = hexNeighbors(tile.coord).every((n) => {
      const neighborHeight = heightByKey.get(hexKey(n));
      return neighborHeight === undefined || neighborHeight >= tile.height;
    });
    if (!isLocalMinimum) continue;

    const basinId = `lake-${basinCounter++}`;
    const tolerance = 0.015;
    const queue: AxialCoord[] = [tile.coord];
    const basinTiles = new Set<string>([key]);

    while (queue.length > 0 && basinTiles.size < maxBasinSize) {
      const current = queue.shift()!;
      for (const neighbor of hexNeighbors(current)) {
        const neighborKey = hexKey(neighbor);
        if (basinTiles.has(neighborKey) || consideredForOtherBasins.has(neighborKey)) continue;
        const neighborHeight = heightByKey.get(neighborKey);
        if (neighborHeight === undefined) continue;
        if (neighborHeight <= tile.height + tolerance) {
          basinTiles.add(neighborKey);
          queue.push(neighbor);
        }
      }
    }

    for (const basinKey of basinTiles) consideredForOtherBasins.add(basinKey);
    candidateBasins.push({ id: basinId, minHeight: tile.height, tileKeys: [...basinTiles] });
  }

  // Safety net: with real fBm+ridge terrain a local minimum should always
  // exist, but guarantee "at least one lake" rather than hope for it.
  if (candidateBasins.length === 0 && inlandAscending.length > 0) {
    candidateBasins.push({ id: "lake-0", minHeight: inlandAscending[0].height, tileKeys: [hexKey(inlandAscending[0].coord)] });
  }

  const chosenBasins = candidateBasins.sort((a, b) => a.minHeight - b.minHeight).slice(0, maxLakes);

  const basinIdByKey = new Map<string, string>();
  for (const basin of chosenBasins) {
    for (const key of basin.tileKeys) basinIdByKey.set(key, basin.id);
  }
  return basinIdByKey;
}

export interface RiverCarveResult {
  /** Only tiles that are part of a river; downstream neighbor, or null at a terminus. */
  riverFlowToByKey: Map<string, AxialCoord | null>;
  /** Additional lake basins carved where a river's descent got stuck. */
  extraBasinIdByKey: Map<string, string>;
}

/**
 * Strict-descent walk: only steps to a neighbor strictly lower than the
 * current tile (not merely "the lowest unvisited neighbor," which can climb
 * once nearby lower tiles are already claimed by another traversal). If no
 * such neighbor exists, that's the stuck condition, and it carves a lake at
 * that exact point rather than looping — value noise gives real plateaus at
 * hex-grid density, so deterministic tie-breaking via the same seeded prng
 * keeps descent reproducible.
 */
export function carveRivers(
  tiles: HeightSample[],
  basinIdByKey: ReadonlyMap<string, string>,
  waterLevel: number,
  prng: Prng,
  sourceCount = 1
): RiverCarveResult {
  const heightByKey = new Map(tiles.map((t) => [hexKey(t.coord), t.height]));
  const coordByKey = new Map(tiles.map((t) => [hexKey(t.coord), t.coord]));
  const riverFlowToByKey = new Map<string, AxialCoord | null>();
  const extraBasinIdByKey = new Map<string, string>();
  let extraBasinCounter = 0;

  const inlandDescending = tiles
    .filter((t) => t.height >= waterLevel && !basinIdByKey.has(hexKey(t.coord)))
    .sort((a, b) => b.height - a.height);
  if (inlandDescending.length === 0) return { riverFlowToByKey, extraBasinIdByKey };

  const sourcePool = inlandDescending.slice(0, Math.max(1, Math.floor(inlandDescending.length * 0.05)));

  for (let s = 0; s < sourceCount; s++) {
    const source = sourcePool[prng.nextInt(sourcePool.length)];
    let currentKey = hexKey(source.coord);
    const visitedThisRiver = new Set<string>();
    let guard = 0;

    while (guard++ < tiles.length) {
      if (visitedThisRiver.has(currentKey)) break;
      visitedThisRiver.add(currentKey);

      const currentHeight = heightByKey.get(currentKey);
      const currentCoord = coordByKey.get(currentKey);
      if (currentHeight === undefined || !currentCoord) break;

      if (currentHeight < waterLevel) {
        riverFlowToByKey.set(currentKey, null);
        break;
      }
      if (basinIdByKey.has(currentKey) || extraBasinIdByKey.has(currentKey)) {
        riverFlowToByKey.set(currentKey, null);
        break;
      }
      if (riverFlowToByKey.has(currentKey)) {
        break; // confluence with an existing river
      }

      const lowerNeighbors = hexNeighbors(currentCoord)
        .map((n) => ({ coord: n, key: hexKey(n), height: heightByKey.get(hexKey(n)) }))
        .filter((n): n is { coord: AxialCoord; key: string; height: number } => n.height !== undefined && n.height < currentHeight);

      if (lowerNeighbors.length === 0) {
        const newBasinId = `river-lake-${extraBasinCounter++}`;
        extraBasinIdByKey.set(currentKey, newBasinId);
        riverFlowToByKey.set(currentKey, null);
        break;
      }

      lowerNeighbors.sort((a, b) => a.height - b.height);
      const bestHeight = lowerNeighbors[0].height;
      const tied = lowerNeighbors.filter((n) => Math.abs(n.height - bestHeight) < 1e-6);
      const chosen = tied[prng.nextInt(tied.length)];

      riverFlowToByKey.set(currentKey, chosen.coord);
      currentKey = chosen.key;
    }
  }

  return { riverFlowToByKey, extraBasinIdByKey };
}
