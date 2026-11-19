# Copilot instructions — ServiceForge

Read `AGENTS.md` at the repo root first — it is the tool-agnostic entry point every tool in this repo shares. This file only adds Copilot-specific pointers.

## The pipeline

Any "develop this feature: `<intent>`" request must follow `pipeline/orchestration.md`: Requirements → Design → human approval of ADR/plan → Build → Test → human approval of results. Do not skip stages or begin building before approval.

## Role definitions

The Requirements (BA), Design, Build (Developer), Test, and Bugfix roles are defined under `.github/agents/*.md`. Read and follow the relevant role file. Reusable prompt files for Requirements, Design, Build, and Test are under `.github/prompts/`.

## Skills

Load `.github/skills/build-code-skill/SKILL.md` before writing backend or frontend code — it has the package layout, DI style, REST conventions, and Angular conventions this repo expects. `.github/skills/spec-generation-skill/SKILL.md` and `.github/skills/migration-safety-skill/SKILL.md` apply to the BA role and to data-model changes respectively.

## Conventions to always respect

- No real database — mock/in-memory data only (`MockDataStore` on the backend).
- Constructor injection only on the backend; no HTTP calls inside Angular components, always through a service.
- Every feature has exactly one spec file under `pipeline/features/`, never merged with another feature's spec.
