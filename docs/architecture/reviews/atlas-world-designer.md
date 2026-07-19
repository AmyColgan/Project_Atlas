# Atlas World Designer — Review

Scope per `.claude/agents/atlas-world-designer.md`: procedural world/terrain generation to replace the Milestone 1 placeholder in `src/map/hexGrid.ts`, starting-homeland placement (`findEligibleStartTile` in `src/engine/worldState.ts`), and deterministic PRNG integration for both. Research/design only — no code touched; grounded in `src/map/hexGrid.ts`, `src/engine/worldState.ts`, `src/utils/prng.ts`, `src/engine/types.ts`, `src/utils/hex.ts`, `docs/architecture/technical_architecture.md` §5, `docs/roadmap/milestone_roadmap.md` (M2), and `docs/specifications/mvp_specification.md`.

---

## Procedural World Generation Proposal

**Algorithm.** Replace `pickTerrain`/`generateHexMap`'s body with fractal (multi-octave) **Simplex** noise for elevation — the roadmap says "Perlin/Simplex" (`technical_architecture.md` §5) and "Perlin noise" (`milestone_roadmap.md` M2); I'm treating these as the same requirement and picking Simplex specifically because it has no axis-aligned artifact bias (a known Perlin weakness) and is cheaper per-sample at 2D, which matters at 40×40 = 1,600 tiles evaluated per world generation. Concretely:

- Sample coordinates: feed each tile's existing `axialToPixel(coord, hexSize)` (already in `src/utils/hex.ts`) into the noise function rather than raw `q`/`r` — this keeps sampling isotropic in world space instead of skewed by the axial lattice.
- Elevation: 4–5 octaves, persistence ≈ 0.5, lacunarity ≈ 2.0, base frequency tuned so the 40×40 grid shows a handful of landmasses/mountain ranges rather than salt-and-pepper noise (frequency roughly `1 / (mapWidth * 0.35)` as a starting point, tunable).
- Moisture: a second, independent noise field at lower frequency (larger features), used only for threshold nuance (e.g., damp Hills vs. dry Hills) — not for new terrain types yet, see Open Questions.
- Thresholds mapping continuous elevation `[0,1)` to the **existing** `TerrainType` enum, illustrative starting values: `ocean < 0.32`, `plains 0.32–0.58`, `hills 0.58–0.78`, `mountains ≥ 0.78`. These replace the current flat 55/20/15/10 weight table but should land close to the same overall proportions for M1→M2 visual continuity.

**Contract preservation.** `generateHexMap(config: MapConfig, prng: Prng): HexMap` keeps its exact signature and return type — nothing outside `map/` needs to change, exactly as `technical_architecture.md` §5 promises. `HexTile`'s required fields (`coord`, `terrain`, `ownerFactionId`) are untouched.

**Proposed additive field.** I recommend adding two **optional** fields to `HexTile`: `elevation?: number` (raw `[0,1)` noise value pre-threshold) and `moisture?: number`. This is backward-compatible (optional, additive) and is the one contract change I'm proposing — it exists specifically so a future terrain mesh/renderer or resource-placement logic can use continuous height/wetness instead of just the 4-way discrete enum. See Contradictions below — this directly answers `atlas-3d-architect`'s open dependency question.

**New biome types?** I am **not** proposing new `TerrainType` values (e.g. Forest, Desert) in this pass. The current 4-value enum is a hard contract several other files depend on (`isHexEligibleForCity`, renderer terrain-key lookups, `AssetManager` manifest keys `terrain.plains` etc.). `mvp_specification.md` §7 does mention "Forests" as a Wood source distinct from Hills/Flatlands, which the current enum can't express — flagged as an open question rather than resolved unilaterally, since it's a resource/gameplay call as much as a terrain-generation one.

---

## Starting Homeland Placement

Current `findEligibleStartTile` (`src/engine/worldState.ts:17-36`) is a single-faction BFS outward from one hardcoded map-center coordinate — it works for M1's one-faction test world but does not generalize to 4–8 civilizations (`mvp_specification.md` §1) or fairness.

**Proposed algorithm:**
1. **Sector partitioning.** For N civilizations, divide the map into N angular sectors around the map center (like slices of a pie over the hex grid's bounding pixel-circle), each sector's centroid becoming a BFS seed point — this guarantees baseline angular spacing without needing an iterative rejection sampler.
2. **Per-sector candidate search.** Within each sector, BFS outward from the sector centroid (reusing the existing `hexNeighbors`-frontier pattern already in `findEligibleStartTile`) collecting the first *K* eligible tiles (not just the first one), scored by:
   - Base eligibility: `isHexEligibleForCity` (unchanged, reused as-is).
   - Land buffer: not adjacent to more than 2 ocean tiles (avoid coastal slivers/peninsulas that cramp early expansion).
   - Resource adjacency: count of eligible resource deposits within radius 2–3 — **this requires a per-tile resource-deposit field that does not exist in `engine/types.ts` today**; I'm flagging this as a dependency on `atlas-civilization-designer`'s data model rather than inventing one, per the ground rule against resolving other specialists' territory myself.
3. **Fairness pass.** After each sector produces its best candidate, run a pairwise minimum-hex-distance check across all N chosen tiles (e.g., require distance ≥ `mapDiameter / (N * 1.5)`); if two sectors' candidates are too close (can happen near the center on a 40×40 grid with 8 sectors), re-run BFS from the second-best-scored candidate in the losing sector.
4. **Candidate pool size for a selection screen.** I recommend generating **2–3× the maximum civilization count (i.e., up to ~24 candidates for N=8)** internally, not just N — this gives the fairness pass slack to reject poor candidates (small islands, resource-poor tiles) without needing to re-run the expensive sector search from scratch. Note: `mvp_specification.md` §3's new-game flow has no step where the player picks a homeland location — civilization selection there is about identity (name/color/trait), not geography — so this candidate pool is for the *algorithm's* internal robustness, not a UI-facing choice, unless the Project Director decides otherwise (see Open Questions).

**Multi-faction generalization.** `createTestWorld` currently hardcodes `faction-0`/one city. Generalizing this to loop over N factions calling the new placement algorithm is straightforward, but instantiating N `Faction`/`City` objects with correct starting resources/trait bonuses is `atlas-civilization-designer` territory — I'm scoping my proposal to "which tiles get chosen and why," not "what gets instantiated on them."

---

## Determinism & PRNG Integration

**Noise must be seeded from the same `Prng`, not an unseeded library default.** Concretely: use the existing `Prng.next()` stream to build the noise permutation table at generation start (the standard technique most JS simplex-noise libraries expose via an injectable random source), so identical `seed` → identical permutation table → identical terrain, satisfying the project's deterministic-replay requirement (`saveSystem.ts` already persists `prngState` for exactly this reason).

**Stream-consumption warning (important, not yet resolved).** The current `generateHexMap` consumes exactly `rows * columns` calls of `prng.next()` (one per tile, via `pickTerrain`). A noise-based generator consumes a *fixed, small* number of calls (enough to seed the permutation table) regardless of map size — it does not draw once per tile. This means:
- Any code downstream of `generateHexMap` that currently relies on the shared `prng` being at a specific stream position (there is none yet in M1, but M2 adds resource scatter, civ generation, and leader generation per `milestone_roadmap.md` M2, all likely drawing from the same seed) will get **different results per seed** than if terrain generation still consumed one call per tile.
- This is expected and acceptable — the docs already state M2 replaces this function's body — but it means **seed X's M1 world and seed X's M2 world will not match**, which is worth an explicit sign-off rather than a silent side effect, especially since M6's replayability protocol (`docs/qa/replayability_variability_protocol.md`) will be validating statistical divergence *between* seeds, not continuity of a single seed across milestones.

**Recommendation: per-subsystem derived sub-seeds, not one shared sequential stream.** Rather than having terrain generation, resource scatter, homeland placement, civ generation, and leader generation all draw from one mutable `Prng` instance in a fragile, order-dependent sequence (where adding/reordering any one system silently perturbs every system after it), I recommend deriving an independent child seed per subsystem, e.g. `deriveSeed(masterSeed, "terrain")`, `deriveSeed(masterSeed, "homelands")`, `deriveSeed(masterSeed, "resources")` (a simple seed-mixing function, e.g. splitmix-style hash of `masterSeed` + a string tag), each producing its own `Prng` via the existing `createPrng`. This:
- Keeps each subsystem's output stable even if unrelated subsystems are added, removed, or reordered later in M2–M6.
- Is a bigger change than my scope alone should decide, because it touches `PrngState`/save-file shape (currently `{ seed: number }` singular) — `saveSystem.ts` would need to persist an array/map of subsystem states instead of one. Flagging as a cross-cutting decision for the Project Director, not assuming it myself.

---

## Contradictions or Disagreements Found

1. **Directly answers `atlas-3d-architect`'s open dependency (their Contradictions §4).** They deliberately scoped their vertical slice to discrete extruded-hex-prisms keyed only off `TerrainType`, specifically to avoid depending on unreviewed elevation data from me. My proposal (optional `elevation?`/`moisture?` fields on `HexTile`) is **additive and non-breaking** — their discrete-height-lookup-per-`TerrainType` approach remains fully valid and requires no changes. Whether to later upgrade their extruded-prism slice to use continuous `elevation` for smoother terrain is a separate, later decision that doesn't block either proposal.
2. **Minor doc inconsistency, not a real conflict:** `technical_architecture.md` §5 says "Perlin/Simplex" while `milestone_roadmap.md` M2 says "Perlin noise heightmaps" specifically. I'm proposing Simplex under the umbrella the architecture doc already permits; flagging in case the Project Director intended "Perlin" literally.
3. **Unresolved dependency on `atlas-civilization-designer`** (running in parallel, output not visible to me): resource-adjacency scoring in homeland placement needs a per-tile resource-deposit data shape that doesn't exist in `engine/types.ts` today. I have not invented one — this is explicitly their data-model territory per the role split, and my placement algorithm has a hole where that scoring criterion goes until their proposal exists.
4. **Overlap boundary, not a conflict:** `createTestWorld`'s hardcoded single-faction setup needs generalizing to N factions for M2, but "what a Faction/City is instantiated with" (starting resources, trait bonuses) is civilization-designer territory. I've scoped my proposal to tile selection only.

---

## Open Questions for the Project Director

1. Approve the additive `elevation?: number` / `moisture?: number` fields on `HexTile`? This is the only data-contract change in this proposal, and it's designed to be safe for `atlas-3d-architect`'s current plan either way.
2. Is it acceptable that a given seed's M1 world and M2 world will differ (since replacing `pickTerrain`'s body changes how many PRNG draws terrain generation consumes)? The docs imply yes but I'd like this confirmed rather than assumed.
3. Should M2 move to per-subsystem derived PRNG sub-streams (my recommendation, touches `PrngState`/save-file shape) or keep one shared sequential stream with a strictly documented draw order across all M2 systems? This is a cross-cutting decision that affects `saveSystem.ts` ownership, not mine alone to make.
4. Should new biome types (e.g., Forest, distinct from `mvp_specification.md` §7's Wood-from-Forests vs. current Hills-only Iron/Wood split) be added to `TerrainType` in M2, or is the 4-value enum staying fixed with resource-yield rules layered on top instead? This is a resource/gameplay-design call I'm flagging, not resolving.
5. Does the new-game flow ever expose homeland/starting-position choice to the player, or is placement purely automatic per `mvp_specification.md` §3 (which lists no such step)? This determines whether my proposed 2–3× candidate pool is purely an internal fairness-algorithm detail or needs to surface as UI, which would put it in `atlas-ui-ux-designer` territory too.
