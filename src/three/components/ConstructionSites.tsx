import { TerrainField } from "../types";
import { ConstructionSite, ProjectType } from "../domain/construction";
import { tileSurfaceHeight } from "./terrainHeight";

const FINISHED_COLORS: Record<ProjectType, { wall: string; roof: string }> = {
  farm: { wall: "#c9b183", roof: "#8fae4f" },
  lumberCamp: { wall: "#8a6a4c", roof: "#5b4330" },
  quarry: { wall: "#9a9a94", roof: "#6b6b64" },
};

function InProgressMarker({ progress }: { progress: number }) {
  return (
    <group>
      <mesh position={[0, 0.14, 0]} castShadow>
        <boxGeometry args={[0.4, 0.28, 0.4]} />
        <meshStandardMaterial color="#c9a35c" transparent opacity={0.6} flatShading />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.3, 0.24, 4]} />
        <meshStandardMaterial color="#8a6a3c" transparent opacity={0.7} flatShading />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[0.42, 0.5, 24, 1, 0, Math.PI * 2 * Math.max(0.02, progress)]} />
        <meshBasicMaterial color="#ffcf5c" transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </group>
  );
}

function FinishedBuilding({ type }: { type: ProjectType }) {
  const colors = FINISHED_COLORS[type];
  return (
    <group>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.36, 0.5]} />
        <meshStandardMaterial color={colors.wall} flatShading />
      </mesh>
      <mesh position={[0, 0.44, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.42, 0.28, 4]} />
        <meshStandardMaterial color={colors.roof} flatShading />
      </mesh>
    </group>
  );
}

interface ConstructionSitesProps {
  terrain: TerrainField;
  sites: ConstructionSite[];
}

/** Placement-preview ghosts render separately (see ConstructionPlacementPreview); this renders committed sites only. */
export function ConstructionSites({ terrain, sites }: ConstructionSitesProps) {
  return (
    <group>
      {sites.map((site) => {
        const tile = terrain.tiles.find((t) => t.id === site.tileId);
        if (!tile) return null;
        const y = tileSurfaceHeight(tile, terrain.maxElevation);
        const progress = (site.totalPhases - site.phasesRemaining) / site.totalPhases;

        return (
          <group key={site.id} position={[tile.worldX, y, tile.worldZ]}>
            {site.completed ? <FinishedBuilding type={site.type} /> : <InProgressMarker progress={progress} />}
          </group>
        );
      })}
    </group>
  );
}
