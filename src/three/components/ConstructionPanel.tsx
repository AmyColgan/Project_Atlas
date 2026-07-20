import { useAtlasSceneStore } from "../state/atlasSceneStore";
import { canAffordProject, PROJECT_DEFINITIONS, PROJECT_TYPES } from "../domain/construction";
import { RESOURCE_LABELS } from "../domain/resources";

function formatCost(cost: Partial<Record<string, number>>): string {
  return Object.entries(cost)
    .map(([kind, amount]) => `${amount} ${RESOURCE_LABELS[kind as keyof typeof RESOURCE_LABELS]}`)
    .join(", ");
}

export function ConstructionPanel() {
  const constructionMode = useAtlasSceneStore((s) => s.constructionMode);
  const selectedProjectType = useAtlasSceneStore((s) => s.selectedProjectType);
  const resources = useAtlasSceneStore((s) => s.resources);
  const pendingConstructionTileId = useAtlasSceneStore((s) => s.pendingConstructionTileId);
  const hoveredConstructionTileId = useAtlasSceneStore((s) => s.hoveredConstructionTileId);
  const selectProjectType = useAtlasSceneStore((s) => s.selectProjectType);
  const confirmConstruction = useAtlasSceneStore((s) => s.confirmConstruction);
  const cancelConstructionPlacement = useAtlasSceneStore((s) => s.cancelConstructionPlacement);
  const closeConstructionMode = useAtlasSceneStore((s) => s.closeConstructionMode);

  if (!constructionMode) return null;

  let statusLine = "Choose a project, then click an eligible tile to place it.";
  if (selectedProjectType && pendingConstructionTileId) {
    statusLine = "Site selected. Press Enter, or use the buttons below.";
  } else if (selectedProjectType && hoveredConstructionTileId) {
    statusLine = "Hover shows why a site is eligible or not — click a highlighted tile to place here.";
  } else if (selectedProjectType) {
    statusLine = "Eligible tiles are highlighted. Click one to place this project.";
  }

  return (
    <div className="pointer-events-auto w-72 rounded-md border border-white/10 bg-black/70 p-3 text-xs text-white/85 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-white">Construction</span>
        <button onClick={closeConstructionMode} className="text-white/50 transition hover:text-white">
          ✕
        </button>
      </div>

      <div className="mb-2 flex flex-col gap-2">
        {PROJECT_TYPES.map((type) => {
          const def = PROJECT_DEFINITIONS[type];
          const affordable = canAffordProject(resources, type);
          const isSelected = selectedProjectType === type;
          return (
            <button
              key={type}
              onClick={() => selectProjectType(isSelected ? null : type)}
              disabled={!affordable}
              className={`rounded-md border px-2 py-2 text-left transition ${
                isSelected
                  ? "border-amber-400/60 bg-amber-500/15"
                  : affordable
                    ? "border-white/15 bg-white/5 hover:border-white/30"
                    : "cursor-not-allowed border-white/5 bg-white/5 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-white">
                <span>{def.name}</span>
                <span className="text-white/50">{formatCost(def.cost)}</span>
              </div>
              <div className="mt-0.5 text-white/60">{def.description}</div>
              <div className="mt-0.5 text-white/40">{def.eligibilityHint}</div>
            </button>
          );
        })}
      </div>

      <div className="mb-2 text-white/70">{statusLine}</div>

      {selectedProjectType && pendingConstructionTileId && (
        <div className="flex gap-2">
          <button
            onClick={confirmConstruction}
            className="rounded border border-emerald-400/40 bg-emerald-500/20 px-2 py-1 text-emerald-200 transition hover:bg-emerald-500/30"
          >
            Confirm
          </button>
          <button
            onClick={cancelConstructionPlacement}
            className="rounded border border-white/20 bg-white/10 px-2 py-1 text-white/80 transition hover:bg-white/20"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
