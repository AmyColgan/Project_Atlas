import { useMemo } from "react";
import { useAtlasSceneStore } from "../state/atlasSceneStore";
import { TerrainTileData } from "../types";
import { SceneLighting } from "./SceneLighting";
import { TerrainTiles } from "./TerrainTiles";
import { WaterPlane } from "./WaterPlane";
import { TileHighlights } from "./TileHighlight";
import { CapitalMarker } from "./CapitalMarker";
import { ExplorerUnit } from "./ExplorerUnit";
import { StrategyCameraRig } from "./StrategyCameraRig";

export function SceneRoot() {
  const terrain = useAtlasSceneStore((s) => s.terrain);
  const settlementTileId = useAtlasSceneStore((s) => s.settlementTileId);
  const explorerTileId = useAtlasSceneStore((s) => s.explorerTileId);
  const hovered = useAtlasSceneStore((s) => s.hovered);
  const selected = useAtlasSceneStore((s) => s.selected);
  const setHovered = useAtlasSceneStore((s) => s.setHovered);
  const select = useAtlasSceneStore((s) => s.select);

  const center = useMemo(() => {
    const xs = terrain.tiles.map((t) => t.worldX);
    const zs = terrain.tiles.map((t) => t.worldZ);
    return [
      (Math.max(...xs) + Math.min(...xs)) / 2,
      0,
      (Math.max(...zs) + Math.min(...zs)) / 2,
    ] as [number, number, number];
  }, [terrain]);

  const handleHoverTile = (tile: TerrainTileData) => setHovered({ kind: "tile", id: tile.id });
  const handleSelectTile = (tile: TerrainTileData) => select({ kind: "tile", id: tile.id });

  const hoveredTileId = hovered?.kind === "tile" ? hovered.id : undefined;
  const selectedTileId = selected?.kind === "tile" ? selected.id : undefined;

  return (
    <>
      <SceneLighting />
      <TerrainTiles terrain={terrain} onHoverTile={handleHoverTile} onSelectTile={handleSelectTile} />
      <WaterPlane terrain={terrain} />
      <TileHighlights terrain={terrain} hoveredTileId={hoveredTileId} selectedTileId={selectedTileId} />
      <CapitalMarker terrain={terrain} tileId={settlementTileId} />
      <ExplorerUnit terrain={terrain} tileId={explorerTileId} />
      <StrategyCameraRig target={center} />
    </>
  );
}
