import { MapControls } from "@react-three/drei";

interface StrategyCameraRigProps {
  target: [number, number, number];
}

/**
 * Strategy-game camera: left-drag pans, right-drag orbits (rotation + tilt),
 * and the scroll wheel zooms. Built on drei's MapControls (an OrbitControls
 * preset tuned for map-style navigation) rather than a hand-rolled rig —
 * damping and inertia come for free.
 */
export function StrategyCameraRig({ target }: StrategyCameraRigProps) {
  return (
    <MapControls
      target={target}
      enableDamping
      dampingFactor={0.08}
      minDistance={6}
      maxDistance={45}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2.3}
      panSpeed={1.1}
      rotateSpeed={0.6}
      zoomSpeed={0.9}
      screenSpacePanning={false}
    />
  );
}
