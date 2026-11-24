# Feature 2 Memory Pipeline — Design vs. Build Audit

**Status:** Executed with the local JSON-backed hybrid store.
**Namespace:** `vashusaini-wq/ServiceForge1:Feature/ba-decision:local-dev`

## Proven round trip

1. The post-turn hook accepted and persisted one Feature 1 decision.
2. The provenance record contains `source_task`, `timestamp`, `type_tag`, `status`, feature, stage, namespace, and supersession state.
3. Feature 2 queried for overlap booking, travel buffer, and conflict behavior.
4. Hybrid ranking selected the same-named, verified record.
5. Retrieval injected 35 tokens, below the 500-token hard limit.
6. The provenance record ID was returned with the injected text.
7. The Build/Reserve JIT stage injected progressive disclosures at L0 invariant, L1 upstream rule, and L2 evidence.

## Validation results

| Check | Result | Evidence |
|---|---|---|
| Provenance write | PASS | `memory_store.json` contains source task, timestamp, type tag, status, namespace, and feature/stage. |
| JIT progressive disclosure | PASS | Build/Reserve prompt includes L0 invariant, L1 upstream rule, and L2 evidence; combined injection stays at or below 500 tokens. |
| Retain filter | PASS | Unit test rejects raw stdout/chatter payloads and unverified records. |
| Namespace isolation | PASS | Unit test retrieves no record from a different repo/branch/environment namespace. |
| 500-token enforcement | PASS | Unit test and demo show `injected_tokens <= 500` and `budget_enforced: true`. |
| End-to-end retrieval | PASS | Demo returned the Feature 1 45-minute travel-buffer rule under its namespace. |
| Non-blocking write hook | PASS | `PostTurnHook` schedules `setImmediate`; the demo does not block execution on persistence. |
| Raw data discard | PASS | Filter rejects raw stdout/tool chatter and unit test verifies the behavior. |

The automated unit suite passed 5 tests with 0 failures. The demo reported `verified: true`. The design audit adds namespace isolation, provenance, retain/discard, 500-token, JIT, and cross-namespace checks.

## Namespace leakage audit

| Audit check | Result |
|---|---|
| Source namespace exact-match | PASS — reads require `repo:branch:env` equality. |
| Different environment namespace | PASS — no cross-namespace record is returned. |
| Working-memory content | PASS — no stock or runtime reservation values are persisted in `memory_store.json`. |
| Episodic leakage | PASS — only the Feature 1 verified domain fact is stored. |
| Raw chatter leakage | PASS — the retained filter rejects stdout/tool-call markers. |
| Context over-budget | PASS — read requests above 500 tokens are rejected; injected output remains at or below 500. |

Run `node memory_pipeline/design-audit.js` for the machine-readable conformance check.

## Design vs. build gap analysis

| B1 requirement | Build result | Gap/decision |
|---|---|---|
| Four memory boxes | Implemented semantic/procedural references, a JSON episodic/hybrid store, and working state passed in query results | Working memory is an explicit query/handoff field in scripts, but it is not a separate persistent store. It should remain transient. |
| Namespace `repo:branch:env` | Implemented exactly on write and read | No cross-namespace fallback is implemented. |
| Retain/discard filter | Implemented | Longer transcript classification and secret scanners are not included; current filter rejects known chatter markers but is intentionally conservative. |
| Hybrid/vector store | Implemented JSON persistence, cosine term-vector relevance, and recency ranking | This is a local lightweight adapter, not a deployed pgvector/Postgres service. The store interface can be replaced by a pgvector adapter without changing the pipeline contract. |
| 500-token injection | Implemented as a hard read-limit guard | Payload summarization is truncated only for a single selected record; source evidence remains outside context. |
| Recency + relevance ranking | Implemented 65% term-vector relevance and 35% exponential recency | Time weighting is configuration in code and should be externally configurable in a production adapter. |
| JIT retrieval | Implemented stage-specific query construction and progressive L0/L1/L2 injection in `buildJitPrompt` | The orchestration runner must call `buildJitPrompt` at each Feature 2 stage; the standalone pipeline now provides the stage contract. |
| Provenance | Implemented source task, timestamp, type, status, namespace, feature, stage, and supersession state | A central audit log for all write decisions is not included; only retained records are persisted. |

**Audit conclusion:** The working pipeline satisfies the B1 namespace, provenance, retain/discard, end-to-end retrieval, and 500-token enforcement requirements. Remaining production gaps are a real pgvector deployment, secrets scanning, external ranking configuration, and role/JIT integration in an orchestration runner.
