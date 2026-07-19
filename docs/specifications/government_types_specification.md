# PROJECT ATLAS: GOVERNMENT TYPES SPECIFICATION
## Constitutional Modifiers (Version 1.0.0)

This document defines the modifiers for the government types referenced in `game_design_document.md` §4. The GDD named these types without specifying their effects; this spec closes that gap. The three types below are the starting set — additional government types may be added in Early Access or Full Vision without changing this document's structure.

---

## 1. Monarchy
* **Stability:** Stable leadership — succession does not trigger a full Leader Profile reroll unless the monarch dies (see `civ_identity_ambitions_specification.md` §5).
* **Diplomacy:** Moderate diplomatic modifiers — no bonus or penalty to Trust accumulation or treaty proposals.
* **Unrest:** Medium baseline Unrest growth (unmodified baseline rate).
* **Interest Group Interaction:** Nobility Influence is weighted higher, per `internal_politics_specification.md` §2A ($I_{\text{Nobility}} = 0.35 \times 1.5$ under Monarchy).

## 2. Republic
* **Economy:** Higher research and economic output — Academies and Markets receive a production bonus (exact percentage to be tuned during Milestone 3 balancing).
* **Political Pressure:** Slightly higher political pressure — Loyalty decay from unpopular policies (high tax, war) is modestly increased relative to Monarchy.
* **Interest Group Interaction:** Nobility Influence is weighted lower ($I_{\text{Nobility}} = 0.35 \times 0.5$, per the non-Monarchy case in `internal_politics_specification.md` §2A).

## 3. Dictatorship
* **Military:** Strong military control — Military interest group Loyalty gains are amplified; military unit upkeep is discounted.
* **Early Stability:** Reduced early Unrest growth (a new Dictatorship suppresses dissent effectively in its first stretch of turns).
* **Long-Term Risk:** Higher long-term instability if crises occur — once any interest group's Loyalty drops into Crisis State (per `internal_politics_specification.md` §3), Unrest escalation and coup risk scale up faster than under Monarchy or Republic.

---

## 4. Implementation Notes
* Government type is a per-civilization property that modifies interest-group Influence formulas (§2A of `internal_politics_specification.md`) and Loyalty decay/growth rates (§2B of the same document).
* Exact numeric coefficients beyond those already fixed by the internal politics spec (the Monarchy Nobility multiplier) are placeholders to be tuned once Milestone 3 (Econ Simulation & Politics Loops) is implemented and playtested — this document will be updated with final values at that point.
* Government type is set at civilization creation (Milestone 2 procedural identity generation) and can change via Revolutionary Coup (`internal_politics_specification.md` §4) or Leader Succession (`civ_identity_ambitions_specification.md` §5).

---
*End of Government Types Specification.*
