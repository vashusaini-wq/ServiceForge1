const fs = require("node:fs");
const path = require("node:path");

const { MemoryStore } = require("./store");
const { PostTurnHook } = require("./write-path");
const { queryMemory, buildJitPrompt } = require("./read-path");

const root = path.resolve(__dirname, "..");
const namespace =
  "vashusaini-wq/ServiceForge1:Feature/ba-decision:local-dev";
const storePath = path.join(root, "memory_store.json");

async function waitForHook() {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

async function run() {
  const store = new MemoryStore(storePath);
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
      "Feature 1 approved rule: bookings use a 45-minute travel buffer and " +
      "half-open reserved intervals; overlapping bookings conflict.",
  });

  await waitForHook();

  const retrieval = queryMemory(
    store,
    namespace,
    "Feature 2 overlap booking travel buffer conflict rule",
  );
  const jit = buildJitPrompt(
    store,
    namespace,
    "build-reserve",
  );
  const roundTrip = {
    namespace,
    stored_record_count: store.records.length,
    retrieval,
    jit,
    verified:
      retrieval.injected_text.includes("45-minute travel buffer") &&
      retrieval.budget_enforced &&
      retrieval.injected_tokens <= 500 &&
      jit.budget_enforced &&
      jit.injected_tokens <= 500 &&
      jit.injected_text.includes("[L0 invariant]"),
  };

  console.log(JSON.stringify(roundTrip, null, 2));
  return roundTrip;
}

if (require.main === module) run();

module.exports = { run, namespace };
