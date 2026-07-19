import { beforeEach, describe, expect, it } from "vitest";
import { useAtlasSceneStore } from "../src/three/state/atlasSceneStore";

const EXPLORER_REF = { kind: "explorer" as const, id: "explorer-unit" };

/**
 * These exercise the zustand store directly (selection, hover/arm/confirm
 * movement) rather than the pure domain functions in isolation. Two real
 * bugs slipped through Milestone 3D-2's pure pathfinding/fog unit tests
 * specifically because they were store-wiring mistakes, not domain-logic
 * mistakes: a preview-object field-name mismatch (`cost` vs `previewCost`)
 * that TypeScript's excess-property checking doesn't catch across a spread,
 * and reachableTileIds being keyed by hex-key string ("8,6") while every
 * consumer checked against TerrainTileData.id ("tile-8-6"). Both silently
 * compiled and passed every domain-level test; only exercising the store's
 * public surface end-to-end catches them.
 */
describe("atlasSceneStore movement integration", () => {
  beforeEach(() => {
    useAtlasSceneStore.getState().regenerate(1337);
  });

  it("selecting the explorer computes a reachable set keyed by real tile ids", () => {
    useAtlasSceneStore.getState().select(EXPLORER_REF);
    const state = useAtlasSceneStore.getState();

    expect(state.reachableTileIds.size).toBeGreaterThan(0);
    for (const id of state.reachableTileIds) {
      expect(state.terrain.tiles.some((t) => t.id === id)).toBe(true);
    }
  });

  it("hovering a reachable tile populates a non-null preview", () => {
    useAtlasSceneStore.getState().select(EXPLORER_REF);
    const before = useAtlasSceneStore.getState();
    const destinationId = Array.from(before.reachableTileIds).find((id) => id !== before.explorerTileId);
    expect(destinationId).toBeDefined();

    useAtlasSceneStore.getState().hoverDestination(destinationId!);
    const after = useAtlasSceneStore.getState();

    expect(after.previewCost).not.toBeNull();
    expect(after.previewPath).not.toBeNull();
    expect(after.previewReachable).toBe(true);
    expect(after.previewBlockedReason).toBeNull();
  });

  it("arming a reachable tile sets pendingDestinationTileId, and confirming starts travel", () => {
    useAtlasSceneStore.getState().select(EXPLORER_REF);
    const before = useAtlasSceneStore.getState();
    const destinationId = Array.from(before.reachableTileIds).find((id) => id !== before.explorerTileId);
    expect(destinationId).toBeDefined();

    useAtlasSceneStore.getState().armDestination(destinationId!);
    expect(useAtlasSceneStore.getState().pendingDestinationTileId).toBe(destinationId);

    const pointsBefore = useAtlasSceneStore.getState().explorerMovementPoints;
    useAtlasSceneStore.getState().confirmMove();
    const after = useAtlasSceneStore.getState();

    expect(after.travel).not.toBeNull();
    expect(after.pendingDestinationTileId).toBeNull();
    expect(after.explorerMovementPoints).toBeLessThan(pointsBefore);
  });

  it("armDestination is a no-op for a tile outside the reachable set", () => {
    useAtlasSceneStore.getState().select(EXPLORER_REF);
    useAtlasSceneStore.getState().armDestination("not-a-real-tile-id");
    expect(useAtlasSceneStore.getState().pendingDestinationTileId).toBeNull();
  });

  it("hovering an unreachable-but-real tile reports a blocked reason, not a silent null", () => {
    useAtlasSceneStore.getState().select(EXPLORER_REF);
    const state = useAtlasSceneStore.getState();
    const farTile = state.terrain.tiles
      .filter((t) => t.biome !== "water" && !state.reachableTileIds.has(t.id))
      .sort((a, b) => b.height - a.height)[0];

    if (!farTile) return; // every walkable tile happened to be in range for this seed/budget; nothing to assert.

    useAtlasSceneStore.getState().hoverDestination(farTile.id);
    const after = useAtlasSceneStore.getState();
    expect(after.previewBlockedReason).not.toBeNull();
    expect(after.previewReachable).toBe(false);
  });
});
