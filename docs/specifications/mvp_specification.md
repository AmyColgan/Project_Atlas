# PROJECT ATLAS: PLAYABLE MVP SPECIFICATION
## Deterministic Core & Visual Strategy Engine (Version 1.2.0)

This document details the software specifications for the playable Minimum Viable Prototype (MVP) of *Project Atlas*. The MVP represents a fully playable graphical vertical slice of a single-player grand strategy game running a deterministic core engine.

---

## 1. Scope & Faction Scaling
* **Civilizations:** Configurable during setup from **4 to 8 civilizations** (1 player-controlled, 3 to 7 autonomous AI opponents).
* **World Map:** A procedurally generated $40 \times 40$ hex grid.
* **Cities:** Limited to 1 to 3 cities per civilization. Expansion from the starting city to additional cities occurs via **Settler** units founding new cities on eligible hexes. Settlers are not implemented in Milestone 1 or 2 — the engine's data model and map/ownership systems must reserve the extension points (a `FOUND_CITY` action type, city-eligibility checks on hex tiles, and unclaimed-territory tracking) so Settlers integrate later without refactoring the core simulation loop.
* **Turn Length:** One turn represents approximately one in-game year for narrative and Chronicle purposes (e.g., era/war naming references "turns" as years). Simulation timing itself remains abstract — no real-world clock mapping, no seasonal mechanics tied to turn parity, unless a later spec introduces them explicitly.
* **Standard Resources:** Food, Wood, Iron, and Gold / Wealth.
* **Pop System:** Numeric class groupings (Workers, Miners, Nobles) per city.
* **Technology Tree:** A small, 6-node branching grid.
* **Diplomacy:** Graphical negotiator displaying leader profiles, relationship gauges, and contract builders.
* **Save/Load:** JSON state snapshots, PRNG state tracking, and export/import functionality.

---

## 2. Technical Stack & Graphics Architecture
* **Frontend Rendering:** HTML5 Canvas API (utilizing Javascript 2D context) or WebGL for rendering the hexagonal map, terrain layers, unit icons, borders, and animations.
* **Aesthetics:** Polished dark-mode grand strategy visual style (frosted glass overlays, neon color grids).
* **Audio Layer:** HTML5 Audio API for managing ambient loops, click events, and game fanfares.
* **Controls:** 
  * Mouse wheel: Zoom in/out ($0.5\times$ to $2.0\times$ scale).
  * Mouse click-and-drag: Smooth camera panning.
  * Hover: Hovering tooltips display hex coordinates, resource values, and unit details.

---

## 3. Game Setup & Initial Customization
When starting a new game, the player configures the following options:

1. **Civilization Count Selection:**
   * Select count $N$ between $4$ and $8$ (Default: 5).
2. **Civilization Selection/Generation:**
   * Select a preset or generate a random faction.
   * Procedural Generation assigns: Name, Primary Map Color, and Faction Trait (e.g., *Agrarian* [+10% Food yield], *Metallurgist* [+10% Iron yield]).
3. **Leader Identity Selection:**
   * Player selects a name and chooses two starting personality traits (e.g., *Innovative* and *Mercantile*).
   * Autonomous AI opponents are assigned procedurally generated leader profiles containing: 2 Personality Traits, 1 Weakness, 1 Governing Priority, 1 Diplomatic Tendency, 1 Military Tendency, 1 Personal Ambition, and 1 Fear.
4. **World Seed Selection:**
   * Player can input a custom integer seed or let the engine generate a random one.

---

## 4. Playable Turn Loop & Visual Stages
The game runs on a synchronous, turn-based loop where the player acts first, followed by parallel AI execution, ending in a global simulation update tick.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TURN TICK SEQUENCE WITH ANIMATED PHASES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. PLAYER DECISION PHASE                                                │
│    - Player interacts with the dashboard UI.                            │
│    - Drag sliders, queue construction, select tech, move armies.        │
├─────────────────────────────────────────────────────────────────────────┤
│ 2. AI DECISION PHASE (Autonomous & Parallel)                            │
│    - Each of the 3-7 AI kingdoms evaluates utility matrices.            │
│    - AI executes construction, technology picks, trades, and maneuvers. │
├─────────────────────────────────────────────────────────────────────────┤
│ 3. ECONOMY & POP RESOLUTION TICK                                        │
│    - Resource outputs calculated. Starvation & Unrest indices updated.  │
├─────────────────────────────────────────────────────────────────────────┤
│ 4. TACTICAL MOVEMENT & COMBAT RESOLUTION (Animated)                     │
│    - Armies smoothly translate along hex cells.                         │
│    - Battles resolve on colliding hexes; spark and damage text animations│
│      render at battle coordinates.                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ 5. HISTORIAN EVENT LOGGING & PERSISTENCE TICK                           │
│    - World Chronicle updates with named wars/eras.                      │
│    - Save snapshot log written.                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Player Commands (API & Interactive Controls)
The player interacts with the world state through the following interactive control interfaces:

* **City Management Dashboard:**
  * `setLaborAllocation(cityId, farmerCount, minerCount, builderCount)`: Drag sliders to assign Pops to jobs.
  * `queueConstruction(cityId, buildingType)`: Place Farm, Iron Mine, Barracks, or Market in the queue.
* **Technology Panel:**
  * `selectResearchNode(techNodeId)`: Target the next technology branch.
* **Diplomacy Negotiator:**
  * `proposeTrade(targetFactionId, offerResources, demandResources)`: Build structured resource swaps.
  * `declareWar(targetFactionId)`: Toggle diplomatic status to War.
  * `proposeAlliance(targetFactionId)`: Toggle alliance request (evaluated by AI relationship values).
* **Military Command Grid:**
  * `queueUnitMovement(unitId, pathCoordinates)`: Trace paths on hex tiles for military squads.
* **National Policy Panel:**
  * `setTaxRate(rateValue)`: Float tax rate between 0% and 50% (higher tax increases Gold income but drives Pop unrest).

---

## 6. Non-Player Civilization AI (Heuristic Autonomous Logic)
Each AI kingdom evaluates its choices at the start of the turn using a deterministic utility scoring framework.

1. **State Assessment:** AI checks resource thresholds (e.g., if Food reserves are $< 2$ turns of Pop consumption, trigger `STARVATION_RISK` flag).
2. **Action Prioritization:** Evaluates utility weights for all valid actions.
   * If `STARVATION_RISK` is active, the utility score for agricultural construction is multiplied by 3.0.
   * If an adversary has units stationed close to borders, the utility score for recruiting military units is scaled by the relative strength difference.
3. **Execution:** The action with the highest evaluated utility is executed.

---

## 7. Resources & Production Mechanics
The MVP tracks exactly four resources:
* **Food:** Harvested from Flatlands. Consumed by Pops. Starvation decreases Pop size and increases Unrest.
* **Wood:** Harvested from Forests. Used to construct buildings and maintain city heating.
* **Iron:** Extracted from Hills. Required to fabricate military units.
* **Gold / Wealth:** Generated by taxation and trade. Used for army upkeep and diplomatic negotiations.

---

## 8. Save & Persistence Specs
The MVP save system generates a structured JSON snapshot containing the absolute state variables, seed states, and historic narrative logs.

---
*End of MVP Specification.*
