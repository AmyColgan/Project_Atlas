import { PlaceholderDrawFn } from "./AssetManager";

function hexPath(ctx: CanvasRenderingContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function flatTerrain(base: string, edge: string): PlaceholderDrawFn {
  return (ctx, size) => {
    hexPath(ctx, size);
    ctx.fillStyle = base;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.stroke();
  };
}

export const terrainPlaceholders: Record<string, PlaceholderDrawFn> = {
  "terrain.plains": flatTerrain("#4a7c3f", "#5f9950"),
  "terrain.hills": flatTerrain("#8a7248", "#a68a5c"),
  "terrain.mountains": flatTerrain("#726b6b", "#8f8686"),
  "terrain.ocean": flatTerrain("#1f4d6e", "#2c6690"),
};

export const cityMarkerPlaceholder: PlaceholderDrawFn = (ctx, size) => {
  const cx = size / 2;
  const cy = size / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "#f2e9dc";
  ctx.fill();
  ctx.strokeStyle = "#3a2e1f";
  ctx.lineWidth = Math.max(1, size * 0.05);
  ctx.stroke();
};
