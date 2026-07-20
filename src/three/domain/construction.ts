import { TerrainTileData } from "../types";
import { ResourceKind, ResourceStock } from "./resources";

export type ProjectType = "farm" | "lumberCamp" | "quarry";

export const PROJECT_TYPES: readonly ProjectType[] = ["farm", "lumberCamp", "quarry"];

export interface ProjectDefinition {
  type: ProjectType;
  name: string;
  description: string;
  eligibilityHint: string;
  cost: Partial<ResourceStock>;
  buildPhases: number;
  producesResource: ResourceKind;
  productionPerPhase: number;
}

export const PROJECT_DEFINITIONS: Record<ProjectType, ProjectDefinition> = {
  farm: {
    type: "farm",
    name: "Agricultural Outpost",
    description: "Works fertile ground near water to keep the settlement fed.",
    eligibilityHint: "Needs fertile plains, near a river, lake, or coast.",
    cost: { wood: 6 },
    buildPhases: 2,
    producesResource: "food",
    productionPerPhase: 3,
  },
  lumberCamp: {
    type: "lumberCamp",
    name: "Lumber Camp",
    description: "Harvests timber from the surrounding forest.",
    eligibilityHint: "Needs forest.",
    cost: { food: 4 },
    buildPhases: 2,
    producesResource: "wood",
    productionPerPhase: 3,
  },
  quarry: {
    type: "quarry",
    name: "Quarry",
    description: "Cuts stone from the hillside or mountain rock.",
    eligibilityHint: "Needs hills or mountains.",
    cost: { food: 4, wood: 2 },
    buildPhases: 3,
    producesResource: "stone",
    productionPerPhase: 2,
  },
};

/** Terrain-gated eligibility: each project needs a specific kind of ground. */
export function isTileEligibleForProject(tile: TerrainTileData, type: ProjectType): boolean {
  switch (type) {
    case "farm":
      return tile.biome === "plains" && tile.isFertile;
    case "lumberCamp":
      return tile.biome === "forest";
    case "quarry":
      return tile.biome === "hills" || tile.biome === "mountains";
    default:
      return false;
  }
}

export function canAffordProject(stock: ResourceStock, type: ProjectType): boolean {
  const def = PROJECT_DEFINITIONS[type];
  return (Object.entries(def.cost) as [ResourceKind, number][]).every(([kind, amount]) => stock[kind] >= amount);
}

export interface ConstructionSite {
  id: string;
  tileId: string;
  type: ProjectType;
  phasesRemaining: number;
  totalPhases: number;
  completed: boolean;
}

export function createConstructionSite(id: string, tileId: string, type: ProjectType): ConstructionSite {
  const def = PROJECT_DEFINITIONS[type];
  return { id, tileId, type, phasesRemaining: def.buildPhases, totalPhases: def.buildPhases, completed: false };
}

/**
 * Advances every site by one phase: decrements in-progress sites (marking
 * complete at zero) and produces resources for already-completed sites.
 * Pure function — the store applies the resulting resource delta and
 * chronicle-worthy events.
 */
export function tickConstructionPhase(
  sites: ConstructionSite[],
  stock: ResourceStock
): { sites: ConstructionSite[]; stock: ResourceStock; justCompleted: ConstructionSite[] } {
  const justCompleted: ConstructionSite[] = [];
  const nextStock = { ...stock };

  const nextSites = sites.map((site) => {
    if (!site.completed) {
      const phasesRemaining = site.phasesRemaining - 1;
      if (phasesRemaining <= 0) {
        const completedSite = { ...site, phasesRemaining: 0, completed: true };
        justCompleted.push(completedSite);
        return completedSite;
      }
      return { ...site, phasesRemaining };
    }

    const def = PROJECT_DEFINITIONS[site.type];
    nextStock[def.producesResource] += def.productionPerPhase;
    return site;
  });

  return { sites: nextSites, stock: nextStock, justCompleted };
}
