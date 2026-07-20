import * as THREE from "three";
import { TerrainField, TerrainTileData } from "../types";
import { tileSurfaceHeight } from "../components/terrainHeight";

export interface LakeSurface {
  lakeId: string;
  geometry: THREE.BufferGeometry;
}

/**
 * One flat disc per lake tile at the lake's own (averaged) surface level —
 * a real lake surface is level, unlike the surrounding sloped terrain.
 * Small basins (capped at generation time) don't need a fitted polygon;
 * overlapping discs at a shared hex spacing read as one continuous pond.
 */
export function buildLakeMeshes(field: TerrainField): LakeSurface[] {
  const lakeTiles = field.tiles.filter((t) => t.isLake && t.lakeId);
  const byLake = new Map<string, TerrainTileData[]>();
  for (const tile of lakeTiles) {
    const group = byLake.get(tile.lakeId!);
    if (group) group.push(tile);
    else byLake.set(tile.lakeId!, [tile]);
  }

  const surfaces: LakeSurface[] = [];

  for (const [lakeId, tiles] of byLake) {
    const averageHeight = tiles.reduce((sum, t) => sum + tileSurfaceHeight(t, field.maxElevation), 0) / tiles.length;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const radius = field.hexSize * 0.98;
    const segments = 6;

    tiles.forEach((tile, tileIndex) => {
      const baseVertex = tileIndex * (segments + 1);
      positions.push(tile.worldX, averageHeight, tile.worldZ); // center
      uvs.push(tile.worldX * 0.3, tile.worldZ * 0.3);
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        const vx = tile.worldX + Math.cos(angle) * radius;
        const vz = tile.worldZ + Math.sin(angle) * radius;
        positions.push(vx, averageHeight, vz);
        uvs.push(vx * 0.3, vz * 0.3);
      }
      for (let s = 0; s < segments; s++) {
        const a = baseVertex;
        const b = baseVertex + 1 + s;
        const c = baseVertex + 1 + ((s + 1) % segments);
        indices.push(a, b, c);
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    surfaces.push({ lakeId, geometry });
  }

  return surfaces;
}
