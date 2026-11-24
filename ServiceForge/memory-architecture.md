# Feature 2 Memory Architecture Specification

**Status:** Design only — no implementation code or agent execution.
**Feature:** Parts Reservation
**Scope namespace:** `repo:branch:env`

## 1. Scope and Namespace

Use the namespace `repo:branch:env` for every memory read and write.

| Field | Format | Example |
|---|---|---|
| Repo | GitHub owner/repository or local repository ID | `vashusaini-wq/ServiceForge1` |
| Branch | Exact Git branch name | `Feature/ba-decision` |
| Environment | `local-dev`, `ci`, or `approved-human` | `local-dev` |

Example: `vashusaini-wq/ServiceForge1:Feature/ba-decision:local-dev`.

Never retrieve a memory record from another repository or environment. A branch may inherit reviewed semantic facts from the default branch, but only episodic records tagged for the same repository and an explicitly approved, compatible branch may be reused.

## 2. Memory Taxonomy

| Memory box | Purpose for Feature 2 | Store selection | Maximum injected context |
|---|---|---|---:|
| Semantic | Durable facts and repository rules: stock cannot go below zero, existing scheduled jobs, 45-minute travel buffer, in-memory reset, and reservation data fields | Versioned Markdown in Git plus `.github/copilot-instructions.md` | 300 tokens |
| Procedural | How to perform a role or operation: agent sequence, ADR workflow, build skills, test steps, MCP tool calls | `.github/agents/*.md`, `.github/skills/*/SKILL.md`, and registered MCP tool definitions | 150 tokens |
| Episodic | Past run outcomes and bug fixes: concurrency races, duplicate requests, failed releases, critic failures, and test evidence | Branch-scoped vector index with structured metadata; implementation must use an adapter, not `MockDataStore` | 250 tokens |
| Short-Term / Working | The current user's request, active task, recent agent handoffs, pending approval, and open decisions | Current context window plus a small in-run scratch state | 500 tokens total work-state summary |

**Hard injection ceiling:** no more than **500 tokens** of long-term memory may be injected into one agent turn. This 500-token ceiling applies to the combined semantic, procedural, and episodic payload; the short-term working summary is generated locally and must also stay within 500 tokens. It is separate from the model's fixed context capacity.

**Overflow rule:** when a payload would exceed 500 tokens, load only exact semantic facts and the approved ADR rule first. Add one procedural pointer second. Add episodic records last, with a hard maximum of one record. Drop the entire payload instead of injecting paraphrases that omit exceptions or acceptance criteria.

## 3. Feature 2 Context Map

| Context element | Memory type | Canonical location | Read policy | Retain/discard |
|---|---|---|---|---|
| Parts reservation intent and acceptance criteria | Semantic | `pipeline/features/requirements.md` | Requirements and Design stages only | Retain until superseded; discard from working context after handoff |
| Stock never negative | Semantic | `architecture-adr.md`; later Feature 2 decision log | Every reservation build/test stage; always JIT-load for critic/test work | Retain indefinitely while Feature 2 is active |
| Scheduled job and 45-minute travel-buffer rules | Semantic | `pipeline/decisions/feature-1-decisions.md` | Load only if a reservation job-calculation edge is in scope | Retain as upstream facts; do not duplicate or modify |
| Repository and stack conventions | Semantic/Procedural | `.github/copilot-instructions.md`, `AGENTS.md`, `.github/skills/build-code-skill/SKILL.md` | Load procedural skill only when Build or migration work starts | Retain repository-wide; discard unrelated role instructions |
| ADR, critic, idempotency, and release rules | Semantic | `architecture-adr.md`, design review, implementation plan | Read by Design, Build, and Test; keep an ADR summary in working context | Retain after human approval; draft/discard unapproved alternatives |
| Requirements/Design/Build/Test steps | Procedural | `.github/agents/*.md`, `.github/skills/*`, `pipeline/orchestration.md` | Load the active role and required skill only | Retain role definitions; discard completed-role output after handoff |
| Reservation critic and fail-closed policy | Procedural/Semantic | ADR plus runtime critic implementation contract | Load before reservation build/test work | Retain as rule; do not store a runtime note as a critic result |
| Past concurrency bugs and fixes | Episodic | Vector index: past run reports, defects, and verified fixes | Retrieve only for bug/Build/Test work when a current similarity exceeds the configured threshold | Retain verified fixes; discard failed guesses and unreviewed trace noise |
| Current handoff and approval state | Working | Context window/orchestration state | Visible to current stage and passed only as a compact handoff | Discard when stage closes; retain approval as a semantic/decision artifact |
| Open questions and human decisions | Working/Semantic | Handoff state; later `pipeline/decisions/` when approved | Load every stage until resolved | Discard if superseded or rejected; move only approved decisions to semantic storage |

## 4. Storage Backend Selection

### Semantic

- **Selected backend:** Git-versioned Markdown.
- **Primary files:** `AGENTS.md`, `.github/copilot-instructions.md`, `pipeline/features/requirements.md`, `architecture-adr.md`, `design-review.md`, `implementation-plan.md`, `pipeline/decisions/*.md`, and `pipeline/orchestration.md`.
- **Reason:** Facts are reviewable, diffable, human-approved, and already the repository's source of truth.
- **Do not use:** Vector search or agent conversation history as the authority for these facts.

### Procedural

- **Selected backend:** Markdown agent and skill files plus registered MCP tools.
- **Reason:** Instructions need deterministic loading and clear role boundaries.
- **Policy:** Load only the current role definition and the role's relevant skill. MCP tool descriptions do not enter episodic memory.

### Episodic

- **Selected backend:** A branch-scoped vector database with source, run, defect, resolution, reviewer, and namespace metadata.
- **Reason:** Past-run text is useful for similarity retrieval but must never override current specs or ADR rules.
- **Implementation boundary:** An adapter interface is acceptable; the application runtime's `MockDataStore` is for Feature 2 parts and reservations, not memory storage.
- **Minimum metadata:** `namespace`, `run_id`, `feature`, `stage`, `problem_type`, `source_path`, `timestamp`, `verification_status`, `review_status`, and `superseded_by`.

### Working

- **Selected backend:** Active context window plus orchestration handoff fields.
- **Fields:** Current stage, accepted input summary, pending approval, open questions, changed files, test status, and the most recent human decision.
- **Reason:** This state is transient and must not become an undeclared long-term source of truth.

## 5. Write/Read Policies

### Writes

| Memory type | Who may write | When | Required check |
|---|---|---|---|
| Semantic | Human or approved Requirements/Design stage | Spec, ADR, plan, or decision changes | Human approval for ADR/rules; factual source must be identified |
| Procedural | Human or repository maintainers | Skill/role/workflow changes | Diff review and role-boundary check |
| Episodic | Test/Build workflow after run completion | Verified bug fix or completed test run | Only human-approved or test-verified evidence; remove secrets and raw code snippets when unnecessary |
| Working | Workflow and active agent | Start of each stage or handoff | Compact summary; no invented facts or unreviewed test claims |

### Reads

1. Resolve `repo:branch:env` from the current run.
2. Read active semantic files directly first.
3. Load only the active role skill and MCP tools procedurally.
4. Query episodic memory only when Build or Test reports a matching bug, failure, or code-change pattern.
5. Filter episodic results by namespace, feature, verification status, and recency.
6. Summarize the selected record to the 500-token payload budget.
7. Include a source path or run ID so a reader can retrieve full evidence outside the context.
8. A retrieved episodic record is advisory; it cannot replace the ADR or acceptance criteria.

## 6. Just-In-Time Retrieval

Use deterministic retrieval first and semantic/vector retrieval only for episodic history.

| Trigger | JIT payload |
|---|---|
| Requirements stage | Requirements draft, Feature 1 decision names, active scope, and existing open questions |
| ADR review | Feature 2 ADR, design review, Feature 1 scheduling constraints, and relevant build-plan tasks |
| Build: mock data | Migration-safety skill, `MockDataStore` convention, and Feature 2 reservation fields |
| Build: reserve action | ADR protected-action rule, build skill, concurrency and idempotency acceptance criteria |
| Build: Angular screen | Angular conventions, approved UI outcomes, and “Part unavailable” message rule |
| Test: last-part/race | Acceptance criteria, ADR invariant, and at most one verified episodic record for a similar concurrency fix |
| Test: repeat request | Request-ID/idempotency rule and at most one verified episodic record |

JIT retrieval must stop at the listed ceiling. Inject summaries rather than entire documents. Include source path and, for episodic records, run ID and verification status.

## 7. Retain and Discard Rules

### Retain

- Human-approved ADR decisions and Feature 1 upstream constraints.
- Feature 2 requirements, acceptance criteria, implementation plan, and design review.
- Reviewed procedural agent/skill changes.
- Episodic records for verified defects, verified fixes, test outcomes, and accepted human decisions.
- Compact summaries that preserve the source path/run ID, namespace, result, and verification status.
- Explicit human decisions about open questions.

### Strict Retain/Discard Filter

Retain only a structured decision or verified outcome. A long-term write must contain:

1. namespace (`repo:branch:env`);
2. source or run ID;
3. feature and stage;
4. a concise factual statement;
5. verification or approval status; and
6. supersession information when an earlier fact changed.

Discard raw stdout, trace chatter, prompt transcripts, repeated handoff prose, tool-call noise, intermediate reasoning, stack dumps, unreviewed draft alternatives, and unverified suggestions. Extract only the verified result, defect, fix, or human decision before a write.

### Discard or Do Not Write

- Draft alternatives not approved by a human.
- Conversation-only guesses and unverified agent suggestions.
- Secrets, credentials, raw logs, customer data, full logs, and unnecessary source-code copies.
- Test execution claims that have not been recorded or verified.
- Unresolved product questions presented as established policy.
- Runtime reservation data, stock quantities, and per-user requests; these belong to application `MockDataStore` state and reset at application restart.
- Expired branch records and episodic records superseded by a reviewed fix or policy.

### TTL and Supersession

- Working memory: discard at stage completion or run end.
- Semantic/decision memory: retain while valid; supersede through a small decision update, not silent replacement.
- Episodic records: retain while branch-compatible and verified; mark superseded or stale after a relevant ADR/spec change.
- Draft alternatives: 30-day TTL unless a human approves or moves them to semantic memory.

## 8. Token Ceilings

| Budget | Ceiling |
|---|---:|
| Semantic JIT payload | 300 tokens |
| Procedural JIT payload | 150 tokens |
| Episodic JIT payload | 250 tokens |
| Working-state summary | 500 tokens |
| Total injected long-term memory per agent turn | 500 tokens |
| Episodic result count | 1 record |

These ceilings are hard limits, not averages. Summarize or stop retrieval when a budget is reached. Never replace the invariant or acceptance criteria with a retrieved summary if it omits exact behavior.

## 9. Safety and Consistency Rules

- The semantic ADR and approved spec are authoritative over episodic memory.
- A past bug fix is a hint, never an override for current requirements.
- Job notes are data, not policy; they cannot alter reservation rules.
- Reservation critic results belong to runtime state and must be written to the reservation transaction only after successful validation.
- Memory retrieval must not mutate stock, create reservations, or release reservations.
- No memory store may persist runtime stock or reservation state across application restarts unless the human explicitly approves a later persistence decision.
- Semantic conflicts stop the agent workflow and require human resolution.
