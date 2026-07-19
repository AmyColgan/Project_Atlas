import { lazy, Suspense, useEffect, useState } from "react";
import { WorldCanvasView } from "./WorldCanvasView";
import { TopBar } from "./HUD/TopBar";
import { InspectorPanel } from "./HUD/InspectorPanel";

// Three.js/@react-three/fiber/drei and the whole 3D prototype tree are pulled
// into a separate chunk, loaded only when the player actually opens it — the
// 2D app's initial bundle never pays for the 3D dependencies.
const Atlas3DPrototype = lazy(() =>
  import("../three/Atlas3DPrototype").then((m) => ({ default: m.Atlas3DPrototype }))
);

const PROTOTYPE_3D_HASH = "#/3d-prototype";

function readIs3DPrototypeOpen(): boolean {
  return window.location.hash === PROTOTYPE_3D_HASH;
}

export function App() {
  const [show3DPrototype, setShow3DPrototype] = useState(readIs3DPrototypeOpen);

  useEffect(() => {
    const onHashChange = () => setShow3DPrototype(readIs3DPrototypeOpen());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const open3DPrototype = () => {
    window.location.hash = PROTOTYPE_3D_HASH;
    setShow3DPrototype(true);
  };

  const close3DPrototype = () => {
    window.location.hash = "";
    setShow3DPrototype(false);
  };

  if (show3DPrototype) {
    return (
      <Suspense
        fallback={
          <div className="flex h-screen w-screen items-center justify-center bg-[#10151c] text-sm text-white/70">
            Loading 3D prototype…
          </div>
        }
      >
        <Atlas3DPrototype onClose={close3DPrototype} />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-atlas-bg text-atlas-text">
      <TopBar onOpen3DPrototype={open3DPrototype} />
      <div className="relative flex-1">
        <WorldCanvasView />
        <InspectorPanel />
      </div>
    </div>
  );
}
