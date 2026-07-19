# PROJECT ATLAS: VICTORY & COLLAPSE SPECIFICATION
## Outcomes, Failures, & Sandbox Mode Transitions (Version 1.0.0)

This document details the mechanics, state variables, and verification equations for achieving victory or experiencing civilization collapse in the *Project Atlas* MVP. The game tracks these thresholds dynamically, providing options for post-victory sandbox play.

---

## 1. Victory Conditions
The MVP supports five distinct strategic pathways to victory.

### A. Military Dominance (Conquest)
* **Threshold Variable:** Faction control of all capital cities on the map.
* **Verification Equation:**

$$\text{OwnedCapitals} == \text{TotalCivilizations}$$

### B. Economic Dominance (Mercantile Hegemony)
* **Threshold Variable:** Wealth storage and trade monopoly.
* **Verification Equation:**

$$\text{FactionTreasury} \ge 2,500 \text{ Gold AND } \text{ActiveTradeTreaties} \ge \lfloor 0.75 \times (\text{TotalCivilizations} - 1) \rfloor$$

### C. Scientific Dominance (Enlightenment)
* **Threshold Variable:** Completion of the Technology tree nodes before any competitor.
* **Verification Equation:**

$$\text{UnlockedTechNodes} == 6 \text{ AND } \text{AllOpponentTechNodes} < 6$$

### D. Diplomatic Federation
* **Threshold Variable:** Establishing a global alliance coalition.
* **Verification Equation:**

$$\text{AlliedFactions} \ge \lfloor 0.60 \times (\text{TotalCivilizations} - 1) \rfloor \text{ AND } \text{RelationshipTrust} \ge 0.80 \text{ with all allies.}$$

### E. Historical Legacy Score (Time Limit)
* **Threshold Variable:** Highest accumulated Legacy Score ($S$) at Turn 150.
* **Verification Equation:**

$$S = \text{CitiesCount} \times 100 + \text{TotalPops} \times 10 + \text{TechsUnlocked} \times 50 + \text{Treasury} \times 0.5 + \text{Alliances} \times 80$$

---

## 2. Sandbox Continuation Mode
When a victory trigger is met:
* **The Player Wins Overlay:** Presents a choice: `Return to Main Menu` or `Continue in Sandbox Mode`.
* **Sandbox Mode:**
  * Disables further Victory checks.
  * Allows the simulation to run indefinitely, letting the player manage their empire, witness future crises, or intentionally trigger collapses to see how history unfolds in the World Chronicle.

---

## 3. Civilization Collapse Failure Paths
A civilization (both player and AI) can collapse and be eliminated from the simulation through four distinct failure pathways:

```
  ┌────────────────────────────────────────────────────────┐
  │ CIVILIZATION FAILURE MODES                             │
  ├────────────────────────────────────────────────────────┤
  │ 1. MILITARY CONQUEST                                   │
  │    - All owned cities occupied by enemy divisions.     │
  ├────────────────────────────────────────────────────────┤
  │ 2. DEMOGRAPHIC STARVATION (Pops == 0)                  │
  │    - Starvation outpaces birth rates.                  │
  ├────────────────────────────────────────────────────────┤
  │ 3. REVOLUTIONARY CIVIL WAR                             │
  │    - Unrest hits 100, or a high-influence interest     │
  │      group coup succeeds.                              │
  ├────────────────────────────────────────────────────────┤
  │ 4. FINANCIAL COLLAPSE (Sovereign Default)              │
  │    - Upkeep deficit persists at $0 gold for 15 turns.  │
  └────────────────────────────────────────────────────────┘
```

### A. Military Conquest
* **Condition:** The faction has lost control of all its cities to occupying enemy military units.
* **Result:** Faction status toggles to `ELIMINATED`. All remaining units outside cities are disbanded.

### B. Population Starvation
* **Condition:** The total population across all faction cities drops to zero due to consecutive turns of food deficit.
* **Result:** Cities become "Ruins" on the map, open for recolonization by adjacent kingdoms. Faction is eliminated.

### C. Revolutionary Overthrow
* **Condition:** City Unrest remains at $100$ for 5 consecutive turns, or a rebel faction captures the capital city during a civil war.
* **Result:** Current government collapsed. For player: Game Over. For AI: Faction splits or undergoes immediate leadership trait reset.

### D. Sovereign Bankruptcy Collapse
* **Condition:** Treasury has been at $0.0$ Gold for 15 turns, and upkeep expenses exceed potential tax yields.
* **Result:** Interest groups lose all loyalty, units mutiny, and the civilization fractures into neutral city-states.

---
*End of Victory & Collapse Conditions Specification.*
