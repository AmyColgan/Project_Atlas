import { TerrainField } from "../types";
import { tileSurfaceHeight } from "./terrainHeight";

interface HighlightRingProps {
  terrain: TerrainField;
  tileId: string | undefined;
  color: string;
  opacity: number;
  yOffset: number;
}

function HighlightRing({ terrain, tileId, color, opacity, yOffset }: HighlightRingProps) {
  const tile = terrain.tiles.find((t) => t.id === tileId);
  if (!tile) return null;

  const y = tileSurfaceHeight(tile, terrain.maxElevation) + yOffset;

  return (
    <mesh position={[tile.worldX, y, tile.worldZ]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <ringGeometry args={[terrain.hexSize * 0.65, terrain.hexSize * 0.92, 6]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

interface TileHighlightsProps {
  terrain: TerrainField;
  hoveredTileId: string | undefined;
  selectedTileId: string | undefined;
}

export function TileHighlights({ terrain, hoveredTileId, selectedTileId }: TileHighlightsProps) {
  return (
    <>
      {hoveredTileId && hoveredTileId !== selectedTileId && (
        <HighlightRing terrain={terrain} tileId={hoveredTileId} color="#ffffff" opacity={0.35} yOffset={0.04} />
      )}
      {selectedTileId && (
        <HighlightRing terrain={terrain} tileId={selectedTileId} color="#ffcf5c" opacity={0.75} yOffset={0.05} />
      )}
    </>
  );
}
