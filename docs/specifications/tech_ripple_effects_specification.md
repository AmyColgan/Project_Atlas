# PROJECT ATLAS: TECH RIPPLE EFFECTS SPECIFICATION
## Systemic Consequences of Scientific Paradigm Shifts (Version 1.0.0)

This document details the multi-dimensional impact of the six technology nodes available in the *Project Atlas* MVP. Rather than acting as simple percentage modifiers, technologies trigger ripple effects across the economy, military threat levels, internal politics, and the environment.

---

## 1. The Technology Tree Structure
The MVP tech tree is divided into three tiers:

```
  ┌────────────────────────────────────────────────────────┐
  │ TIER 1                                                 │
  │     ┌───────────────┐           ┌───────────────┐      │
  │     │  AGRICULTURE  │           │    MASONRY    │      │
  │     └───────┬───────┘           └───────┬───────┘      │
  └─────────────┼───────────────────────────┼──────────────┘
                ▼                           ▼
  ┌─────────────┼───────────────────────────┼──────────────┐
  │ TIER 2      │                           │              │
  │     ┌───────▼───────┐           ┌───────▼───────┐      │
  │     │    WRITING    │           │ IRON WORKING  │      │
  │     └───────┬───────┘           └───────┬───────┘      │
  └─────────────┼───────────────────────────┼──────────────┘
                ▼                           ▼
  ┌─────────────┼───────────────────────────┼──────────────┐
  │ TIER 3      │                           │              │
  │     ┌───────▼───────┐           ┌───────▼───────┐      │
  │     │ CODE OF LAWS  │           │    SAILING    │      │
  │     └───────────────┘           └───────────────┘      │
  └────────────────────────────────────────────────────────┘
```

---

## 2. Technology Node Specifications

### Agriculture (Tier 1)
* **Direct Effect:** Enables construction of the *Farm* building on Flatlands.
* **Economic Consequence:** Food production base yield increases from $+2$ to $+4$ per turn per Farmer.
* **Diplomatic Consequence:** Surplus food allows trade offerings to food-deficit neighbors, raising trust.
* **Internal Politics:** Boosts the loyalty and influence of the **Farmers / Workers** interest group ($I = +5\%$).
* **Environmental/Social Side Effect:** Population growth rate increases, putting pressure on housing. Increases deforestation as more land is cleared for farming, decreasing regional humidity ($H = -0.05$).

### Masonry (Tier 1)
* **Direct Effect:** Enables construction of *Fortresses* on Hills and Mountain border tiles.
* **Economic Consequence:** Construction costs for standard buildings are reduced by $10\%$ due to quarrying techniques.
* **Diplomatic Consequence:** Neighboring kingdoms perceive building fortresses near borders as an threat, increasing Hostility ($H = +15$).
* **Internal Politics:** Supported by the **Nobility** interest group (increases their loyalty by $+10$).
* **Environmental/Social Side Effect:** Quarrying activities reduce local biodiversity, making adjacent agricultural tiles slightly less fertile (Farm yields $-5\%$).

### Writing (Tier 2)
* **Direct Effect:** Enables construction of the *Academy* building.
* **Economic Consequence:** Academies generate $+4$ research points per turn. Exposes active Gold ledgers of other factions in the trade view.
* **Diplomatic Consequence:** Enables negotiation of *Joint Research Pacts*.
* **Internal Politics:** Boosts the influence of the **Scholars** interest group.
* **Environmental/Social Side Effect:** Pops demand political representation. Basic unrest coefficient increases by $+2.0$ globally.

### Iron Working (Tier 2)
* **Direct Effect:** Enables recruitment of *Swordsmen* units (double the combat power of default Militia).
* **Economic Consequence:** Unlocks Iron mining on Hill hexes. Increases Iron demand; upkeeps of advanced structures now require Iron.
* **Diplomatic Consequence:** Neighbor fear level ($F$) increases by $+20\%$, causing defensive coalitions to form against you.
* **Internal Politics:** Highly favored by the **Military** interest group (Loyalty $+20$, Influence $+10\%$).
* **Environmental/Social Side Effect:** Smelting iron requires vast amounts of wood fuel, accelerating deforestation rates.

### Code of Laws (Tier 3)
* **Direct Effect:** Unlocks the *Tax Slider* limit (can now tax up to $50\%$) and enables *Policy Decrees*.
* **Economic Consequence:** Tax collection efficiency is improved, reducing corruption gold leakage.
* **Diplomatic Consequence:** Increases diplomatic trust cap with civilized treaty-aligned neighbors.
* **Internal Politics:** Strongly supported by the **Clergy** and **Nobility** (Loyalty $+15$). **Workers** oppose strict codification (Loyalty $-10$).
* **Environmental/Social Side Effect:** Drastically reduces baseline city Unrest growth rates, but increases likelihood of structural revolutions if tax rates are pushed above $40\%$.

### Sailing (Tier 3)
* **Direct Effect:** Enables construction of *Galley* transport ships.
* **Economic Consequence:** Unlocks marine resource gathering and increases trade route slot limits.
* **Diplomatic Consequence:** Allows kingdoms on separate islands to form trade networks.
* **Internal Politics:** Highly supported by the **Merchants** interest group (Loyalty $+20$, Influence $+10\%$).
* **Environmental/Social Side Effect:** Spreads technologies faster across oceans. Exposes coastal cities to maritime raids and pirate spawn events.

---
*End of Technology Ripple Effects Specification.*
