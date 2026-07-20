import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TerrainField } from "../types";
import { generateVegetationPlacements, PropKind, PropPlacement } from "../rendering/vegetationPlacement";
import { resolveVisibility } from "../domain/visibility";

const TREE_SCALE: Partial<Record<PropKind, number>> = {
  "tree-small": 0.7,
  "tree-medium": 1.0,
  "tree-large": 1.4,
};
const TREE_KINDS: PropKind[] = ["tree-small", "tree-medium", "tree-large"];

const TRUNK_COLOR = "#5b4330";
const CANOPY_COLORS = ["#3f6b3a", "#4d7a42", "#345c30"];
const ROCK_COLOR = "#8a8a86";
const BOULDER_COLOR = "#767468";
const SHRUB_COLOR = "#5c7a3f";

interface InstancedGroupProps {
  placements: PropPlacement[];
  geometry: THREE.BufferGeometry;
  color: string;
  colorVariants?: string[];
  yOffset?: number;
  castShadow?: boolean;
}

/** Color variation within a biome (per-instance, via a handful of palette variants) is cheap on an InstancedMesh via instanceColor — one draw call regardless of variant count. */
function InstancedPropGroup({ placements, geometry, color, colorVariants, yOffset = 0, castShadow = false }: InstancedGroupProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    placements.forEach((p, i) => {
      const scale = p.scale * (TREE_SCALE[p.kind] ?? 1);
      dummy.position.set(p.x, p.y + yOffset * scale, p.z);
      dummy.rotation.set(0, p.rotationY, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (colorVariants && colorVariants.length > 0) {
        tmpColor.set(colorVariants[i % colorVariants.length]);
        mesh.setColorAt(i, tmpColor);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [placements, dummy, tmpColor, yOffset, colorVariants]);

  if (placements.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined as unknown as THREE.Material, placements.length]}
      castShadow={castShadow}
      raycast={() => null}
    >
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </instancedMesh>
  );
}

interface VegetationInstancesProps {
  terrain: TerrainField;
  seed: number;
  visibleTileIds: ReadonlySet<string>;
  exploredTileIds: ReadonlySet<string>;
}

/**
 * Instanced decorative props (trees, rocks, shrubs, boulders) — a handful
 * of draw calls total regardless of prop count, not one draw call per
 * prop. castShadow is disabled on foliage specifically: at this density,
 * shadow-casting cost on many small instances is the real performance
 * risk, not triangle count.
 *
 * Fog of war: props sit well above the thin fog-overlay mesh (which only
 * darkens the ground surface), so a dense stand of trees would otherwise
 * stay clearly visible over unexplored terrain and give away "this is
 * forest" despite the ground beneath reading as fog — filtered out here
 * the same way CapitalMarker/ExplorerUnit hide on an unexplored tile.
 */
export function VegetationInstances({ terrain, seed, visibleTileIds, exploredTileIds }: VegetationInstancesProps) {
  const allPlacements = useMemo(() => generateVegetationPlacements(terrain, seed), [terrain, seed]);
  const placements = useMemo(
    () => allPlacements.filter((p) => resolveVisibility(p.tileId, visibleTileIds, exploredTileIds) !== "unexplored"),
    [allPlacements, visibleTileIds, exploredTileIds]
  );

  const byKind = useMemo(() => {
    const groups = new Map<PropKind, PropPlacement[]>();
    for (const p of placements) {
      const group = groups.get(p.kind);
      if (group) group.push(p);
      else groups.set(p.kind, [p]);
    }
    return groups;
  }, [placements]);

  const trunkGeometry = useMemo(() => new THREE.CylinderGeometry(0.06, 0.09, 0.5, 6), []);
  const canopyGeometry = useMemo(() => new THREE.ConeGeometry(0.4, 0.9, 7), []);
  const rockGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.22, 0), []);
  const boulderGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.4, 0), []);
  const shrubGeometry = useMemo(() => new THREE.IcosahedronGeometry(0.2, 0), []);

  const trees = useMemo(() => TREE_KINDS.flatMap((kind) => byKind.get(kind) ?? []), [byKind]);

  return (
    <group>
      <InstancedPropGroup placements={trees} geometry={trunkGeometry} color={TRUNK_COLOR} yOffset={0.25} />
      <InstancedPropGroup
        placements={trees}
        geometry={canopyGeometry}
        color="#ffffff"
        colorVariants={CANOPY_COLORS}
        yOffset={0.75}
        castShadow
      />
      <InstancedPropGroup placements={byKind.get("rock") ?? []} geometry={rockGeometry} color={ROCK_COLOR} yOffset={0.15} />
      <InstancedPropGroup
        placements={byKind.get("boulder") ?? []}
        geometry={boulderGeometry}
        color={BOULDER_COLOR}
        yOffset={0.28}
        castShadow
      />
      <InstancedPropGroup placements={byKind.get("shrub") ?? []} geometry={shrubGeometry} color={SHRUB_COLOR} yOffset={0.14} />
    </group>
  );
}
