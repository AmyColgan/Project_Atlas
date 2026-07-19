import { create } from "zustand";
import { DEFAULT_TERRAIN_CONFIG, generateTerrainField } from "../generation/terrainGenerator";
import { pickExplorerTile, pickSettlementTile } from "../generation/placement";
import { SelectableRef, TerrainField, TerrainTileData } from "../types";

/**
 * Prototype-local scene state: terrain data, camera-independent selection,
 * and marker placement. Deliberately not connected to `useSimulationStore` —
 * this is a rendering foundation, not a gameplay system yet.
 */
export interface AtlasSceneState {
  seed: number;
  terrain: TerrainField;
  settlementTileId: string;
  explorerTileId: string;
  hovered: SelectableRef | null;
  selected: SelectableRef | null;
  setHovered: (ref: SelectableRef | null) => void;
  select: (ref: SelectableRef | null) => void;
  regenerate: (seed: number) => void;
  getTile: (id: string) => TerrainTileData | undefined;
}

function buildWorld(seed: number) {
  const terrain = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
  const settlement = pickSettlementTile(terrain.tiles);
  const explorer = pickExplorerTile(terrain.tiles, settlement);
  return { terrain, settlementTileId: settlement.id, explorerTileId: explorer.id };
}

const initialSeed = 1337;
const initialWorld = buildWorld(initialSeed);

export const useAtlasSceneStore = create<AtlasSceneState>((set, get) => ({
  seed: initialSeed,
  terrain: initialWorld.terrain,
  settlementTileId: initialWorld.settlementTileId,
  explorerTileId: initialWorld.explorerTileId,
  hovered: null,
  selected: null,

  setHovered: (ref) => set({ hovered: ref }),
  select: (ref) => set({ selected: ref }),

  regenerate: (seed) => {
    const world = buildWorld(seed);
    set({ seed, ...world, hovered: null, selected: null });
  },

  getTile: (id) => get().terrain.tiles.find((t) => t.id === id),
}));
