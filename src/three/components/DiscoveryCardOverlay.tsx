import { useAtlasSceneStore } from "../state/atlasSceneStore";
import { RESOURCE_LABELS } from "../domain/resources";

const TYPE_LABELS: Record<string, string> = {
  "ancient-ruins": "Ancient Ruins",
  "natural-landmark": "Natural Landmark",
  "abandoned-camp": "Abandoned Camp",
  "resource-deposit": "Resource Deposit",
};

export function DiscoveryCardOverlay() {
  const activeDiscoveryId = useAtlasSceneStore((s) => s.activeDiscoveryId);
  const discoveries = useAtlasSceneStore((s) => s.discoveries);
  const resumeAfterDiscovery = useAtlasSceneStore((s) => s.resumeAfterDiscovery);

  const discovery = discoveries.find((d) => d.id === activeDiscoveryId);
  if (!discovery) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg border border-white/15 bg-[#151a22] p-6 text-white shadow-2xl">
        <div className="mb-1 text-xs uppercase tracking-wide text-white/50">{TYPE_LABELS[discovery.type] ?? discovery.type}</div>
        <h2 className="mb-3 text-xl font-semibold">{discovery.name}</h2>
        <p className="mb-4 text-sm leading-relaxed text-white/80">{discovery.description}</p>
        <div className="mb-5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85">
          {discovery.reward.description}
          {discovery.reward.kind === "movement-cache" && discovery.reward.movementPointsGranted ? (
            <span className="ml-1 text-emerald-300">(+{discovery.reward.movementPointsGranted} movement)</span>
          ) : null}
          {discovery.reward.kind === "resource-bonus" && discovery.reward.resourceKind && discovery.reward.resourceAmount ? (
            <span className="ml-1 text-emerald-300">
              (+{discovery.reward.resourceAmount} {RESOURCE_LABELS[discovery.reward.resourceKind]})
            </span>
          ) : null}
        </div>
        <button
          onClick={() => resumeAfterDiscovery(performance.now())}
          className="w-full rounded-md bg-[#ffcf5c] px-4 py-2 text-sm font-semibold text-[#20180a] transition hover:bg-[#ffd977]"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
