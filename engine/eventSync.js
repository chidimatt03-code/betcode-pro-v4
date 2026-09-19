const {
  ingestInternalEvents,
  internalEventSourceStatus
} = require("./internalEventSource");

const {
  fetchUpcomingEvents
} = require("./bookmakers/sportybet");

async function syncLiveSportyBetEvents(options = {}) {
  const result = await fetchUpcomingEvents(options);

  if (!result || result.success !== true) {
    throw new Error("SportyBet live event feed unavailable.");
  }

  return syncBookmakerEvents("sportybet", result.events);
}

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
  syncLiveSportyBetEvents,
  internalEventSourceStatus
};
