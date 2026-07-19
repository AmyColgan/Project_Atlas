# PROJECT ATLAS: UNIFIED PROPOSAL — POST-MILESTONE-1 RESEARCH PHASE
## Synthesized by the Project Director from the 7-specialist review round

**Status: RESEARCH ONLY. No renderer replacement, migration, or gameplay implementation has begun.** This document synthesizes `docs/architecture/reviews/atlas-*.md` (all seven specialist files) into one proposal, per the phase instructions. Nothing here is authorized until the human Project Director approves it.

---

## 1. Recommended 3D Technology and Architecture

**Three.js, used imperatively — not react-three-fiber, Babylon.js, or PlayCanvas.** `atlas-3d-architect`'s rationale: `WorldRenderer` (`src/graphics/renderer/WorldRenderer.ts`) is already an imperative class-behind-an-interface (`init/resize/renderFrame/hexAtScreenPoint/destroy`), which is exactly Three.js's native usage pattern — R3F's component-tree model would fight that shape rather than fit it; Babylon/PlayCanvas expect to own more of the app shell than this codebase's asset/save boundaries assume.

**No breaking changes to `WorldRenderer`.** `WebGLWorldRenderer` would implement the existing interface verbatim. One additive, optional change is proposed: extending `CameraState` (currently `{x, y, zoom}`) with optional `tiltDeg?`/`orbitDeg?`/`heightZ?` fields that `CanvasWorldRenderer` simply ignores. `atlas-performance-engineer` independently confirmed this is architecturally sound and raises no objection to the technology choice itself.

**Terrain representation for the slice:** extruded hex prisms (height looked up per `TerrainType`), not a heightmap mesh — deliberately avoids depending on `atlas-world-designer`'s not-yet-approved elevation data, and requires zero changes to `map/hexGrid.ts` or `engine/types.ts`.

**The one substantive open call, not a technology disagreement:** all three of `atlas-game-director`, `atlas-3d-architect`, and `atlas-performance-engineer` independently arrived at the same underlying question from different angles — **the GDD never places rendering technology in any tier**, and `mvp_specification.md` §2 already permits "HTML5 Canvas API... or WebGL" for its existing, fully-2D visual requirements. A WebGL renderer that stays visually 2D/2.5D would satisfy the letter of the MVP spec at a fraction of the performance risk of true 3D (tilted camera, extruded geometry). This is not a specialist disagreement to referee — it's a scope decision only you can make (see §14).

---

## 2. Proposed Project Folder Structure

No new top-level folders are needed — this proposal fits entirely inside the existing structure:

```
src/graphics/renderer/
  WorldRenderer.ts            (unchanged interface)
  CanvasWorldRenderer.ts       (unchanged, stays default)
  WebGLWorldRenderer.ts        (new — implements WorldRenderer)
  createRenderer.ts            (one new case, already stubbed)
src/graphics/assets/
  assetManifest.ts             (new entries: material-kind assets for 3D)
src/map/hexGrid.ts             (terrain-gen body replaced; HexTile gains optional elevation?/moisture?/resourceDeposit? fields)
src/engine/types.ts            (Faction gains optional factionTrait?/governmentType?/leaderProfile?/interestGroups? fields; new LeaderProfile/InterestGroupState types)
src/engine/worldState.ts       (generalized from 1 hardcoded faction to N)
src/ui/
  setup/                       (new — title, civ-count, civ-selection, leader-identity, world-seed screens)
  HUD/                         (TopBar, InspectorPanel unchanged; one new camera-reset control if CameraState extension ships)
src/ui/state/simulationStore.ts (new action to instantiate an N-faction game from setup selections)
docs/architecture/reviews/      (this research round's raw specialist output — kept as historical record)
```

Every specialist confirmed their proposal fits existing folders; nobody requested new top-level directories.

---

## 3. Civilization Data Structure

From `atlas-civilization-designer`, cross-checked by `atlas-world-designer` and `atlas-character-writer` — **additive-only extension of the existing `Faction` interface**, so Milestone 1's already-committed save files keep deserializing with no migration:

```typescript
export type FactionTrait = "agrarian" | "metallurgist" | "mercantile" | "seafaring";
export type GovernmentType = "monarchy" | "republic" | "dictatorship";
// + MajorTrait, Weakness, GoverningPriority, DiplomaticTendency, MilitaryTendency,
//   PersonalAmbition, Fear, LongTermAmbition — enums matching civ_identity_ambitions_specification.md §2 exactly

export interface LeaderProfile {
  leaderName: string;
  majorTraits: [MajorTrait, MajorTrait];
  weakness: Weakness;
  governingPriority: GoverningPriority;
  diplomaticTendency: DiplomaticTendency;
  militaryTendency: MilitaryTendency;
  personalAmbition: PersonalAmbition;
  fear: Fear;
  longTermAmbition: LongTermAmbition;
  isPlayerControlled: boolean;
}

export type InterestGroupId = "military" | "merchants" | "farmers_workers" | "nobility" | "clergy" | "scholars";
export interface InterestGroupState { id: InterestGroupId; influence: number; loyalty: number; }

export interface Faction {
  id: string; name: string; color: string; cityIds: string[]; resources: ResourceStock; // unchanged
  factionTrait?: FactionTrait;
  emblemAssetKey?: string;
  governmentType?: GovernmentType;
  leaderProfile?: LeaderProfile;
  interestGroups?: InterestGroupState[]; // always length 6 when present
}
```

`isPlayerControlled` is the proposed minimal hook resolving the player-role question (§12 below) — exactly one `Faction` gets `true`, all others `false`; AI vs. human control differs only in which decision-maker drives the turn, not in data shape.

**One field is deliberately NOT owned by this structure:** `HexTile.resourceDeposit?: { type: "iron"|"wood"|"gold"; richness: number }` — proposed by civilization-designer to unblock world-designer's homeland scoring, but explicitly flagged by both as needing joint review before it lands in `hexGrid.ts` (see §10).

---

## 4. Procedural World and Homeland Approach

**World generation** (`atlas-world-designer`): replace `pickTerrain`/`generateHexMap`'s body with multi-octave Simplex noise (elevation + moisture fields), sampled via the existing `axialToPixel` for isotropic sampling, thresholded onto the **unchanged 4-value `TerrainType` enum** (no new biome types proposed this round — see open question). Signature of `generateHexMap` is preserved exactly.

**Homelands**: current single-faction, hardcoded-center `findEligibleStartTile` is replaced with a sector-partition + BFS + fairness-distance algorithm generalizing to 4–8 civilizations, scored by eligibility, land-buffer, and resource adjacency (pending the `resourceDeposit` field). A 2–3× candidate pool (up to ~24 for N=8) is generated internally for algorithmic robustness — **not** as a player-facing homeland-picker, since no such step exists in `mvp_specification.md` §3 (confirmed independently by `atlas-ui-ux-designer`).

**Determinism**: noise must be seeded from the existing `Prng` stream (not an unseeded library default). A real trade-off is flagged, not hidden: a noise-based generator consumes a fixed small number of PRNG draws regardless of map size, versus M1's current one-draw-per-tile — meaning **seed X's M1 world and seed X's M2 world will not match**. World-designer additionally recommends per-subsystem derived sub-seeds (terrain/homelands/resources/civs each getting an independently-derived child seed) rather than one shared sequential stream, which is more robust to reordering but **touches `PrngState`/save-file shape** — flagged as cross-cutting, not decided unilaterally.

---

## 5. New-Game and Civilization-Selection Experience

**New-game flow** (`atlas-ui-ux-designer`), scoped strictly to `mvp_specification.md` §3's four steps plus one explicitly-flagged addition:

1. **Title/Continue screen** (addition — needed to make the already-shipped `Load` button reachable; not in §3, called out rather than folded in silently)
2. **Civilization Count** (§3 step 1): 4–8 slider, default 5
3. **Civilization Selection/Generation** (§3 step 2): see below
4. **Leader Identity Selection** (§3 step 3): name + exactly 2 traits (player); full procedural profile silently generated for AI
5. **World Seed** (§3 step 4): custom integer or randomize
6. **Handoff**: a new store action instantiates N factions and mounts the existing, unchanged `App.tsx`/HUD tree

**Civilization-selection screen** — clean ownership split both `atlas-civilization-designer` and `atlas-ui-ux-designer` independently converged on without seeing each other's work: **civilization-designer owns the data** (what a preset contains, what's player-editable vs. procedural), **ui-ux-designer owns the screen** (preset-grid + custom-creation tabs + live preview, reusing the existing `InspectorPanel` color-driven styling precedent). Single-selection for the player's own civ; the remaining N−1 AI slots fill silently, matching §3's literal text.

**Explicitly out of scope, called out rather than silently added:** difficulty selection, map size, victory-condition toggles, homeland/starting-position picking, government type as a listed §3 step (though civ-designer recommends adding it — flagged, not assumed).

---

## 6. First 3D Vertical-Slice Scope

Per `atlas-3d-architect`, tightly bounded to prove the `WorldRenderer` abstraction survives a second implementation — **not** to build 3D gameplay:

**In scope:** one new `WebGLWorldRenderer.ts` file; the already-stubbed `"webgl"` case in `createRenderer.ts`; extruded hex prisms over the full existing 40×40 grid via `InstancedMesh`; one static-orbit camera; one directional + one ambient light; existing `AssetManager` keys resolved to flat-color/simple materials; hover highlight, click-select, and pulsing territory borders re-implemented to match M1's existing visual requirements.

**Definition of done:** load an existing save, render the same `WorldSnapshot` through `createRenderer("webgl")` instead of `"canvas2d"`, with correct picking/hover/select/borders, inside `atlas-performance-engineer`'s budgets (§11) — with zero changes to any file outside `graphics/renderer/` and `graphics/assets/`.

**Explicitly out of scope:** any change to `engine/`, `simulation/`, `ai/`, `gameplay/`, save system, or store beyond reading existing types; unit/army models; weather; day/night; multiple biome mesh variants; LOD; heightmap-driven terrain (sequenced after world-designer's elevation data, not parallel-built); replacing `CanvasWorldRenderer` as default.

---

## 7. Implementation Order

1. **Decide the open-scope question** (§1, §14) — whether true 3D proceeds at all, since it gates everything below it in priority (though not in code dependency).
2. **Lock shared-contract decisions** (§10): `HexTile` additive fields, `CameraState` extension approach, PRNG sub-seed strategy, `FactionTrait`/preset-count/custom-creation-surface approvals.
3. **In parallel once contracts are locked:** terrain noise generator; `Faction`/`LeaderProfile` type implementation; `WebGLWorldRenderer` vertical slice; performance instrumentation harness; biography template functions; new-game-flow screens (built against mocked data until real contracts land).
4. **Sequential integration points:** N-faction homeland placement (needs locked `HexTile.resourceDeposit`) → civilization/leader generation (needs locked `LeaderProfile`/`FactionTrait`) → new store action wiring setup flow to world creation (needs both of the above) → HUD orbit/tilt control (needs `CameraState` decision).
5. **Final:** physical-device performance pass on the vertical slice; GDD/spec addendum notes for whatever gets decided in §14.

---

## 8. Agent Ownership

| Area | Owner |
|---|---|
| 3D technology, `WebGLWorldRenderer`, vertical-slice scope | `atlas-3d-architect` |
| Terrain generation, homeland placement algorithm, PRNG/determinism | `atlas-world-designer` |
| Civilization/leader data structure, presets, custom-creation data contract | `atlas-civilization-designer` |
| New-game flow screens, civilization-selection presentation, HUD evolution | `atlas-ui-ux-designer` |
| Campaign biography templates | `atlas-character-writer` |
| Performance budgets, profiling harness, fallback/capability-probe logic | `atlas-performance-engineer` |
| Cross-discipline coherence, GDD-tier alignment, contradiction arbitration prep | `atlas-game-director` |
| Final synthesis, approval gating, human liaison | **Project Director (main session) — not a specialist** |

---

## 9. Systems That May Be Developed in Parallel

- Terrain noise generator (world-designer) — independent of civ-design track except the shared `resourceDeposit` field and PRNG strategy.
- `WebGLWorldRenderer` build-out (3d-architect) — depends on nothing from the civ/world track except the optional `CameraState` addition and an `AssetManager` manifest entry kind.
- Performance instrumentation (performance-engineer) — can start immediately against the current `CanvasWorldRenderer` baseline.
- Biography template functions (character-writer) — can be written against the proposed `LeaderProfile` shape as soon as it's approved, independent of UI work.
- New-game-flow screen layout (ui-ux-designer) — can be built against mocked preset/leader data before the real data layer lands, then wired once it does.
- Preset content authoring (civ-designer, 8 hand-written presets) — pure content work, parallel to everything once the `FactionTrait` enum is approved.

---

## 10. Systems That Must Be Developed Sequentially (Shared Contracts)

These require explicit sign-off before implementation, per the workflow's "shared-contract change" rule — not parallel work:

1. **`HexTile.resourceDeposit?`** — civilization-designer proposed the shape; world-designer owns the file it lives in (`hexGrid.ts`); both flagged this needs a joint pass, not a unilateral addition by either.
2. **`CameraState` extension** (`tiltDeg?`/`orbitDeg?`/`heightZ?`) — touches a type read by UI/camera code beyond the renderer; 3d-architect explicitly declined to decide this alone.
3. **PRNG derived-sub-seed strategy** — touches `PrngState`/`saveSystem.ts`'s save-file shape; affects every M2 subsystem that draws randomness (terrain, homelands, resources, civ/leader generation). Must be decided once, before any of those subsystems are built, not discovered mid-implementation.
4. **`FactionTrait` enum finalization** — blocks both preset authoring and custom-creation UI; currently only 2 of 4 proposed values are actually sourced in the specs.
5. **The new `simulationStore.ts` action** for N-faction game creation — depends on both civilization-designer's data shape and world-designer's homeland algorithm; ui-ux-designer explicitly deferred its internals pending both.

---

## 11. Performance Risks and Protections

Per `atlas-performance-engineer`, pressure-testing the 3d-architect's specific proposal (not 3D in the abstract):

- **No disagreement on technology** — `InstancedMesh` is confirmed correct for the draw-call risk. The real risk is *execution discipline*: every additional visual layer (borders, hover, selection, city markers) must independently commit to instancing or a shader technique, or draw calls creep back up.
- **Border/selection overlays are the highest-risk layer** — the one place "one mesh per tile" could silently reappear.
- **Concrete budgets proposed** (pending device-target sign-off, §14): 60fps/Tier-A, ≥30fps/Tier-B floor; ≤12 draw calls/frame (ceiling 20); ≤220KB gzip bundle delta, ideally code-split; ≤300ms TTI regression; ≤150ms (Tier A) / ≤400ms (Tier B) first-3D-frame shader-compile stall; ≤50MB texture / ≤150MB total GPU memory; zero per-frame heap allocation in the render loop.
- **Profiling strategy**: `renderer.info.*` + `performance.now()` percentile instrumentation, Chrome DevTools, Lighthouse in CI, a scripted Playwright perf check gating PRs touching `graphics/`, and a mandatory physical low-end device pass (throttling alone doesn't reproduce real driver-level shader-compile/context-loss behavior).
- **Fallback (strong recommendation, not a hedge): Canvas 2D stays the default** in `createRenderer` even after `WebGLWorldRenderer` exists. A capability probe (test WebGL2 context creation, a throwaway timed render, `hardwareConcurrency`/`deviceMemory` heuristics) picks the renderer at app level; `webglcontextlost` without recovery within a grace period tears down and falls back to Canvas 2D live. Because both renderers satisfy the same interface, this is a runtime call-site decision, not a re-architecture — the interface design already pays for this fallback.
- **Important reframing, not a disagreement**: "3D" and "WebGL" have been used interchangeably across reviews but are not the same performance question — a WebGL-but-visually-2D renderer would clear nearly every budget above trivially. The true-3D (tilted camera, extruded geometry) approach is what these specific risk numbers are about.

---

## 12. Conflicts With the Existing Project

- **GDD tier gap**: `game_design_document.md` §1 defines all four tiers purely by simulation/AI depth; rendering technology has no tier axis. "True 3D conversion" is therefore new scope, not a reinterpretation — it needs either a GDD addendum (matching the existing §4 self-correction precedent) or an explicit decision to keep it out of any tier for now.
- **Player-role gap (not a contradiction, but unresolved)**: GDD §1 says "the player directly controls one civilization"; the shipped M1 build is a single hardcoded faction with no player-command surface anywhere in `src/ui` (confirmed via grep — no `observer`/`player.*control`/`activeFaction` concept exists). Civilization-designer's read: this is pre-command-implementation, not a scope change, and proposes `isPlayerControlled` as the bridge. This should be explicitly confirmed rather than assumed.
- **Spec gaps surfaced, not caused by this proposal**: "Seafaring" is named as an example faction trait in `civ_identity_ambitions_specification.md` §1's diagram but never defined anywhere; the "LLMs limited to diplomacy wording, leader dialogue, historical summaries" boundary given as project context could not be found sourced verbatim in any doc the specialists read (the GDD's actual sourced boundary is coarser — LLMs are an Early-Access-stage feature overall, not itemized by text surface); `technical_architecture.md` says "Perlin/Simplex" while `milestone_roadmap.md` says "Perlin" specifically (minor wording inconsistency, not a real conflict).
- **No conflicts with shipped code were found that this proposal would force**: every specialist confirmed their proposed changes are additive/optional and preserve existing signatures (`generateHexMap`, `WorldRenderer`, `Faction`, `WorldSaveFile`).

---

## 13. Migration and Rollback Plan

- **Nothing has been migrated or replaced.** This entire research phase touched only `.claude/agents/` and `docs/` — `git status` on `feature/agent-system` confirms zero changes under `src/`. Milestone 1 at `4d926ba5` on `main` is untouched and fully shippable regardless of what happens with this proposal.
- **If implementation is approved**, recommend a further sub-branch (e.g. `feature/webgl-vertical-slice`) off `feature/agent-system` or `main`, so `main` stays shippable throughout.
- **Rollback is a one-line change, not a code revert**, by design: `createRenderer`'s default case stays `"canvas2d"` even after `WebGLWorldRenderer` ships (performance-engineer's explicit recommendation) — disabling 3D at any point is a default-case flip, not an undo of committed work.
- **Data-side rollback safety**: every proposed data-model change (`Faction`, `HexTile`) is additive/optional, so M1 save files (including the one already committed) keep deserializing with no migration script.
- **One exception, flagged explicitly**: if the PRNG derived-sub-seed strategy (§10.3) is adopted, that **does** change `PrngState`/save-file shape non-additively and would need its own versioned migration note — this is the one piece of this proposal that isn't a free rollback, and should be scoped separately if approved.

---

## 14. Exact Approval Decisions Needed From You

Grouped by theme; all 28 open questions raised across the seven reviews, deduplicated:

### Rendering & 3D scope
1. Does "true 3D conversion" get placed in a GDD tier, or stay unplaced for now (addendum needed either way)?
2. **The central question**: is true 3D (tilted camera, extruded geometry) actually required for the MVP tier, or does a WebGL-but-visually-2D renderer — or staying on Canvas 2D entirely — satisfy `mvp_specification.md` §2's letter at substantially lower performance risk? All three of game-director, 3d-architect, and performance-engineer independently raised a version of this.
3. If `WebGLWorldRenderer` is built, should it ever become the default, or stay a permanent opt-in with Canvas 2D as the fallback (performance-engineer's recommendation)?
4. `CameraState` extension: additive optional 3D fields (recommended) vs. a separate 3D camera type with an adapter layer?

### Data model & determinism
5. Approve additive `HexTile.elevation?`/`moisture?` fields?
6. Accept that seed X's M1 world and M2 world will differ once terrain generation changes PRNG draw count?
7. Adopt per-subsystem derived PRNG sub-seeds (touches save-file shape) vs. one shared sequential stream?
8. Add new biome types (e.g., Forest) to `TerrainType`, or keep the 4-value enum with resource-yield rules layered on top?
9. Confirm `HexTile.resourceDeposit?` gets a joint world-designer + civilization-designer review pass before landing.

### Civilization design
10. Confirm the GDD's "player directly controls one civilization" is the target state, with M1 accepted as pre-command-implementation (not a scope change).
11. Approve the `FactionTrait` enum (Agrarian/Metallurgist/Mercantile/Seafaring) or supply the canonical list — only 2 of these 4 are actually sourced in existing docs.
12. Approve authoring exactly 8 hand-made presets.
13. Approve government type as a player-choosable field at custom creation, even though it's not literally in `mvp_specification.md` §3.
14. Confirm the "name + 2 traits only" reading of the custom-creation surface, versus a broader reading exposing more fields.
15. Approve a colorPrimary/name uniqueness constraint per game.

### New-game flow & UX
16. Confirm the civilization-designer/ui-ux-designer ownership split (data vs. presentation) — both already assumed it independently.
17. Approve the title/continue screen as an explicit addition beyond `mvp_specification.md` §3.
18. Confirm homeland/starting-position stays fully automatic (no player-facing step) — both world-designer and ui-ux-designer converged on this reading but want it confirmed.
19. Should civilization-color-driven HUD theming (GDD §8C, currently unimplemented) be scoped into this phase or deferred?
20. Design the orbit/tilt HUD control now, or defer until the `CameraState` decision (#4) is actually made?

### Narrative
21. Does the player's own leader get a biography preview during setup (requiring a backfill-vs-degrade decision), or do only AI leaders get biographies?
22. Accept the proposed character-writer/civilization-designer split: civ-designer owns which fields exist, character-writer owns the template/text layer?
23. Should the LLM-usage boundary phrasing given as project context be formally added to the GDD via addendum, since it wasn't found sourced in any document?
24. Is a biography preview/reroll interaction in scope for this phase, or should biographies ship display-only?

### Performance & platform
25. Is mobile-web support even an MVP goal? No device/platform target exists in any current spec.
26. Should the ≤220KB gzip bundle budget be a hard CI-enforced gate, or a soft warning?
27. Does the vertical slice's definition-of-done require a physical low-end device pass, or is throttled-desktop-only acceptable?
28. Should `CanvasWorldRenderer` be guaranteed long-term maintained as a permanent fallback, or allowed to bit-rot if 3D ships?

---

*Stopping here per phase instructions. No implementation, migration, or renderer replacement begins until you respond to the above.*
