import type { ThreeEvent } from "@react-three/fiber";
import { TerrainField } from "../types";
import { columnHeight } from "./TerrainTiles";
import { useAtlasSceneStore } from "../state/atlasSceneStore";

const UNIT_ID = "explorer-unit";

interface ExplorerUnitProps {
  terrain: TerrainField;
  tileId: string;
}

export function ExplorerUnit({ terrain, tileId }: ExplorerUnitProps) {
  const tile = terrain.tiles.find((t) => t.id === tileId);
  const hovered = useAtlasSceneStore((s) => s.hovered?.kind === "explorer" && s.hovered.id === UNIT_ID);
  const selected = useAtlasSceneStore((s) => s.selected?.kind === "explorer" && s.selected.id === UNIT_ID);
  const setHovered = useAtlasSceneStore((s) => s.setHovered);
  const select = useAtlasSceneStore((s) => s.select);

  if (!tile) return null;

  const baseY = columnHeight(tile, terrain.maxElevation);
  const glow = selected ? 0.6 : hovered ? 0.3 : 0;

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered({ kind: "explorer", id: UNIT_ID });
  };
  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(null);
  };
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    select({ kind: "explorer", id: UNIT_ID });
  };

  return (
    <group
      position={[tile.worldX, baseY, tile.worldZ]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <mesh position={[0, 0.32, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.32, 4, 8]} />
        <meshStandardMaterial color="#4fd1c5" emissive="#4fd1c5" emissiveIntensity={glow} />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color="#e8f7f5" emissive="#4fd1c5" emissiveIntensity={glow * 0.5} />
      </mesh>
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.5, 20]} />
          <meshBasicMaterial color="#4fd1c5" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
