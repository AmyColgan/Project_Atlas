import { useSimulationStore } from "../state/simulationStore";
import { hexKey } from "../../utils/hex";

export function InspectorPanel() {
  const selectedHex = useSimulationStore((s) => s.selectedHex);
  const world = useSimulationStore((s) => s.world);

  if (!selectedHex) {
    return (
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-atlas-panelBorder bg-atlas-panel/90 px-4 py-3 text-xs text-atlas-textDim shadow-xl backdrop-blur">
        Click a tile to inspect it.
      </div>
    );
  }

  const tile = world.map.get(hexKey(selectedHex));
  const city = world.cities.find((c) => c.coord.q === selectedHex.q && c.coord.r === selectedHex.r);
  const faction = tile?.ownerFactionId
    ? world.factions.find((f) => f.id === tile.ownerFactionId)
    : undefined;

  return (
    <div className="absolute bottom-4 left-4 w-64 rounded-lg border border-atlas-panelBorder bg-atlas-panel/95 p-4 text-sm shadow-xl backdrop-blur transition-all">
      <div className="mb-2 text-xs uppercase tracking-wide text-atlas-textDim">
        Hex ({selectedHex.q}, {selectedHex.r})
      </div>
      <div className="mb-1 capitalize">
        Terrain: <span className="text-atlas-accent">{tile?.terrain ?? "unknown"}</span>
      </div>
      {faction && (
        <div className="mb-1">
          Territory: <span style={{ color: faction.color }}>{faction.name}</span>
        </div>
      )}
      {city && (
        <div className="mt-2 border-t border-atlas-panelBorder pt-2">
          <div className="font-semibold text-atlas-accentWarm">{city.name}</div>
          <div className="text-xs text-atlas-textDim">
            Population: {city.population}
            {city.isCapital ? " · Capital" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
