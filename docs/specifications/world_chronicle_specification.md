# PROJECT ATLAS: WORLD CHRONICLE SPECIFICATION
## The Generative Historiography Engine (Version 1.0.0)

This document outlines the architecture, data schemas, and narrative compilation rules for the **World Chronicle Subsystem** in the *Project Atlas* MVP. The Chronicle records significant world transactions and compiles them into a structured, readable history ledger.

---

## 1. System Architecture
The World Chronicle operates as a time-series ledger. Every major simulation transition triggers an event write to an append-only memory stack:

```
  ┌────────────────────────────────────────────────────────┐
  │                   SIMULATION ENGINES                   │
  │   - Faction state changes, battles, disasters, tech    │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │                 CHRONICLE DATA SCHEMA                  │
  │   - Formats event to structured JSON entries           │
  │   - Commits details (Turn, Factions, Cost, Causality)  │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │                  NARRATIVE ASSEMBLER                   │
  │   - Maps JSON structures to grammar templates          │
  │   - Generates readable end-of-game histories           │
  └────────────────────────────────────────────────────────┘
```

---

## 2. Event Ledger Schema
Events are serialized using a unified schema to support dynamic tracking:

```json
{
  "event_id": "chron_1942",
  "turn": 34,
  "category": "WAR_DECLARED",
  "name": "THE FIRST IRON WAR",
  "primary_actors": ["kingdom_valgardia", "kingdom_osteria"],
  "secondary_actors": ["kingdom_aethelgard"],
  "causality": {
    "trigger_type": "RESOURCE_COMPETITION",
    "resource": "Iron",
    "target_hex": "hex_12_4"
  },
  "metrics": {
    "starting_forces": 14,
    "casualties": 5,
    "gold_spent": 450
  },
  "outcome": "VICTORY_VALGARDIA",
  "long_term_shift": {
    "border_change": true,
    "alliance_broken": "alliance_valgardia_osteria"
  }
}
```

---

## 3. Narrative Template Assembly
The chronicle parses the JSON database entries and maps them to human-readable text blocks using dynamic string interpolation structures:

```typescript
function compileWarRecord(entry: ChronicleEntry): string {
  const template = `
=== ${entry.name} ===
Turns ${entry.turn} to ${entry.turn + entry.duration}

Cause:
${entry.primary_actors[0]} and ${entry.primary_actors[1]} competed for control of the ${entry.causality.resource} reserves.

Major Events:
- ${entry.primary_actors[0]} rejected trade requests from ${entry.primary_actors[1]}.
- Troops from ${entry.primary_actors[1]} marched across the border near ${entry.causality.target_hex}.
${entry.secondary_actors.length > 0 ? `- ${entry.secondary_actors[0]} entered the conflict to support their allies.` : ''}

Outcome:
${entry.outcome} asserted control over the disputed region, losing ${entry.metrics.casualties} military divisions in the campaign.

Consequences:
- Border adjustments executed at ${entry.causality.target_hex}.
- Relationship hostility metrics increased between former trading partners.
`;
  return template;
}
```

---

## 4. End-of-Game Narrative Compiler
When a victory or collapse condition is triggered, the game transitions to the **World Chronicle Viewer**:

1. **Chronological Reconstruction:** The compiler reads the append-only JSON file from turn 1.
2. **Era Categorization:** The compiler clusters consecutive turns into distinct "Eras" based on dominant activities (e.g., War eras, Development eras, Famine eras).
3. **Synthesis:** It prints a formatted, scrollable narrative document showing the rise, peak, crises, alliances, and eventual victory/collapse of the civilizations.
4. **Export:** Players can click `EXPORT HISTORY` to output the complete compiled chronicle as a text markdown document.

---
*End of World Chronicle Specification.*
