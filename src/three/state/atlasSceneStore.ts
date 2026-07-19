import { create } from "zustand";
import { AxialCoord } from "../../utils/hex";
import { DEFAULT_TERRAIN_CONFIG, generateTerrainField } from "../generation/terrainGenerator";
import { pickExplorerTile, pickSettlementTile } from "../generation/placement";
import { SelectableRef, TerrainField, TerrainTileData } from "../types";
import { buildTerrainIndex, TerrainIndex } from "../domain/hexIndex";
import { findPath, findReachableTiles } from "../domain/pathfinding";
import { computeVisibleTileIds } from "../domain/visibility";
import { Discovery, generateDiscoveries } from "../domain/discovery";
import { ChronicleEntry, createChronicleEntry } from "../domain/chronicle";
import { TRAVEL_STEP_DURATION_MS } from "../domain/travelAnimation";

const EXPLORER_MAX_MOVEMENT_POINTS = 6;

export type PreviewBlockedReason = "impassable" | "too-far" | null;

export interface TravelState {
  /** Remaining hex steps to walk, excluding the tile already stood on. */
  path: AxialCoord[];
  totalSteps: number;
  /** Index into `path` of the tile currently being walked toward. */
  currentStepIndex: number;
  stepStartedAtMs: number;
  paused: boolean;
}

/**
 * Prototype-local scene state: terrain data, explorer movement/pathfinding,
 * fog of war, discoveries, and the chronicle log. Deliberately not connected
 * to `useSimulationStore` — this is a rendering + domain-logic foundation,
 * not integrated with the main game's save/turn systems yet (see the
 * `save-ready fields` note at the bottom of this file).
 *
 * All pathfinding/visibility/discovery *rules* live in ../domain/*.ts as pure
 * functions with no Three.js dependency. This store only holds data and
 * orchestrates when those rules run — it never stores a Three.js object.
 */
export interface AtlasSceneState {
  seed: number;
  terrain: TerrainField;
  terrainIndex: TerrainIndex;

  settlementTileId: string;
  explorerTileId: string;
  explorerMovementPoints: number;
  explorerMaxMovementPoints: number;

  hovered: SelectableRef | null;
  selected: SelectableRef | null;

  hoveredDestinationTileId: string | null;
  pendingDestinationTileId: string | null;
  previewPath: AxialCoord[] | null;
  previewCost: number | null;
  previewReachable: boolean;
  previewBlockedReason: PreviewBlockedReason;
  reachableTileIds: Set<string>;

  travel: TravelState | null;

  exploredTileIds: Set<string>;
  visibleTileIds: Set<string>;

  discoveries: Discovery[];
  activeDiscoveryId: string | null;

  chronicle: ChronicleEntry[];
  chronicleSequence: number;
  chronicleOpen: boolean;

  setHovered: (ref: SelectableRef | null) => void;
  select: (ref: SelectableRef | null) => void;
  regenerate: (seed: number) => void;
  getTile: (id: string) => TerrainTileData | undefined;

  hoverDestination: (tileId: string | null) => void;
  armDestination: (tileId: string) => void;
  cancelDestination: () => void;
  confirmMove: () => void;
  tick: (nowMs: number) => void;
  resumeAfterDiscovery: (nowMs: number) => void;
  refreshMovementPoints: () => void;
  refreshReachable: () => void;
  checkForNewDiscoveries: () => void;

  toggleChronicle: () => void;
  closeChronicle: () => void;
}

interface PreviewResult {
  path: AxialCoord[] | null;
  cost: number | null;
  reachable: boolean;
  blockedReason: PreviewBlockedReason;
}

function computePreview(
  index: TerrainIndex,
  fromCoord: AxialCoord,
  toCoord: AxialCoord,
  movementPoints: number
): PreviewResult {
  const result = findPath(index, fromCoord, toCoord);
  if (!result) return { path: null, cost: null, reachable: false, blockedReason: "impassable" };
  const reachable = result.cost <= movementPoints;
  return { path: result.path, cost: result.cost, reachable, blockedReason: reachable ? null : "too-far" };
}

function emptyPreview(): PreviewResult {
  return { path: null, cost: null, reachable: false, blockedReason: null };
}

function recomputeVisibility(
  tiles: TerrainTileData[],
  settlementTileId: string,
  explorerTileId: string,
  previouslyExplored: ReadonlySet<string>
): { visible: Set<string>; explored: Set<string> } {
  const settlement = tiles.find((t) => t.id === settlementTileId);
  const explorer = tiles.find((t) => t.id === explorerTileId);
  const centers = [settlement, explorer].filter((t): t is TerrainTileData => !!t).map((t) => t.coord);
  const visible = computeVisibleTileIds(tiles, centers);

  const explored = new Set(previouslyExplored);
  for (const id of visible) explored.add(id);

  return { visible, explored };
}

function buildWorld(seed: number) {
  const terrain = generateTerrainField(seed, DEFAULT_TERRAIN_CONFIG);
  const terrainIndex = buildTerrainIndex(terrain.tiles);
  const settlement = pickSettlementTile(terrain.tiles);
  const explorer = pickExplorerTile(terrain.tiles, settlement);
  const discoveries = generateDiscoveries(seed, terrain.tiles, new Set([settlement.id, explorer.id]));
  const { visible, explored } = recomputeVisibility(terrain.tiles, settlement.id, explorer.id, new Set());

  return {
    terrain,
    terrainIndex,
    settlementTileId: settlement.id,
    explorerTileId: explorer.id,
    discoveries,
    visibleTileIds: visible,
    exploredTileIds: explored,
  };
}

const initialSeed = 1337;
const initialWorld = buildWorld(initialSeed);

function clearMovementUI() {
  return {
    hoveredDestinationTileId: null,
    pendingDestinationTileId: null,
    previewPath: null,
    previewCost: null,
    previewReachable: false,
    previewBlockedReason: null as PreviewBlockedReason,
  };
}

export const useAtlasSceneStore = create<AtlasSceneState>((set, get) => ({
  seed: initialSeed,
  terrain: initialWorld.terrain,
  terrainIndex: initialWorld.terrainIndex,
  settlementTileId: initialWorld.settlementTileId,
  explorerTileId: initialWorld.explorerTileId,
  explorerMovementPoints: EXPLORER_MAX_MOVEMENT_POINTS,
  explorerMaxMovementPoints: EXPLORER_MAX_MOVEMENT_POINTS,

  hovered: null,
  selected: null,

  ...clearMovementUI(),
  reachableTileIds: new Set(),

  travel: null,

  exploredTileIds: initialWorld.exploredTileIds,
  visibleTileIds: initialWorld.visibleTileIds,

  discoveries: initialWorld.discoveries,
  activeDiscoveryId: null,

  chronicle: [],
  chronicleSequence: 0,
  chronicleOpen: false,

  setHovered: (ref) => set({ hovered: ref }),

  select: (ref) => {
    const state = get();
    if (ref?.kind === "explorer") {
      const explorerTile = state.terrain.tiles.find((t) => t.id === state.explorerTileId);
      const reachable = explorerTile
        ? findReachableTiles(state.terrainIndex, explorerTile.coord, state.explorerMovementPoints)
        : new Map();
      set({ selected: ref, reachableTileIds: new Set(reachable.keys()), ...clearMovementUI() });
    } else {
      set({ selected: ref, reachableTileIds: new Set(), ...clearMovementUI() });
    }
  },

  regenerate: (seed) => {
    const world = buildWorld(seed);
    set({
      seed,
      ...world,
      hovered: null,
      selected: null,
      ...clearMovementUI(),
      reachableTileIds: new Set(),
      travel: null,
      activeDiscoveryId: null,
      chronicle: [],
      chronicleSequence: 0,
      chronicleOpen: false,
      explorerMovementPoints: EXPLORER_MAX_MOVEMENT_POINTS,
      explorerMaxMovementPoints: EXPLORER_MAX_MOVEMENT_POINTS,
    });
    get().checkForNewDiscoveries();
  },

  getTile: (id) => get().terrain.tiles.find((t) => t.id === id),

  hoverDestination: (tileId) => {
    const state = get();
    if (state.selected?.kind !== "explorer" || state.travel || state.pendingDestinationTileId) {
      set({ hoveredDestinationTileId: tileId });
      return;
    }
    if (tileId === null || tileId === state.explorerTileId) {
      set({ hoveredDestinationTileId: tileId, ...emptyPreview() });
      return;
    }

    const explorerTile = state.terrain.tiles.find((t) => t.id === state.explorerTileId);
    const destTile = state.terrain.tiles.find((t) => t.id === tileId);
    if (!explorerTile || !destTile) return;

    const preview = computePreview(state.terrainIndex, explorerTile.coord, destTile.coord, state.explorerMovementPoints);
    set({ hoveredDestinationTileId: tileId, ...preview });
  },

  armDestination: (tileId) => {
    const state = get();
    if (state.selected?.kind !== "explorer" || state.travel) return;
    if (tileId === state.explorerTileId) return;
    if (!state.reachableTileIds.has(tileId)) return;

    const explorerTile = state.terrain.tiles.find((t) => t.id === state.explorerTileId);
    const destTile = state.terrain.tiles.find((t) => t.id === tileId);
    if (!explorerTile || !destTile) return;

    const preview = computePreview(state.terrainIndex, explorerTile.coord, destTile.coord, state.explorerMovementPoints);
    if (!preview.reachable) return;

    set({ hoveredDestinationTileId: tileId, pendingDestinationTileId: tileId, ...preview });
  },

  cancelDestination: () => set({ ...clearMovementUI() }),

  confirmMove: () => {
    const state = get();
    if (!state.pendingDestinationTileId || !state.previewPath || !state.previewReachable || state.travel) return;

    const explorerTile = state.terrain.tiles.find((t) => t.id === state.explorerTileId);
    const destTile = state.terrain.tiles.find((t) => t.id === state.pendingDestinationTileId);
    const cost = state.previewCost ?? 0;
    const sequence = state.chronicleSequence + 1;

    const entry = createChronicleEntry({
      sequence,
      kind: "departure",
      summary: destTile
        ? `The explorer set out toward (${destTile.coord.q}, ${destTile.coord.r}).`
        : "The explorer set out.",
      location: explorerTile ? { q: explorerTile.coord.q, r: explorerTile.coord.r } : null,
    });

    set({
      explorerMovementPoints: Math.max(0, state.explorerMovementPoints - cost),
      travel: {
        path: state.previewPath,
        totalSteps: state.previewPath.length,
        currentStepIndex: 0,
        stepStartedAtMs: performance.now(),
        paused: false,
      },
      ...clearMovementUI(),
      reachableTileIds: new Set(),
      chronicle: [...state.chronicle, entry],
      chronicleSequence: sequence,
    });
  },

  tick: (nowMs) => {
    const state = get();
    const travel = state.travel;
    if (!travel || travel.paused) return;

    const elapsed = nowMs - travel.stepStartedAtMs;
    if (elapsed < TRAVEL_STEP_DURATION_MS) return;

    const nextCoord = travel.path[travel.currentStepIndex];
    const nextTile = state.terrain.tiles.find((t) => t.coord.q === nextCoord.q && t.coord.r === nextCoord.r);
    if (!nextTile) {
      set({ travel: null });
      return;
    }

    const isFinalStep = travel.currentStepIndex >= travel.totalSteps - 1;
    const { visible, explored } = recomputeVisibility(
      state.terrain.tiles,
      state.settlementTileId,
      nextTile.id,
      state.exploredTileIds
    );

    set({
      explorerTileId: nextTile.id,
      visibleTileIds: visible,
      exploredTileIds: explored,
      travel: isFinalStep ? null : { ...travel, currentStepIndex: travel.currentStepIndex + 1, stepStartedAtMs: nowMs },
    });

    get().checkForNewDiscoveries();
    if (get().selected?.kind === "explorer") get().refreshReachable();
  },

  resumeAfterDiscovery: (nowMs) => {
    set((s) => ({
      activeDiscoveryId: null,
      travel: s.travel ? { ...s.travel, paused: false, stepStartedAtMs: nowMs } : null,
    }));
    get().checkForNewDiscoveries();
  },

  refreshMovementPoints: () => {
    set((s) => ({ explorerMovementPoints: s.explorerMaxMovementPoints }));
    get().refreshReachable();
  },

  refreshReachable: () => {
    const state = get();
    if (state.selected?.kind !== "explorer") return;
    const explorerTile = state.terrain.tiles.find((t) => t.id === state.explorerTileId);
    if (!explorerTile) return;
    const reachable = findReachableTiles(state.terrainIndex, explorerTile.coord, state.explorerMovementPoints);
    set({ reachableTileIds: new Set(reachable.keys()) });
  },

  checkForNewDiscoveries: () => {
    const state = get();
    if (state.activeDiscoveryId) return;

    const found = state.discoveries.find((d) => !d.completed && state.visibleTileIds.has(d.tileId));
    if (!found) return;

    const rewardPoints = found.reward.kind === "movement-cache" ? found.reward.movementPointsGranted ?? 0 : 0;
    const updatedDiscoveries = state.discoveries.map((d) => (d.id === found.id ? { ...d, completed: true } : d));
    const sequence = state.chronicleSequence + 1;
    const discoveryTile = state.terrain.tiles.find((t) => t.id === found.tileId);

    const entry = createChronicleEntry({
      sequence,
      kind: "discovery",
      summary: `Discovered ${found.name}.`,
      location: discoveryTile ? { q: discoveryTile.coord.q, r: discoveryTile.coord.r } : null,
      discoveryId: found.id,
      rewardText: found.reward.description,
    });

    set((s) => ({
      discoveries: updatedDiscoveries,
      activeDiscoveryId: found.id,
      chronicle: [...s.chronicle, entry],
      chronicleSequence: sequence,
      explorerMovementPoints: Math.min(s.explorerMaxMovementPoints, s.explorerMovementPoints + rewardPoints),
      travel: s.travel ? { ...s.travel, paused: true } : null,
    }));
  },

  toggleChronicle: () => set((s) => ({ chronicleOpen: !s.chronicleOpen })),
  closeChronicle: () => set({ chronicleOpen: false }),
}));

useAtlasSceneStore.getState().checkForNewDiscoveries();

/**
 * Save-ready state (Phase 6 / Milestone 3D-2):
 * Fields below are shaped so a future save/load pass can serialize them
 * directly — but none of this is wired into `src/engine/saveSystem.ts` yet.
 *
 *  Ready to serialize as-is (plain data, no Three.js references):
 *   - seed
 *   - explorerTileId, explorerMovementPoints, explorerMaxMovementPoints
 *   - exploredTileIds, visibleTileIds  (Sets — serialize as string[] via Array.from)
 *   - discoveries                       (plain objects already)
 *   - chronicle, chronicleSequence      (plain objects already)
 *
 *  Derived at load time, not saved directly:
 *   - terrain, terrainIndex             (regenerate from `seed` + rebuild the index)
 *   - settlementTileId                  (currently re-derived by pickSettlementTile;
 *                                         would need to become an explicit saved field
 *                                         if the capital ever becomes player-movable)
 *
 *  Intentionally transient / not saved:
 *   - hovered, selected, hoveredDestinationTileId, pendingDestinationTileId,
 *     previewPath, previewCost, previewReachable, previewBlockedReason,
 *     reachableTileIds, travel, activeDiscoveryId, chronicleOpen
 *     (all UI/interaction state, meaningless across a save/reload boundary)
 */
