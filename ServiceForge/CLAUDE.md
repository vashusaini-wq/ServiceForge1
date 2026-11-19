# CLAUDE.md — ServiceForge (Claude Code)

@AGENTS.md

The above import brings in the tool-agnostic project rules. Everything below is Claude-Code-specific.

## Subagents

This repo defines four feature-work subagents under `.github/agents`, matching the stages in `pipeline/orchestration.md`:

- `ba-agent` — turns a feature intent into a requirements/specification draft.
- `design-agent` — challenges the requirements and drafts the ADR and implementation plan.
- `developer-agent` — implements the human-approved design into working code.
- `tester-agent` — writes and runs tests against the approved acceptance criteria.

Invoke them the way you'd invoke any Claude Code subagent, e.g.:

```
"Develop this feature: <intent>"
→ Route through ba-agent → design-agent → human ADR/plan approval
  → developer-agent → tester-agent → human test-result approval,
  per pipeline/orchestration.md — do not skip gates or write code directly.
```

## Skills

Skills live under `.github/skills/<skill-name>/SKILL.md` and are loaded when relevant:

- `build-code-skill` — backend + frontend stack conventions for this repo.
- `spec-generation-skill` — how the BA agent turns intent into a feature spec.
- `migration-safety-skill` — how to evolve the mock data model without breaking existing consumers (there is no real database, but the same discipline applies to the in-memory model).

## Memory note for this repo

Feature-by-feature decisions (the facts a later feature may need to retrieve) are logged under `pipeline/decisions/`, one file per feature — starting with `pipeline/decisions/feature-1-decisions.md`. Do not rely on conversation history alone to carry these facts forward; they are committed here specifically so they can be retrieved on demand instead of kept in context permanently.
