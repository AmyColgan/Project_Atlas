import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TerrainField } from "../types";
import { tileSurfaceHeight } from "./terrainHeight";

const RANGE_COLOR = "#5cd18f";
const RANGE_OPACITY = 0.28;
const RANGE_HEIGHT_OFFSET = 0.03;

interface MovementRangeHighlightsProps {
  terrain: TerrainField;
  reachableTileIds: ReadonlySet<string>;
  excludeTileId?: string;
}

/** Translucent overlay marking every tile the selected explorer can reach this move. */
export function MovementRangeHighlights({ terrain, reachableTileIds, excludeTileId }: MovementRangeHighlightsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const tiles = useMemo(
    () => terrain.tiles.filter((t) => reachableTileIds.has(t.id) && t.id !== excludeTileId),
    [terrain.tiles, reachableTileIds, excludeTileId]
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    tiles.forEach((tile, i) => {
      const y = tileSurfaceHeight(tile, terrain.maxElevation) + RANGE_HEIGHT_OFFSET;
      dummy.position.set(tile.worldX, y, tile.worldZ);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [tiles, terrain.maxElevation, dummy]);

  if (tiles.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, tiles.length]}
      raycast={() => null}
    >
      <circleGeometry args={[terrain.hexSize * 0.82, 6]} />
      <meshBasicMaterial color={RANGE_COLOR} transparent opacity={RANGE_OPACITY} depthWrite={false} />
    </instancedMesh>
  );
}
