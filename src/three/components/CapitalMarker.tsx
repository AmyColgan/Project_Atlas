import type { ThreeEvent } from "@react-three/fiber";
import { TerrainField } from "../types";
import { columnHeight } from "./TerrainTiles";
import { useAtlasSceneStore } from "../state/atlasSceneStore";

const MARKER_ID = "capital-settlement";

interface CapitalMarkerProps {
  terrain: TerrainField;
  tileId: string;
}

export function CapitalMarker({ terrain, tileId }: CapitalMarkerProps) {
  const tile = terrain.tiles.find((t) => t.id === tileId);
  const hovered = useAtlasSceneStore((s) => s.hovered?.kind === "capital" && s.hovered.id === MARKER_ID);
  const selected = useAtlasSceneStore((s) => s.selected?.kind === "capital" && s.selected.id === MARKER_ID);
  const setHovered = useAtlasSceneStore((s) => s.setHovered);
  const select = useAtlasSceneStore((s) => s.select);

  if (!tile) return null;

  const baseY = columnHeight(tile, terrain.maxElevation);
  const glow = selected ? 0.55 : hovered ? 0.25 : 0;

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered({ kind: "capital", id: MARKER_ID });
  };
  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(null);
  };
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    select({ kind: "capital", id: MARKER_ID });
  };

  return (
    <group
      position={[tile.worldX, baseY, tile.worldZ]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.8, 0.9]} />
        <meshStandardMaterial color="#d8c39a" emissive="#ffcf5c" emissiveIntensity={glow} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <coneGeometry args={[0.68, 0.5, 4]} />
        <meshStandardMaterial color="#a13d2b" emissive="#ffcf5c" emissiveIntensity={glow} />
      </mesh>
      <mesh position={[0.75, 0.25, 0.4]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#c9b183" emissive="#ffcf5c" emissiveIntensity={glow} />
      </mesh>
      <mesh position={[-0.7, 0.22, -0.35]} castShadow receiveShadow>
        <boxGeometry args={[0.45, 0.44, 0.45]} />
        <meshStandardMaterial color="#c9b183" emissive="#ffcf5c" emissiveIntensity={glow} />
      </mesh>
    </group>
  );
}
