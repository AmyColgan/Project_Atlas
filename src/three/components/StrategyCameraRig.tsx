import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import { useAtlasSceneStore } from "../state/atlasSceneStore";

interface StrategyCameraRigProps {
  target: [number, number, number];
  followPosition: [number, number, number] | null;
  focusPositions: {
    explorer: [number, number, number] | null;
    capital: [number, number, number] | null;
  };
}

const FORWARD_KEYS = new Set(["KeyW", "ArrowUp"]);
const BACK_KEYS = new Set(["KeyS", "ArrowDown"]);
const LEFT_KEYS = new Set(["KeyA", "ArrowLeft"]);
const RIGHT_KEYS = new Set(["KeyD", "ArrowRight"]);

const KEY_PAN_SPEED = 14;
const FOLLOW_LERP = 0.06;
const FOCUS_LERP = 0.12;
const FOCUS_SNAP_EPSILON = 0.01;

/**
 * Strategy-game camera: left-drag pans, right-drag orbits (rotation +
 * tilt), the scroll wheel zooms, and WASD/arrow keys pan too — all built on
 * drei's MapControls (an OrbitControls preset tuned for map-style
 * navigation) as the underlying driver rather than a hand-rolled rig, so
 * damping/inertia/zoom-clamping come for free. Keyboard pan, follow mode,
 * and one-shot focus requests are layered on top via a ref into the same
 * controls instance, since none of those are things MapControls exposes
 * on its own.
 */
export function StrategyCameraRig({ target, followPosition, focusPositions }: StrategyCameraRigProps) {
  const controlsRef = useRef<MapControlsImpl>(null);
  const { camera } = useThree();
  const pressedKeys = useRef<Set<string>>(new Set());
  const focusHandledNonce = useRef(0);

  const cameraFollowExplorer = useAtlasSceneStore((s) => s.cameraFollowExplorer);
  const cameraFocusRequest = useAtlasSceneStore((s) => s.cameraFocusRequest);
  const clearCameraFocus = useAtlasSceneStore((s) => s.clearCameraFocus);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => pressedKeys.current.add(event.code);
    const onKeyUp = (event: KeyboardEvent) => pressedKeys.current.delete(event.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const keys = pressedKeys.current;
    if (keys.size > 0) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() > 0) forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

      const move = new THREE.Vector3();
      for (const code of keys) {
        if (FORWARD_KEYS.has(code)) move.add(forward);
        if (BACK_KEYS.has(code)) move.sub(forward);
        if (LEFT_KEYS.has(code)) move.sub(right);
        if (RIGHT_KEYS.has(code)) move.add(right);
      }
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(KEY_PAN_SPEED * delta * (controls.getDistance() / 20));
        camera.position.add(move);
        controls.target.add(move);
      }
    }

    if (cameraFollowExplorer && followPosition) {
      const offset = new THREE.Vector3(...followPosition).sub(controls.target);
      if (offset.lengthSq() > 0.0001) {
        controls.target.addScaledVector(offset, FOLLOW_LERP);
        camera.position.addScaledVector(offset, FOLLOW_LERP);
      }
    }

    if (cameraFocusRequest && cameraFocusRequest.nonce !== focusHandledNonce.current) {
      const focusPosition = focusPositions[cameraFocusRequest.target];
      if (!focusPosition) {
        focusHandledNonce.current = cameraFocusRequest.nonce;
        clearCameraFocus();
      } else {
        const offset = new THREE.Vector3(...focusPosition).sub(controls.target);
        controls.target.addScaledVector(offset, FOCUS_LERP);
        camera.position.addScaledVector(offset, FOCUS_LERP);
        if (offset.lengthSq() < FOCUS_SNAP_EPSILON) {
          focusHandledNonce.current = cameraFocusRequest.nonce;
          clearCameraFocus();
        }
      }
    }
  });

  return (
    <MapControls
      ref={controlsRef}
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
