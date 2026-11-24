# Agent Blueprint — Parts Reservation

*Orchestration decides who does each task, what they need, what they return, and when a human must approve.*

| Component | Primary purpose / assigned work | Inputs needed | Outputs returned | Handoff / approval |
|---|---|---|---|---|
| Human | Set priorities and trade-offs: prevent double reservation before extras; prefer safety over a faster first draft. Resolve business decisions. | Proposed ADR, task plan, build summary, and test results | Approved ADR and priorities; final approval or requested changes | Approve the ADR before Build; approve test results before delivery. |
| Build Agent | Implement the protected Reserve Part action and related approved changes. | Human-approved ADR, Feature 2 requirements, task plan, repository conventions | Code changes, summary, and unanswered questions | Workflow passes implementation to Test only when the action is available. |
| Test Agent | Validate business rules, especially no-stock behavior and two-user competition for the last part. | Implemented action, approved requirements, and acceptance cases | Test results, failures with reproduction details, and unanswered questions | Return results to Workflow for human review; failures go back to Build. |
| Workflow / Orchestration | Enforce task order and approval gates; pass inputs and outputs between roles; track status and decisions. | Plan, human approvals, and agent outputs | Sequenced handoffs, status, and traceable decisions | Requirements/design → Human ADR approval → Build → Test → Human final approval. |

**Flow:** Human sets direction and approves the ADR → Workflow gives the approved ADR and task plan to Build → Build makes the Reserve Part action available → Workflow starts Test → Test reports stock/conflict validation → Workflow presents results to Human → Human approves delivery or requests changes. A failed test returns through Workflow to Build, then Test reruns the affected checks. Agents must surface unanswered questions instead of guessing. Human approval gates are distinct from the reservation critic, which checks each individual reservation before it is finalized.

**Journal:** My role shifted from implementing behavior to directing focused work, defining handoffs, and making approval points explicit. I accepted deriving availability from active reservations because it makes safe release easier to reason about. The source of user identity and the expiry policy still need clarification before implementation decisions depend on them.
