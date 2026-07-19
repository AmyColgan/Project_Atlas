# PROJECT ATLAS: GAME DESIGN DOCUMENT
## The Agentic Civilization Simulator (Graphical emergent Storytelling Edition)
**Lead Systems Architect & Creative Director:** Antigravity  
**Document Version:** 1.3.0  
**Target Platform:** PC / Mac  

---

## 1. Executive Summary & Design Philosophy
*Project Atlas* is a AAA grand strategy game that redefines the 4X genre. Rather than relying on artificial cheats or static state-machines, Project Atlas models civilizations as complex, adaptive systems where gameplay and history emerge naturally from the friction between geography, resource constraints, domestic factions, and leader traits.

To ensure realistic development timelines and system stability, the game's architecture is structured into four distinct development stages:
1. **Minimum Viable Prototype (MVP):** Offline, deterministic simulation using rule-based heuristics and local mock engines. The player **directly controls one civilization**, competing against **3 to 7 autonomous, rule-based AI civilizations** (4 to 8 total kingdoms). Features a rich World Chronicle, dynamic leader ambitions, internal interest groups, and system-driven crises. No paid cloud services, no Deep Reinforcement Learning (DRL).
2. **Early Access (EA) Systems:** Introduction of local/open-source LLMs (via Ollama/Llama.cpp) for strategic reasoning and natural language dialogue, advanced dynamic pricing markets, and physical trade caravan routes.
3. **Full Vision:** Integration of cloud hybrid agent loops (LLM strategic nodes), Deep Reinforcement Learning (DRL) tactical engines, and advanced double-entry macroeconomics.
4. **Experimental Future Systems:** Decentralized swarm sub-factions, advanced generative historiography, and neural-physical climate feedback networks.

---

## 2. Core Gameplay Loop

### MVP Stage
* **Strategic Phase:** Turn-based, simultaneous inputs. The player manages their starting city, allocates labor, queues building construction, selects tech nodes, issues policy decrees, trades with AI, and reacts to internal interest group demands.
* **Resolution Phase:** Sequential resolution of player and AI kingdom moves. Resource pools update across local city stockpiles.
* **Logistics:** Basic territorial supply metrics. Units are supplied if they are within $N$ hexes of any owned city connected to their state network.

---

## 3. AI Architecture & The World Chronicle
* **Leader AI:** Dynamic decision-making engine combining hardcoded utility trees, long-term strategic ambitions, personality traits, and relationship memory structures.
* **Domestic Politics:** A simplified interest group system representing the Military, Merchants, and Farmers/Workers.
* **World Chronicle:** An automated logging engine that parses state transitions and historical milestones, writing named historical eras (e.g., *"The Twelve-Year Border War"*) and chronicles to readable log snapshot files.
* **Combat:** Deterministic heuristic scripts (standard search algorithms like A* for pathfinding and simple priority weights for targeting high-value units). Seeded randomness resolves combat ties.

---

## 4. Civilization Systems
* **Constitution:** Basic government types (Monarchy, Republic, Dictatorship) with distinct modifiers. See `government_types_specification.md` for full modifier tables.
* **Interest Groups:** All six groups are always active in every civilization — Military, Merchants, Farmers/Workers, Nobility, Clergy, Scholars. Ignored groups raise city unrest, cause labor strikes, or launch political coups. (Earlier drafts of this document referenced a 3-group subset; that version is obsolete — see `internal_politics_specification.md`.)
* **Laws:** Toggles affecting resource distribution and welfare (e.g., *Welfare Decrees*).
* **Role:** Player directly manages their constitution, adjusting tax levels and citizen freedoms, which affects Pop unrest and interest group loyalty.

---

## 5. Technology Tree (The Paradigm Web)
* **Structure:** Branching tech tree with nodes for Agriculture, Masonry, Iron Working, Writing, Code of Laws, and Sailing.
* **Ripple Effects:** Technologies carry direct economic benefits but trigger trade changes, neighbor threat increases, and interest group alignment shifts.
* **Consequences:** Modifiers apply instantly across the faction (e.g., unlocking *Iron Working* boosts military power but spikes neighborhood hostility).

---

## 6. The Economy
* **Currency:** Gold / Wealth global stockpile.
* **Resources:** Food, Wood, Iron, and Gold / Wealth. Resources are gathered locally and placed in city inventories.
* **Markets:** Fixed base values for resources with simple buying/selling margins. No inflation or debt default.

---

## 7. Save System & Persistence
* **Persistence Layer:**
  * **Full JSON State Snapshots:** Complete serialization of map, kingdoms, cities, pops, and resource counts.
  * **PRNG State:** Serializes the current seed and PRNG state register to ensure complete simulation determinism on load.
  * **Persisted Append-Only Event Log & Chronicle:** Exportable JSON/JSONL logs storing historical timeline logs and events.
  * **Import/Export:** Direct JSON load/save support.

---

## 8. Non-Negotiable Visual & Audio Requirements

*Project Atlas* must be built as a fully graphical, interactive strategy game. It must not become a text adventure, an AI chat interface, a spreadsheet simulator, or a plain grid of unstyled colored shapes. Normal gameplay takes place through a polished visual interface, interactive map, animated world, and direct player controls.

### A. Map Visuals
The strategic map must include visually distinct, polished representations of:
* Oceans and coastlines, lakes, and winding rivers.
* Plains, forests, deserts, hills, and mountains.
* Farms, mines, roads, markets, forts, and cities.
* Resource deposits and territorial improvements.
* Dynamic political borders (neon colored boundaries).
* Armies, caravans, trade routes, and crisis zones.
* Weather conditions (rain particles, snow, sandstorms, drought tints).

### B. World Animation
The world must feel active and alive:
* Armies must visibly travel between hexes (smooth translation paths).
* Building construction must display progress indicators or building animations.
* Trade routes must show flowing cargo icons or caravan models.
* Border lines must animate/flash during ownership transfers.
* Cities must grow, physically spawning extra houses and walls as population scales.
* Weather effects (smoke, fire, dust, storms) must overlay the tiles.
* Combat must generate visual impacts, fire particles, and damage numbers.

### C. Cities & Civilizations Visuals
Every civilization must have:
* A unique flag/emblem.
* A distinct map boundary color.
* A leader portrait.
* A customized, styled HUD matching the civilization's identity.

### D. Leaders & Diplomacy Screen
Diplomacy takes place on a dedicated graphical screen displaying:
* High-detail leader portraits.
* Animated status icons reflecting current diplomatic stances (trust, fear, hostility).
* Interactive treaty construction slips (drag-and-drop resources).
* Dialog boxes printing generated text dialogue supported by the deterministic narrative engine.

### E. Audio Design
The architecture must support audio from Milestone 1:
* Background music.
* Ambient environmental sounds (wind, forest rustling, sea shore).
* Interface click sounds and transition swooshes.
* Combat clash effects and explosion impacts.
* Major event sound cues (tech discovery fanfare, war horns, disaster alerts).

---

## 9. Future Expansion Roadmap

### Base Game (MVP & Early Access)
* Focusing on the offline, rule-based 4X core, active player control, dynamic leader ambitions, interest groups, local LLM integrations, and robust macroeconomics.

### Expansion 1: Infinite Horizon (Full Vision Integration)
* Scaling systems up to cloud agent nodes, deep reinforcement learning combat, space exploration, and orbital logistics.

### Expansion 2: Leviathan Syndicates (Experimental Systems)
* Unleashing corporate governance, cybernetics, and decentralized global factions.

---
*End of Game Design Document v1.3.0*
