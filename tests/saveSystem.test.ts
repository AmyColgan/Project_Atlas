import { describe, expect, it } from "vitest";
import { createTestWorld } from "../src/engine/worldState";
import { deserializeWorld, serializeWorld } from "../src/engine/saveSystem";

describe("save system round-trip", () => {
  it("reproduces an identical world after serialize/deserialize", () => {
    const world = createTestWorld(2024);
    const saved = serializeWorld(world, 1700000000000);
    const restored = deserializeWorld(saved);

    expect(restored.seed).toBe(world.seed);
    expect(restored.turn).toBe(world.turn);
    expect(restored.factions).toEqual(world.factions);
    expect(restored.cities).toEqual(world.cities);
    expect(restored.map.size).toBe(world.map.size);

    for (const [key, tile] of world.map.entries()) {
      expect(restored.map.get(key)).toEqual(tile);
    }
  });

  it("createTestWorld is deterministic for a given seed", () => {
    const worldA = createTestWorld(555);
    const worldB = createTestWorld(555);

    expect(worldA.cities).toEqual(worldB.cities);
    expect(worldA.factions).toEqual(worldB.factions);
    expect(Array.from(worldA.map.values())).toEqual(Array.from(worldB.map.values()));
  });
});
