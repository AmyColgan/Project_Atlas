import { useMemo } from "react";
import { TerrainField } from "../types";
import { WaterMaterial } from "./WaterMaterial";
import { BIOME_COLORS } from "./biomeColors";

interface OceanProps {
  terrain: TerrainField;
}

/**
 * A flat plane at sea level over the terrain's own bounds — the "shrink to
 * the landmass" the brief asks for comes from the terrain shape itself
 * (continent falloff concentrates land centrally, ocean at the edges), not
 * from resizing this plane. raycast disabled: a decorative water plane with
 * no pointer handlers still occludes raycasts to whatever's beneath it
 * unless explicitly excluded — the exact bug that made unexplored fog tiles
 * unclickable in Milestone 3D-2.
 */
export function Ocean({ terrain }: OceanProps) {
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
      raycast={() => null}
    >
      <planeGeometry args={[bounds.width, bounds.depth, 1, 1]} />
      <WaterMaterial color={BIOME_COLORS.water} opacity={0.78} />
    </mesh>
  );
}
