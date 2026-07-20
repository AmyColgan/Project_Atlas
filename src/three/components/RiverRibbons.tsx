import { useMemo } from "react";
import { TerrainField } from "../types";
import { buildRiverMeshes } from "../rendering/riverMesh";
import { WaterMaterial } from "./WaterMaterial";
import { BIOME_COLORS } from "./biomeColors";

interface RiverRibbonsProps {
  terrain: TerrainField;
}

export function RiverRibbons({ terrain }: RiverRibbonsProps) {
  const geometries = useMemo(() => buildRiverMeshes(terrain), [terrain]);

  return (
    <>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry} raycast={() => null}>
          <WaterMaterial color={BIOME_COLORS.water} opacity={0.85} />
        </mesh>
      ))}
    </>
  );
}
