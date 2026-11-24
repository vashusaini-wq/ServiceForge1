const { estimateTokens } = require("./store");

const HARD_LONG_TERM_TOKEN_LIMIT = 500;

function queryMemory(store, namespace, query, tokenLimit = 500) {
  if (tokenLimit > HARD_LONG_TERM_TOKEN_LIMIT) {
    throw new Error("Token limit cannot exceed 500");
  }

  const records = store.hybridSearch(namespace, query, 1);
  const lines = [];
  for (const record of records) {
    const line =
      `[${record.type_tag}:${record.status}] ${record.text} ` +
      `(source: ${record.source_task}; at: ${record.timestamp})`;
    if (estimateTokens(line) <= tokenLimit) {
      lines.push(line);
    }
  }

  let injectedText = lines.join("\n");
  if (estimateTokens(injectedText) > tokenLimit) {
    const words = injectedText.split(/\s+/);
    injectedText = words.slice(0, tokenLimit).join(" ");
  }

  return {
    namespace,
    query,
    injected_text: injectedText,
    injected_tokens: estimateTokens(injectedText),
    record_ids: records.map((record) => record.id),
    token_limit: tokenLimit,
    budget_enforced: estimateTokens(injectedText) <= tokenLimit,
  };
}

const JIT_STAGE_CONFIG = {
  requirements: {
    query: "Feature 2 requirements scheduled job stock reservation overlap booking",
    disclosure: "requirements-summary",
  },
  design: {
    query: "Feature 2 ADR stock protected reserve request ID critic",
    disclosure: "approved-design",
  },
  "build-reserve": {
    query: "Feature 2 overlap booking travel buffer reservation stock invariant",
    disclosure: "build-reservation-rule",
  },
  "test-last-part": {
    query: "Feature 1 overlap booking travel buffer last-part reservation conflict",
    disclosure: "test-invariant",
  },
  "test-repeat-request": {
    query: "Feature 2 repeat request duplicate reservation request ID",
    disclosure: "test-idempotency",
  },
};

function buildJitPrompt(store, namespace, stage, overrides = {}) {
  const config = JIT_STAGE_CONFIG[stage];
  if (!config) throw new Error(`Unknown Feature 2 JIT stage: ${stage}`);

  const query = overrides.query || config.query;
  const result = queryMemory(store, namespace, query, 500);
  const disclosureLevels = [
    "[L0 invariant] Parts reservations must never exceed stock.",
  ];

  if (stage === "build-reserve" || stage.startsWith("test-")) {
    disclosureLevels.push(
      "[L1 upstream] Feature 1 preserves its approved overlap and travel-buffer rules.",
    );
  }
  if (result.injected_text) {
    disclosureLevels.push(`[L2 evidence] ${result.injected_text}`);
  }

  let injectedText = disclosureLevels.join("\n");
  if (result.injected_tokens + estimateTokens(disclosureLevels.join("\n")) >
      HARD_LONG_TERM_TOKEN_LIMIT) {
    injectedText =
      disclosureLevels[0] +
      (disclosureLevels[1] ? `\n${disclosureLevels[1]}` : "");
  }

  if (estimateTokens(injectedText) > HARD_LONG_TERM_TOKEN_LIMIT) {
    const words = injectedText.split(/\s+/);
    injectedText = words.slice(0, HARD_LONG_TERM_TOKEN_LIMIT).join(" ");
  }

  return {
    stage,
    disclosure: overrides.disclosure || config.disclosure,
    namespace,
    query,
    injected_text: injectedText,
    injected_tokens: estimateTokens(injectedText),
    record_ids: result.record_ids,
    token_limit: HARD_LONG_TERM_TOKEN_LIMIT,
    budget_enforced: estimateTokens(injectedText) <= HARD_LONG_TERM_TOKEN_LIMIT,
  };
}

module.exports = {
  HARD_LONG_TERM_TOKEN_LIMIT,
  queryMemory,
  JIT_STAGE_CONFIG,
  buildJitPrompt,
};
