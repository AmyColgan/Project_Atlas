import { TerrainField } from "../types";
import { Discovery, DiscoveryType } from "../domain/discovery";
import { resolveVisibility } from "../domain/visibility";
import { tileSurfaceHeight } from "./terrainHeight";

interface DiscoveryMarkerProps {
  type: DiscoveryType;
}

function DiscoveryProp({ type }: DiscoveryMarkerProps) {
  switch (type) {
    case "ancient-ruins":
      return (
        <group>
          <mesh position={[-0.25, 0.35, 0]} rotation={[0, 0, 0.05]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.7, 8]} />
            <meshStandardMaterial color="#c9c2b3" roughness={0.95} />
          </mesh>
          <mesh position={[0.22, 0.3, 0.1]} rotation={[0, 0, -0.08]} castShadow>
            <cylinderGeometry args={[0.09, 0.11, 0.6, 8]} />
            <meshStandardMaterial color="#b8b1a2" roughness={0.95} />
          </mesh>
          <mesh position={[0.05, 0.08, -0.3]} rotation={[0, 0.4, 1.45]} castShadow>
            <cylinderGeometry args={[0.09, 0.1, 0.55, 8]} />
            <meshStandardMaterial color="#a89f8f" roughness={0.95} />
          </mesh>
        </group>
      );
    case "natural-landmark":
      return (
        <group>
          <mesh position={[0, 0.5, 0]} rotation={[0.1, 0.3, 0]} castShadow>
            <icosahedronGeometry args={[0.45, 0]} />
            <meshStandardMaterial color="#8f7ab8" roughness={0.7} flatShading />
          </mesh>
          <mesh position={[0.3, 0.2, 0.2]} rotation={[0.2, 0.6, 0.1]} castShadow>
            <icosahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color="#a591cf" roughness={0.7} flatShading />
          </mesh>
        </group>
      );
    case "abandoned-camp":
      return (
        <group>
          <mesh position={[-0.2, 0.28, 0]} castShadow>
            <coneGeometry args={[0.32, 0.55, 6]} />
            <meshStandardMaterial color="#8a6a4c" roughness={0.9} />
          </mesh>
          <mesh position={[0.3, 0.06, 0.15]}>
            <cylinderGeometry args={[0.16, 0.16, 0.12, 8]} />
            <meshStandardMaterial color="#3a3a3a" roughness={1} />
          </mesh>
          <mesh position={[0.3, 0.16, 0.15]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial color="#ff8c3c" emissive="#ff8c3c" emissiveIntensity={0.9} />
          </mesh>
        </group>
      );
    case "resource-deposit":
    default:
      return (
        <group>
          <mesh position={[0, 0.22, 0]} rotation={[0.2, 0.4, 0]} castShadow>
            <octahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color="#5cc8e0" emissive="#5cc8e0" emissiveIntensity={0.5} flatShading />
          </mesh>
          <mesh position={[0.25, 0.12, 0.18]} rotation={[0.4, 0.1, 0.2]} castShadow>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color="#79d6e8" emissive="#79d6e8" emissiveIntensity={0.5} flatShading />
          </mesh>
        </group>
      );
  }
}

interface DiscoveryMarkersProps {
  terrain: TerrainField;
  discoveries: Discovery[];
  visibleTileIds: ReadonlySet<string>;
  exploredTileIds: ReadonlySet<string>;
}

/** 3D props for each discovered landmark. Hidden entirely while its tile is unexplored. */
export function DiscoveryMarkers({ terrain, discoveries, visibleTileIds, exploredTileIds }: DiscoveryMarkersProps) {
  return (
    <group>
      {discoveries.map((discovery) => {
        const visibility = resolveVisibility(discovery.tileId, visibleTileIds, exploredTileIds);
        if (visibility === "unexplored") return null;

        const tile = terrain.tiles.find((t) => t.id === discovery.tileId);
        if (!tile) return null;

        return (
          <group key={discovery.id} position={[tile.worldX, tileSurfaceHeight(tile, terrain.maxElevation), tile.worldZ]}>
            <DiscoveryProp type={discovery.type} />
          </group>
        );
      })}
    </group>
  );
}
