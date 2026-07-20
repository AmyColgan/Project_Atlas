import { TerrainField, TerrainTileData } from "../types";

export interface TerrainGridDimensions {
  columns: number;
  rows: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  vertexSpacing: number;
  gatherRadius: number;
  bucketSize: number;
}

export function computeGridDimensions(field: TerrainField): TerrainGridDimensions {
  const { tiles, hexSize } = field;
  const minX = Math.min(...tiles.map((t) => t.worldX)) - hexSize * 2;
  const maxX = Math.max(...tiles.map((t) => t.worldX)) + hexSize * 2;
  const minZ = Math.min(...tiles.map((t) => t.worldZ)) - hexSize * 2;
  const maxZ = Math.max(...tiles.map((t) => t.worldZ)) + hexSize * 2;

  const hexPitch = hexSize * Math.sqrt(3);
  const vertexSpacing = hexPitch * 0.28;
  const gatherRadius = hexPitch * 1.8;

  const columns = Math.max(2, Math.round((maxX - minX) / vertexSpacing));
  const rows = Math.max(2, Math.round((maxZ - minZ) / vertexSpacing));

  return { columns, rows, minX, maxX, minZ, maxZ, vertexSpacing, gatherRadius, bucketSize: gatherRadius };
}

export function vertexWorldXZ(dims: TerrainGridDimensions, col: number, row: number): { x: number; z: number } {
  return {
    x: dims.minX + (col / dims.columns) * (dims.maxX - dims.minX),
    z: dims.minZ + (row / dims.rows) * (dims.maxZ - dims.minZ),
  };
}

/** Shared triangle index buffer for any mesh built over the same grid dimensions. */
export function buildGridIndices(dims: TerrainGridDimensions): number[] {
  const indices: number[] = [];
  for (let row = 0; row < dims.rows; row++) {
    for (let col = 0; col < dims.columns; col++) {
      const a = row * (dims.columns + 1) + col;
      const b = a + 1;
      const c = a + (dims.columns + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return indices;
}

export interface TileBucketIndex {
  bucketSize: number;
  buckets: Map<string, TerrainTileData[]>;
}

export function buildBucketIndex(tiles: TerrainTileData[], bucketSize: number): TileBucketIndex {
  const buckets = new Map<string, TerrainTileData[]>();
  for (const tile of tiles) {
    const key = `${Math.floor(tile.worldX / bucketSize)},${Math.floor(tile.worldZ / bucketSize)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(tile);
    else buckets.set(key, [tile]);
  }
  return { bucketSize, buckets };
}

export function gatherNearbyTiles(x: number, z: number, index: TileBucketIndex): TerrainTileData[] {
  const bucketX = Math.floor(x / index.bucketSize);
  const bucketZ = Math.floor(z / index.bucketSize);
  const nearby: TerrainTileData[] = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const bucket = index.buckets.get(`${bucketX + dx},${bucketZ + dz}`);
      if (bucket) nearby.push(...bucket);
    }
  }
  return nearby;
}

/** Smooth falloff to zero at gatherRadius — a hard nearest-k cutoff produces visible seam artifacts. */
export function smoothWeight(distance: number, gatherRadius: number): number {
  const t = Math.min(1, distance / gatherRadius);
  const falloff = 1 - t * t;
  return falloff * falloff;
}
