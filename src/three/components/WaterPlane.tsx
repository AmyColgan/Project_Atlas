import { useMemo } from "react";
import { TerrainField } from "../types";
import { BIOME_COLORS } from "./biomeColors";

interface WaterPlaneProps {
  terrain: TerrainField;
}

export function WaterPlane({ terrain }: WaterPlaneProps) {
  const bounds = useMemo(() => {
    const xs = terrain.tiles.map((t) => t.worldX);
    const zs = terrain.tiles.map((t) => t.worldZ);
    const width = Math.max(...xs) - Math.min(...xs) + terrain.hexSize * 4;
    const depth = Math.max(...zs) - Math.min(...zs) + terrain.hexSize * 4;
    const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
    const centerZ = (Math.max(...zs) + Math.min(...zs)) / 2;
    return { width, depth, centerX, centerZ };
  }, [terrain]);

  const waterY = terrain.waterLevel * terrain.maxElevation;

  return (
    <mesh
      position={[bounds.centerX, waterY, bounds.centerZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[bounds.width, bounds.depth]} />
      <meshStandardMaterial
        color={BIOME_COLORS.water}
        transparent
        opacity={0.75}
        roughness={0.15}
        metalness={0.1}
      />
    </mesh>
  );
}
