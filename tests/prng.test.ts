import { describe, expect, it } from "vitest";
import { createPrng, restorePrng } from "../src/utils/prng";

describe("prng determinism", () => {
  it("produces the same sequence for the same seed", () => {
    const a = createPrng(12345);
    const b = createPrng(12345);

    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());

    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createPrng(1);
    const b = createPrng(2);

    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());

    expect(seqA).not.toEqual(seqB);
  });

  it("resumes identically from a saved state", () => {
    const original = createPrng(999);
    for (let i = 0; i < 7; i++) original.next();
    const savedState = original.getState();

    const expectedNext = Array.from({ length: 10 }, () => original.next());

    const resumed = restorePrng(savedState);
    const resumedNext = Array.from({ length: 10 }, () => resumed.next());

    expect(resumedNext).toEqual(expectedNext);
  });

  it("stays within [0, 1) and nextInt respects bounds", () => {
    const prng = createPrng(42);
    for (let i = 0; i < 100; i++) {
      const value = prng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);

      const intValue = prng.nextInt(6);
      expect(intValue).toBeGreaterThanOrEqual(0);
      expect(intValue).toBeLessThan(6);
    }
  });
});
