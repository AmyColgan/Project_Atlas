import { AxialCoord } from "../../utils/hex";
import { WorldSnapshot } from "../../engine/types";
import { AssetManager } from "../assets/AssetManager";
import { CameraState } from "../camera";

export interface HoverSelectionState {
  hoveredHex: AxialCoord | null;
  selectedHex: AxialCoord | null;
  selectionAnimStartMs: number | null;
}

/**
 * Every renderer implementation (Canvas 2D today, WebGL later) satisfies
 * this contract. Simulation, gameplay, save system, and UI code depend only
 * on this interface plus CameraState/WorldSnapshot — never on a concrete
 * drawing API. See docs/architecture/technical_architecture.md §3.
 */
export interface WorldRenderer {
  init(canvas: HTMLCanvasElement, assets: AssetManager): void;
  resize(widthPx: number, heightPx: number): void;
  renderFrame(
    world: WorldSnapshot,
    camera: CameraState,
    interaction: HoverSelectionState,
    nowMs: number
  ): void;
  hexAtScreenPoint(screenX: number, screenY: number, camera: CameraState): AxialCoord | null;
  destroy(): void;
}
