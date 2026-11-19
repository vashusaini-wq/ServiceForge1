# The "develop this feature" workflow

This is the tool-agnostic workflow for developing a feature in ServiceForge. It separates understanding, design, implementation, and validation so each agent has one clear responsibility. Tool-specific instructions in `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` point here.

## Trigger

Start with:

> **"Develop this feature: `<intent>`"**

The workflow coordinates four specialized agents. The human sets priorities, resolves business decisions, and approves the design and test results. Agents must not silently fill gaps with invented policy.

## Workflow at a glance

```text
Requirements Agent
        ↓
Design Agent
        ↓
Human approves ADR and plan
        ↓
Build Agent
        ↓
Test Agent
        ↓
Human approves test results before delivery
```

Each stage receives the prior accepted output and returns a defined artifact. The next stage does not start until its required input and approval are available.

## 1. Requirements Agent — understand the feature

- **Role:** `.github/agents/ba-agent.md`
- **Skill:** `.github/skills/spec-generation-skill/SKILL.md`
- **Input:** Feature request, business requirements, existing feature specs, and relevant decision logs.
- **Work:** Identify user needs, scope, user stories, acceptance criteria, constraints, assumptions, and open questions. Check every existing file under `pipeline/features/` and `pipeline/decisions/` for dependencies.
- **Output:** One draft feature specification under `pipeline/features/` (or `requirements.md` when explicitly requested). It must include testable acceptance criteria and label unresolved decisions.
- **Handoff:** Workflow sends the draft to Design. The Requirements Agent does not design the architecture or write application code.

## 2. Design Agent — choose the technical approach

- **Role:** `.github/agents/design-agent.md`
- **Input:** Requirements draft, business constraints, relevant prior decisions, and the implementation-plan request.
- **Work:** Challenge requirements for ambiguity, then define the solution architecture, component interactions, data flow, alternatives, trade-offs, and risks. Write an ADR and a build-ready task plan as requested. Do not write application code.
- **Output:** Proposed ADR and implementation plan, with assumptions and open questions visible.
- **Handoff:** Human reviews priorities and trade-offs and explicitly approves the ADR and plan. Build must not begin before this approval. If there are unresolved decisions affecting behavior, Design asks the human rather than choosing a policy.

## 3. Build Agent — implement the approved design

- **Role:** `.github/agents/developer-agent.md`
- **Skills:** `.github/skills/build-code-skill/SKILL.md`; also `.github/skills/migration-safety-skill/SKILL.md` for data-model changes.
- **Input:** Human-approved ADR and plan, accepted feature specification, relevant decision logs, and active rules under `pipeline/rules/*.md`.
- **Work:** Implement only the approved scope, following task dependencies and repository conventions. For parts reservation, the protected Reserve Part action must recheck stock and prevent duplicate reservation as specified.
- **Output:** Working code and an implementation summary identifying changed files and unresolved questions.
- **Handoff:** Workflow starts Test only when the implementation is available. The Build Agent does not change requirements or claim test results.

## 4. Test Agent — verify the business rules

- **Role:** `.github/agents/tester-agent.md`
- **Input:** Accepted feature specification and acceptance criteria, approved design, and built changes.
- **Work:** Write and run tests against the stated criteria. At minimum for parts reservation, verify no-stock behavior, two users competing for the last unit, and same-request retries. Report test failures and unrun/blocked checks explicitly.
- **Output:** Test code and a pass/fail report by acceptance criterion, with evidence and defect reproduction details.
- **Handoff:** Workflow presents results to the human for approval before delivery. Failed tests return to Build for fixes, then Test reruns affected checks; requirements do not change merely to make a test pass.

## Human checkpoints and safe recovery

1. Human sets priorities and resolves business trade-offs.
2. Human approves the ADR and task plan before Build.
3. Human reviews test results and approves delivery.

These are project workflow approvals. They are separate from any runtime business-rule check (such as a reservation critic), which must pass before an individual reservation is finalized.

At any stage, stop and ask the human if inputs conflict, a required behavior is undecided, or the next stage cannot proceed. Do not turn a blocked or unrun test into a pass. Workflow records the open question or failure and routes it to the responsible prior stage.

## Running the workflow

- **Claude Code:** Read this file and the matching role definitions in `.github/agents/`; run Requirements → Design → human approval → Build → Test → human approval.
- **GitHub Copilot:** Use the matching prompt files in `.github/prompts/` for each role in the same order, pausing for human approval at the stated gates.
- **Codex / other tools:** Read this file and the role definitions in `.github/agents/`; pass each stage's output to the next and pause at the human gates.
- **Without an agent tool:** A person can perform the same stages using the role definitions as checklists.
