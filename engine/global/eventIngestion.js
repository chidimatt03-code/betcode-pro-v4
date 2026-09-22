const { ingestSourceEvents } = require("./sourceIngestor");
const { persistCanonicalEvent } = require("./eventPersistence");

async function ingestAndPersistSource(repository, adapter, options = {}) {
  if (
    !repository ||
    typeof repository.getSourceByCode !== "function"
  ) {
    throw new TypeError("BCP_EVENT_INGESTION_REPOSITORY_INVALID");
  }

  if (
    !adapter ||
    typeof adapter.fetchMatches !== "function"
  ) {
    throw new TypeError("BCP_EVENT_INGESTION_ADAPTER_INVALID");
  }

  const events = await ingestSourceEvents(adapter, options);

  const persisted = [];

  for (const event of events) {
    const result = await persistCanonicalEvent(
      repository,
      event,
      options
    );

    persisted.push(result);
  }

  return Object.freeze({
    sourceCode: adapter.code,
    received: events.length,
    persisted: persisted.length,
    events: Object.freeze(persisted)
  });
}

module.exports = {
  ingestAndPersistSource
};
