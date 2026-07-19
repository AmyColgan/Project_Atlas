import { AssetManifestEntry } from "./AssetManager";
import { cityMarkerPlaceholder, terrainPlaceholders } from "./placeholderGenerators";

/**
 * The single source of truth for "asset key -> where it comes from".
 * Milestone 1: every entry is a placeholder. When real art lands in
 * assets/terrain, assets/sprites, etc., change the corresponding entry
 * to { kind: "image", src: "/assets/terrain/plains.png" } — nothing
 * that calls AssetManager.get() needs to change.
 */
export const assetManifest: Record<string, AssetManifestEntry> = {
  ...Object.fromEntries(
    Object.entries(terrainPlaceholders).map(([key, draw]) => [key, { kind: "placeholder", draw } as AssetManifestEntry])
  ),
  "city.marker": { kind: "placeholder", draw: cityMarkerPlaceholder },
};
