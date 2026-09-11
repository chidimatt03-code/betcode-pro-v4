const {
  upsertEvent,
  upsertEventMarket,
  upsertMarketSelection
} = require("./eventStore");

function ingestEvent(bookmaker, event) {
  if (!bookmaker) {
    throw new Error("Bookmaker is required.");
  }

  if (!event || typeof event !== "object") {
    throw new Error("Event data is required.");
  }

  if (!event.sport) {
    throw new Error("Event sport is required.");
  }

  if (!event.homeTeam || !event.awayTeam) {
    throw new Error("Event teams are required.");
  }

  const storedEvent = upsertEvent({
    bookmaker: String(bookmaker).toLowerCase().trim(),
    externalId: event.externalId || null,
    sport: event.sport,
    competition: event.competition || null,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    startTime: event.startTime || null,
    status: event.status || "scheduled"
  });

  const markets = Array.isArray(event.markets)
    ? event.markets
    : [];

  const storedMarkets = [];

  for (const market of markets) {
    const storedMarket = upsertEventMarket(
      storedEvent.id,
      {
        marketType: market.marketType || market.type,
        marketName: market.marketName || market.name || null,
        line: market.line ?? null
      }
    );

    const selections = Array.isArray(market.selections)
      ? market.selections
      : [];

    const storedSelections = [];

    for (const selection of selections) {
      const storedSelection = upsertMarketSelection(
        storedMarket.id,
        {
          selectionType:
            selection.selectionType || selection.type,
          selectionName:
            selection.selectionName || selection.name || null,
          selectionValue:
            selection.selectionValue ?? selection.value ?? null
        }
      );

      storedSelections.push(storedSelection);
    }

    storedMarkets.push({
      ...storedMarket,
      selections: storedSelections
    });
  }

  return {
    ...storedEvent,
    markets: storedMarkets
  };
}

function ingestEvents(bookmaker, events = []) {
  if (!Array.isArray(events)) {
    throw new Error("Events must be an array.");
  }

  return events.map(event =>
    ingestEvent(bookmaker, event)
  );
}

module.exports = {
  ingestEvent,
  ingestEvents
};
