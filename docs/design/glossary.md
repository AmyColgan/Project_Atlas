# PROJECT ATLAS: GLOSSARY & SHARED DEFINITIONS
## Canonical Terminology (Version 1.0.0)

This document defines terms used across multiple specification documents so they are applied consistently throughout the project. When a spec references one of these terms, it means exactly this.

---

## Relative Military Power (RMP)

**Definition:**

$$\text{RMP}(A, B) = \frac{\text{EffectiveMilitaryStrength}(A)}{\text{EffectiveMilitaryStrength}(B)}$$

Where `EffectiveMilitaryStrength` is a civilization's aggregate military capability (unit count weighted by unit combat power, modified by fortification/terrain bonuses where applicable — exact formula defined alongside the combat system in Milestone 4).

**Usage convention:** RMP is always expressed as *the acting civilization's strength divided by the reference civilization's strength*. RMP > 1.0 means the acting civilization is stronger; RMP < 1.0 means it is weaker. This is the definition referenced by the *Cautious* leader weakness in `civ_identity_ambitions_specification.md` ("avoids war unless RMP > 2.0") and by any future system comparing two civilizations' military strength.

---

*Additional shared terms will be added here as they are introduced, so no spec needs to redefine a concept another spec already owns.*

---
*End of Glossary.*
