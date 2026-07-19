export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export const DEFAULT_CAMERA: CameraState = { x: 400, y: 60, zoom: 1 };

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.0;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

const LERP_SPEED = 10;

/** Smoothly moves `current` toward `target` — this is what makes pan/zoom feel eased rather than stepped. */
export function lerpCamera(current: CameraState, target: CameraState, dtSeconds: number): CameraState {
  const t = Math.min(1, LERP_SPEED * dtSeconds);
  return {
    x: current.x + (target.x - current.x) * t,
    y: current.y + (target.y - current.y) * t,
    zoom: current.zoom + (target.zoom - current.zoom) * t,
  };
}

export function isCameraSettled(current: CameraState, target: CameraState): boolean {
  return (
    Math.abs(current.x - target.x) < 0.05 &&
    Math.abs(current.y - target.y) < 0.05 &&
    Math.abs(current.zoom - target.zoom) < 0.001
  );
}
