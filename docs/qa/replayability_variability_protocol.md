# PROJECT ATLAS: REPLAYABILITY TEST PROTOCOL
## Headless Simulation Variance Checks (Version 1.0.0)

This document defines the quality assurance validation protocols required to verify the replayability of the *Project Atlas* MVP. The objective of this protocol is to ensure that starting variables, procedural generation algorithms, and AI decision heuristics produce divergent histories rather than repeating uniform outcomes.

---

## 1. Automated Test Setup
An automated script runs **10 simulation instances** concurrently.

* **Simulation Count ($N$):** 10 games.
* **Turn Limit:** 150 turns per simulation.
* **Seeds:** Dedicated integers $1$ through $10$.
* **Configuration:** 5 civilizations, starting at procedural coordinates.
* **Mode:** Headless execution (graphical UI disabled, console logging state tracking only).

---

## 2. Quantitative Evaluation Metrics
At turn 150, the test runner compiles the final JSON state snapshots and runs statistical tests across the 10 data outputs:

```
  ┌────────────────────────────────────────────────────────┐
  │ HEADLESS TEST RUNNER                                   │
  │ Execute seeds 1-10 through 150 turns.                  │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ METRIC COMPILATION                                     │
  │ Extract: Winners, Tech Paths, Wars, Alliances, Crises. │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ STATISTICAL VARIATION CHECKS                           │
  │ Evaluate: Jaccard Similarity, standard deviation,      │
  │ dominant strategies.                                   │
  └────────────────────────────────────────────────────────┘
```

The script evaluates the following compliance metrics:

### A. Faction Victory & Score Distribution
* **Equation:** Let $W_s$ represent the winning faction ID for seed $s$. Let $f(W_s)$ be the frequency of a faction winning across all runs.
* **Target Variance:** The most dominant faction must not win more than $40\%$ of the games:

$$\max_{i} (f(i)) \le 4$$

*This verifies that starting faction traits or colors do not carry unbalanced, dominant advantages.*

### B. Tech Path Divergence (Jaccard Index)
* **Equation:** For any two civilizations $A$ and $B$ in seed $s$, let $T_A$ and $T_B$ be the set of their unlocked technologies. The Jaccard Similarity index is:

$$J(T_A, T_B) = \frac{|T_A \cap T_B|}{|T_A \cup T_B|}$$

* **Target Variance:** The average Jaccard index across all active civilizations at turn 100 must be less than $0.60$:

$$\text{Average}(J) < 0.60$$

*This confirms that civilizations specialize in different technological directions rather than researching nodes in a fixed order.*

### C. War & Conflict Frequency Variation
* **Equation:** Let $C_s$ be the count of declared wars in seed $s$. Calculate the standard deviation $\sigma_c$ across all 10 runs:

$$\sigma_c = \sqrt{\frac{1}{N}\sum_{s=1}^{N}(C_s - \mu_c)^2}$$

* **Target Variance:** Conflict frequency must vary based on geography and personality matchups:

$$\sigma_c > 2.0$$

---

## 3. Playable Strategy Dominance Check
A core goal of the replayability test is to confirm that **no single strategy dominates the simulation**.
* The test script tracks the leader traits of winning factions.
* If leaders with the **Militaristic** trait win more than $50\%$ of the games, or if civilizations starting adjacent to **Iron** win more than $50\%$ of the games, the balance algorithm fails. The engine parameters must be re-calibrated (e.g., increasing trade gold yield or defense fortress modifiers) to allow mercantile, scientific, or defensive victories.

---

## 4. Pass / Fail Acceptance Criteria
The MVP build is **rejected** if any of the following occur:
* **The Monotony Failure:** The same civilization wins in $\ge 6$ out of the 10 seeds.
* **The Tech Mirror Failure:** Civilizations unlock the six technology nodes in the same chronological sequence in $\ge 8$ out of 10 runs.
* **The Alliance Stagnation Failure:** Factions form the same bilateral alliance pairings in every game.
* **The Crash Failure:** Any of the 10 headless simulations fail to complete 150 turns due to standard code errors or memory leaks.

---
*End of Replayability Test Protocol.*
