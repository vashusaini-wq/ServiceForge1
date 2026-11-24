const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { MemoryStore } = require("./store");
const { PostTurnHook, retainFilter } = require("./write-path");
const { queryMemory, buildJitPrompt } = require("./read-path");

const namespace =
  "vashusaini-wq/ServiceForge1:Feature/ba-decision:local-dev";
const otherNamespace =
  "vashusaini-wq/ServiceForge1:Feature/ba-decision:ci";

async function waitForHook() {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

async function run() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-audit-"));
  const store = new MemoryStore(path.join(dir, "store.json"));
  const hook = new PostTurnHook(store);

  hook.submit({
    id: "feature-1-overlap-booking-v1",
    namespace,
    source_task: "feature-1/overlap-booking",
    timestamp: "2026-11-18T10:00:00+00:00",
    type_tag: "domain_fact",
    status: "verified",
    feature: "Feature 1 - Technician Availability",
    stage: "build",
    text:
      "Feature 1 approved rule: bookings use a 45-minute travel buffer " +
      "and half-open reserved intervals; overlapping bookings conflict.",
  });
  await waitForHook();

  const retrieval = queryMemory(
    store,
    namespace,
    "Feature 2 overlap booking travel buffer conflict rule",
  );
  const crossNamespace = queryMemory(
    store,
    otherNamespace,
    "45-minute travel buffer",
  );
  const jit = buildJitPrompt(store, namespace, "build-reserve");
  const rejectedChatter = retainFilter({
    namespace,
    source_task: "run-stdout",
    type_tag: "test_result",
    status: "verified",
    feature: "Feature 2",
    stage: "test",
    text: "Raw stdout and tool-call chatter",
  });

  let ceilingRejected = false;
  try {
    queryMemory(store, namespace, "travel buffer", 501);
  } catch (error) {
    ceilingRejected = /cannot exceed 500/.test(error.message);
  }

  const checks = {
    namespace_isolated:
      crossNamespace.record_ids.length === 0 &&
      crossNamespace.injected_text === "",
    provenance_present:
      Boolean(
        store.records[0]?.source_task &&
        store.records[0]?.timestamp &&
        store.records[0]?.type_tag &&
        store.records[0]?.status,
      ),
    retain_filter_rejected_chatter: rejectedChatter === null,
    token_budget_enforced:
      retrieval.budget_enforced && retrieval.injected_tokens <= 500,
    jit_budget_enforced:
      jit.budget_enforced && jit.injected_tokens <= 500,
    ceiling_above_500_rejected: ceilingRejected,
    end_to_end_round_trip:
      retrieval.injected_text.includes("45-minute travel buffer") &&
      retrieval.record_ids.length === 1,
  };

  const audit = {
    namespace,
    checked_against: "memory-architecture.md",
    checks,
    all_passed: Object.values(checks).every(Boolean),
    retrieval: {
      record_ids: retrieval.record_ids,
      injected_tokens: retrieval.injected_tokens,
      budget_enforced: retrieval.budget_enforced,
    },
    jit: {
      injected_tokens: jit.injected_tokens,
      disclosure: jit.disclosure,
      record_ids: jit.record_ids,
      budget_enforced: jit.budget_enforced,
    },
  };

  console.log(JSON.stringify(audit, null, 2));
  if (!audit.all_passed) process.exitCode = 1;
  return audit;
}

if (require.main === module) run();

module.exports = { run };
