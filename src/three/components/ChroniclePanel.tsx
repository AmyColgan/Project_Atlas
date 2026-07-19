import { useAtlasSceneStore } from "../state/atlasSceneStore";

const KIND_LABELS: Record<string, string> = {
  departure: "Departure",
  discovery: "Discovery",
};

export function ChroniclePanel() {
  const chronicleOpen = useAtlasSceneStore((s) => s.chronicleOpen);
  const chronicle = useAtlasSceneStore((s) => s.chronicle);
  const closeChronicle = useAtlasSceneStore((s) => s.closeChronicle);

  if (!chronicleOpen) return null;

  const entries = [...chronicle].reverse();

  return (
    <div className="pointer-events-auto fixed inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l border-white/10 bg-[#151a22]/95 text-white shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">World Chronicle</h2>
        <button onClick={closeChronicle} className="rounded px-2 py-1 text-white/60 transition hover:text-white">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {entries.length === 0 ? (
          <p className="text-sm text-white/50">Nothing recorded yet — send the explorer out.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-white/50">
                  <span>#{entry.sequence} · {KIND_LABELS[entry.kind] ?? entry.kind}</span>
                  {entry.location && (
                    <span>
                      ({entry.location.q}, {entry.location.r})
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/90">{entry.summary}</p>
                {entry.rewardText && <p className="mt-1 text-xs text-emerald-300/90">{entry.rewardText}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
