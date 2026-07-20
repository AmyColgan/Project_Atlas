import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { SceneRoot } from "./components/SceneRoot";
import { DiscoveryCardOverlay } from "./components/DiscoveryCardOverlay";
import { ChroniclePanel } from "./components/ChroniclePanel";
import { useAtlasSceneStore } from "./state/atlasSceneStore";

interface Atlas3DPrototypeProps {
  onClose: () => void;
}

function MovementHud() {
  const selected = useAtlasSceneStore((s) => s.selected);
  const travel = useAtlasSceneStore((s) => s.travel);
  const movementPoints = useAtlasSceneStore((s) => s.explorerMovementPoints);
  const maxMovementPoints = useAtlasSceneStore((s) => s.explorerMaxMovementPoints);
  const hoveredDestinationTileId = useAtlasSceneStore((s) => s.hoveredDestinationTileId);
  const pendingDestinationTileId = useAtlasSceneStore((s) => s.pendingDestinationTileId);
  const previewCost = useAtlasSceneStore((s) => s.previewCost);
  const previewBlockedReason = useAtlasSceneStore((s) => s.previewBlockedReason);
  const confirmMove = useAtlasSceneStore((s) => s.confirmMove);
  const cancelDestination = useAtlasSceneStore((s) => s.cancelDestination);
  const refreshMovementPoints = useAtlasSceneStore((s) => s.refreshMovementPoints);

  const isMovementMode = selected?.kind === "explorer";
  if (!isMovementMode) return null;

  let statusLine: string;
  if (travel) {
    statusLine = "Traveling…";
  } else if (pendingDestinationTileId) {
    statusLine = `Move selected — cost ${previewCost ?? "?"}. Confirm (Enter) or Cancel (Esc).`;
  } else if (hoveredDestinationTileId && previewBlockedReason === "impassable") {
    statusLine = "Impassable — that tile cannot be entered.";
  } else if (hoveredDestinationTileId && previewBlockedReason === "too-far") {
    statusLine = `Too far — costs ${previewCost}, only ${movementPoints} movement remaining.`;
  } else if (hoveredDestinationTileId) {
    statusLine = `Cost ${previewCost} of ${movementPoints} remaining.`;
  } else {
    statusLine = "Hover a highlighted tile to preview a route, then click it to select a destination.";
  }

  return (
    <div className="pointer-events-auto rounded-md border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/85 backdrop-blur">
      <div className="mb-1 flex items-center justify-between gap-4">
        <span className="font-semibold text-white">Explorer selected</span>
        <span>
          Movement {movementPoints} / {maxMovementPoints}
        </span>
      </div>
      <div className="mb-2">{statusLine}</div>
      <div className="flex gap-2">
        {pendingDestinationTileId && !travel && (
          <>
            <button
              onClick={confirmMove}
              className="rounded border border-emerald-400/40 bg-emerald-500/20 px-2 py-1 text-emerald-200 transition hover:bg-emerald-500/30"
            >
              Confirm Move
            </button>
            <button
              onClick={cancelDestination}
              className="rounded border border-white/20 bg-white/10 px-2 py-1 text-white/80 transition hover:bg-white/20"
            >
              Cancel
            </button>
          </>
        )}
        {!travel && movementPoints < maxMovementPoints && (
          <button
            onClick={refreshMovementPoints}
            className="rounded border border-white/20 bg-white/10 px-2 py-1 text-white/80 transition hover:bg-white/20"
          >
            Refresh Movement
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Isolated 3D foundation prototype. Mounted alongside (not instead of) the
 * existing Canvas2D renderer — see src/ui/App.tsx for the toggle.
 */
export function Atlas3DPrototype({ onClose }: Atlas3DPrototypeProps) {
  const seed = useAtlasSceneStore((s) => s.seed);
  const regenerate = useAtlasSceneStore((s) => s.regenerate);
  const select = useAtlasSceneStore((s) => s.select);
  const confirmMove = useAtlasSceneStore((s) => s.confirmMove);
  const cancelDestination = useAtlasSceneStore((s) => s.cancelDestination);
  const toggleChronicle = useAtlasSceneStore((s) => s.toggleChronicle);
  const activeDiscoveryId = useAtlasSceneStore((s) => s.activeDiscoveryId);
  const cameraFollowExplorer = useAtlasSceneStore((s) => s.cameraFollowExplorer);
  const toggleCameraFollow = useAtlasSceneStore((s) => s.toggleCameraFollow);
  const setCameraFollow = useAtlasSceneStore((s) => s.setCameraFollow);
  const clearCameraFocus = useAtlasSceneStore((s) => s.clearCameraFocus);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (activeDiscoveryId) return;
      if (event.key === "Escape") {
        cancelDestination();
        setCameraFollow(false);
        clearCameraFocus();
      }
      if (event.key === "Enter") confirmMove();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmMove, cancelDestination, activeDiscoveryId, setCameraFollow, clearCameraFocus]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#10151c]">
      <Canvas
        shadows
        camera={{ position: [18, 20, 32], fov: 50, near: 0.1, far: 200 }}
        onPointerMissed={() => select(null)}
      >
        <color attach="background" args={["#10151c"]} />
        <fog attach="fog" args={["#10151c", 32, 72]} />
        <Suspense fallback={null}>
          <SceneRoot />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="rounded-md border border-white/10 bg-black/50 px-3 py-2 text-xs text-white/80 backdrop-blur">
            <div className="mb-1 font-semibold text-white">3D Foundation Prototype</div>
            <div>Drag: pan &nbsp;·&nbsp; Right-drag: rotate/tilt &nbsp;·&nbsp; Scroll: zoom &nbsp;·&nbsp; WASD/arrows: pan</div>
            <div>Click the explorer to plan a move · double-click explorer/capital to focus camera</div>
            <div className="mt-1 text-white/50">Seed {seed}</div>
          </div>
          <MovementHud />
        </div>

        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={toggleCameraFollow}
            className={`rounded-md border px-3 py-1.5 text-sm backdrop-blur transition ${
              cameraFollowExplorer
                ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                : "border-white/20 bg-black/50 text-white/90 hover:border-white/40"
            }`}
          >
            {cameraFollowExplorer ? "Following Explorer" : "Follow Explorer"}
          </button>
          <button
            onClick={toggleChronicle}
            className="rounded-md border border-white/20 bg-black/50 px-3 py-1.5 text-sm text-white/90 backdrop-blur transition hover:border-white/40"
          >
            Chronicle
          </button>
          <button
            onClick={() => regenerate(Math.floor(Math.random() * 1_000_000))}
            className="rounded-md border border-white/20 bg-black/50 px-3 py-1.5 text-sm text-white/90 backdrop-blur transition hover:border-white/40"
          >
            New Terrain
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-white/20 bg-black/50 px-3 py-1.5 text-sm text-white/90 backdrop-blur transition hover:border-white/40"
          >
            Back to 2D Map
          </button>
        </div>
      </div>

      <ChroniclePanel />
      <DiscoveryCardOverlay />
    </div>
  );
}
