# Atlas Civilization Designer — Review

Scope per `.claude/agents/atlas-civilization-designer.md`: civilization selection (data/backend side), custom civilization creation, and the civilization data structure. Research/design only — no code touched; grounded in `src/engine/types.ts`, `src/engine/saveSystem.ts`, `src/engine/worldState.ts`, `docs/specifications/civ_identity_ambitions_specification.md`, `docs/specifications/internal_politics_specification.md`, `docs/specifications/government_types_specification.md`, `docs/specifications/mvp_specification.md`, and `docs/design/game_design_document.md`.

**Ownership note (coordination with `atlas-ui-ux-designer`):** per `atlas-game-director`'s review (Contradiction #1) and `MULTI_AGENT_WORKFLOW.md` §1's role table, both of us are scoped to "civilization selection." I am explicitly **not** proposing screen layout, click flow, panel arrangement, or visual treatment anywhere in this document — that is `atlas-ui-ux-designer` territory. Everything below is the *data* a selection/creation screen would read from and write into: what a preset contains, what fields are player-editable vs. procedurally locked, and the concrete TypeScript shape backing both. Where I mention "screen" or "step," I mean it only as a UI-agnostic sequence of data decisions, not a layout recommendation.

---

## Civilization Selection Proposal

`mvp_specification.md` §3 already specifies the new-game sequence: (1) civ count 4–8, (2) civilization selection/generation — preset or random, assigning Name/Color/Faction Trait, (3) leader identity selection, (4) world seed. This proposal fills in what step (2) and (3) actually contain as data, without adding steps beyond that four-item list (per `atlas-game-director`'s Recommendation 3).

### What a preset contains
A preset is a **static, hand-authored `CivilizationPreset` record**, not a randomly-generated one — it exists so the player has recognizable, curated choices at new-game time distinct from "Generate Random." Each preset bundles:

- `id`, `displayName` (e.g., "Rome"), `colorPrimary` (hex, matches existing `Faction.color` domain).
- `emblem`: an asset-manifest key (string), not inline art — consistent with how `atlas-3d-architect`'s and `atlas-world-designer`'s reviews treat `AssetManager` keys as the existing indirection pattern for renderer assets. I am not choosing the emblem *rendering* mechanism (SVG/canvas/sprite) — that's a UI/renderer concern.
- `factionTrait`: one of the enumerated trait values already implied by `mvp_specification.md` §3.2 (*Agrarian* +10% Food, *Metallurgist* +10% Iron) — this list needs at least one more entry to feel like a real choice; I recommend a small fixed set (Agrarian, Metallurgist, Mercantile-adjacent "Seafaring" per `civ_identity_ambitions_specification.md` §1's diagram, which already name-drops "Seafaring" as an example faction trait even though §2 never defines it as a leader trait — flagging this gap, see Contradictions).
- `defaultLeaderProfile`: a **fully pre-filled** `LeaderProfile` (see Data Structure below) using the exact vocabulary of `civ_identity_ambitions_specification.md` §2 (2 Major Traits, 1 Weakness, 1 Governing Priority, 1 Diplomatic Tendency, 1 Military Tendency, 1 Personal Ambition, 1 Fear) plus a starting `longTermAmbition` from §3. This is what makes a preset feel like a designed civilization rather than a reskinned color swap — picking "Rome" should mean picking a specific, curated leader personality, not just a name and flag.
- `defaultGovernmentType`: one of `Monarchy | Republic | Dictatorship` per `government_types_specification.md`.

### How many presets Milestone-scope requires
`mvp_specification.md` §1 caps civ count at 8. I recommend authoring **8 presets minimum** — enough that an 8-civ game never has to fall back to "Generate Random" for every AI slot, and the player always has a real curated choice too. This is a content-authoring task (writing 8 name/trait/leader-profile bundles), not an engine change, and can proceed independently of any other specialist's work once the data shape below is approved.

### "Generate Random" path
When the player (or an AI slot) chooses random instead of a preset, the same `CivilizationPreset` shape is produced procedurally: name from a prefix/root/suffix generator (per `milestone_roadmap.md` M2's "Procedural Civilization Generator"), trait chosen from the same fixed enum, leader profile rolled per `civ_identity_ambitions_specification.md` §2's "choose N of category" structure, seeded from the same per-game PRNG the world generator uses (coordinating with `atlas-world-designer`'s recommendation for derived per-subsystem sub-seeds — I support that recommendation; civ/leader generation should be its own derived stream, e.g. `deriveSeed(masterSeed, "civs")`, so reordering terrain generation doesn't silently change which civilizations get rolled).

### Selection-time data contract (for `atlas-ui-ux-designer`)
Whatever screen UI/UX designs, it needs from this layer:
- A read-only list of `CivilizationPreset[]` to render as choices.
- A `generateRandomPreset(seed, excludeColors, excludeNames): CivilizationPreset` function signature to call for "random" or for filling unclaimed AI slots.
- A validation rule: no two civilizations in the same game may share `colorPrimary` (a hard uniqueness constraint the UI must enforce or the engine must reject) — this is not stated anywhere in the specs today and needs explicit adoption, see Open Questions.

---

## Custom Civilization Creation Proposal

Per `mvp_specification.md` §3.3, the player picks a name and 2 personality traits; AI opponents get a fully procedural profile (2 traits, 1 weakness, 1 governing priority, 1 diplomatic tendency, 1 military tendency, 1 ambition, 1 fear). I read this as meaning: **the player's custom-creation surface is currently spec'd as narrower than the full leader profile** — only name + 2 traits are player-facing in the MVP spec's literal text. I recommend keeping the MVP-scope custom-creation surface intentionally narrow rather than exposing every field in `civ_identity_ambitions_specification.md` §2, for two reasons: (a) exposing weakness/fear/ambition as player picks risks the player optimizing them as difficulty sliders rather than the emergent, procedurally-discovered flavor they're designed to be for AI civs; (b) it matches the literal spec text rather than silently expanding it.

### What the player can customize (proposed MVP surface)
1. **Leader name** (free text, validated non-empty, length-capped).
2. **2 Major Traits** (player picks from the 10-item enum in `civ_identity_ambitions_specification.md` §2A) — matches spec exactly.
3. **Civilization name** (free text) and **`colorPrimary`** (from a fixed palette or color picker — UI's call) — matches `mvp_specification.md` §3.2's "Name, Primary Map Color."
4. **Faction Trait** (one pick from the fixed enum — Agrarian/Metallurgist/etc.) — matches §3.2.
5. **Government type** (Monarchy/Republic/Dictatorship) — the MVP spec's §3 doesn't explicitly list this as a player choice, but `government_types_specification.md` §4 says "Government type is set at civilization creation," and leaving it un-set would mean either an arbitrary default or an ungoverned civilization. I recommend making it player-choosable as a natural §3.2-adjacent addition, flagged explicitly as **beyond the MVP spec's literal four-step list** per `atlas-game-director`'s Recommendation 3 (call it out to the human, don't fold it in silently).

### What stays procedurally generated (not player-facing at creation)
- **Weakness** (1, from §2B) — rolled.
- **Governing Priority** (1, from §2C) — rolled.
- **Diplomatic Tendency + Military Tendency** (1 each, §2D) — rolled.
- **Personal Ambition + Fear** (1 each, §2E) — rolled.
- **Long-Term Ambition** (§3) — derived from the rolled profile + starting geography per §3's own rule ("assigned based on their profile and starting geography"), so it cannot be player-picked even in principle until geography exists (post `atlas-world-designer`'s homeland placement).
- **Interest-group starting Influence/Loyalty values** (`internal_politics_specification.md` §1) — all six groups start at engine-defined defaults, not player-tunable at creation; this keeps the civ-identity system's "friction," in the GDD's words, undesigned-away by a min-maxing player.
- **Emblem** — for a custom civ, either a small fixed emblem set to choose from or a procedurally assigned one; I'm flagging this as a UI-asset decision, not resolving it myself.

### Open item this section surfaces
The 2-traits-only player surface means a player-created civ's weakness/fear/ambition are just as opaque to the player as an AI's — the player discovers their own leader's weakness through play, same as they'd discover an AI's. This is a deliberate design read of the spec, not an obvious one; flagged in Open Questions for explicit sign-off since it materially affects how "custom" custom creation feels.

---

## Civilization Data Structure

The current `Faction` interface (`src/engine/types.ts:20-26`) is a 5-field engine-minimum shape: `id`, `name`, `color`, `cityIds`, `resources`. It has **no leader, no government, no interest-group state, no trait** — everything the identity/politics/government specs describe is currently unimplemented in the data model. `saveSystem.ts`'s `WorldSaveFile` serializes `Faction[]` directly with no transformation (`serializeWorld`/`deserializeWorld` just pass the array through), and `WorldSnapshot` (`types.ts:37-42`) exposes `factions: readonly Faction[]` straight to the renderer.

### Proposed approach: additive, optional extension — not a breaking rewrite
I propose extending `Faction` with new **optional** fields, mirroring the additive pattern `atlas-world-designer` used for `elevation?`/`moisture?` on `HexTile`. This is deliberately conservative:

```typescript
// Extends the existing Faction in src/engine/types.ts — all new fields optional
// so M1 save files (Faction objects with only the 5 current fields) still
// deserialize without migration: JSON.parse'd objects simply have `undefined`
// for fields that don't exist in an old save.

export type FactionTrait =
  | "agrarian" | "metallurgist" | "mercantile" | "seafaring"; // fixed enum, extensible

export type GovernmentType = "monarchy" | "republic" | "dictatorship";

export type MajorTrait =
  | "ambitious" | "cautious" | "diplomatic" | "vindictive" | "mercantile"
  | "expansionist" | "traditionalist" | "innovative" | "militaristic" | "isolationist";

export type Weakness =
  | "indecisive_in_war" | "poor_economic_judgment" | "vulnerable_to_unrest"
  | "paranoid" | "stubborn";

export type GoverningPriority =
  | "infrastructure" | "treasury_maximization" | "armed_forces_expansion" | "scientific_breakthroughs";

export type DiplomaticTendency = "alliance_builder" | "opportunistic_pact_breaker";
export type MilitaryTendency = "attrition_warfare" | "scorched_earth";
export type PersonalAmbition = "hoard_wealth" | "uncover_sciences";
export type Fear = "fear_of_starvation" | "fear_of_encirclement";

export type LongTermAmbition =
  | "unite_continent" | "control_iron_range" | "wealthiest_merchant"
  | "scientific_hegemony" | "autarky" | "protect_ally" | "destroy_rival";

export interface LeaderProfile {
  leaderName: string;
  majorTraits: [MajorTrait, MajorTrait]; // exactly 2, per spec §2A
  weakness: Weakness;
  governingPriority: GoverningPriority;
  diplomaticTendency: DiplomaticTendency;
  militaryTendency: MilitaryTendency;
  personalAmbition: PersonalAmbition;
  fear: Fear;
  longTermAmbition: LongTermAmbition;
  isPlayerControlled: boolean; // false for AI leaders — see Player-Role Reconciliation
}

export type InterestGroupId =
  | "military" | "merchants" | "farmers_workers" | "nobility" | "clergy" | "scholars";

export interface InterestGroupState {
  id: InterestGroupId;
  influence: number; // 0.0–1.0, per internal_politics_specification.md §1
  loyalty: number;   // 0–100
}

export interface Faction {
  id: string;
  name: string;
  color: string;
  cityIds: string[];
  resources: ResourceStock;

  // --- New, optional fields (Milestone 2+) ---
  factionTrait?: FactionTrait;
  emblemAssetKey?: string;
  governmentType?: GovernmentType;
  leaderProfile?: LeaderProfile;
  interestGroups?: InterestGroupState[]; // always length 6 when present, per spec §1
}
```

### Why optional, not required
- `saveSystem.ts`'s `deserializeWorld` does a straight `JSON.parse` cast to `WorldSaveFile` with no per-field migration logic today. Making these fields required would make every M1 save file (including the one already committed at `4d926ba5`) fail to satisfy the type the moment `strict` checks run against loaded data, or silently produce `undefined` government/leader state that downstream code must null-check anyway. Optional fields make that null-checking explicit and match the current codebase's total absence of a save-version migration path (`WorldSaveFile.version` is a literal `1` with no migration function anywhere in `saveSystem.ts`).
- `WorldSnapshot` and the renderer consume `factions` directly; adding optional fields changes nothing for `atlas-3d-architect`'s or the existing `CanvasWorldRenderer`'s current terrain-keyed rendering, since neither reads these fields today. This is a non-breaking, additive contract change, consistent with `MULTI_AGENT_WORKFLOW.md` §2's "must not make overlapping edits" — it doesn't touch renderer code or force any other specialist's proposal to change.

### Resource-deposit dependency flagged by `atlas-world-designer`
Their review explicitly flags an open dependency: homeland-placement scoring needs "a per-tile resource-deposit field that does not exist in `engine/types.ts` today" and states they deliberately did not invent one, deferring to me. Addressing it directly:

- I propose a **`HexTile`-level, not `Faction`-level**, addition: `resourceDeposit?: { type: "iron" | "wood" | "gold"; richness: number }` (richness `0–1`, analogous to their `elevation`/`moisture` pattern). This lives in `src/map/hexGrid.ts`'s `HexTile` interface, not in `Faction` — resource deposits are a property of terrain/geography, not of the civilization that may or may not own that tile yet. I want to be precise that this is **not my file to edit or finalize alone**: `HexTile` is `atlas-world-designer`'s territory (they own procedural world generation and already proposed the `elevation?`/`moisture?` precedent on the same interface). I'm proposing the shape here because they asked for it and it's genuinely a civ/resource-model question (what deposit types exist, tied to the 3 non-Food resources in `mvp_specification.md` §7 — Wood, Iron, Gold — Food is harvested from terrain generally, not a discrete deposit), but the field should land in their file, reviewed by both of us, not unilaterally by either.
- This directly unblocks their homeland-placement "resource adjacency" scoring criterion (their §2, step 2): a homeland-placement BFS can now count `resourceDeposit` hits within radius 2–3 once this field exists.
- Deposit **richness/type generation** (where deposits get scattered, at what density) is `atlas-world-designer`'s "Resource scatter clustering scripts" per `milestone_roadmap.md` M2 — I'm proposing the data shape only, not the scatter algorithm.

---

## Player-Role Reconciliation

There is a real, unresolved contradiction between two authoritative sources:

- `game_design_document.md` §1: "The player **directly controls one civilization**, competing against 3 to 7 autonomous, rule-based AI civilizations."
- The shipped Milestone 1 build (`createTestWorld` in `worldState.ts`, confirmed via `src/ui/`): a **single hardcoded faction**, no player-input affordances tied to that faction distinctly from the world itself, no new-game screen, and no concept of a "player faction ID" anywhere in `WorldState`, `Faction`, or the UI layer I can find (`grep` across `src/ui` for `observer`/`player.*control`/`activeFaction` returns nothing relevant). The current build renders and lets the user pan/zoom/inspect a single-civilization world — it does not yet let the user *act* as that civilization at all. This is closer to a tech-demo/observer mode than "directly controls," simply because M1's scope (per `milestone_roadmap.md`) never asked for player commands to exist yet.

**This design assumes the GDD's framing is correct and M1 is simply pre-command-implementation, not a redefinition of the player's role.** Concretely:
- `LeaderProfile.isPlayerControlled: boolean` (proposed above) exists specifically to mark exactly one `Faction` in `WorldState.factions[]` as player-controlled per game — this is the minimal data hook needed for "the player directly controls one civilization" to become true once command-issuing UI exists (§5 of `mvp_specification.md` already lists the exact commands: `setLaborAllocation`, `queueConstruction`, `selectResearchNode`, `proposeTrade`, `declareWar`, `proposeAlliance`, `queueUnitMovement`, `setTaxRate` — all of which need to resolve "which faction is this the player's" before they can execute against the right `Faction` in `WorldState`).
- I am **not** proposing a separate "player mode" vs. "AI mode" split at the data-structure level — a `Faction` with `leaderProfile.isPlayerControlled = true` still has the exact same shape as an AI's; only which decision-maker (human input vs. utility-scoring AI per `mvp_specification.md` §6) drives its turn differs. This keeps the data structure uniform and avoids a parallel "PlayerFaction" type that would fork serialization logic in `saveSystem.ts`.
- Civilization *selection* (this document's first section) is the point at which `isPlayerControlled` gets assigned — whichever preset/custom civ the player configures in new-game setup becomes the one `Faction` with the flag set true; all other slots (filled by preset or random per civ count) get `false`.

I am treating this as the design assumption going forward rather than an open question, because the GDD text is unambiguous and M1's silence on player commands reads as "not yet built" rather than "decided otherwise" — but I flag it explicitly per the assignment's instruction, since it is a real, currently-unresolved gap between a design doc and a shipped build, and the human Project Director should confirm rather than have it assumed silently.

---

## Contradictions or Disagreements Found

1. **Overlap with `atlas-ui-ux-designer` on "civilization selection" (structural, not yet observed as a stated conflict).** Per `atlas-game-director`'s Contradiction #1 and my own reading of `MULTI_AGENT_WORKFLOW.md` §1's role table, both role descriptions contain the literal phrase "civilization selection." I have scoped this document strictly to the *data* side (preset contents, player-editable vs. procedural fields, the `CivilizationPreset`/`Faction`/`LeaderProfile` shapes, and the read-only data contract a selection screen would consume) and explicitly avoided proposing screen layout, click sequencing, or visual design anywhere above. If `atlas-ui-ux-designer`'s review (not visible to me) also proposes data fields for presets or creation, the Project Director should reconcile field-for-field against the shapes in this document rather than merging two independently-invented schemas.
2. **Dependency owed to `atlas-world-designer`, addressed above, not fully resolved by me alone.** Their review flags a hole in their homeland-placement algorithm needing a per-tile resource-deposit field. I've proposed a concrete shape (`HexTile.resourceDeposit?`) in the Data Structure section above, but note it lives in *their* file (`hexGrid.ts`) and should be co-reviewed, not unilaterally added by either of us per `MULTI_AGENT_WORKFLOW.md` §2's overlapping-edits rule.
3. **Unresolved naming gap in the civ-identity spec itself.** `civ_identity_ambitions_specification.md` §1's diagram lists "Seafaring" as an example **Faction Trait** (alongside Agrarian, Metallurgist), but §2A's Major Traits enum (the *leader* trait list) has no "Seafaring" entry, and no section of that document actually enumerates the full Faction Trait set — only `mvp_specification.md` §3.2 gives two examples (Agrarian, Metallurgist) via "e.g." I had to invent a 4th value ("mercantile" as a faction trait, separate from the identically-named leader Major Trait) to reach a usable enum size for presets. This is a genuine spec gap, not a contradiction between specialists — flagged for the human/spec-owner, not resolved unilaterally by me.
4. **Possible tension with `atlas-character-writer`'s territory (per `atlas-game-director`'s Contradiction #3, not directly observed since character-writer's output isn't visible to me).** My "2 traits only" custom-creation surface (Custom Creation section above) means a player-made leader has the same undisclosed weakness/fear/ambition as an AI leader. If `atlas-character-writer` assumes every leader (including player-made ones) gets a pre-game biography that would reveal or hint at these rolled fields, that could undercut the "player discovers their own leader's weakness through play" design intent stated above. Not a confirmed conflict — flagged because the two proposals intersect exactly at this point, per game-director's own flag.

---

## Open Questions for the Project Director

1. **Player-role reconciliation:** confirm that the GDD's "player directly controls one civilization" is the target state and M1's observer-style build is accepted as pre-command-implementation, not a scope change — per the Player-Role Reconciliation section above. This affects whether `LeaderProfile.isPlayerControlled` is the right minimal hook or whether a different mechanism is wanted.
2. **Faction Trait enum:** approve a fixed starting set (I used Agrarian, Metallurgist, Mercantile, Seafaring) or supply the canonical list — `mvp_specification.md` only gives two examples via "e.g.," and `civ_identity_ambitions_specification.md` §1 name-drops "Seafaring" without ever defining it. This blocks finalizing both `CivilizationPreset` and preset content authoring.
3. **Preset count:** approve authoring exactly 8 hand-made presets (one per max civ count), or a different number.
4. **Government type at creation:** approve making government type a player-choosable field in custom creation (my recommendation) even though `mvp_specification.md` §3 doesn't literally list it as a setup step — this is scope beyond the MVP spec's literal four items, flagged per `atlas-game-director`'s Recommendation 3, and needs explicit sign-off rather than silent inclusion.
5. **Custom-creation surface width:** confirm the "2 traits + name only" reading of `mvp_specification.md` §3.3 is correct, versus a broader reading where the player could optionally pick weakness/governing-priority/etc. too. This is a meaningfully different design (min-maxing risk vs. emergent discovery) and should be an explicit decision, not an inferred one.
6. **Color/name uniqueness constraint:** approve treating `colorPrimary` (and civilization `name`) as unique-per-game constraints enforced at selection time, since nothing in the existing specs states this today.
7. **`resourceDeposit` field ownership:** confirm whether `HexTile.resourceDeposit?` (proposed jointly for `atlas-world-designer`'s homeland-scoring dependency) should be finalized by world-designer alone, by me alone, or requires a joint follow-up pass before Milestone 2 implementation — per `MULTI_AGENT_WORKFLOW.md` §2's rule against overlapping edits.
