import * as THREE from "three";
import { TerrainField } from "../types";
import { resolveVisibility } from "../domain/visibility";
import { buildBucketIndex, buildGridIndices, computeGridDimensions, gatherNearbyTiles, smoothWeight, vertexWorldXZ } from "./terrainGrid";

const VISIBLE_LEVEL = 1;
const EXPLORED_LEVEL = 0.42;
const UNEXPLORED_LEVEL = 0.04;
const OVERLAY_Y_OFFSET = 0.06;

/**
 * A mesh over the same grid as the ground, meant to be rendered with
 * THREE.MultiplyBlending: a white vertex multiplies the ground color by 1
 * (no visible effect — fully "visible"), a near-black vertex multiplies it
 * toward black (fully covers it — "unexplored," hiding biome details
 * without a second full ground-color computation). This reuses the same
 * smooth IDW gather as the ground mesh, so fog edges soften naturally
 * instead of snapping at hex boundaries.
 */
export function buildFogOverlayMesh(
  field: TerrainField,
  visibleTileIds: ReadonlySet<string>,
  exploredTileIds: ReadonlySet<string>
): THREE.BufferGeometry {
  const dims = computeGridDimensions(field);
  const bucketIndex = buildBucketIndex(field.tiles, dims.bucketSize);

  const vertexCount = (dims.columns + 1) * (dims.rows + 1);
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);

  for (let row = 0; row <= dims.rows; row++) {
    for (let col = 0; col <= dims.columns; col++) {
      const { x, z } = vertexWorldXZ(dims, col, row);
      const vertexIndex = row * (dims.columns + 1) + col;
      const nearby = gatherNearbyTiles(x, z, bucketIndex);

      let heightWeightSum = 0;
      let heightSum = 0;
      let levelWeightSum = 0;
      let levelSum = 0;

      for (const tile of nearby) {
        const dx = tile.worldX - x;
        const dz = tile.worldZ - z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance > dims.gatherRadius) continue;

        const weight = smoothWeight(distance, dims.gatherRadius);
        heightWeightSum += weight;
        heightSum += tile.height * weight;

        const visibility = resolveVisibility(tile.id, visibleTileIds, exploredTileIds);
        const level = visibility === "visible" ? VISIBLE_LEVEL : visibility === "explored" ? EXPLORED_LEVEL : UNEXPLORED_LEVEL;
        levelSum += level * weight;
        levelWeightSum += weight;
      }

      const height = heightWeightSum > 0 ? heightSum / heightWeightSum : 0;
      const level = levelWeightSum > 0 ? levelSum / levelWeightSum : UNEXPLORED_LEVEL;

      positions[vertexIndex * 3 + 0] = x;
      positions[vertexIndex * 3 + 1] = height * field.maxElevation + OVERLAY_Y_OFFSET;
      positions[vertexIndex * 3 + 2] = z;

      colors[vertexIndex * 3 + 0] = level;
      colors[vertexIndex * 3 + 1] = level;
      colors[vertexIndex * 3 + 2] = level;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(buildGridIndices(dims));

  return geometry;
}
