export const TRAVEL_STEP_DURATION_MS = 450;

export function computeStepProgress(elapsedMs: number, stepDurationMs = TRAVEL_STEP_DURATION_MS): number {
  if (stepDurationMs <= 0) return 1;
  return Math.min(1, Math.max(0, elapsedMs / stepDurationMs));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface WorldPoint {
  x: number;
  z: number;
}

export function interpolateWorldPosition(from: WorldPoint, to: WorldPoint, t: number): WorldPoint {
  return { x: lerp(from.x, to.x, t), z: lerp(from.z, to.z, t) };
}
