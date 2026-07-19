# PROJECT ATLAS: MILESTONE ROADMAP
## Development Timeline & Structural Phases (Version 1.3.0)

This document details the development milestones for the playable MVP of *Project Atlas*. Development is organized into six consecutive milestones to establish a solid foundation before layering on future features (Early Access, Full Vision, and Experimental).

---

## 1. Milestone Map
```
  ┌────────────────────────────────────────────────────────┐
  │ M1: Core Engine & Early Visual Shell                   │
  │     - Axial hex coordinate system                      │
  │     - Rendered map, pan/zoom camera, selectable city   │
  │     - Styled HUD and at least one animated effect      │
  └──────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ M2: Procedural Generation & Identity Setup             │
  │     - Seeded 2D Perlin noise heightmaps                │
  │     - Leader profile & trait generation tables         │
  └──────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ M3: Econ Simulation & Politics Loops                   │
  │     - Food, Wood, Iron, Wealth calculations            │
  │     - Sliders for labor; Interest Group loyalty        │
  └──────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ M4: Heuristic AI, Memory, & Crisis Systems             │
  │     - HFSM states with Trust, Fear, Hostility metrics  │
  │     - Event-driven Crisis outbreak state machines      │
  └──────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ M5: Interface Dashboard & World Chronicle              │
  │     - Strategic hex grid canvas map                    │
  │     - Action panels (Trade, Tech, Laws, City)          │
  │     - Chronicle compiler & end-of-game history log     │
  └──────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ M6: Variability Validation & Balance                   │
  │     - Tech ripple balancing                            │
  │     - Automated headless simulation testing            │
  └────────────────────────────────────────────────────────┘
```

---

## 2. Milestone Details

### Milestone 1: Core Engine & Early Visual Shell
* **Gameplay Deliverables:**
  * Coordinate math libraries for Hexaxial positioning.
  * Faction, City, Pop, and Resource database classes. City data model reserves a `FOUND_CITY` extension point for future Settler-driven expansion (not implemented this milestone).
  * Base Save/Load serialization modules (JSON snapshots).
  * PRNG module integrating seed register backups.
* **Architecture Requirements (Non-Negotiable):**
  * **Modular rendering layer:** all rendering goes through a `WorldRenderer` interface. Milestone 1 ships a Canvas 2D implementation; the interface must allow a future WebGL implementation to be swapped in without changes to the simulation engine, gameplay systems, save system, or UI logic.
  * **Asset management system:** no terrain, unit, building, effect, icon, portrait, or UI artwork may be hard-coded into gameplay or rendering code. All visual assets load through an `AssetManager` keyed by logical name (e.g. `terrain.plains`), so real art can later replace placeholders by editing the asset manifest only.
* **Visual Deliverables (Early Visual Prototype):**
  * Immediately visible graphical shell (Canvas 2D for M1; WebGL-ready per the renderer abstraction above).
  * Rendered interactive map display with smooth camera pan and zoom (not instant/stepped).
  * Terrain presentation (distinct placeholder assets for Hills, Plains, Oceans, Mountains, loaded via the AssetManager) with visible variation across the map, not a uniform single tile style.
  * A visible civilization territory and city.
  * Selectable map elements: hover highlight and a tile-selection animation on click-to-inspect.
  * Attractively styled HUD layout — dark-mode strategy-game aesthetic, not an unstyled developer utility.
  * At least one animated world effect (pulsing territory border).
  * Responsive interface (layout adapts to window size).

### Milestone 2: Procedural Generation & Identity Setup
* **Gameplay Deliverables:**
  * Heightmap generation using seeded Perlin/Simplex noise.
  * Resource scatter clustering scripts (Iron, Wood, Gold placement).
  * Procedural Civilization Generator (joining prefixes/roots/suffixes, assigning color IDs).
  * Leader Generation Engine (randomizing Traits, Weaknesses, Governing Priorities, Fears).
* **Visual Deliverables:**
  * Map rendering updates to match procedural terrain heights and moisture coordinates.
  * Rendered resource deposit icons and colorized faction territories.

### Milestone 3: Econ Simulation & Politics Loops
* **Gameplay Deliverables:**
  * Worker assignment mechanics (Farmers, Miners, Laborers yields).
  * Pop Needs consumption (Food and Wood).
  * Faction Interest Group trackers (Loyalty, Influence updates).
  * Domestic political crises (Labor strikes, tax evasion, mutiny triggers).
* **Visual Deliverables:**
  * Interactive city sliders and dropdown menus in HUD.
  * Visual indicators for interest group loyalty levels.

### Milestone 4: Heuristic AI, Memory, & Crisis Systems
* **Gameplay Deliverables:**
  * HFSM state evaluation loops for AI opponents incorporating strategic Ambitions.
  * AI-to-AI trade deal generators and relationship update formulas.
  * Relational Memory Ledger tracking broken treaties and border clashes.
  * Crisis outbreak controllers (Long Drought, Sovereign Default, refugee influx).
* **Visual Deliverables:**
  * Interactive diplomacy screen with leader portraits, relationship gauges, and trade selectors.
  * Crisis outbreak visual banners and alerts.

### Milestone 5: Interface Dashboard & World Chronicle
* **Gameplay Deliverables:**
  * Action panels (Trade, Tech, Laws, City).
  * World Chronicle compiler translating JSON logs into readable historical entries.
* **Visual Deliverables:**
  * Polished final strategy HUD interface.
  * Animated army unit movement (smooth translation path rendering).
  * Smooth panel transitions.
  * Scrollable history timeline and Chronicle view at end-of-game.

### Milestone 6: Variability Validation & Balance
* **Gameplay Deliverables:**
  * Tech tree ripple effect balancing.
  * Turn limits and score calculation modules.
  * **Replayability Test Suite Execution:** Headless run of 10 seeds through 150 turns verifying statistical divergence.
* **Visual Deliverables:**
  * Final HUD balancing metrics displays.
  * Victory, collapse, coup, and golden age cinematic overlays.

---
*End of Milestone Roadmap.*
