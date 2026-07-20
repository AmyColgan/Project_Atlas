import * as THREE from "three";
import { hexKey } from "../../utils/hex";
import { TerrainField, TerrainTileData } from "../types";
import { tileSurfaceHeight } from "../components/terrainHeight";

const RIVER_WIDTH = 0.55;
const RIVER_Y_OFFSET = 0.05;

function findRiverChains(tiles: TerrainTileData[]): TerrainTileData[][] {
  const riverTiles = tiles.filter((t) => t.isRiver);
  const byKey = new Map(riverTiles.map((t) => [hexKey(t.coord), t]));
  const isFlowTarget = new Set<string>();
  for (const tile of riverTiles) {
    if (tile.riverFlowTo) isFlowTarget.add(hexKey(tile.riverFlowTo));
  }

  const heads = riverTiles.filter((t) => !isFlowTarget.has(hexKey(t.coord)));
  const chains: TerrainTileData[][] = [];

  for (const head of heads) {
    const chain: TerrainTileData[] = [];
    let current: TerrainTileData | undefined = head;
    const visited = new Set<string>();
    while (current && !visited.has(hexKey(current.coord))) {
      visited.add(hexKey(current.coord));
      chain.push(current);
      current = current.riverFlowTo ? byKey.get(hexKey(current.riverFlowTo)) : undefined;
    }
    if (chain.length > 0) chains.push(chain);
  }

  return chains;
}

/**
 * Ribbon geometry walking each river's riverFlowTo chain, sitting slightly
 * below the surrounding ground so it reads as a carved channel. Pure
 * geometry construction — no material/animation here, that's a rendering
 * component's concern (it needs a per-frame time uniform).
 *
 * Each segment is extruded independently using only its own direction,
 * rather than a shared miter joint blending the incoming/outgoing tangents
 * at each point — hex-grid turns are sharp (60-120 degrees), and a shared
 * miter folds/self-intersects at exactly those angles, producing a visible
 * gray sliver where the ribbon twists on itself. Independent segments can
 * leave a tiny gap or overlap at each joint, invisible at this width/scale.
 */
export function buildRiverMeshes(field: TerrainField): THREE.BufferGeometry[] {
  const chains = findRiverChains(field.tiles);
  const geometries: THREE.BufferGeometry[] = [];

  for (const chain of chains) {
    if (chain.length < 2) continue;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < chain.length - 1; i++) {
      const a = chain[i];
      const b = chain[i + 1];

      const dirX = b.worldX - a.worldX;
      const dirZ = b.worldZ - a.worldZ;
      const length = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
      const perpX = (-dirZ / length) * RIVER_WIDTH;
      const perpZ = (dirX / length) * RIVER_WIDTH;

      const yA = tileSurfaceHeight(a, field.maxElevation) - RIVER_Y_OFFSET;
      const yB = tileSurfaceHeight(b, field.maxElevation) - RIVER_Y_OFFSET;

      const base = positions.length / 3;
      positions.push(a.worldX - perpX, yA, a.worldZ - perpZ);
      positions.push(a.worldX + perpX, yA, a.worldZ + perpZ);
      positions.push(b.worldX - perpX, yB, b.worldZ - perpZ);
      positions.push(b.worldX + perpX, yB, b.worldZ + perpZ);
      uvs.push(0, i, 1, i, 0, i + 1, 1, i + 1);

      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometries.push(geometry);
  }

  return geometries;
}
