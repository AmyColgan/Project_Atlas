import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { TerrainField } from "../types";
import { tileSurfaceHeight } from "./terrainHeight";
import { useAtlasSceneStore } from "../state/atlasSceneStore";
import { computeStepProgress, interpolateWorldPosition, lerp } from "../domain/travelAnimation";

const UNIT_ID = "explorer-unit";

const TUNIC_COLOR = "#3f8f86";
const PANTS_COLOR = "#5b4a37";
const SKIN_COLOR = "#e0b48f";
const CAP_COLOR = "#2c5651";
const PACK_COLOR = "#6b5030";

const HIP_Y = 0.34;
const LEG_HEIGHT = 0.34;
const TORSO_HEIGHT = 0.32;
const SHOULDER_Y = HIP_Y + TORSO_HEIGHT * 0.92;
const ARM_LENGTH = 0.3;
const HEAD_RADIUS = 0.12;
const HEAD_Y = HIP_Y + TORSO_HEIGHT + HEAD_RADIUS * 1.1;

const WALK_CYCLE_SPEED = 7;
const LEG_SWING = 0.55;
const ARM_SWING = 0.4;
const WALK_BOB_HEIGHT = 0.04;
const IDLE_BOB_SPEED = 1.6;
const IDLE_BOB_HEIGHT = 0.012;
const YAW_LERP = 0.15;

interface ExplorerUnitProps {
  terrain: TerrainField;
  tileId: string;
  visible: boolean;
}

/**
 * A believable low-poly traveler (head/torso/arms/legs/pack), not a
 * placeholder pawn. Limbs swing procedurally from a walk-phase that only
 * advances during active travel; the whole rig turns to face its direction
 * of movement. No rigged/imported asset — primitives grouped so each limb
 * has its own pivot, matching the "prefer procedural, local geometry" call.
 */
export function ExplorerUnit({ terrain, tileId, visible }: ExplorerUnitProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const bodyBobRef = useRef<THREE.Group>(null!);
  const leftLegRef = useRef<THREE.Group>(null!);
  const rightLegRef = useRef<THREE.Group>(null!);
  const leftArmRef = useRef<THREE.Group>(null!);
  const rightArmRef = useRef<THREE.Group>(null!);
  const walkPhase = useRef(0);
  const currentYaw = useRef(0);

  const tile = terrain.tiles.find((t) => t.id === tileId);
  const hovered = useAtlasSceneStore((s) => s.hovered?.kind === "explorer" && s.hovered.id === UNIT_ID);
  const selected = useAtlasSceneStore((s) => s.selected?.kind === "explorer" && s.selected.id === UNIT_ID);
  const setHovered = useAtlasSceneStore((s) => s.setHovered);
  const select = useAtlasSceneStore((s) => s.select);
  const requestCameraFocus = useAtlasSceneStore((s) => s.requestCameraFocus);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || !tile) return;

    const travel = useAtlasSceneStore.getState().travel;
    let worldX = tile.worldX;
    let worldZ = tile.worldZ;
    let y = tileSurfaceHeight(tile, terrain.maxElevation);
    let isWalking = false;

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
        isWalking = true;

        const dx = nextTile.worldX - tile.worldX;
        const dz = nextTile.worldZ - tile.worldZ;
        if (dx * dx + dz * dz > 1e-8) {
          const targetYaw = Math.atan2(dx, dz);
          // Shortest-path angle lerp so it never spins the long way around.
          let delta2 = targetYaw - currentYaw.current;
          delta2 = Math.atan2(Math.sin(delta2), Math.cos(delta2));
          currentYaw.current += delta2 * YAW_LERP;
        }
      }
    }

    group.position.set(worldX, y, worldZ);
    group.rotation.y = currentYaw.current;

    if (isWalking) {
      walkPhase.current += delta * WALK_CYCLE_SPEED;
      const swing = Math.sin(walkPhase.current);
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing * LEG_SWING;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing * LEG_SWING;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * ARM_SWING;
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * ARM_SWING;
      if (bodyBobRef.current) bodyBobRef.current.position.y = Math.abs(swing) * WALK_BOB_HEIGHT;
    } else {
      const idle = Math.sin(performance.now() * 0.001 * IDLE_BOB_SPEED);
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
      if (bodyBobRef.current) bodyBobRef.current.position.y = idle * IDLE_BOB_HEIGHT;
    }
  });

  // Fog of war: unexplored terrain must not expose units.
  if (!tile || !visible) return null;

  const glow = selected ? 0.55 : hovered ? 0.28 : 0;

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
  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    requestCameraFocus("explorer");
  };

  return (
    <group
      ref={groupRef}
      position={[tile.worldX, tileSurfaceHeight(tile, terrain.maxElevation), tile.worldZ]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <group ref={bodyBobRef}>
        <mesh position={[0, HIP_Y + TORSO_HEIGHT / 2, 0]} castShadow>
          <boxGeometry args={[0.28, TORSO_HEIGHT, 0.16]} />
          <meshStandardMaterial color={TUNIC_COLOR} emissive="#4fd1c5" emissiveIntensity={glow} flatShading />
        </mesh>

        <mesh position={[0, HIP_Y + TORSO_HEIGHT * 0.55, -0.11]} castShadow>
          <boxGeometry args={[0.16, 0.2, 0.1]} />
          <meshStandardMaterial color={PACK_COLOR} flatShading />
        </mesh>

        <mesh position={[0, HEAD_Y, 0]} castShadow>
          <sphereGeometry args={[HEAD_RADIUS, 10, 8]} />
          <meshStandardMaterial color={SKIN_COLOR} emissive="#4fd1c5" emissiveIntensity={glow * 0.4} flatShading />
        </mesh>
        <mesh position={[0, HEAD_Y + HEAD_RADIUS * 0.65, 0]} castShadow>
          <coneGeometry args={[HEAD_RADIUS * 0.95, HEAD_RADIUS * 0.85, 8]} />
          <meshStandardMaterial color={CAP_COLOR} flatShading />
        </mesh>

        <group ref={leftLegRef} position={[-0.08, HIP_Y, 0]}>
          <mesh position={[0, -LEG_HEIGHT / 2, 0]} castShadow>
            <boxGeometry args={[0.1, LEG_HEIGHT, 0.1]} />
            <meshStandardMaterial color={PANTS_COLOR} flatShading />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.08, HIP_Y, 0]}>
          <mesh position={[0, -LEG_HEIGHT / 2, 0]} castShadow>
            <boxGeometry args={[0.1, LEG_HEIGHT, 0.1]} />
            <meshStandardMaterial color={PANTS_COLOR} flatShading />
          </mesh>
        </group>

        <group ref={leftArmRef} position={[-0.18, SHOULDER_Y, 0]}>
          <mesh position={[0, -ARM_LENGTH / 2, 0]} castShadow>
            <boxGeometry args={[0.075, ARM_LENGTH, 0.075]} />
            <meshStandardMaterial color={TUNIC_COLOR} flatShading />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.18, SHOULDER_Y, 0]}>
          <mesh position={[0, -ARM_LENGTH / 2, 0]} castShadow>
            <boxGeometry args={[0.075, ARM_LENGTH, 0.075]} />
            <meshStandardMaterial color={TUNIC_COLOR} flatShading />
          </mesh>
        </group>
      </group>

      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[0.4, 0.5, 20]} />
          <meshBasicMaterial color="#4fd1c5" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
