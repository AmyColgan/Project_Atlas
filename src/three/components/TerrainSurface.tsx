import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { hexKey, pixelToAxial } from "../../utils/hex";
import { TerrainField, TerrainTileData } from "../types";
import { buildTerrainMesh } from "../rendering/terrainMesh";

interface TerrainSurfaceProps {
  terrain: TerrainField;
  onHoverTile: (tile: TerrainTileData) => void;
  onSelectTile: (tile: TerrainTileData) => void;
}

/**
 * One continuous ground mesh handles every tile click/hover uniformly —
 * unlike the old per-tile instanced pillars, there's no separate
 * interactive bucket per biome/visibility state. A click's world-space
 * intersection point maps back to the nearest hex via the same
 * pixelToAxial math used to place tiles in the first place. The fog
 * overlay rendered on top is purely visual (raycast disabled) so it can
 * never block a click meant for the ground beneath it — ordering the
 * explorer into unexplored-but-reachable territory must keep working.
 */
export function TerrainSurface({ terrain, onHoverTile, onSelectTile }: TerrainSurfaceProps) {
  const { geometry } = useMemo(() => buildTerrainMesh(terrain), [terrain]);
  const tileByKey = useMemo(() => new Map(terrain.tiles.map((t) => [hexKey(t.coord), t])), [terrain.tiles]);

  // pixelToAxial takes a PixelCoord {x, y}; world Z is the "y" half of that
  // 2D plane (matches axialToPixel, which produced worldX/worldZ this way).
  const resolveTile = (worldX: number, worldZ: number): TerrainTileData | undefined => {
    const coord = pixelToAxial({ x: worldX, y: worldZ }, terrain.hexSize);
    return tileByKey.get(hexKey(coord));
  };

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const tile = resolveTile(event.point.x, event.point.z);
    if (tile) onHoverTile(tile);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const tile = resolveTile(event.point.x, event.point.z);
    if (tile) onSelectTile(tile);
  };

  return (
    <mesh geometry={geometry} receiveShadow castShadow onPointerMove={handleMove} onClick={handleClick}>
      <meshStandardMaterial vertexColors roughness={0.92} metalness={0.02} />
    </mesh>
  );
}
