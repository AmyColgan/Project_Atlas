import { create } from "zustand";
import { AxialCoord } from "../../utils/hex";
import { WorldState } from "../../engine/types";
import { createTestWorld } from "../../engine/worldState";
import { loadFromLocalStorage, saveToLocalStorage } from "../../engine/saveSystem";
import { CameraState, DEFAULT_CAMERA, clampZoom } from "../../graphics/camera";

interface ScreenPoint {
  x: number;
  y: number;
}

interface SimulationStore {
  world: WorldState;
  seed: number;
  /** Target camera — the renderer smoothly lerps toward this each frame. */
  camera: CameraState;
  hoveredHex: AxialCoord | null;
  selectedHex: AxialCoord | null;
  selectionAnimStartMs: number | null;

  panBy: (dx: number, dy: number) => void;
  zoomBy: (delta: number, aroundScreen?: ScreenPoint) => void;
  setHoveredHex: (coord: AxialCoord | null) => void;
  selectHex: (coord: AxialCoord | null, nowMs: number) => void;
  regenerate: (seed: number) => void;
  saveGame: () => void;
  loadGame: () => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  world: createTestWorld(1),
  seed: 1,
  camera: DEFAULT_CAMERA,
  hoveredHex: null,
  selectedHex: null,
  selectionAnimStartMs: null,

  panBy: (dx, dy) =>
    set((state) => ({
      camera: { ...state.camera, x: state.camera.x + dx, y: state.camera.y + dy },
    })),

  zoomBy: (delta, aroundScreen) =>
    set((state) => {
      const newZoom = clampZoom(state.camera.zoom + delta);
      if (!aroundScreen) {
        return { camera: { ...state.camera, zoom: newZoom } };
      }
      const worldX = (aroundScreen.x - state.camera.x) / state.camera.zoom;
      const worldY = (aroundScreen.y - state.camera.y) / state.camera.zoom;
      return {
        camera: {
          x: aroundScreen.x - worldX * newZoom,
          y: aroundScreen.y - worldY * newZoom,
          zoom: newZoom,
        },
      };
    }),

  setHoveredHex: (coord) => set({ hoveredHex: coord }),

  selectHex: (coord, nowMs) => set({ selectedHex: coord, selectionAnimStartMs: coord ? nowMs : null }),

  regenerate: (seed) => set({ world: createTestWorld(seed), seed, selectedHex: null, hoveredHex: null }),

  saveGame: () => saveToLocalStorage(get().world, Date.now()),

  loadGame: () => {
    const loaded = loadFromLocalStorage();
    if (loaded) set({ world: loaded, seed: loaded.seed, selectedHex: null, hoveredHex: null });
  },
}));
