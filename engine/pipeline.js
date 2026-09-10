const {
  createBetSlip
} = require("./converter");

const {
  normalizeEvent
} = require("./normalizer");

const {
  findBestEventMatch
} = require("./matcher");

const {
  mapMarketType,
  isSupportedMarket
} = require("./marketMapper");

const {
  mapSelectionWithLine
} = require("./selectionMapper");

const {
  validateConversion
} = require("./validator");

const {
  getRoute
} = require("./routes");

const {
  findBestStoredEventMatch
} = require("./eventMatcher");

function convertBetSlip({
  sourceBookmaker,
  destinationBookmaker,
  sourceCode,
  selections = [],
  normalizedSlip = null,
  destinationEvents = []
}) {
  // 1. Use normalized slip when available,
  // otherwise build the universal slip.
  const slip = normalizedSlip || createBetSlip({
    sourceBookmaker,
    sourceCode,
    selections
  });

  // 2. Basic source validation
  if (!slip.source.bookmaker) {
    return {
      success: false,
      stage: "SOURCE_VALIDATION",
      errors: ["Source bookmaker is missing."]
    };
  }

  if (!destinationBookmaker) {
    return {
      success: false,
      stage: "ROUTE_VALIDATION",
      errors: ["Destination bookmaker is missing."]
    };
  }

  const route = getRoute(
    sourceBookmaker,
    destinationBookmaker
  );

  if (!route) {
    return {
      success: false,
      stage: "ROUTE_VALIDATION",
      errors: [
        `Unsupported conversion route: ${sourceBookmaker} -> ${destinationBookmaker}`
      ]
    };
  }

  if (!slip.source.code) {
    return {
      success: false,
      stage: "SOURCE_VALIDATION",
      errors: ["Source booking code is missing."]
    };
  }

  if (!Array.isArray(slip.selections) || slip.selections.length === 0) {
    return {
      success: false,
      stage: "SOURCE_VALIDATION",
      errors: ["No selections were found."]
    };
  }

  const convertedSelections = [];

  // 3. Process each selection
  for (const selection of slip.selections) {
    const sourceEvent = normalizeEvent(selection.event);

    // 4. Map market BEFORE requiring market.type
    const marketType = mapMarketType(
      selection.market.name,
      selection.market.type
    );

    if (!marketType || !isSupportedMarket(marketType)) {
      return {
        success: false,
        stage: "MARKET_MAPPING",
        selection: selection.index,
        errors: [
          `Unsupported market: ${selection.market.name || "Unknown"}`
        ]
      };
    }

    // 5. Find destination event
    const match = destinationEvents.length
      ? findBestEventMatch(sourceEvent, destinationEvents)
      : findBestStoredEventMatch(destinationBookmaker, sourceEvent);

    // 6. Map selection
    const mappedSelection = mapSelectionWithLine(
      marketType,
      selection.selection.name,
      selection.market.line,
      selection.event.home,
      selection.event.away
    );

    // 7. Validate final conversion
    const validation = validateConversion({
      matchResult: match,
      marketType,
      selectionType: mappedSelection.type,
      line: mappedSelection.line
    });

    if (!validation.valid) {
      return {
        success: false,
        stage: "CONVERSION_VALIDATION",
        selection: selection.index,
        errors: validation.errors,
        match
      };
    }

    convertedSelections.push({
      index: selection.index,

      event: {
        source: sourceEvent,
        destination: match.candidate,
        confidence: match.score,
        status: match.status
      },

      market: {
        source: selection.market.name,
        type: marketType,
        line: mappedSelection.line
      },

      selection: {
        source: selection.selection.name,
        type: mappedSelection.type
      }
    });
  }

  return {
    success: true,

    source: slip.source,

    selections: convertedSelections
  };
}

module.exports = {
  convertBetSlip
};
