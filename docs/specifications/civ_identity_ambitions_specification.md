# PROJECT ATLAS: CIV IDENTITY & AMBITION SPECIFICATION
## Emergent Behavior & Dynamic Leader Profiles (Version 1.0.0)

This document details the systems governing **Civilization Identities** and **AI Leader Profiles** in the *Project Atlas* MVP. These systems prevent civilizations from behaving like generic resource-collecting models, ensuring they develop distinct strategies, diplomatic stances, and long-term ambitions that evolve over the timeline of play.

---

## 1. The Core Profile Model
A civilization's strategic behavior is calculated dynamically from its **Civilization Identity Schema** and its active **Leader Profile**:

```
      ┌────────────────────────────────────────────────────────┐
      │               CIVILIZATION IDENTITY SCHEMA             │
      │  - Starting Geography (Rivers, Mountains, Plains)      │
      │  - Faction Traits (Agrarian, Metallurgist, Seafaring)  │
      │  - Interest Group Influences (Military, Merchants)     │
      └──────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
      ┌────────────────────────────────────────────────────────┐
      │                  ACTIVE LEADER PROFILE                 │
      │  - 2 Major Traits        - 1 Governing Priority        │
      │  - 1 Weakness            - 1 Personal Ambition         │
      │  - 1 Diplomatic Tendency - 1 Fear or Insecurity        │
      │  - 1 Military Tendency   - 1 Active Long-Term Ambition │
      └──────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
      ┌────────────────────────────────────────────────────────┐
      │                 DECISION UTILITY COEFFICIENTS          │
      │  - Modifies FSM transitions                            │
      │  - Skews building/unit construction priority queues    │
      └────────────────────────────────────────────────────────┘
```

---

## 2. Expanded Leader Profile Structure
At setup or during a leadership succession crisis, leaders are procedurally generated with the following attributes:

### A. Major Traits (Choose 2)
* **Ambitious:** $+25\%$ utility to expansion decisions.
* **Cautious:** $+25\%$ utility to Fortifications. Avoids war unless **Relative Military Power (RMP)** — defined in `../design/glossary.md` — exceeds $2.0$ against the target.
* **Diplomatic:** $+30\%$ utility to diplomatic deals. Reduces relation decay.
* **Vindictive:** Negative memories do not decay over time.
* **Mercantile:** $+40\%$ utility to Markets. Priority given to trade deals.
* **Expansionist:** $+30\%$ utility to Settlers. Expands city limits.
* **Traditionalist:** $+20\%$ utility to housing/welfare. Enacts conservative laws.
* **Innovative:** $+25\%$ utility to Academies and scientific projects.
* **Militaristic:** $+50\%$ utility to military units. Decreases war unrest by $30\%$.
* **Isolationist:** Rejects all alliances. $+25\%$ resource production modifier, but trade value is halved.

### B. Weaknesses (Choose 1)
* **Indecisive in War:** $-25\%$ Attack strength for units outside friendly territory. AI delays declaring war by $10$ turns after a trigger.
* **Poor Economic Judgment:** Upkeep costs for all buildings are increased by $+20\%$. Gold reserves calculations are ignored when prioritizing construction.
* **Vulnerable to Unrest:** City Unrest increases $+50\%$ faster during crises. Interest group loyalty penalties are multiplied by 1.5.
* **Paranoid:** Baseline diplomatic Trust cap is set to $0.50$. Neighbor military builds increase Hostility $+100\%$ faster.
* **Stubborn:** AI will not sue for peace in wars unless its cities are actively occupied.

### C. Governing Priorities (Choose 1)
* **Infrastructure:** $+30\%$ utility to Farms, Mines, and Markets.
* **Treasury Maximization:** High tax rate preference. $+40\%$ utility to Gold-generating activities.
* **Armed Forces Expansion:** $+30\%$ utility to Barracks construction and military units recruitment.
* **Scientific Breakthroughs:** $+30\%$ utility to Academies and tech research.

### D. Diplomatic & Military Tendencies (Choose 1 each)
* **Alliance Builder (Diplomatic):** $+50\%$ willingness to accept and propose Alliances.
* **Opportunistic Pact-Breaker (Diplomatic):** If a neighbor's military power falls below $50\%$ of the AI's power, the AI will break active treaties without penalty to prepare for war.
* **Attrition Warfare (Military):** Prioritizes defensive blockades and siege combat. Units gain defense buffs when fortified.
* **Scorched Earth (Military):** When retreating, AI pillages its own resource improvements to starve advancing enemies.

### E. Personal Ambitions & Fears (Choose 1 each)
* **Hoard Wealth (Ambition):** AI will attempt to amass a minimum treasury reserve of $1,000$ Gold. Rejects trades that reduce cash below this limit.
* **Uncover Sciences (Ambition):** Focuses research exclusively on tech branches where it is not the global leader.
* **Fear of Starvation (Fear):** Maintains a permanent $+50\%$ surplus of food reserves. Allocates extra Farmers even during wealth deficits.
* **Fear of Encirclement (Fear):** Increases hostility index toward any civ that establishes borders adjacent to more than $30\%$ of its territory.

---

## 3. Long-Term Strategic Ambitions
At start of play, the leader is assigned a **Long-Term Ambition** based on their profile and starting geography:

1. **Unite Continent:** FSM targets conquest of all contiguous landmass tiles. Utility of Settlers and Armies is scaled by $1.5$.
2. **Control Iron Range:** FSM targets control of at least $60\%$ of all discovered Iron deposits. Relational hostility is doubled against any faction holding active Iron Mines.
3. **Wealthiest Merchant:** Prioritizes trade treaty proposals. Evaluates trade deal items with a $+25\%$ utility bonus.
4. **Scientific Hegemony:** FSM targets unlocking Tier 3 technologies ahead of all other factions.
5. **Autarky (Self-Reliance):** Rejects all trade proposals. Focuses entirely on internal resource extraction.
6. **Protect Ally:** Targets maintaining a constant defense treaty with the weakest neighboring faction.
7. **Destroy Rival:** AI targets the faction with the highest relational Hostility index. Will not accept peace deals from this faction.

---

## 4. Decision Weight Calculations (Utility Shifts)
Leader profile variables directly alter utility values in the central simulation engine:

$$\text{FinalUtility}(Action) = \text{BaseUtility}(Action) \times \prod \text{Modifiers}$$

---

## 5. Ambition Drift & Successions
Ambitions are not permanent. They adapt dynamically to major world milestones:
* **Capital Loss:** If a civilization loses its capital city, its ambition immediately shifts to **Destroy Rival** (targeting the conqueror) or **Autarky** (focusing on survival).
* **Famine/Bankruptcy:** Consecutive turns of starvation or zero treasury force a shift to **Autarky** or **Wealthiest Merchant**.
* **Leader Death/Succession:** When a ruler dies (due to aging, war casualty, or coup), a new leader profile is randomized based on the seed. The Faction interest groups determine the new ambition based on which interest group is dominant.

---
*End of Civilization Identity & Ambition Specification.*
