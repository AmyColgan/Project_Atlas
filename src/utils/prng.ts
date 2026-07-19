export interface PrngState {
  seed: number;
}

export interface Prng {
  next(): number;
  nextInt(maxExclusive: number): number;
  nextRange(min: number, maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  getState(): PrngState;
}

function mulberry32(state: { a: number }): () => number {
  return () => {
    state.a |= 0;
    state.a = (state.a + 0x6d2b79f5) | 0;
    let t = Math.imul(state.a ^ (state.a >>> 15), 1 | state.a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPrng(seed: number): Prng {
  const state = { a: seed };
  const random = mulberry32(state);

  return {
    next: () => random(),
    nextInt: (maxExclusive: number) => Math.floor(random() * maxExclusive),
    nextRange: (min: number, maxExclusive: number) => min + Math.floor(random() * (maxExclusive - min)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)],
    getState: (): PrngState => ({ seed: state.a }),
  };
}

export function restorePrng(state: PrngState): Prng {
  return createPrng(state.seed);
}
