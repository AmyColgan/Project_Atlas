import { WorldCanvasView } from "./WorldCanvasView";
import { TopBar } from "./HUD/TopBar";
import { InspectorPanel } from "./HUD/InspectorPanel";

export function App() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-atlas-bg text-atlas-text">
      <TopBar />
      <div className="relative flex-1">
        <WorldCanvasView />
        <InspectorPanel />
      </div>
    </div>
  );
}
