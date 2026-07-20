import { useMemo } from "react";
import * as THREE from "three";
import { TerrainField } from "../types";
import { buildFogOverlayMesh } from "../rendering/fogOverlay";

interface FogOverlayMeshProps {
  terrain: TerrainField;
  visibleTileIds: ReadonlySet<string>;
  exploredTileIds: ReadonlySet<string>;
}

/**
 * Purely visual — raycast disabled so it can never block a click meant for
 * the ground mesh beneath it (the WaterPlane click-blocking bug from
 * Milestone 3D-2 was exactly this class of mistake). MultiplyBlending
 * means a white vertex has no visible effect ("visible") and a near-black
 * vertex darkens the ground toward black ("unexplored"), so hiding fog is
 * just a vertex-color gradient, not a second full terrain-color pass.
 */
export function FogOverlayMesh({ terrain, visibleTileIds, exploredTileIds }: FogOverlayMeshProps) {
  const geometry = useMemo(
    () => buildFogOverlayMesh(terrain, visibleTileIds, exploredTileIds),
    [terrain, visibleTileIds, exploredTileIds]
  );

  return (
    <mesh geometry={geometry} raycast={() => null}>
      <meshBasicMaterial vertexColors blending={THREE.MultiplyBlending} transparent depthWrite={false} />
    </mesh>
  );
}
