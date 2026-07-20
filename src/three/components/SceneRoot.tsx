import { useMemo } from "react";
import { useAtlasSceneStore } from "../state/atlasSceneStore";
import { TerrainTileData } from "../types";
import { resolveVisibility } from "../domain/visibility";
import { tileSurfaceHeight } from "./terrainHeight";
import { SceneLighting } from "./SceneLighting";
import { TerrainSurface } from "./TerrainSurface";
import { FogOverlayMesh } from "./FogOverlayMesh";
import { RiverRibbons } from "./RiverRibbons";
import { LakeSurfaces } from "./LakeSurfaces";
import { Ocean } from "./Ocean";
import { TileHighlights } from "./TileHighlight";
import { CapitalMarker } from "./CapitalMarker";
import { ExplorerUnit } from "./ExplorerUnit";
import { StrategyCameraRig } from "./StrategyCameraRig";
import { MovementRangeHighlights } from "./MovementRangeHighlights";
import { PathPreview } from "./PathPreview";
import { DiscoveryMarkers } from "./DiscoveryMarkers";
import { ExplorerMovementController } from "./ExplorerMovementController";
import { VegetationInstances } from "./VegetationInstances";
import { ConstructionSites } from "./ConstructionSites";
import { ConstructionEligibilityHighlights } from "./ConstructionEligibilityHighlights";

export function SceneRoot() {
  const terrain = useAtlasSceneStore((s) => s.terrain);
  const seed = useAtlasSceneStore((s) => s.seed);
  const settlementTileId = useAtlasSceneStore((s) => s.settlementTileId);
  const explorerTileId = useAtlasSceneStore((s) => s.explorerTileId);
  const hovered = useAtlasSceneStore((s) => s.hovered);
  const selected = useAtlasSceneStore((s) => s.selected);
  const setHovered = useAtlasSceneStore((s) => s.setHovered);
  const select = useAtlasSceneStore((s) => s.select);

  const visibleTileIds = useAtlasSceneStore((s) => s.visibleTileIds);
  const exploredTileIds = useAtlasSceneStore((s) => s.exploredTileIds);
  const discoveries = useAtlasSceneStore((s) => s.discoveries);

  const reachableTileIds = useAtlasSceneStore((s) => s.reachableTileIds);
  const hoveredDestinationTileId = useAtlasSceneStore((s) => s.hoveredDestinationTileId);
  const pendingDestinationTileId = useAtlasSceneStore((s) => s.pendingDestinationTileId);
  const previewPath = useAtlasSceneStore((s) => s.previewPath);
  const previewBlockedReason = useAtlasSceneStore((s) => s.previewBlockedReason);
  const hoverDestination = useAtlasSceneStore((s) => s.hoverDestination);
  const armDestination = useAtlasSceneStore((s) => s.armDestination);
  const travel = useAtlasSceneStore((s) => s.travel);

  const constructionMode = useAtlasSceneStore((s) => s.constructionMode);
  const selectedProjectType = useAtlasSceneStore((s) => s.selectedProjectType);
  const constructionSites = useAtlasSceneStore((s) => s.constructionSites);
  const hoveredConstructionTileId = useAtlasSceneStore((s) => s.hoveredConstructionTileId);
  const pendingConstructionTileId = useAtlasSceneStore((s) => s.pendingConstructionTileId);
  const hoverConstructionTile = useAtlasSceneStore((s) => s.hoverConstructionTile);
  const armConstructionSite = useAtlasSceneStore((s) => s.armConstructionSite);

  const isMovementMode = selected?.kind === "explorer" && !travel;

  const center = useMemo(() => {
    const xs = terrain.tiles.map((t) => t.worldX);
    const zs = terrain.tiles.map((t) => t.worldZ);
    return [
      (Math.max(...xs) + Math.min(...xs)) / 2,
      0,
      (Math.max(...zs) + Math.min(...zs)) / 2,
    ] as [number, number, number];
  }, [terrain]);

  const handleHoverTile = (tile: TerrainTileData) => {
    if (constructionMode) hoverConstructionTile(tile.id);
    else if (isMovementMode) hoverDestination(tile.id);
    else setHovered({ kind: "tile", id: tile.id });
  };

  const handleSelectTile = (tile: TerrainTileData) => {
    if (constructionMode) armConstructionSite(tile.id);
    else if (isMovementMode) armDestination(tile.id);
    else select({ kind: "tile", id: tile.id });
  };

  const hoveredTileId = constructionMode
    ? (hoveredConstructionTileId ?? undefined)
    : !isMovementMode && hovered?.kind === "tile"
      ? hovered.id
      : undefined;
  const selectedTileId = constructionMode ? (pendingConstructionTileId ?? undefined) : selected?.kind === "tile" ? selected.id : undefined;

  const settlementVisible = resolveVisibility(settlementTileId, visibleTileIds, exploredTileIds) !== "unexplored";
  const explorerVisible = resolveVisibility(explorerTileId, visibleTileIds, exploredTileIds) !== "unexplored";

  const activeDestinationTileId = pendingDestinationTileId ?? (isMovementMode ? hoveredDestinationTileId : null);

  const explorerTile = terrain.tiles.find((t) => t.id === explorerTileId);
  const settlementTile = terrain.tiles.find((t) => t.id === settlementTileId);
  const explorerPosition = explorerTile
    ? ([explorerTile.worldX, tileSurfaceHeight(explorerTile, terrain.maxElevation), explorerTile.worldZ] as [number, number, number])
    : null;
  const capitalPosition = settlementTile
    ? ([settlementTile.worldX, tileSurfaceHeight(settlementTile, terrain.maxElevation), settlementTile.worldZ] as [
        number,
        number,
        number
      ])
    : null;

  return (
    <>
      <SceneLighting />
      <TerrainSurface terrain={terrain} onHoverTile={handleHoverTile} onSelectTile={handleSelectTile} />
      <RiverRibbons terrain={terrain} />
      <LakeSurfaces terrain={terrain} />
      <Ocean terrain={terrain} />
      <VegetationInstances terrain={terrain} seed={seed} visibleTileIds={visibleTileIds} exploredTileIds={exploredTileIds} />
      <FogOverlayMesh terrain={terrain} visibleTileIds={visibleTileIds} exploredTileIds={exploredTileIds} />
      <TileHighlights terrain={terrain} hoveredTileId={hoveredTileId} selectedTileId={selectedTileId} />

      {isMovementMode && <MovementRangeHighlights terrain={terrain} reachableTileIds={reachableTileIds} excludeTileId={explorerTileId} />}
      {isMovementMode && (
        <PathPreview
          terrain={terrain}
          path={previewPath}
          destinationTileId={activeDestinationTileId}
          armed={!!pendingDestinationTileId}
          blockedReason={previewBlockedReason}
        />
      )}

      <DiscoveryMarkers
        terrain={terrain}
        discoveries={discoveries}
        visibleTileIds={visibleTileIds}
        exploredTileIds={exploredTileIds}
      />

      {constructionMode && selectedProjectType && (
        <ConstructionEligibilityHighlights
          terrain={terrain}
          projectType={selectedProjectType}
          visibleTileIds={visibleTileIds}
          exploredTileIds={exploredTileIds}
          excludeTileIds={new Set(constructionSites.map((s) => s.tileId))}
        />
      )}
      <ConstructionSites terrain={terrain} sites={constructionSites} />

      <CapitalMarker terrain={terrain} tileId={settlementTileId} visible={settlementVisible} />
      <ExplorerUnit terrain={terrain} tileId={explorerTileId} visible={explorerVisible} />
      <ExplorerMovementController />
      <StrategyCameraRig
        target={center}
        followPosition={explorerPosition}
        focusPositions={{ explorer: explorerPosition, capital: capitalPosition }}
      />
    </>
  );
}
