export type PlaceholderDrawFn = (ctx: CanvasRenderingContext2D, size: number) => void;

export interface AssetManifestEntry {
  kind: "placeholder" | "image";
  draw?: PlaceholderDrawFn;
  src?: string;
}

/**
 * Central point through which every visual asset (terrain, units, buildings,
 * effects, icons, portraits, UI art) is requested. Gameplay and rendering
 * code call get(key) — never a file path or a hard-coded color/shape.
 *
 * Milestone 1: every manifest entry is a procedurally-drawn placeholder.
 * Swapping a placeholder for real art later means changing that entry's
 * `kind`/`src` in the manifest — no caller of get() needs to change.
 */
export class AssetManager {
  private readonly manifest: Record<string, AssetManifestEntry>;
  private readonly cache = new Map<string, CanvasImageSource>();
  private readonly tileSize: number;

  constructor(manifest: Record<string, AssetManifestEntry>, tileSize = 64) {
    this.manifest = manifest;
    this.tileSize = tileSize;
  }

  async preload(): Promise<void> {
    await Promise.all(
      Object.entries(this.manifest).map(([key, entry]) => this.loadOne(key, entry))
    );
  }

  private async loadOne(key: string, entry: AssetManifestEntry): Promise<void> {
    if (entry.kind === "placeholder" && entry.draw) {
      const canvas = document.createElement("canvas");
      canvas.width = this.tileSize;
      canvas.height = this.tileSize;
      const ctx = canvas.getContext("2d");
      if (ctx) entry.draw(ctx, this.tileSize);
      this.cache.set(key, canvas);
      return;
    }

    if (entry.kind === "image" && entry.src) {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load asset image: ${entry.src}`));
        img.src = entry.src as string;
      });
      this.cache.set(key, image);
      return;
    }

    throw new Error(`AssetManager: manifest entry for "${key}" is missing required fields`);
  }

  get(key: string): CanvasImageSource {
    const asset = this.cache.get(key);
    if (!asset) {
      throw new Error(`AssetManager: asset "${key}" was not preloaded — call preload() first`);
    }
    return asset;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}
