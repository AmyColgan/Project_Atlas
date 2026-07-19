# PROJECT ATLAS: MVP ACCEPTANCE CRITERIA
## Quality Assurance, Playability, & Visual Compliance (Version 1.3.0)

This document defines the metrics, test suites, and compliance requirements the Minimum Viable Prototype (MVP) must meet before it is accepted for transition to the Early Access stage.

---

## 1. Playable Functional Compliance
To pass QA, the MVP software must satisfy the following interactive benchmarks:

* **End-to-End Campaign Completeness:** The player must be able to launch a new campaign, customize their leader, play for 150 turns, achieve one of the five victory conditions (Military, Economic, Scientific, Diplomatic, or Legacy), or face civilization collapse without runtime crashes.
* **Active Player Controls:** The user interface must successfully execute commands for:
  * Adjusting city worker distribution sliders.
  * Adding structures (Farms, Mines, Barracks, Markets) to the construction queues.
  * Selecting technology nodes.
  * Adjusting national tax rates.
  * Moving military divisions on the hex map.
  * Constructing, proposing, and signing trade offers in the diplomacy panel.
* **World Chronicle Generation:** The end-of-game screen must compile and present a coherent, readable narrative timeline (describing wars, crises, and alliances) exported as a markdown document.

---

## 2. Dynamic System-Interaction & Tradeoff Verification
The simulation must prove that its systems are interconnected and that choices require meaningful tradeoffs:

* **Tax vs. Unrest Tradeoff:** Raising taxes above $20\%$ must generate gold but cause Unrest to increase and Worker/Noble loyalty to decay.
* **Forest Cleansing Tradeoff:** Exploiting forest hexes generates wood but reduces regional humidity, increasing Drought disaster probability.
* **Refugee Inclusion Tradeoff:** Accepting refugees increases the city Pop count (boosting labor capacity) but creates immediate Housing Unrest penalties.

---

## 3. The Visual Quality Gate
The MVP must pass a strict Visual Quality Review to ensure it feels like a commercial strategy game rather than a developer utility.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          VISUAL QUALITY GATE                            │
├─────────────────────────────────────────────────────────────────────────┤
│ The MVP fails this review if:                                           │
│ 1. The map consists only of solid colored squares or simple geometry.    │
│ 2. Units teleport between hexes without smooth translation animations.  │
│ 3. Cities do not physically evolve (no expansion of houses/walls).      │
│ 4. Diplomacy screen consists of raw database forms and input boxes.      │
│ 5. Most simulation details are only accessible via text log scrolling. │
│ 6. The strategic map feels static, empty, or repetitive.                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Required Visual Quality Gate Compliance:
1. **Interactive Strategic Map:** Rendered with tile assets/textures representing coastlines, plains, forests, mountains, roads, and cities. Neon border highlights indicate territory limits.
2. **Smooth Translations:** When units move, they must travel along coordinate paths via interpolation animation loops. Teleportation between coordinates is a blocker.
3. **Animated Effects:** Includes particle animations for combat, weather overlays (rain, sandstorms), and construction progress effects.
4. **Cinematic Screens:** Unlocking technology, starting a golden age, experiencing a coup, or winning/collapsing must trigger dedicated full-screen graphic panels with sound fanfares.

---

## 4. Replayability & Variability Testing (10-Seed Check)
Before approval, the team must execute the headless test protocol defined in `replayability_variability_protocol.md`.

---
*End of MVP Acceptance Criteria.*
