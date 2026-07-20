import * as THREE from "three";
import { TerrainField } from "../types";
import { BIOME_COLORS } from "../components/biomeColors";
import { buildBucketIndex, buildGridIndices, computeGridDimensions, gatherNearbyTiles, smoothWeight, vertexWorldXZ } from "./terrainGrid";

const SAND_COLOR = new THREE.Color("#d9c68f");
const SEABED_COLOR = new THREE.Color("#1f4a63");

export interface TerrainMeshBuildResult {
  geometry: THREE.BufferGeometry;
}

/**
 * Builds one static, continuous ground mesh for the whole terrain field —
 * rebuilt only on regenerate, never per-frame. Every vertex's height/color
 * is sampled at build time from the *final* domain data (never re-derives
 * noise here) via a smooth, wide-gather inverse-distance-weighted blend —
 * a hard nearest-3 cutoff produces visible Voronoi-seam faceting where the
 * "nearest 3" set changes discontinuously even though the underlying
 * weighting is continuous. This is the load-bearing separation for "hexes
 * are the hidden simulation grid, the rendered surface is continuous": this
 * function reads TerrainTileData (plain data) and returns a
 * THREE.BufferGeometry; it never talks to the store or React.
 */
export function buildTerrainMesh(field: TerrainField): TerrainMeshBuildResult {
  const dims = computeGridDimensions(field);
  const bucketIndex = buildBucketIndex(field.tiles, dims.bucketSize);

  const vertexCount = (dims.columns + 1) * (dims.rows + 1);
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const tmpColor = new THREE.Color();

  for (let row = 0; row <= dims.rows; row++) {
    for (let col = 0; col <= dims.columns; col++) {
      const { x, z } = vertexWorldXZ(dims, col, row);
      const vertexIndex = row * (dims.columns + 1) + col;
      const nearby = gatherNearbyTiles(x, z, bucketIndex);

      let heightWeightSum = 0;
      let heightSum = 0;
      let colorWeightSum = 0;
      const colorSum = new THREE.Color(0, 0, 0);
      let anyLandInRange = false;

      for (const tile of nearby) {
        const dx = tile.worldX - x;
        const dz = tile.worldZ - z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance > dims.gatherRadius) continue;

        const weight = smoothWeight(distance, dims.gatherRadius);
        heightWeightSum += weight;
        heightSum += tile.height * weight;

        if (tile.biome !== "water") {
          anyLandInRange = true;
          tmpColor.set(BIOME_COLORS[tile.biome]);
          if (tile.isCoast) tmpColor.lerp(SAND_COLOR, 0.55);
          colorSum.r += tmpColor.r * weight;
          colorSum.g += tmpColor.g * weight;
          colorSum.b += tmpColor.b * weight;
          colorWeightSum += weight;
        }
      }

      const height = heightWeightSum > 0 ? heightSum / heightWeightSum : 0;
      positions[vertexIndex * 3 + 0] = x;
      positions[vertexIndex * 3 + 1] = height * field.maxElevation;
      positions[vertexIndex * 3 + 2] = z;

      const finalColor = anyLandInRange
        ? new THREE.Color(colorSum.r / colorWeightSum, colorSum.g / colorWeightSum, colorSum.b / colorWeightSum)
        : SEABED_COLOR;

      colors[vertexIndex * 3 + 0] = finalColor.r;
      colors[vertexIndex * 3 + 1] = finalColor.g;
      colors[vertexIndex * 3 + 2] = finalColor.b;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(buildGridIndices(dims));
  geometry.computeVertexNormals();

  return { geometry };
}
