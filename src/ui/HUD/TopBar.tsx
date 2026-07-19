import { useSimulationStore } from "../state/simulationStore";

interface TopBarProps {
  onOpen3DPrototype: () => void;
}

export function TopBar({ onOpen3DPrototype }: TopBarProps) {
  const turn = useSimulationStore((s) => s.world.turn);
  const seed = useSimulationStore((s) => s.seed);
  const regenerate = useSimulationStore((s) => s.regenerate);
  const saveGame = useSimulationStore((s) => s.saveGame);
  const loadGame = useSimulationStore((s) => s.loadGame);

  return (
    <header className="flex items-center justify-between border-b border-atlas-panelBorder bg-atlas-panel px-5 py-3 shadow-lg">
      <div className="flex items-baseline gap-3">
        <h1 className="text-lg font-semibold tracking-wide text-atlas-accent">PROJECT ATLAS</h1>
        <span className="text-xs text-atlas-textDim">
          Turn {turn} · Seed {seed}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => regenerate(Math.floor(Math.random() * 1_000_000))}
          className="rounded-md border border-atlas-panelBorder bg-atlas-bg px-3 py-1.5 text-sm text-atlas-text transition hover:border-atlas-accent hover:text-atlas-accent"
        >
          New World
        </button>
        <button
          onClick={saveGame}
          className="rounded-md border border-atlas-panelBorder bg-atlas-bg px-3 py-1.5 text-sm text-atlas-text transition hover:border-atlas-accent hover:text-atlas-accent"
        >
          Save
        </button>
        <button
          onClick={loadGame}
          className="rounded-md border border-atlas-panelBorder bg-atlas-bg px-3 py-1.5 text-sm text-atlas-text transition hover:border-atlas-accent hover:text-atlas-accent"
        >
          Load
        </button>
        <button
          onClick={onOpen3DPrototype}
          className="rounded-md border border-atlas-panelBorder bg-atlas-bg px-3 py-1.5 text-sm text-atlas-text transition hover:border-atlas-accent hover:text-atlas-accent"
        >
          3D Prototype (Beta)
        </button>
      </div>
    </header>
  );
}
