import { useAtlasSceneStore } from "../state/atlasSceneStore";

interface DebugPanelProps {
  onClose: () => void;
}

/**
 * Developer-facing details (seed, full control scheme, raw counts) live here
 * instead of on the default HUD — a game's default interface shouldn't lead
 * with "3D Foundation Prototype" and a wall of key bindings. Toggled with `.
 */
export function DebugPanel({ onClose }: DebugPanelProps) {
  const seed = useAtlasSceneStore((s) => s.seed);
  const phase = useAtlasSceneStore((s) => s.phase);
  const discoveries = useAtlasSceneStore((s) => s.discoveries);
  const constructionSites = useAtlasSceneStore((s) => s.constructionSites);
  const explorerMovementPoints = useAtlasSceneStore((s) => s.explorerMovementPoints);

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-20 w-80 rounded-md border border-white/15 bg-black/80 p-3 text-xs text-white/80 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-white">Debug (` to toggle)</span>
        <button onClick={onClose} className="text-white/50 transition hover:text-white">
          ✕
        </button>
      </div>
      <div className="mb-2 space-y-0.5">
        <div>Seed: {seed}</div>
        <div>Phase: {phase}</div>
        <div>Movement points: {explorerMovementPoints}</div>
        <div>
          Discoveries: {discoveries.filter((d) => d.completed).length} / {discoveries.length}
        </div>
        <div>Construction sites: {constructionSites.length}</div>
      </div>
      <div className="border-t border-white/10 pt-2 text-white/60">
        <div className="mb-1 font-semibold text-white/80">Controls</div>
        <div>Drag: pan · Right-drag: rotate/tilt · Scroll: zoom · WASD/arrows: pan</div>
        <div>Click explorer/tile: select · Double-click explorer/capital: focus camera</div>
        <div>Enter: confirm · Escape: cancel</div>
      </div>
    </div>
  );
}
