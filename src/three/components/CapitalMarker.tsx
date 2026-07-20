import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { TerrainField } from "../types";
import { tileSurfaceHeight } from "./terrainHeight";
import { useAtlasSceneStore } from "../state/atlasSceneStore";

const MARKER_ID = "capital-settlement";

interface BuildingSpec {
  x: number;
  z: number;
  rotationY: number;
  width: number;
  depth: number;
  wallHeight: number;
  roofHeight: number;
  wallColor: string;
  roofColor: string;
}

const BUILDINGS: BuildingSpec[] = [
  { x: 0, z: 0.15, rotationY: 0, width: 0.85, depth: 0.85, wallHeight: 0.42, roofHeight: 0.42, wallColor: "#d8c39a", roofColor: "#a13d2b" },
  { x: -0.95, z: -0.25, rotationY: 0.3, width: 0.55, depth: 0.5, wallHeight: 0.3, roofHeight: 0.26, wallColor: "#c9b183", roofColor: "#7a6a4a" },
  { x: 0.85, z: 0.35, rotationY: -0.4, width: 0.45, depth: 0.45, wallHeight: 0.26, roofHeight: 0.22, wallColor: "#cbb896", roofColor: "#8a4a36" },
  { x: 0.5, z: -0.75, rotationY: 0.5, width: 0.4, depth: 0.4, wallHeight: 0.24, roofHeight: 0.2, wallColor: "#c3ac86", roofColor: "#7a6a4a" },
  { x: -0.55, z: 0.75, rotationY: -0.25, width: 0.42, depth: 0.42, wallHeight: 0.25, roofHeight: 0.21, wallColor: "#d8c39a", roofColor: "#8a4a36" },
];

const ROADS: { x: number; z: number; rotationY: number; length: number }[] = [
  { x: -0.48, z: -0.05, rotationY: 0.3, length: 0.9 },
  { x: 0.43, z: 0.25, rotationY: -0.4, length: 0.75 },
  { x: 0.25, z: -0.3, rotationY: 0.5, length: 0.75 },
  { x: -0.28, z: 0.45, rotationY: -0.25, length: 0.75 },
];

function Building({ spec, glow }: { spec: BuildingSpec; glow: number }) {
  return (
    <group position={[spec.x, 0, spec.z]} rotation={[0, spec.rotationY, 0]}>
      <mesh position={[0, spec.wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.width, spec.wallHeight, spec.depth]} />
        <meshStandardMaterial color={spec.wallColor} emissive="#ffcf5c" emissiveIntensity={glow} flatShading />
      </mesh>
      <mesh position={[0, spec.wallHeight + spec.roofHeight / 2, 0]} castShadow rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[spec.width * 0.72, spec.roofHeight, 4]} />
        <meshStandardMaterial color={spec.roofColor} emissive="#ffcf5c" emissiveIntensity={glow} flatShading />
      </mesh>
    </group>
  );
}

function RoadStrip({ x, z, rotationY, length }: { x: number; z: number; rotationY: number; length: number }) {
  return (
    <mesh position={[x, 0.015, z]} rotation={[-Math.PI / 2, 0, rotationY]} receiveShadow raycast={() => null}>
      <planeGeometry args={[0.22, length]} />
      <meshStandardMaterial color="#6b5d47" roughness={1} />
    </mesh>
  );
}

function Torch({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
        <meshStandardMaterial color="#4a3a28" />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ff8c3c" emissive="#ff8c3c" emissiveIntensity={1.2} />
      </mesh>
      <pointLight position={[0, 0.55, 0]} color="#ffab5c" intensity={0.6} distance={2.2} decay={2} />
    </group>
  );
}

function Cart({ x, z, rotationY }: { x: number; z: number; rotationY: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[0.36, 0.16, 0.22]} />
        <meshStandardMaterial color="#6b5030" flatShading />
      </mesh>
      <mesh position={[-0.13, 0.08, 0.13]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 10]} />
        <meshStandardMaterial color="#3a2c1c" />
      </mesh>
      <mesh position={[0.13, 0.08, 0.13]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 10]} />
        <meshStandardMaterial color="#3a2c1c" />
      </mesh>
    </group>
  );
}

function Banner({ x, z }: { x: number; z: number }) {
  const flagRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.25;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.7, 6]} />
        <meshStandardMaterial color="#4a3a28" />
      </mesh>
      <mesh ref={flagRef} position={[0.14, 0.55, 0]} castShadow>
        <planeGeometry args={[0.26, 0.18]} />
        <meshStandardMaterial color="#c65b3c" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

interface CapitalMarkerProps {
  terrain: TerrainField;
  tileId: string;
  visible: boolean;
}

/**
 * A small settlement cluster — several buildings, roads, and a couple of
 * lived-in props — rather than one placeholder box+cone. No dozens of
 * citizens yet, but it reads as a place, not a marker.
 */
export function CapitalMarker({ terrain, tileId, visible }: CapitalMarkerProps) {
  const tile = terrain.tiles.find((t) => t.id === tileId);
  const hovered = useAtlasSceneStore((s) => s.hovered?.kind === "capital" && s.hovered.id === MARKER_ID);
  const selected = useAtlasSceneStore((s) => s.selected?.kind === "capital" && s.selected.id === MARKER_ID);
  const setHovered = useAtlasSceneStore((s) => s.setHovered);
  const select = useAtlasSceneStore((s) => s.select);
  const requestCameraFocus = useAtlasSceneStore((s) => s.requestCameraFocus);

  // Fog of war: unexplored terrain must not expose settlements.
  if (!tile || !visible) return null;

  const baseY = tileSurfaceHeight(tile, terrain.maxElevation);
  const glow = selected ? 0.5 : hovered ? 0.22 : 0;

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
  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    requestCameraFocus("capital");
  };

  return (
    <group
      position={[tile.worldX, baseY, tile.worldZ]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {ROADS.map((road, i) => (
        <RoadStrip key={i} {...road} />
      ))}
      {BUILDINGS.map((spec, i) => (
        <Building key={i} spec={spec} glow={glow} />
      ))}
      <Torch x={0.42} z={0.05} />
      <Torch x={-0.42} z={0.35} />
      <Cart x={-0.75} z={-0.55} rotationY={0.4} />
      <Banner x={0.1} z={0.55} />
    </group>
  );
}
