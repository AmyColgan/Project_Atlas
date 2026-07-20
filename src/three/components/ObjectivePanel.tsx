import { useAtlasSceneStore } from "../state/atlasSceneStore";
import { computeObjectiveStatus } from "../domain/objectives";

export function ObjectivePanel() {
  const discoveries = useAtlasSceneStore((s) => s.discoveries);
  const constructionSites = useAtlasSceneStore((s) => s.constructionSites);

  const status = computeObjectiveStatus({
    discoveriesCompleted: discoveries.filter((d) => d.completed).length,
    constructionSites,
  });

  return (
    <div className="pointer-events-auto max-w-sm rounded-md border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/85 backdrop-blur">
      <div className="mb-0.5 flex items-center gap-1.5 font-semibold text-white">
        <span className="text-amber-300">◆</span>
        {status.title}
      </div>
      <div className="text-white/70">{status.description}</div>
    </div>
  );
}
