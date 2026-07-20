import { describe, expect, it } from "vitest";
import { computeObjectiveStatus } from "../src/three/domain/objectives";

describe("objective progression", () => {
  it("starts at scout with no discoveries and no construction", () => {
    const status = computeObjectiveStatus({ discoveriesCompleted: 0, constructionSites: [] });
    expect(status.step).toBe("scout");
  });

  it("moves to discover-more after the first discovery", () => {
    const status = computeObjectiveStatus({ discoveriesCompleted: 1, constructionSites: [] });
    expect(status.step).toBe("discover-more");
  });

  it("moves to choose-site once 3 discoveries are made", () => {
    const status = computeObjectiveStatus({ discoveriesCompleted: 3, constructionSites: [] });
    expect(status.step).toBe("choose-site");
  });

  it("does not regress to choose-site once a site exists, even with fewer discoveries recorded", () => {
    const status = computeObjectiveStatus({ discoveriesCompleted: 0, constructionSites: [{ completed: false }] });
    expect(status.step).toBe("under-construction");
  });

  it("moves to under-construction once a site is placed but not finished", () => {
    const status = computeObjectiveStatus({ discoveriesCompleted: 3, constructionSites: [{ completed: false }] });
    expect(status.step).toBe("under-construction");
  });

  it("moves to complete once any site finishes", () => {
    const status = computeObjectiveStatus({
      discoveriesCompleted: 3,
      constructionSites: [{ completed: false }, { completed: true }],
    });
    expect(status.step).toBe("complete");
  });

  it("never skips backward from complete even if sites list order changes", () => {
    const status = computeObjectiveStatus({ discoveriesCompleted: 0, constructionSites: [{ completed: true }] });
    expect(status.step).toBe("complete");
  });
});
