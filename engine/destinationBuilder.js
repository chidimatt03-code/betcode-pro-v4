const {
  getEventMarkets,
  getMarketSelections
} = require("./eventStore");

function clean(value) {
  return String(value ?? "").trim();
}

function parseSpecifierLine(specifier) {
  const value = clean(specifier);

  const match = value.match(
    /(?:total|handicap|hcp|goals)=(-?\d+(?:\.\d+)?)/
  );

  return match ? Number(match[1]) : null;
}

function sameLine(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Number(a) === Number(b);
}

function resolveNativeDestination({
  destinationBookmaker,
  event,
  marketType,
  line,
  selectionType
}) {
  const bookmaker = clean(destinationBookmaker).toLowerCase();

  if (bookmaker !== "sportybet") {
    return {
      success: true,
      native: null
    };
  }

  const eventId = Number(event?.id);

  if (!Number.isInteger(eventId)) {
    return {
      success: false,
      error: "Destination event database ID is invalid."
    };
  }

  const markets = getEventMarkets(eventId);

  if (!markets.length) {
    return {
      success: false,
      error:
        `No stored destination markets were found for event ${eventId}.`
    };
  }

  const marketCandidates = markets.filter(
    market =>
      clean(market.market_type).toUpperCase() ===
      clean(marketType).toUpperCase()
  );

  if (!marketCandidates.length) {
    return {
      success: false,
      error:
        `No ${marketType} destination market was found for event ${eventId}.`
    };
  }

  const market =
    marketCandidates.find(item =>
      sameLine(
        item.line,
        line
      )
    ) ||
    marketCandidates.find(item =>
      sameLine(
        parseSpecifierLine(item.bookmaker_specifier),
        line
      )
    );

  if (!market) {
    return {
      success: false,
      error:
        `No destination ${marketType} market matched line ${line ?? "null"} for event ${eventId}.`
    };
  }

  const selections = getMarketSelections(market.id);

  if (!selections.length) {
    return {
      success: false,
      error:
        `Destination market ${market.id} has no stored selections.`
    };
  }

  const selection = selections.find(
    item =>
      clean(item.selection_type).toUpperCase() ===
      clean(selectionType).toUpperCase()
  );

  if (!selection) {
    return {
      success: false,
      error:
        `No destination ${selectionType} selection was found for market ${market.id}.`
    };
  }

  if (!clean(market.bookmaker_market_id)) {
    return {
      success: false,
      error:
        `Destination market ${market.id} is missing bookmaker_market_id.`
    };
  }

  if (!clean(selection.bookmaker_outcome_id)) {
    return {
      success: false,
      error:
        `Destination selection ${selection.id} is missing bookmaker_outcome_id.`
    };
  }

  return {
    success: true,
    native: {
      eventId: clean(event.externalId),
      marketId: clean(market.bookmaker_market_id),
      specifier: clean(market.bookmaker_specifier),
      outcomeId: clean(selection.bookmaker_outcome_id)
    }
  };
}

function buildDestinationSlip({ destinationBookmaker, converted }) {
  if (!destinationBookmaker) {
    return {
      success: false,
      stage: "DESTINATION_BUILDER",
      errors: ["Destination bookmaker is missing."]
    };
  }

  if (!converted || typeof converted !== "object") {
    return {
      success: false,
      stage: "DESTINATION_BUILDER",
      errors: ["Converted bet slip is missing."]
    };
  }

  if (!converted.success) {
    return {
      success: false,
      stage: "DESTINATION_BUILDER",
      errors: ["Conversion was not successful."]
    };
  }

  if (
    !Array.isArray(converted.selections) ||
    !converted.selections.length
  ) {
    return {
      success: false,
      stage: "DESTINATION_BUILDER",
      errors: ["No converted selections were found."]
    };
  }

  const errors = [];
  const unavailable = [];
  const selections = [];

  for (let index = 0; index < converted.selections.length; index += 1) {
    const item = converted.selections[index];
    const number = item.index || index + 1;
    const event = item.event?.destination;

    if (!event?.id) {
      unavailable.push({
        index: number,
        reason: "DESTINATION_EVENT_MISSING"
      });
      continue;
    }

    if (!item.market?.type) {
      unavailable.push({
        index: number,
        reason: "DESTINATION_MARKET_MISSING"
      });
      continue;
    }

    if (!item.selection?.type) {
      unavailable.push({
        index: number,
        reason: "DESTINATION_SELECTION_MISSING"
      });
      continue;
    }

    const resolved = resolveNativeDestination({
      destinationBookmaker,
      event,
      marketType: item.market.type,
      line: item.market.line,
      selectionType: item.selection.type
    });

    if (!resolved.success) {
      unavailable.push({
        index: number,
        reason: "NATIVE_MARKET_UNAVAILABLE",
        message: resolved.error
      });
      continue;
    }

    selections.push({
      index: number,

      event: {
        id: event.id,
        externalId: event.externalId || null,
        home: event.home || null,
        away: event.away || null,
        competition: event.competition || null,
        startTime: event.startTime || null
      },

      market: {
        type: item.market.type,
        line: item.market.line ?? null
      },

      selection: {
        type: item.selection.type
      },

      native: resolved.native
    });
  }

  if (!selections.length) {
    return {
      success: false,
      stage: "DESTINATION_BUILDER",
      errors: [
        "No converted selections have a currently available native destination market."
      ],
      unavailable
    };
  }

  return {
    success: true,
    stage: "DESTINATION_BUILDER",
    destinationBookmaker:
      String(destinationBookmaker).toLowerCase().trim(),
    partial:
      unavailable.length > 0,
    selections,
    unavailable,
    summary: {
      input: converted.selections.length,
      nativeReady: selections.length,
      unavailable: unavailable.length
    }
  };
}

module.exports = {
  buildDestinationSlip,
  resolveNativeDestination
};
