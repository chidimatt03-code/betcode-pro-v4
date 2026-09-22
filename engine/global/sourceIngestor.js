const { createMatchEvent } = require("./matchModel");

function requireAdapter(adapter) {
  if (
    !adapter ||
    typeof adapter.fetchMatches !== "function"
  ) {
    throw new TypeError("BCP_SOURCE_INGESTOR_ADAPTER_INVALID");
  }

  return adapter;
}

async function ingestSourceEvents(adapter, options = {}) {
  const source = requireAdapter(adapter);

  const result = await source.fetchMatches(options);

  if (!Array.isArray(result)) {
    throw new TypeError("BCP_SOURCE_INGESTOR_RESULT_INVALID");
  }

  return result.map((event) =>
    createMatchEvent({
      ...event,
      sourceCode: source.code
    })
  );
}

module.exports = {
  ingestSourceEvents
};
