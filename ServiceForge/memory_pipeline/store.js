const fs = require("node:fs");
const path = require("node:path");

function estimateTokens(text) {
  return (String(text).match(/[A-Za-z0-9]+/g) || []).length;
}

function vectorTerms(text) {
  const vector = new Map();
  for (const term of String(text).toLowerCase().match(/[a-z0-9]+/g) || []) {
    vector.set(term, (vector.get(term) || 0) + 1);
  }
  return vector;
}

function cosineSimilarity(left, right) {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (const value of left.values()) leftMagnitude += value * value;
  for (const value of right.values()) rightMagnitude += value * value;
  for (const [term, value] of left) {
    dot += value * (right.get(term) || 0);
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function lexicalScore(query, record) {
  const queryVector = vectorTerms(query);
  const text = [
    record.text,
    record.feature,
    record.type_tag,
    record.source_task,
  ].join(" ").toLowerCase();
  return cosineSimilarity(queryVector, vectorTerms(text));
}

function recencyScore(record, now = Date.now()) {
  const timestamp = Date.parse(record.timestamp);
  if (Number.isNaN(timestamp)) return 0;
  const ageHours = Math.max(0, (now - timestamp) / 3600000);
  return Math.exp(-ageHours / (24 * 30));
}

class MemoryStore {
  constructor(storePath) {
    this.storePath = storePath;
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    this.records = [];
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, "utf8"));
      this.records = data.records || [];
    }
  }

  save() {
    fs.writeFileSync(
      this.storePath,
      JSON.stringify({ records: this.records }, null, 2),
      "utf8",
    );
  }

  put(record) {
    const index = this.records.findIndex((item) => item.id === record.id);
    if (index >= 0) this.records[index] = record;
    else this.records.push(record);
    this.save();
    return record;
  }

  namespaceRecords(namespace) {
    return this.records.filter(
      (record) =>
        record.namespace === namespace &&
        record.status !== "discarded" &&
        record.status !== "superseded",
    );
  }

  hybridSearch(namespace, query, limit = 1) {
    const ranked = this.namespaceRecords(namespace).map((record) => ({
      record,
      rank:
        0.65 * lexicalScore(query, record) +
        0.35 * recencyScore(record),
    }));
    ranked.sort((a, b) =>
      b.rank - a.rank ||
      String(b.record.timestamp).localeCompare(String(a.record.timestamp)) ||
      String(a.record.id).localeCompare(String(b.record.id)),
    );
    return ranked.slice(0, limit).map((item) => item.record);
  }
}

module.exports = {
  MemoryStore,
  estimateTokens,
};
