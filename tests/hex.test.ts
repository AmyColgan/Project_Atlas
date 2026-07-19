import { describe, expect, it } from "vitest";
import {
  axialToPixel,
  hexDistance,
  hexEquals,
  hexNeighbors,
  pixelToAxial,
} from "../src/utils/hex";

describe("hex coordinate math", () => {
  it("round-trips axial -> pixel -> axial", () => {
    const hexSize = 32;
    const originals = [
      { q: 0, r: 0 },
      { q: 3, r: -2 },
      { q: -5, r: 4 },
      { q: 10, r: 10 },
    ];

    for (const coord of originals) {
      const pixel = axialToPixel(coord, hexSize);
      const roundTripped = pixelToAxial(pixel, hexSize);
      expect(hexEquals(roundTripped, coord)).toBe(true);
    }
  });

  it("produces exactly 6 unique neighbors", () => {
    const neighbors = hexNeighbors({ q: 2, r: 2 });
    expect(neighbors).toHaveLength(6);

    const keys = new Set(neighbors.map((n) => `${n.q},${n.r}`));
    expect(keys.size).toBe(6);
  });

  it("every neighbor is exactly distance 1 away", () => {
    const center = { q: 0, r: 0 };
    for (const neighbor of hexNeighbors(center)) {
      expect(hexDistance(center, neighbor)).toBe(1);
    }
  });

  it("distance is symmetric and zero for the same hex", () => {
    const a = { q: 1, r: -3 };
    const b = { q: -2, r: 5 };
    expect(hexDistance(a, b)).toBe(hexDistance(b, a));
    expect(hexDistance(a, a)).toBe(0);
  });
});
