import { useMemo } from "react";
import { TerrainField } from "../types";
import { buildLakeMeshes } from "../rendering/lakeMesh";
import { WaterMaterial } from "./WaterMaterial";
import { BIOME_COLORS } from "./biomeColors";

interface LakeSurfacesProps {
  terrain: TerrainField;
}

export function LakeSurfaces({ terrain }: LakeSurfacesProps) {
  const lakes = useMemo(() => buildLakeMeshes(terrain), [terrain]);

  return (
    <>
      {lakes.map((lake) => (
        <mesh key={lake.lakeId} geometry={lake.geometry} raycast={() => null}>
          <WaterMaterial color={BIOME_COLORS.water} opacity={0.85} />
        </mesh>
      ))}
    </>
  );
}
