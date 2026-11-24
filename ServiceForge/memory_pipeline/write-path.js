const { randomUUID } = require("node:crypto");

const RAW_MARKERS = [
  "stdout",
  "traceback",
  "tool-call",
  "prompt transcript",
  "intermediate reasoning",
];

function retainFilter(payload) {
  const text = String(payload.text || "").trim();
  const lower = text.toLowerCase();
  if (text.length < 20) return null;
  if (RAW_MARKERS.some((marker) => lower.includes(marker))) return null;
  if (!["verified", "approved"].includes(payload.status)) return null;

  const required = [
    "namespace",
    "source_task",
    "feature",
    "stage",
    "type_tag",
  ];
  if (required.some((field) => !payload[field])) return null;

  return {
    id: payload.id || randomUUID(),
    namespace: payload.namespace,
    source_task: payload.source_task,
    timestamp: payload.timestamp || new Date().toISOString(),
    type_tag: payload.type_tag,
    status: payload.status,
    feature: payload.feature,
    stage: payload.stage,
    text,
    superseded_by: payload.superseded_by || null,
  };
}

class PostTurnHook {
  constructor(store) {
    this.store = store;
  }

  submit(payload) {
    setImmediate(() => {
      const record = retainFilter(payload);
      if (record) this.store.put(record);
    });
  }
}

module.exports = {
  PostTurnHook,
  retainFilter,
};
