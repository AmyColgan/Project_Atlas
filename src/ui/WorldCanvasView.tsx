import { useEffect, useRef, useState } from "react";
import { useSimulationStore } from "./state/simulationStore";
import { createRenderer } from "../graphics/renderer/createRenderer";
import { AssetManager } from "../graphics/assets/AssetManager";
import { assetManifest } from "../graphics/assets/assetManifest";
import { CameraState, lerpCamera } from "../graphics/camera";
import { toSnapshot } from "../engine/types";
import { HoverSelectionState } from "../graphics/renderer/WorldRenderer";

const CLICK_DRAG_THRESHOLD_PX = 6;

export function WorldCanvasView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef(createRenderer("canvas2d"));
  const assetsRef = useRef(new AssetManager(assetManifest, 64));
  const displayedCameraRef = useRef<CameraState>({ x: 0, y: 0, zoom: 1 });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);
  const [assetsReady, setAssetsReady] = useState(false);

  const world = useSimulationStore((s) => s.world);
  const targetCamera = useSimulationStore((s) => s.camera);
  const hoveredHex = useSimulationStore((s) => s.hoveredHex);
  const selectedHex = useSimulationStore((s) => s.selectedHex);
  const selectionAnimStartMs = useSimulationStore((s) => s.selectionAnimStartMs);
  const panBy = useSimulationStore((s) => s.panBy);
  const zoomBy = useSimulationStore((s) => s.zoomBy);
  const setHoveredHex = useSimulationStore((s) => s.setHoveredHex);
  const selectHex = useSimulationStore((s) => s.selectHex);

  useEffect(() => {
    assetsRef.current.preload().then(() => setAssetsReady(true));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    rendererRef.current.init(canvas, assetsRef.current);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      rendererRef.current.resize(rect.width, rect.height);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frameId: number;

    const loop = () => {
      displayedCameraRef.current = lerpCamera(displayedCameraRef.current, targetCamera, 1 / 60);

      if (assetsReady) {
        const interaction: HoverSelectionState = {
          hoveredHex,
          selectedHex,
          selectionAnimStartMs,
        };
        rendererRef.current.renderFrame(
          toSnapshot(world),
          displayedCameraRef.current,
          interaction,
          performance.now()
        );
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [world, targetCamera, hoveredHex, selectedHex, selectionAnimStartMs, assetsReady]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      dragDistanceRef.current += Math.abs(dx) + Math.abs(dy);
      panBy(dx, dy);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const hex = rendererRef.current.hexAtScreenPoint(
      e.clientX - rect.left,
      e.clientY - rect.top,
      displayedCameraRef.current
    );
    setHoveredHex(hex);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // A mousedown->move->up sequence still fires a native click at the release
    // point; ignore it here so panning the map doesn't also select a tile.
    if (dragDistanceRef.current > CLICK_DRAG_THRESHOLD_PX) {
      dragDistanceRef.current = 0;
      return;
    }
    dragDistanceRef.current = 0;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const hex = rendererRef.current.hexAtScreenPoint(
      e.clientX - rect.left,
      e.clientY - rect.top,
      displayedCameraRef.current
    );
    selectHex(hex, performance.now());
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const around = rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : undefined;
    zoomBy(-e.deltaY * 0.001, around);
  };

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-atlas-bg">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />
    </div>
  );
}
