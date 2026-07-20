import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TerrainField } from "../types";
import { ProjectType, isTileEligibleForProject } from "../domain/construction";
import { resolveVisibility } from "../domain/visibility";
import { tileSurfaceHeight } from "./terrainHeight";

const ELIGIBLE_COLOR = "#5cd18f";
const ELIGIBLE_OPACITY = 0.3;

interface ConstructionEligibilityHighlightsProps {
  terrain: TerrainField;
  projectType: ProjectType;
  visibleTileIds: ReadonlySet<string>;
  exploredTileIds: ReadonlySet<string>;
  excludeTileIds: ReadonlySet<string>;
}

/** Eligible tiles only — highlighting every ineligible tile too would cover most of the map and read as noise, not guidance. */
export function ConstructionEligibilityHighlights({
  terrain,
  projectType,
  visibleTileIds,
  exploredTileIds,
  excludeTileIds,
}: ConstructionEligibilityHighlightsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const eligibleTiles = useMemo(
    () =>
      terrain.tiles.filter(
        (t) =>
          isTileEligibleForProject(t, projectType) &&
          !excludeTileIds.has(t.id) &&
          resolveVisibility(t.id, visibleTileIds, exploredTileIds) !== "unexplored"
      ),
    [terrain.tiles, projectType, visibleTileIds, exploredTileIds, excludeTileIds]
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    eligibleTiles.forEach((tile, i) => {
      const y = tileSurfaceHeight(tile, terrain.maxElevation) + 0.03;
      dummy.position.set(tile.worldX, y, tile.worldZ);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [eligibleTiles, terrain.maxElevation, dummy]);

  if (eligibleTiles.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, eligibleTiles.length]}
      raycast={() => null}
    >
      <circleGeometry args={[terrain.hexSize * 0.8, 6]} />
      <meshBasicMaterial color={ELIGIBLE_COLOR} transparent opacity={ELIGIBLE_OPACITY} depthWrite={false} />
    </instancedMesh>
  );
}
