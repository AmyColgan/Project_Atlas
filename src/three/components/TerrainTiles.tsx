import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { BiomeType, TerrainField, TerrainTileData } from "../types";
import { BIOME_COLORS, EXPLORED_DIM_FACTOR, FOG_COLOR } from "./biomeColors";
import { resolveVisibility } from "../domain/visibility";

const MIN_COLUMN_HEIGHT_RATIO = 0.15;
const FOG_HEIGHT_RATIO = 0.22;

export function columnHeight(tile: TerrainTileData, maxElevation: number): number {
  return Math.max(MIN_COLUMN_HEIGHT_RATIO * maxElevation, tile.height * maxElevation);
}

interface BiomeGroupProps {
  biome: BiomeType;
  tiles: TerrainTileData[];
  maxElevation: number;
  hexSize: number;
  colorFactor: number;
  interactive: boolean;
  onHoverTile: (tile: TerrainTileData) => void;
  onSelectTile: (tile: TerrainTileData) => void;
}

function BiomeInstances({
  biome,
  tiles,
  maxElevation,
  hexSize,
  colorFactor,
  interactive,
  onHoverTile,
  onSelectTile,
}: BiomeGroupProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(BIOME_COLORS[biome]).multiplyScalar(colorFactor), [biome, colorFactor]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    tiles.forEach((tile, i) => {
      const height = columnHeight(tile, maxElevation);
      dummy.position.set(tile.worldX, height / 2, tile.worldZ);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [tiles, maxElevation, dummy]);

  if (tiles.length === 0) return null;

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    if (event.instanceId === undefined) return;
    onHoverTile(tiles[event.instanceId]);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    if (event.instanceId === undefined) return;
    onSelectTile(tiles[event.instanceId]);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, tiles.length]}
      castShadow
      receiveShadow
      onPointerMove={interactive ? handleMove : undefined}
      onClick={interactive ? handleClick : undefined}
    >
      <cylinderGeometry args={[hexSize * 0.96, hexSize * 0.96, 1, 6]} />
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </instancedMesh>
  );
}

interface FogGroupProps {
  tiles: TerrainTileData[];
  hexSize: number;
  maxElevation: number;
  onHoverTile: (tile: TerrainTileData) => void;
  onSelectTile: (tile: TerrainTileData) => void;
}

/**
 * Unexplored tiles render as uniform, flat fog — no biome, height, or landmark
 * data leaks through. They still need hover/click handlers, though: ordering
 * the explorer into reachable-but-unrevealed territory is how fog gets
 * pushed back in the first place, so fog can't be a dead click zone.
 */
function FogInstances({ tiles, hexSize, maxElevation, onHoverTile, onSelectTile }: FogGroupProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const fogHeight = maxElevation * FOG_HEIGHT_RATIO;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    tiles.forEach((tile, i) => {
      dummy.position.set(tile.worldX, fogHeight / 2, tile.worldZ);
      dummy.scale.set(1, fogHeight, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [tiles, fogHeight, dummy]);

  if (tiles.length === 0) return null;

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.instanceId === undefined) return;
    onHoverTile(tiles[event.instanceId]);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.instanceId === undefined) return;
    onSelectTile(tiles[event.instanceId]);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, tiles.length]}
      receiveShadow
      onPointerMove={handleMove}
      onClick={handleClick}
    >
      <cylinderGeometry args={[hexSize * 0.96, hexSize * 0.96, 1, 6]} />
      <meshStandardMaterial color={FOG_COLOR} flatShading roughness={1} />
    </instancedMesh>
  );
}

interface TerrainTilesProps {
  terrain: TerrainField;
  visibleTileIds: ReadonlySet<string>;
  exploredTileIds: ReadonlySet<string>;
  onHoverTile: (tile: TerrainTileData) => void;
  onSelectTile: (tile: TerrainTileData) => void;
}

export function TerrainTiles({ terrain, visibleTileIds, exploredTileIds, onHoverTile, onSelectTile }: TerrainTilesProps) {
  const buckets = useMemo(() => {
    const fog: TerrainTileData[] = [];
    const explored = new Map<BiomeType, TerrainTileData[]>();
    const visible = new Map<BiomeType, TerrainTileData[]>();

    for (const tile of terrain.tiles) {
      const visibility = resolveVisibility(tile.id, visibleTileIds, exploredTileIds);
      if (visibility === "unexplored") {
        fog.push(tile);
      } else {
        const target = visibility === "visible" ? visible : explored;
        const group = target.get(tile.biome);
        if (group) group.push(tile);
        else target.set(tile.biome, [tile]);
      }
    }

    return { fog, explored, visible };
  }, [terrain.tiles, visibleTileIds, exploredTileIds]);

  return (
    <group>
      <FogInstances
        tiles={buckets.fog}
        hexSize={terrain.hexSize}
        maxElevation={terrain.maxElevation}
        onHoverTile={onHoverTile}
        onSelectTile={onSelectTile}
      />

      {Array.from(buckets.explored.entries()).map(([biome, tiles]) => (
        <BiomeInstances
          key={`explored-${biome}`}
          biome={biome}
          tiles={tiles}
          maxElevation={terrain.maxElevation}
          hexSize={terrain.hexSize}
          colorFactor={EXPLORED_DIM_FACTOR}
          interactive
          onHoverTile={onHoverTile}
          onSelectTile={onSelectTile}
        />
      ))}

      {Array.from(buckets.visible.entries()).map(([biome, tiles]) => (
        <BiomeInstances
          key={`visible-${biome}`}
          biome={biome}
          tiles={tiles}
          maxElevation={terrain.maxElevation}
          hexSize={terrain.hexSize}
          colorFactor={1}
          interactive
          onHoverTile={onHoverTile}
          onSelectTile={onSelectTile}
        />
      ))}
    </group>
  );
}
