import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { TerrainField } from "../types";
import { tileSurfaceHeight } from "./terrainHeight";
import { useAtlasSceneStore } from "../state/atlasSceneStore";
import { computeStepProgress, interpolateWorldPosition, lerp } from "../domain/travelAnimation";

const UNIT_ID = "explorer-unit";

interface ExplorerUnitProps {
  terrain: TerrainField;
  tileId: string;
  visible: boolean;
}

export function ExplorerUnit({ terrain, tileId, visible }: ExplorerUnitProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const tile = terrain.tiles.find((t) => t.id === tileId);
  const hovered = useAtlasSceneStore((s) => s.hovered?.kind === "explorer" && s.hovered.id === UNIT_ID);
  const selected = useAtlasSceneStore((s) => s.selected?.kind === "explorer" && s.selected.id === UNIT_ID);
  const setHovered = useAtlasSceneStore((s) => s.setHovered);
  const select = useAtlasSceneStore((s) => s.select);

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !tile) return;

    const travel = useAtlasSceneStore.getState().travel;
    let worldX = tile.worldX;
    let worldZ = tile.worldZ;
    let y = tileSurfaceHeight(tile, terrain.maxElevation);

    if (travel && !travel.paused) {
      const nextCoord = travel.path[travel.currentStepIndex];
      const nextTile = terrain.tiles.find((t) => t.coord.q === nextCoord.q && t.coord.r === nextCoord.r);
      if (nextTile) {
        const elapsed = performance.now() - travel.stepStartedAtMs;
        const t = computeStepProgress(elapsed);
        const interpolated = interpolateWorldPosition(
          { x: tile.worldX, z: tile.worldZ },
          { x: nextTile.worldX, z: nextTile.worldZ },
          t
        );
        worldX = interpolated.x;
        worldZ = interpolated.z;
        y = lerp(tileSurfaceHeight(tile, terrain.maxElevation), tileSurfaceHeight(nextTile, terrain.maxElevation), t);
      }
    }

    group.position.set(worldX, y, worldZ);
  });

  // Fog of war: unexplored terrain must not expose units.
  if (!tile || !visible) return null;

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
    select(selected ? null : { kind: "explorer", id: UNIT_ID });
  };

  return (
    <group
      ref={groupRef}
      position={[tile.worldX, tileSurfaceHeight(tile, terrain.maxElevation), tile.worldZ]}
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
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[0.4, 0.5, 20]} />
          <meshBasicMaterial color="#4fd1c5" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
