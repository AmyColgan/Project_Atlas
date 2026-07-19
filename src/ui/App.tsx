import { useEffect, useState } from "react";
import { WorldCanvasView } from "./WorldCanvasView";
import { TopBar } from "./HUD/TopBar";
import { InspectorPanel } from "./HUD/InspectorPanel";
import { Atlas3DPrototype } from "../three/Atlas3DPrototype";

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
    return <Atlas3DPrototype onClose={close3DPrototype} />;
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
