const REQUIRED_ADAPTER_FIELDS = [
  "code",
  "name",
  "sourceType",
  "fetchMatches"
];


function normalizeSourcePriority(adapter) {
  const priority =
    adapter.priority === undefined || adapter.priority === null
      ? 0
      : Number(adapter.priority);

  if (!Number.isInteger(priority)) {
    throw new TypeError("BCP_SOURCE_ADAPTER_PRIORITY_INVALID");
  }

  return priority;
}

function assertSourceAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("BCP_SOURCE_ADAPTER_REQUIRED");
  }

  for (const field of REQUIRED_ADAPTER_FIELDS) {
    if (!(field in adapter)) {
      throw new Error(`BCP_SOURCE_ADAPTER_MISSING_${field.toUpperCase()}`);
    }
  }

  if (typeof adapter.code !== "string" || !adapter.code.trim()) {
    throw new TypeError("BCP_SOURCE_ADAPTER_CODE_INVALID");
  }

  if (typeof adapter.name !== "string" || !adapter.name.trim()) {
    throw new TypeError("BCP_SOURCE_ADAPTER_NAME_INVALID");
  }

  if (typeof adapter.sourceType !== "string" || !adapter.sourceType.trim()) {
    throw new TypeError("BCP_SOURCE_ADAPTER_SOURCE_TYPE_INVALID");
  }

  normalizeSourcePriority(adapter);

  if (typeof adapter.fetchMatches !== "function") {
    throw new TypeError("BCP_SOURCE_ADAPTER_FETCH_MATCHES_INVALID");
  }

  return true;
}

module.exports = {
  REQUIRED_ADAPTER_FIELDS,
  normalizeSourcePriority,
  assertSourceAdapter
};
