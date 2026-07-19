# PROJECT ATLAS: MULTI-AGENT WORKFLOW
## Specialist Subagent System (Living Document)

This document describes the specialized subagent system used for Project Atlas design and research phases, how it's invoked, and the rules of engagement that keep it from stepping on the existing, working Milestone 1 build.

---

## 1. Roles

**Project Director** — the main Claude Code session (not a subagent). Owns final synthesis, arbitration between specialists, and is the only party that decides when a proposal is approved for implementation. The human user is the ultimate approver; the Project Director never self-approves destructive or large-scope work.

**Specialist subagents** — defined as project-scoped agents in `Project_Atlas/.claude/agents/*.md` (not global `~/.claude/agents/`), so they exist only for this project:

| Agent | Focus |
|---|---|
| `atlas-game-director` | Cross-discipline creative coherence, GDD-tier alignment, disagreement surfacing |
| `atlas-3d-architect` | 3D technology choice, renderer-interface fit, vertical-slice scope |
| `atlas-world-designer` | Procedural world generation, starting-homeland placement |
| `atlas-civilization-designer` | Civilization selection, custom creation, civilization data structure |
| `atlas-ui-ux-designer` | New-game flow, civilization-selection experience, HUD evolution |
| `atlas-character-writer` | Campaign biographies grounded in the existing leader-profile/Chronicle systems |
| `atlas-performance-engineer` | Browser performance risk, budgets, profiling strategy |

Note: `atlas-game-director` is a specialist, not the Project Director. It focuses on creative coherence between specialists; it does not have approval authority. That authority stays with the main session and the human user, per rule 11 of the phase instructions that established this system.

---

## 2. Rules of Engagement

During a research/design phase, every specialist:

- May inspect the project (`Read`, `Grep`, `Glob`, `WebSearch`).
- May create or update files **only under `docs/`** — never `src/`, config files, or anything that runs.
- Must not replace the current renderer or touch existing renderer code.
- Must not make overlapping edits with another agent's assigned area — if an overlap is found, it gets reported, not silently resolved.
- Must not delete any existing system, file, or document.
- Must report disagreements and contradictions (with other specialists or with existing docs) explicitly to the Project Director, rather than picking a side.

Tool access is deliberately narrow (`Read, Grep, Glob, Write, WebSearch` — no `Edit`, no `Bash`) so a specialist physically cannot run destructive commands or touch runtime code; the `docs/`-only constraint is enforced by instruction within each agent's prompt, not by a sandboxing mechanism, so the Project Director still reviews what gets written before treating it as final.

---

## 3. Workflow Lifecycle

1. **Dispatch** — the Project Director spawns the relevant specialists (via the `Agent` tool, `subagent_type` set to the agent's name) with a scoped task description, run in the background per the project's existing "Agent Comms" pattern.
2. **Independent research** — each specialist inspects the project and writes findings to `docs/architecture/reviews/<agent-name>.md`.
3. **Collection** — the Project Director reads every review file once all specialists finish.
4. **Synthesis** — the Project Director produces one unified proposal (technology, folder structure, data structures, scope, ownership, sequencing, risks, conflicts, migration/rollback plan, and the exact approval decisions needed) and presents it to the human user.
5. **Approval gate** — the Project Director stops. No implementation, migration, or renderer replacement begins until the human user explicitly approves the unified proposal.
6. **Implementation (future phase, not yet authorized)** — once approved, work is split so agents with non-overlapping file ownership can run in parallel, while anything touching a shared contract (the `WorldRenderer` interface, `WorldState`/save-system shape) is done sequentially by whichever specialist owns that seam, reviewed by the Project Director before the next dependent piece starts.

---

## 4. Invocation Pattern

```
Agent({
  description: "3D tech + vertical slice research",
  subagent_type: "atlas-3d-architect",
  prompt: "<scoped research task, pointing at the exact files/docs to ground findings in>",
  run_in_background: true
})
```

Project-scoped agent definitions are loaded from `Project_Atlas/.claude/agents/` at session start. If an agent file is added or changed mid-session, it may not be picked up until the Claude Code session is restarted — this is checked and reported explicitly whenever the agent set changes (see the validation section of the phase report that introduced this system).

---

## 5. Where Findings Live

```
docs/architecture/
├── MULTI_AGENT_WORKFLOW.md       <- this file
└── reviews/
    ├── atlas-game-director.md
    ├── atlas-3d-architect.md
    ├── atlas-world-designer.md
    ├── atlas-civilization-designer.md
    ├── atlas-ui-ux-designer.md
    ├── atlas-character-writer.md
    └── atlas-performance-engineer.md
```

Individual review files are working documents — the authoritative output of a research phase is the synthesized unified proposal the Project Director presents afterward, not any single specialist's file in isolation.

---
*This document will be updated as the multi-agent system is used across future phases.*
