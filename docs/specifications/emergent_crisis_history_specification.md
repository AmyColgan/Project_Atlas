# PROJECT ATLAS: EMERGENT CRISIS & HISTORY SPECIFICATION
## System-Driven Crises & Dynamic Era Naming (Version 1.0.0)

This document details the systems governing **System-Driven Crises** and the **Procedural Era Naming Engine** in the *Project Atlas* MVP. These systems track macroscopic simulation shifts (famines, financial collapses, wars) and formalize them into named historical eras.

---

## 1. Structured Crisis Framework
A crisis is not a random event card. It is a system-driven state machine triggered by numerical thresholds in the world state.

```
          ┌──────────────────────────────────────────────────┐
          │                  1. TRIGGER VALUE                │
          │  e.g., Food Stockpile <= 0, active starvation.   │
          └────────────────────────┬─────────────────────────┘
                                   │
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │               2. WARNING PHASE (T+1)             │
          │  Event log alert; Pop Unrest increases +2.       │
          └────────────────────────┬─────────────────────────┘
                                   │
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │             3. OUTBREAK & PEAK (T+2)             │
          │  Active modifiers apply. Production cuts, strikes.│
          └────────────────────────┬─────────────────────────┘
                                   │
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │            4. RESOLUTION & CONSEQS               │
          │  Threshold cleared. Logged to World Chronicle.   │
          └──────────────────────────────────────────────────┘
```

---

## 2. Crisis Definitions

### A. The Long Drought
* **Trigger Conditions:** Discovered forest hexes deforested $> 40\%$ and regional humidity $H < 0.20$.
* **Escalation Modifiers:** Flatland farm yields are reduced by $50\%$ globally. Regional water hexes dry up, blocking coastal unit transit.
* **Consequences:** Pop starvation spikes, triggering immediate migration toward adjacent kingdoms.
* **Resolution Path:** Re-planting forests (using Wood and Gold construction projects) or waiting 10 turns for natural regional humidity replenishment.

### B. Sovereign Bankruptcy (Financial Collapse)
* **Trigger Conditions:** Treasury reserve $== 0$ Gold and state upkeep exceeds net trade/tax revenue.
* **Escalation Modifiers:** Army units refuse movement, and defensive value drops by $50\%$. Interest group loyalty of Nobles and Merchants drops by $-30$.
* **Consequences:** State cannot purchase technologies or construct buildings.
* **Resolution Path:** Disbanding military divisions or increasing tax levels above $30\%$ (which spikes Worker unrest).

### C. The Refugee Cascade
* **Trigger Conditions:** A neighboring civilization is experiencing an active war or famine, causing Pop size drop in their cities.
* **Escalation Modifiers:** Unsettled Pops cross borders, appearing in player/AI territory.
* **Consequences:** City populations spike, exceeding local capacity and generating immediate **Housing Unrest** ($+15$ unrest/turn).
* **Resolution Path:** Constructing Residential Districts (requires Wood) or enacting the *Closed Borders Decree* (which damages diplomatic relations with the exporting kingdom).

---

## 3. Algorithmic Era & War Naming Engine
To translate numerical logs into memorable histories, the World Chronicle uses a **Grammar-Based Concatenation Engine** to name major events.

### A. War Naming Algorithm
When Faction A declares war on Faction B, the engine tracks the primary trigger variable (e.g., Iron resource deficit, territorial encroachment, or alliance activation). When the war ends, it compiles the name:

$$\text{WarTitle} = \text{The } [\text{Scale}] \text{ } [\text{Trigger}] \text{ War}$$

Where:
* **Scale:**
  * If turns elapsed $< 10$: *Skirmish* or *Campaign*.
  * If turns elapsed $\ge 10$ and $< 30$: *Conflict* or *War*.
  * If turns elapsed $\ge 30$: *Long War* or *Great War*.
* **Trigger:**
  * If initiated over an Iron node: *Iron* or *Steel*.
  * If initiated over border violations: *Border* or *Disputed*.
  * If initiated via alliance activation: *Coalition* or *Alliance*.

*Example Outcome:* If Rome and Carthage fight for 32 turns over an Iron mine, the engine outputs: **"The Great Iron War"**.

### B. Era Naming Algorithm
The engine evaluates the global metrics of all civilizations over 30-turn windows to designate historic eras:

$$\text{EraTitle} = \text{The } [\text{Modifier}] \text{ } [\text{Subject}] \text{ Era}$$

Where:
* **Modifier:**
  * If global unrest average is $> 40$: *Dark*, *Chaotic*, or *Troubled*.
  * If global average technology level increases by $> 3$ nodes: *Enlightened*, *Scientific*, or *Golden*.
  * If global trade volume is high: *Mercantile* or *Prosperous*.
* **Subject:**
  * Driven by the dominant faction name or resource (e.g., *Age of Rome*, *Era of Coal*, *Iron Age*).

*Example Output:* 30 turns of low unrest, high trade, and Roman dominance yields: **"The Prosperous Era of Rome"**.

---
*End of Emergent Crisis & History Specification.*
