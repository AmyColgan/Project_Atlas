import { CanvasWorldRenderer } from "./CanvasWorldRenderer";
import { WorldRenderer } from "./WorldRenderer";

export type RendererKind = "canvas2d" | "webgl";

/**
 * The only place that chooses a concrete WorldRenderer implementation.
 * Adding WebGL later means writing WebGLWorldRenderer and adding one
 * case here — no other file changes.
 */
export function createRenderer(kind: RendererKind): WorldRenderer {
  switch (kind) {
    case "canvas2d":
      return new CanvasWorldRenderer();
    case "webgl":
      throw new Error(
        "WebGL renderer is not implemented yet (planned for a later milestone) — see docs/architecture/technical_architecture.md §3"
      );
    default:
      throw new Error(`Unknown renderer kind: ${kind}`);
  }
}
