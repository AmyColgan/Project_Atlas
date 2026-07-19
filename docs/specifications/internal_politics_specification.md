# PROJECT ATLAS: INTERNAL POLITICS SPECIFICATION
## Domestic Factions & Interest Group Dynamics (Version 1.0.0)

This document details the systems governing **Internal Politics** and **Interest Groups** in the *Project Atlas* MVP. The objective is to simulate domestic political friction within both the player's civilization and AI-controlled kingdoms. Ignoring the material demands of powerful domestic factions leads to economic gridlock, military instability, or revolutionary collapse.

---

## 1. Interest Group Schema
Every civilization contains all six interest groups below, always active simultaneously, representing the socio-economic pillars of the state. (An earlier draft described "at least three" as a variable subset — that language is obsolete; all six groups are tracked for every civilization from turn one.)

```
                  ┌────────────────────────────────────────┐
                  │          CIVILIZATION POLICIES         │
                  │   (Tax Rates, Laws, War State, Tech)   │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │             INTEREST GROUPS            │
                  │   Tracks: Influence [0.0 - 1.0]        │
                  │           Loyalty [0 - 100]            │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │             DOMESTIC CRISES            │
                  │   - Workers / Scholars strike          │
                  │   - Military Mutiny / Noble Tax Evasion│
                  │   - Revolutionary Civil War            │
                  └────────────────────────────────────────┘
```

The interest groups are defined as follows:

| Faction Group | Class Foundation | Primary Demand | Approval Modifiers |
| :--- | :--- | :--- | :--- |
| **Military** | Soldiers & Officers | Security & Expansion | $+10$ during war. $+15$ for building Barracks. $-20$ for low army maintenance. |
| **Merchants** | Traders & Artisans | Open Commerce & Wealth | $+15$ for active Trade Treaties. $-25$ if war disrupts trade. $-10$ for high tariffs. |
| **Farmers / Workers** | Laborers & Farmers | Welfare & Stability | $+20$ if Food surplus is high. $-30$ during famine. $-15$ for high tax rates. |
| **Nobility** | Landowners & Elites | Low Taxes & Aristocracy | $+20$ for Monarchy government. $-25$ if tax rate is set $> 20\%$. |
| **Clergy** | Priesthood | Moral Authority | $+15$ for religious government. $-15$ for secular law changes. |
| **Scholars** | Researchers | Academic Funding | $+20$ for Academy construction. $-15$ if research funding is cut. |

---

## 2. Dynamic Metric Calculations
At the end of each turn, the engine calculates the **Influence ($I$)** and **Loyalty ($L$)** of each faction.

### A. Faction Influence ($I$)
Influence represents the group’s share of political power, calculated as a ratio of their economic and structural presence:

$$I_{\text{Military}} = \frac{\text{ArmyUpkeep}}{\text{TotalStateUpkeep}}$$

$$I_{\text{Merchants}} = \frac{\text{TradeIncome}}{\text{TotalStateRevenue}}$$

$$I_{\text{Farmers/Workers}} = \frac{\text{Farmers} + \text{Miners}}{\text{TotalPopulation}}$$

$$I_{\text{Nobility}} = 0.35 \times (\text{MonarchyGovernment} ? 1.5 : 0.5)$$

*The sum of all active faction influences is normalized to $1.0$ at the end of each calculation step.*

### B. Faction Loyalty ($L$)
Loyalty scales from $0$ (open rebellion) to $100$ (complete obedience). It updates each turn based on state variables:

$$L_{t+1} = L_t + \Delta L_{\text{taxation}} + \Delta L_{\text{welfare}} + \Delta L_{\text{stability}} + \Delta L_{\text{actions}}$$

Where:
* **Taxation Impact:**
  $$\Delta L_{\text{taxation}} = (\text{TaxRate} > 0.20) ? -(\text{TaxRate} - 0.20) \times 100 : +5$$
  *(Nobles and Merchants suffer double this penalty).*
* **Starvation Impact:**
  $$\Delta L_{\text{starvation}} = \text{StarvationRate} \times -50$$
  *(Farmers and Workers suffer double this penalty).*
* **War Status:**
  * Military: $+5$ per turn in war, $-5$ per turn in peace.
  * Merchants: $-10$ per turn in war if trade deals are closed.

---

## 3. Domestic Crises & Faction Backlash
If a faction's Loyalty ($L$) falls below $30$, they enter a **Crisis State**. The consequences are determined by their influence ($I$):

1. **Labor Strikes (Farmers / Workers):**
   * Triggered if Loyalty $< 30$.
   * **Consequence:** City production and mining yields are reduced by $\%\text{Strike} = I_{\text{Workers}} \times 100$. Food production drops, potentially triggering starvation cascades.
2. **Military Mutiny (Military Faction):**
   * Triggered if Loyalty $< 25$.
   * **Consequence:** All military divisions refuse movement orders and suffer a $-50\%$ defense penalty. If loyalty drops below $10$, random military divisions switch to neutral "Rebel" units on the map, occupying adjacent hexes.
3. **Tax Evasion (Nobility / Merchants):**
   * Triggered if Loyalty $< 30$.
   * **Consequence:** State Gold income from taxes is cut by half.
4. **Academic Gridlock (Scholars):**
   * Triggered if Loyalty $< 35$.
   * **Consequence:** Research point generation halts in Academies. Unlocked technologies cannot be applied.

---

## 4. The Revolutionary Coup (Political Collapse)
If any interest group with $I > 0.40$ (representing a dominant political class) has $L < 15$ for more than 5 consecutive turns, a **Revolution Event** triggers:

* **Player Civilization:** The player is presented with a choice:
  * **Option A: Yield to Demands:** Immediately adjust government style, change tax rates, or close wars, causing a permanent $-30\%$ loss in prestige score.
  * **Option B: Fight Revolution:** Civil war erupts. Random cities and armies rebel under independent AI controls. The player must defeat the rebels within 20 turns or face game over.
* **AI Civilizations:** The AI leader undergoes immediate succession. The government form is altered (e.g., Monarchy changes to Dictatorship), and the previous leader profile is deleted.

---
*End of Internal Politics Specification.*
