import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { SceneRoot } from "./components/SceneRoot";
import { useAtlasSceneStore } from "./state/atlasSceneStore";

interface Atlas3DPrototypeProps {
  onClose: () => void;
}

/**
 * Isolated 3D foundation prototype. Mounted alongside (not instead of) the
 * existing Canvas2D renderer — see src/ui/App.tsx for the toggle.
 */
export function Atlas3DPrototype({ onClose }: Atlas3DPrototypeProps) {
  const seed = useAtlasSceneStore((s) => s.seed);
  const regenerate = useAtlasSceneStore((s) => s.regenerate);
  const select = useAtlasSceneStore((s) => s.select);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#10151c]">
      <Canvas
        shadows
        camera={{ position: [18, 20, 32], fov: 50, near: 0.1, far: 200 }}
        onPointerMissed={() => select(null)}
      >
        <color attach="background" args={["#10151c"]} />
        <fog attach="fog" args={["#10151c", 32, 72]} />
        <Suspense fallback={null}>
          <SceneRoot />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-md border border-white/10 bg-black/50 px-3 py-2 text-xs text-white/80 backdrop-blur">
          <div className="mb-1 font-semibold text-white">3D Foundation Prototype</div>
          <div>Drag: pan &nbsp;·&nbsp; Right-drag: rotate/tilt &nbsp;·&nbsp; Scroll: zoom</div>
          <div>Click a tile, the settlement, or the explorer to select it</div>
          <div className="mt-1 text-white/50">Seed {seed}</div>
        </div>

        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={() => regenerate(Math.floor(Math.random() * 1_000_000))}
            className="rounded-md border border-white/20 bg-black/50 px-3 py-1.5 text-sm text-white/90 backdrop-blur transition hover:border-white/40"
          >
            New Terrain
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-white/20 bg-black/50 px-3 py-1.5 text-sm text-white/90 backdrop-blur transition hover:border-white/40"
          >
            Back to 2D Map
          </button>
        </div>
      </div>
    </div>
  );
}
