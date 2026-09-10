const { ingestEvents } = require("./eventIngestor");

function normalizeBookmaker(bookmaker) {
  const key = String(bookmaker || "").toLowerCase().trim();

  if (!["sportybet", "bet9ja", "betking"].includes(key)) {
    throw new Error(`Unsupported internal bookmaker event source: ${bookmaker}`);
  }

  return key;
}

function ingestInternalEvents(bookmaker, events = []) {
  const key = normalizeBookmaker(bookmaker);

  if (!Array.isArray(events)) {
    throw new Error("Events must be an array.");
  }

  return ingestEvents(key, events);
}

function internalEventSourceStatus(bookmaker) {
  const key = String(bookmaker || "").toLowerCase().trim();

  return {
    bookmaker: key,
    available: ["sportybet", "bet9ja", "betking"].includes(key),
    internal: true,
    externalCalls: false
  };
}

module.exports = {
  ingestInternalEvents,
  internalEventSourceStatus
};
