const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { MemoryStore } = require("./store");
const { retainFilter, PostTurnHook } = require("./write-path");
const { queryMemory, buildJitPrompt } = require("./read-path");

const namespace =
  "vashusaini-wq/ServiceForge1:test:local-dev";

test("retain filter rejects raw stdout and unverified chatter", () => {
  assert.equal(
    retainFilter({
      namespace,
      source_task: "run-1",
      type_tag: "test_result",
      status: "verified",
      feature: "Feature 2",
      stage: "test",
      text: "Raw stdout trace output and tool-call chatter",
    }),
    null,
  );
});

test("Feature 1 decision round trip is namespace scoped and budgeted", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-test-"));
  const store = new MemoryStore(path.join(dir, "store.json"));
  const hook = new PostTurnHook(store);

  hook.submit({
    namespace,
    source_task: "feature-1/overlap-booking",
    timestamp: "2026-11-18T10:00:00+00:00",
    type_tag: "domain_fact",
    status: "verified",
    feature: "Feature 1",
    stage: "build",
    text:
      "Approved overlap rule uses a 45-minute travel buffer and half-open intervals.",
  });
  await new Promise((resolve) => setTimeout(resolve, 20));

  const result = queryMemory(
    store,
    namespace,
    "45-minute overlap travel buffer",
  );
  assert.equal(result.record_ids.length, 1);
  assert.match(result.injected_text, /45-minute travel buffer/);
  assert.equal(result.budget_enforced, true);
  assert.ok(result.injected_tokens <= 500);
});

test("a different namespace does not retrieve the record", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-test-"));
  const store = new MemoryStore(path.join(dir, "store.json"));
  store.put({
    id: "record-1",
    namespace,
    source_task: "feature-1",
    timestamp: "2026-11-18T10:00:00+00:00",
    type_tag: "domain_fact",
    status: "verified",
    feature: "Feature 1",
    stage: "build",
    text: "The overlap booking rule uses a 45-minute travel buffer.",
    superseded_by: null,
  });

  const result = queryMemory(
    store,
    "vashusaini-wq/ServiceForge1:Feature/ba-decision:ci",
    "travel buffer",
  );
  assert.equal(result.record_ids.length, 0);
  assert.equal(result.injected_text, "");
});

test("JIT build stage uses progressive disclosure under 500 tokens", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-test-"));
  const store = new MemoryStore(path.join(dir, "store.json"));
  store.put({
    id: "record-overlap",
    namespace,
    source_task: "feature-1/overlap-booking",
    timestamp: "2026-11-18T10:00:00+00:00",
    type_tag: "domain_fact",
    status: "verified",
    feature: "Feature 1",
    stage: "build",
    text:
      "Feature 1 uses a 45-minute travel buffer and half-open booking intervals.",
    superseded_by: null,
  });

  const jit = buildJitPrompt(store, namespace, "build-reserve");
  assert.match(jit.injected_text, /\[L0 invariant\]/);
  assert.match(jit.injected_text, /\[L1 upstream\]/);
  assert.match(jit.injected_text, /\[L2 evidence\]/);
  assert.equal(jit.budget_enforced, true);
  assert.ok(jit.injected_tokens <= 500);
});

test("query rejects a requested ceiling above 500 tokens", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-test-"));
  const store = new MemoryStore(path.join(dir, "store.json"));
  assert.throws(
    () => queryMemory(store, namespace, "travel buffer", 501),
    /cannot exceed 500/,
  );
});
