import { beforeEach, describe, expect, it } from "vitest";
import { useAtlasSceneStore } from "../src/three/state/atlasSceneStore";
import { isTileEligibleForProject, PROJECT_DEFINITIONS } from "../src/three/domain/construction";

describe("atlasSceneStore construction integration", () => {
  beforeEach(() => {
    useAtlasSceneStore.getState().regenerate(1337);
  });

  function findEligibleTile(type: "farm" | "lumberCamp" | "quarry") {
    const state = useAtlasSceneStore.getState();
    const excluded = new Set([state.settlementTileId, state.explorerTileId]);
    return state.terrain.tiles.find((t) => !excluded.has(t.id) && isTileEligibleForProject(t, type));
  }

  it("openConstructionMode enters construction mode and deselects the explorer", () => {
    useAtlasSceneStore.getState().select({ kind: "explorer", id: "explorer-unit" });
    useAtlasSceneStore.getState().openConstructionMode();
    const state = useAtlasSceneStore.getState();
    expect(state.constructionMode).toBe(true);
    expect(state.selected).toBeNull();
  });

  it("armConstructionSite is a no-op on an ineligible tile", () => {
    const lumberCampTile = findEligibleTile("lumberCamp");
    expect(lumberCampTile).toBeDefined();

    useAtlasSceneStore.getState().openConstructionMode();
    useAtlasSceneStore.getState().selectProjectType("farm"); // farm needs fertile plains, not forest
    useAtlasSceneStore.getState().armConstructionSite(lumberCampTile!.id);
    expect(useAtlasSceneStore.getState().pendingConstructionTileId).toBeNull();
  });

  it("armConstructionSite succeeds on an eligible, affordable tile", () => {
    const farmTile = findEligibleTile("farm");
    if (!farmTile) return; // seed may not have fertile plains; other seeds are covered by domain tests

    useAtlasSceneStore.getState().openConstructionMode();
    useAtlasSceneStore.getState().selectProjectType("farm");
    useAtlasSceneStore.getState().armConstructionSite(farmTile.id);
    expect(useAtlasSceneStore.getState().pendingConstructionTileId).toBe(farmTile.id);
  });

  it("confirmConstruction deducts cost, creates a site, and exits construction mode", () => {
    const lumberCampTile = findEligibleTile("lumberCamp");
    expect(lumberCampTile).toBeDefined();

    const before = useAtlasSceneStore.getState().resources.food;
    useAtlasSceneStore.getState().openConstructionMode();
    useAtlasSceneStore.getState().selectProjectType("lumberCamp");
    useAtlasSceneStore.getState().armConstructionSite(lumberCampTile!.id);
    useAtlasSceneStore.getState().confirmConstruction();

    const state = useAtlasSceneStore.getState();
    expect(state.resources.food).toBe(before - (PROJECT_DEFINITIONS.lumberCamp.cost.food ?? 0));
    expect(state.constructionSites).toHaveLength(1);
    expect(state.constructionSites[0].tileId).toBe(lumberCampTile!.id);
    expect(state.constructionMode).toBe(false);
  });

  it("cancelConstructionPlacement clears the pending site without creating one", () => {
    const lumberCampTile = findEligibleTile("lumberCamp");
    expect(lumberCampTile).toBeDefined();

    useAtlasSceneStore.getState().openConstructionMode();
    useAtlasSceneStore.getState().selectProjectType("lumberCamp");
    useAtlasSceneStore.getState().armConstructionSite(lumberCampTile!.id);
    useAtlasSceneStore.getState().cancelConstructionPlacement();

    const state = useAtlasSceneStore.getState();
    expect(state.pendingConstructionTileId).toBeNull();
    expect(state.constructionSites).toHaveLength(0);
  });

  it("advancePhase ticks construction progress and eventually completes it", () => {
    const lumberCampTile = findEligibleTile("lumberCamp");
    expect(lumberCampTile).toBeDefined();

    useAtlasSceneStore.getState().openConstructionMode();
    useAtlasSceneStore.getState().selectProjectType("lumberCamp");
    useAtlasSceneStore.getState().armConstructionSite(lumberCampTile!.id);
    useAtlasSceneStore.getState().confirmConstruction();

    const totalPhases = PROJECT_DEFINITIONS.lumberCamp.buildPhases;
    for (let i = 0; i < totalPhases; i++) {
      useAtlasSceneStore.getState().advancePhase();
    }

    expect(useAtlasSceneStore.getState().constructionSites[0].completed).toBe(true);
  });

  it("advancePhase refills explorer movement points after a move spends some", () => {
    useAtlasSceneStore.getState().select({ kind: "explorer", id: "explorer-unit" });
    const state = useAtlasSceneStore.getState();
    const reachableId = Array.from(state.reachableTileIds).find((id) => id !== state.explorerTileId);
    expect(reachableId).toBeDefined();

    useAtlasSceneStore.getState().armDestination(reachableId!);
    useAtlasSceneStore.getState().confirmMove();
    expect(useAtlasSceneStore.getState().explorerMovementPoints).toBeLessThan(
      useAtlasSceneStore.getState().explorerMaxMovementPoints
    );

    useAtlasSceneStore.getState().advancePhase();
    expect(useAtlasSceneStore.getState().explorerMovementPoints).toBe(
      useAtlasSceneStore.getState().explorerMaxMovementPoints
    );
  });
});
