import { AxialCoord } from "../../utils/hex";
import { TerrainField } from "../types";
import { columnHeight } from "./TerrainTiles";
import { PreviewBlockedReason } from "../state/atlasSceneStore";

export type PathPreviewStatus = "valid" | "blocked" | null;

interface PathPreviewProps {
  terrain: TerrainField;
  path: AxialCoord[] | null;
  destinationTileId: string | null;
  armed: boolean;
  blockedReason: PreviewBlockedReason;
}

function resolveColor(blockedReason: PreviewBlockedReason, armed: boolean): string {
  if (blockedReason) return "#ff5c5c";
  return armed ? "#ffcf5c" : "#6fb8ff";
}

export function PathPreview({ terrain, path, destinationTileId, armed, blockedReason }: PathPreviewProps) {
  if (!destinationTileId) return null;

  const color = resolveColor(blockedReason, armed);
  const destinationTile = terrain.tiles.find((t) => t.id === destinationTileId);

  const pathTiles = (path ?? [])
    .map((coord) => terrain.tiles.find((t) => t.coord.q === coord.q && t.coord.r === coord.r))
    .filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <group>
      {pathTiles.map((tile) => (
        <mesh
          key={tile.id}
          position={[tile.worldX, columnHeight(tile, terrain.maxElevation) + 0.12, tile.worldZ]}
          raycast={() => null}
        >
          <sphereGeometry args={[terrain.hexSize * 0.12, 10, 10]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} />
        </mesh>
      ))}

      {destinationTile && (
        <mesh
          position={[destinationTile.worldX, columnHeight(destinationTile, terrain.maxElevation) + 0.06, destinationTile.worldZ]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={() => null}
        >
          <ringGeometry args={[terrain.hexSize * 0.7, terrain.hexSize * 1.0, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
