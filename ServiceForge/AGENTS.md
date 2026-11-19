# AGENTS.md — ServiceForge

This file is the entry point any coding agent (Claude Code, GitHub Copilot, Codex CLI, or equivalent) should read first when working in this repository. It is intentionally tool-agnostic — tool-specific files in `.github/` point back to it and to `pipeline/orchestration.md`.

## What this repo is

**ServiceForge** is a Field Service Management platform: work orders, technician scheduling, parts inventory, a customer portal, SLA tracking, mobile dispatch. This boilerplate ships with **Feature 1 — Technician Availability Calendar** already built, as the worked reference for everything built on top of it.

- **Backend:** Java 17, Spring Boot 3, in-memory mock data (no real database — this is a training boilerplate, not a production system).
- **Frontend:** Angular, calling the backend REST API, mock data end to end.

## How to run it

```bash
# Backend (from /backend)
mvn spring-boot:run          # serves http://localhost:8080

# Frontend (from /frontend)
npm install
npm start                    # serves http://localhost:4200
```

## The one rule every agent follows here

**"Develop this feature" is a standing instruction, not a one-off prompt.** Whenever anyone (human or agent) says "develop this feature: <intent>", the work must go through **[`pipeline/orchestration.md`](pipeline/orchestration.md)** — Requirements → Design → human approval → Build → Test → human approval. Do not skip stages or start building before the ADR and plan are approved.

## Where things live

| What | Where |
|---|---|
| The orchestration pipeline (tool-agnostic, read this first) | `pipeline/orchestration.md` |
| Agent role definitions (Requirements / Design / Build / Test) | `.github/agents` — plain markdown with a small YAML header for Claude Code; readable as-is by any tool |
| Skills (reusable how-to knowledge) | `.github/skills/*/SKILL.md` |
| Feature specifications (one file per feature — see the [feature-spec convention](pipeline/features/feature-1-technician-availability.md)) | `pipeline/features/feature-N-<slug>.md` |
| Decisions made while building a feature (what later features must remember) | `pipeline/decisions/feature-N-decisions.md` |
| Project-wide rules | `pipeline/rules/*.md` |
| Build journal | `pipeline/build-journal.md` |

## Coding conventions

- **Backend (Java/Spring Boot):** package-by-layer (`model`, `data`, `service`, `controller`, `dto`); constructor injection, no field injection; REST endpoints return `ResponseEntity<T>`; validation errors return `400` with an `ApiError` body; not-found returns `404` with an `ApiError` body.
- **Frontend (Angular):** one component per screen area under `src/app/`; HTTP calls isolated in `services/`; no business logic in components — components render and delegate.
- **Both:** no real database, no external services — mock/in-memory data only, seeded at startup. Do not introduce a database dependency without an explicit decision recorded in `pipeline/decisions/`.

## Cross-tool notes

- **Codex / any AGENTS.md-aware CLI agent:** you're already reading the right file. Go to `pipeline/orchestration.md` next.
- **GitHub Copilot:** see `.github/copilot-instructions.md` and the reusable prompt files in `.github/prompts/`.
- **Claude Code:** see `CLAUDE.md` — it imports this file and adds Claude Code-specific usage notes. Agent and skill definitions are maintained under `.github/`.
