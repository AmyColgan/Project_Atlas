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
import { ResourceStock, STARTING_RESOURCES } from "../domain/resources";
import {
  canAffordProject,
  ConstructionSite,
  createConstructionSite,
  isTileEligibleForProject,
  PROJECT_DEFINITIONS,
  ProjectType,
  tickConstructionPhase,
} from "../domain/construction";

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

  cameraFollowExplorer: boolean;
  cameraFocusRequest: CameraFocusRequest | null;

  resources: ResourceStock;
  constructionSites: ConstructionSite[];
  constructionMode: boolean;
  selectedProjectType: ProjectType | null;
  hoveredConstructionTileId: string | null;
  pendingConstructionTileId: string | null;
  phase: number;

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
  advancePhase: () => void;
  refreshReachable: () => void;
  checkForNewDiscoveries: () => void;

  toggleChronicle: () => void;
  closeChronicle: () => void;

  toggleCameraFollow: () => void;
  setCameraFollow: (follow: boolean) => void;
  requestCameraFocus: (target: "explorer" | "capital") => void;
  clearCameraFocus: () => void;

  openConstructionMode: () => void;
  closeConstructionMode: () => void;
  selectProjectType: (type: ProjectType | null) => void;
  hoverConstructionTile: (tileId: string | null) => void;
  armConstructionSite: (tileId: string) => void;
  cancelConstructionPlacement: () => void;
  confirmConstruction: () => void;
}

export interface CameraFocusRequest {
  target: "explorer" | "capital";
  /** Increments per request so a repeat focus on the same target still re-triggers the camera snap. */
  nonce: number;
}

interface PreviewResult {
  previewPath: AxialCoord[] | null;
  previewCost: number | null;
  previewReachable: boolean;
  previewBlockedReason: PreviewBlockedReason;
}

function computePreview(
  index: TerrainIndex,
  fromCoord: AxialCoord,
  toCoord: AxialCoord,
  movementPoints: number
): PreviewResult {
  const result = findPath(index, fromCoord, toCoord);
  if (!result) {
    return { previewPath: null, previewCost: null, previewReachable: false, previewBlockedReason: "impassable" };
  }
  const reachable = result.cost <= movementPoints;
  return {
    previewPath: result.path,
    previewCost: result.cost,
    previewReachable: reachable,
    previewBlockedReason: reachable ? null : "too-far",
  };
}

function emptyPreview(): PreviewResult {
  return { previewPath: null, previewCost: null, previewReachable: false, previewBlockedReason: null };
}

/**
 * findReachableTiles() keys its result by hex coordinate key (e.g. "8,6"),
 * but every consumer (armDestination, MovementRangeHighlights) checks against
 * TerrainTileData.id (e.g. "tile-8-6") — translate here so the two never
 * silently fail to match.
 */
function reachableTileIdsFrom(reachable: Map<string, { coord: AxialCoord }>, index: TerrainIndex): Set<string> {
  const ids = new Set<string>();
  for (const key of reachable.keys()) {
    const id = index.get(key)?.id;
    if (id) ids.add(id);
  }
  return ids;
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

function clearConstructionUI() {
  return {
    constructionMode: false,
    selectedProjectType: null as ProjectType | null,
    hoveredConstructionTileId: null,
    pendingConstructionTileId: null,
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

  cameraFollowExplorer: false,
  cameraFocusRequest: null,

  resources: { ...STARTING_RESOURCES },
  constructionSites: [],
  ...clearConstructionUI(),
  phase: 1,

  setHovered: (ref) => set({ hovered: ref }),

  select: (ref) => {
    const state = get();
    if (ref?.kind === "explorer") {
      const explorerTile = state.terrain.tiles.find((t) => t.id === state.explorerTileId);
      const reachable = explorerTile
        ? findReachableTiles(state.terrainIndex, explorerTile.coord, state.explorerMovementPoints)
        : new Map();
      set({ selected: ref, reachableTileIds: reachableTileIdsFrom(reachable, state.terrainIndex), ...clearMovementUI() });
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
      cameraFollowExplorer: false,
      cameraFocusRequest: null,
      resources: { ...STARTING_RESOURCES },
      constructionSites: [],
      ...clearConstructionUI(),
      phase: 1,
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
    if (!preview.previewReachable) return;

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

  advancePhase: () => {
    const state = get();
    const { sites, stock, justCompleted } = tickConstructionPhase(state.constructionSites, state.resources);

    let chronicle = state.chronicle;
    let sequence = state.chronicleSequence;
    for (const site of justCompleted) {
      const def = PROJECT_DEFINITIONS[site.type];
      const siteTile = state.terrain.tiles.find((t) => t.id === site.tileId);
      sequence += 1;
      chronicle = [
        ...chronicle,
        createChronicleEntry({
          sequence,
          kind: "construction",
          summary: `${def.name} construction complete.`,
          location: siteTile ? { q: siteTile.coord.q, r: siteTile.coord.r } : null,
          rewardText: `Now producing ${def.productionPerPhase} ${def.producesResource} per phase.`,
        }),
      ];
    }

    set({
      resources: stock,
      constructionSites: sites,
      chronicle,
      chronicleSequence: sequence,
      phase: state.phase + 1,
      explorerMovementPoints: state.explorerMaxMovementPoints,
    });
    get().refreshReachable();
  },

  refreshReachable: () => {
    const state = get();
    if (state.selected?.kind !== "explorer") return;
    const explorerTile = state.terrain.tiles.find((t) => t.id === state.explorerTileId);
    if (!explorerTile) return;
    const reachable = findReachableTiles(state.terrainIndex, explorerTile.coord, state.explorerMovementPoints);
    set({ reachableTileIds: reachableTileIdsFrom(reachable, state.terrainIndex) });
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

    set((s) => {
      const resources = { ...s.resources };
      if (found.reward.kind === "resource-bonus" && found.reward.resourceKind && found.reward.resourceAmount) {
        resources[found.reward.resourceKind] += found.reward.resourceAmount;
      }

      return {
        discoveries: updatedDiscoveries,
        activeDiscoveryId: found.id,
        chronicle: [...s.chronicle, entry],
        chronicleSequence: sequence,
        resources,
        explorerMovementPoints: Math.min(s.explorerMaxMovementPoints, s.explorerMovementPoints + rewardPoints),
        travel: s.travel ? { ...s.travel, paused: true } : null,
      };
    });
  },

  toggleChronicle: () => set((s) => ({ chronicleOpen: !s.chronicleOpen })),
  closeChronicle: () => set({ chronicleOpen: false }),

  toggleCameraFollow: () => set((s) => ({ cameraFollowExplorer: !s.cameraFollowExplorer })),
  setCameraFollow: (follow) => set({ cameraFollowExplorer: follow }),
  requestCameraFocus: (target) =>
    set((s) => ({ cameraFocusRequest: { target, nonce: (s.cameraFocusRequest?.nonce ?? 0) + 1 } })),
  clearCameraFocus: () => set({ cameraFocusRequest: null }),

  openConstructionMode: () => set({ constructionMode: true, selected: null, ...clearMovementUI() }),
  closeConstructionMode: () => set({ ...clearConstructionUI() }),

  selectProjectType: (type) =>
    set({ selectedProjectType: type, hoveredConstructionTileId: null, pendingConstructionTileId: null }),

  hoverConstructionTile: (tileId) => {
    const state = get();
    if (state.pendingConstructionTileId) return; // frozen once armed, same convention as hoverDestination
    set({ hoveredConstructionTileId: tileId });
  },

  armConstructionSite: (tileId) => {
    const state = get();
    if (!state.constructionMode || !state.selectedProjectType) return;
    if (tileId === state.settlementTileId || tileId === state.explorerTileId) return;
    if (state.constructionSites.some((s) => s.tileId === tileId)) return;

    const tile = state.terrain.tiles.find((t) => t.id === tileId);
    if (!tile) return;
    if (!isTileEligibleForProject(tile, state.selectedProjectType)) return;
    if (!canAffordProject(state.resources, state.selectedProjectType)) return;

    set({ hoveredConstructionTileId: tileId, pendingConstructionTileId: tileId });
  },

  cancelConstructionPlacement: () => set({ hoveredConstructionTileId: null, pendingConstructionTileId: null }),

  confirmConstruction: () => {
    const state = get();
    if (!state.pendingConstructionTileId || !state.selectedProjectType) return;
    const type = state.selectedProjectType;
    if (!canAffordProject(state.resources, type)) return;

    const def = PROJECT_DEFINITIONS[type];
    const resources = { ...state.resources };
    for (const [kind, amount] of Object.entries(def.cost) as [keyof ResourceStock, number][]) {
      resources[kind] -= amount;
    }

    const siteTile = state.terrain.tiles.find((t) => t.id === state.pendingConstructionTileId);
    const site = createConstructionSite(
      `site-${state.constructionSites.length}-${state.pendingConstructionTileId}`,
      state.pendingConstructionTileId,
      type
    );

    const sequence = state.chronicleSequence + 1;
    const entry = createChronicleEntry({
      sequence,
      kind: "construction",
      summary: `Construction began: ${def.name}.`,
      location: siteTile ? { q: siteTile.coord.q, r: siteTile.coord.r } : null,
    });

    set({
      resources,
      constructionSites: [...state.constructionSites, site],
      chronicle: [...state.chronicle, entry],
      chronicleSequence: sequence,
      ...clearConstructionUI(),
    });
  },
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
