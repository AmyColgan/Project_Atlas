import { AxialCoord, axialToPixel, hexCorners, pixelToAxial } from "../../utils/hex";
import { WorldSnapshot } from "../../engine/types";
import { AssetManager } from "../assets/AssetManager";
import { CameraState } from "../camera";
import { HoverSelectionState, WorldRenderer } from "./WorldRenderer";

const HEX_SIZE = 22;
const SELECTION_ANIM_MS = 220;
const BORDER_PULSE_PERIOD_MS = 1000;

function terrainAssetKey(terrain: string): string {
  return `terrain.${terrain}`;
}

export class CanvasWorldRenderer implements WorldRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private assets: AssetManager | null = null;

  init(canvas: HTMLCanvasElement, assets: AssetManager): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.assets = assets;
  }

  resize(widthPx: number, heightPx: number): void {
    if (!this.canvas || !this.ctx) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(widthPx * dpr));
    this.canvas.height = Math.max(1, Math.floor(heightPx * dpr));
    this.canvas.style.width = `${widthPx}px`;
    this.canvas.style.height = `${heightPx}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  renderFrame(
    world: WorldSnapshot,
    camera: CameraState,
    interaction: HoverSelectionState,
    nowMs: number
  ): void {
    const { ctx, canvas, assets } = this;
    if (!ctx || !canvas || !assets) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.fillStyle = "#05070c";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    for (const tile of world.map.values()) {
      const center = axialToPixel(tile.coord, HEX_SIZE);
      const assetKey = terrainAssetKey(tile.terrain);
      if (assets.has(assetKey)) {
        const size = HEX_SIZE * 2;
        ctx.drawImage(assets.get(assetKey), center.x - HEX_SIZE, center.y - HEX_SIZE, size, size);
      }

      if (tile.ownerFactionId) {
        const faction = world.factions.find((f) => f.id === tile.ownerFactionId);
        if (faction) {
          const pulse = 0.5 + 0.5 * Math.sin((nowMs / BORDER_PULSE_PERIOD_MS) * Math.PI * 2);
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.35 * pulse;
          ctx.strokeStyle = faction.color;
          ctx.lineWidth = 2 + pulse;
          this.traceHexPath(ctx, center, HEX_SIZE * 0.96);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    if (interaction.hoveredHex) {
      this.strokeHex(ctx, interaction.hoveredHex, "rgba(255,255,255,0.55)", 2, 1);
    }

    if (interaction.selectedHex) {
      const elapsed = interaction.selectionAnimStartMs ? nowMs - interaction.selectionAnimStartMs : SELECTION_ANIM_MS;
      const t = Math.min(1, elapsed / SELECTION_ANIM_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const scale = 0.82 + 0.18 * eased;
      this.strokeHex(ctx, interaction.selectedHex, "#f2c14e", 3, scale);
    }

    for (const city of world.cities) {
      const center = axialToPixel(city.coord, HEX_SIZE);
      if (assets.has("city.marker")) {
        const size = HEX_SIZE * 1.1;
        ctx.drawImage(assets.get("city.marker"), center.x - size / 2, center.y - size / 2, size, size);
      }
    }

    ctx.restore();
  }

  private traceHexPath(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, size: number): void {
    const corners = hexCorners(center, size);
    ctx.beginPath();
    corners.forEach((corner, i) => (i === 0 ? ctx.moveTo(corner.x, corner.y) : ctx.lineTo(corner.x, corner.y)));
    ctx.closePath();
  }

  private strokeHex(
    ctx: CanvasRenderingContext2D,
    coord: AxialCoord,
    color: string,
    width: number,
    scale: number
  ): void {
    const center = axialToPixel(coord, HEX_SIZE);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    this.traceHexPath(ctx, center, HEX_SIZE * scale);
    ctx.stroke();
    ctx.restore();
  }

  hexAtScreenPoint(screenX: number, screenY: number, camera: CameraState): AxialCoord | null {
    const worldX = (screenX - camera.x) / camera.zoom;
    const worldY = (screenY - camera.y) / camera.zoom;
    return pixelToAxial({ x: worldX, y: worldY }, HEX_SIZE);
  }

  destroy(): void {
    this.canvas = null;
    this.ctx = null;
    this.assets = null;
  }
}
