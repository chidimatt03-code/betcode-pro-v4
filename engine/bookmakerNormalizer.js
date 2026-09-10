function clean(value) {
  return String(value ?? "").trim();
}

function normalizeSelection(selection = {}) {
  const marketType =
    selection.market?.type ||
    selection.marketType ||
    null;

  const selectionType =
    selection.selection?.type ||
    selection.selectionType ||
    null;

  return {
    sport: clean(
      selection.sport ||
      selection.event?.sport
    ),

    event: {
      id: clean(
        selection.event?.id ||
        selection.eventId
      ),
      home: clean(
        selection.event?.home ||
        selection.homeTeam ||
        selection.home
      ),
      away: clean(
        selection.event?.away ||
        selection.awayTeam ||
        selection.away
      ),
      competition: clean(
        selection.event?.competition ||
        selection.competition ||
        selection.league
      ),
      startTime:
        selection.event?.startTime ||
        selection.startTime ||
        selection.eventTime ||
        null
    },

    market: {
      name: clean(
        selection.market?.name ||
        selection.marketName ||
        selection.market
      ),
      type: marketType,
      line:
        selection.market?.line ??
        selection.line ??
        null
    },

    selection: {
      type: selectionType,
      name: clean(
        selection.selection?.name ||
        selection.pick ||
        selection.outcome ||
        selection.selectionName
      ),
      value:
        selection.selection?.value ??
        selection.value ??
        null,
      odds:
        selection.selection?.odds ??
        selection.odds ??
        null
    }
  };
}

function normalizeBookmakerSlip(response = {}) {
  const rawSelections =
    response.selections ||
    response.bets ||
    response.items ||
    response.betSlip ||
    [];

  if (!Array.isArray(rawSelections)) {
    throw new Error("Bookmaker response contains no valid selections.");
  }

  return {
    bookmaker: clean(
      response.bookmaker ||
      response.source
    ),

    bookingCode: clean(
      response.bookingCode ||
      response.code ||
      response.booking_code
    ),

    selections: rawSelections.map(normalizeSelection)
  };
}

module.exports = {
  normalizeSelection,
  normalizeBookmakerSlip
};
