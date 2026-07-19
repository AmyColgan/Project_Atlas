import { useFrame } from "@react-three/fiber";
import { useAtlasSceneStore } from "../state/atlasSceneStore";

/**
 * Invisible per-frame clock for the explorer's travel animation. All actual
 * movement rules (path, cost, arrival, discovery checks) live in the store
 * and ../domain/*.ts — this component only supplies "now" once per frame.
 */
export function ExplorerMovementController() {
  const tick = useAtlasSceneStore((s) => s.tick);

  useFrame(() => {
    tick(performance.now());
  });

  return null;
}
