import { BiomeType } from "../types";

export const BIOME_COLORS: Record<BiomeType, string> = {
  water: "#2a6f97",
  plains: "#9caf5c",
  forest: "#3f6b3a",
  hills: "#a98a5b",
  mountains: "#8b8f96",
};

export const BIOME_HEIGHT_SCALE: Record<BiomeType, number> = {
  water: 0.35,
  plains: 0.6,
  forest: 0.75,
  hills: 1.15,
  mountains: 1.85,
};
