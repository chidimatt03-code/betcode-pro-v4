const {
  ingestInternalEvents,
  internalEventSourceStatus
} = require("./internalEventSource");

async function syncBookmakerEvents(bookmaker, events = []) {
  const status = internalEventSourceStatus(bookmaker);

  if (!status.available) {
    throw new Error(
      `Unsupported internal bookmaker event source: ${bookmaker}`
    );
  }

  if (!Array.isArray(events)) {
    throw new Error("Events must be an array.");
  }

  return ingestInternalEvents(bookmaker, events);
}

module.exports = {
  syncBookmakerEvents,
  internalEventSourceStatus
};
