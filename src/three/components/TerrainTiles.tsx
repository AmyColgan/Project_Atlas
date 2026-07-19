import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { BiomeType, TerrainField, TerrainTileData } from "../types";
import { BIOME_COLORS } from "./biomeColors";

const MIN_COLUMN_HEIGHT_RATIO = 0.15;

interface BiomeGroupProps {
  biome: BiomeType;
  tiles: TerrainTileData[];
  maxElevation: number;
  hexSize: number;
  onHoverTile: (tile: TerrainTileData) => void;
  onSelectTile: (tile: TerrainTileData) => void;
}

function columnHeight(tile: TerrainTileData, maxElevation: number): number {
  return Math.max(MIN_COLUMN_HEIGHT_RATIO * maxElevation, tile.height * maxElevation);
}

function BiomeInstances({ biome, tiles, maxElevation, hexSize, onHoverTile, onSelectTile }: BiomeGroupProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

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
      castShadow
      receiveShadow
      onPointerMove={handleMove}
      onClick={handleClick}
    >
      <cylinderGeometry args={[hexSize * 0.96, hexSize * 0.96, 1, 6]} />
      <meshStandardMaterial color={BIOME_COLORS[biome]} flatShading roughness={0.9} />
    </instancedMesh>
  );
}

interface TerrainTilesProps {
  terrain: TerrainField;
  onHoverTile: (tile: TerrainTileData) => void;
  onSelectTile: (tile: TerrainTileData) => void;
}

export function TerrainTiles({ terrain, onHoverTile, onSelectTile }: TerrainTilesProps) {
  const tilesByBiome = useMemo(() => {
    const groups = new Map<BiomeType, TerrainTileData[]>();
    for (const tile of terrain.tiles) {
      const group = groups.get(tile.biome);
      if (group) group.push(tile);
      else groups.set(tile.biome, [tile]);
    }
    return groups;
  }, [terrain.tiles]);

  return (
    <group>
      {Array.from(tilesByBiome.entries()).map(([biome, tiles]) => (
        <BiomeInstances
          key={biome}
          biome={biome}
          tiles={tiles}
          maxElevation={terrain.maxElevation}
          hexSize={terrain.hexSize}
          onHoverTile={onHoverTile}
          onSelectTile={onSelectTile}
        />
      ))}
    </group>
  );
}

export { columnHeight };
