import { describe, expect, it } from "vitest";
import { AxialCoord, axialToPixel } from "../src/utils/hex";
import { BiomeType, TerrainTileData } from "../src/three/types";
import {
  canAffordProject,
  createConstructionSite,
  isTileEligibleForProject,
  PROJECT_DEFINITIONS,
  tickConstructionPhase,
} from "../src/three/domain/construction";
import { STARTING_RESOURCES } from "../src/three/domain/resources";

const HEX_SIZE = 1;

function tile(q: number, r: number, biome: BiomeType, isFertile = false): TerrainTileData {
  const coord: AxialCoord = { q, r };
  const pixel = axialToPixel(coord, HEX_SIZE);
  return {
    id: `tile-${q}-${r}`,
    coord,
    biome,
    height: 0.5,
    worldX: pixel.x,
    worldZ: pixel.y,
    isRiver: false,
    riverFlowTo: null,
    isLake: false,
    lakeId: null,
    isCoast: false,
    isFertile,
  };
}

describe("construction eligibility", () => {
  it("only allows a farm on fertile plains", () => {
    expect(isTileEligibleForProject(tile(0, 0, "plains", true), "farm")).toBe(true);
    expect(isTileEligibleForProject(tile(0, 0, "plains", false), "farm")).toBe(false);
    expect(isTileEligibleForProject(tile(0, 0, "forest", true), "farm")).toBe(false);
  });

  it("only allows a lumber camp on forest", () => {
    expect(isTileEligibleForProject(tile(0, 0, "forest"), "lumberCamp")).toBe(true);
    expect(isTileEligibleForProject(tile(0, 0, "plains"), "lumberCamp")).toBe(false);
  });

  it("only allows a quarry on hills or mountains", () => {
    expect(isTileEligibleForProject(tile(0, 0, "hills"), "quarry")).toBe(true);
    expect(isTileEligibleForProject(tile(0, 0, "mountains"), "quarry")).toBe(true);
    expect(isTileEligibleForProject(tile(0, 0, "plains"), "quarry")).toBe(false);
  });

  it("never allows any project on water", () => {
    expect(isTileEligibleForProject(tile(0, 0, "water", true), "farm")).toBe(false);
    expect(isTileEligibleForProject(tile(0, 0, "water"), "lumberCamp")).toBe(false);
    expect(isTileEligibleForProject(tile(0, 0, "water"), "quarry")).toBe(false);
  });
});

describe("construction costs", () => {
  it("reports afforability against the resource stock", () => {
    const stock = { food: 3, wood: 10, stone: 0 };
    expect(canAffordProject(stock, "lumberCamp")).toBe(false); // needs 4 food, only have 3
    expect(canAffordProject(stock, "farm")).toBe(true); // needs 6 wood, have 10
    expect(canAffordProject(stock, "quarry")).toBe(false); // needs food+wood, food insufficient
  });

  it("starting resources can afford at least one project of each type", () => {
    for (const type of ["farm", "lumberCamp", "quarry"] as const) {
      expect(canAffordProject(STARTING_RESOURCES, type)).toBe(true);
    }
  });
});

describe("construction phase progression", () => {
  it("decrements phasesRemaining and marks complete at zero", () => {
    const site = createConstructionSite("site-0", "tile-0-0", "lumberCamp");
    expect(site.phasesRemaining).toBe(PROJECT_DEFINITIONS.lumberCamp.buildPhases);
    expect(site.completed).toBe(false);

    let sites = [site];
    let stock = { ...STARTING_RESOURCES };
    for (let i = 0; i < PROJECT_DEFINITIONS.lumberCamp.buildPhases; i++) {
      const result = tickConstructionPhase(sites, stock);
      sites = result.sites;
      stock = result.stock;
    }

    expect(sites[0].completed).toBe(true);
    expect(sites[0].phasesRemaining).toBe(0);
  });

  it("produces resources every phase once completed, not before", () => {
    const site = createConstructionSite("site-0", "tile-0-0", "lumberCamp");
    let sites = [site];
    let stock = { food: 0, wood: 0, stone: 0 };

    // First phase: still under construction, no production yet.
    let result = tickConstructionPhase(sites, stock);
    sites = result.sites;
    stock = result.stock;
    expect(stock.wood).toBe(0);

    // Second phase: completes this tick (buildPhases=2), still no production on the completing tick itself.
    result = tickConstructionPhase(sites, stock);
    sites = result.sites;
    stock = result.stock;
    expect(sites[0].completed).toBe(true);
    expect(result.justCompleted).toHaveLength(1);
    expect(stock.wood).toBe(0);

    // Third phase: now produces.
    result = tickConstructionPhase(sites, stock);
    stock = result.stock;
    expect(stock.wood).toBe(PROJECT_DEFINITIONS.lumberCamp.productionPerPhase);
  });

  it("reports justCompleted only on the phase a site finishes, never again after", () => {
    const site = createConstructionSite("site-0", "tile-0-0", "farm");
    let sites = [site];
    const stock = { ...STARTING_RESOURCES };

    let result = tickConstructionPhase(sites, stock); // phase 1 of 2
    expect(result.justCompleted).toHaveLength(0);
    sites = result.sites;

    result = tickConstructionPhase(sites, stock); // phase 2 of 2 -> completes
    expect(result.justCompleted).toHaveLength(1);
    sites = result.sites;

    result = tickConstructionPhase(sites, stock); // already complete
    expect(result.justCompleted).toHaveLength(0);
  });
});
