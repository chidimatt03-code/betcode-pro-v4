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
  getMarketCompatibility
} = require("./marketCompatibility");

const {
  findBestStoredEventMatch
} = require("./eventMatcher");

function unavailableSelection({
  selection,
  reason,
  errors,
  match = null,
  marketType = null,
  compatibility = null
}) {
  return {
    index: selection.index,
    reason,
    errors,
    event: selection.event,
    market: {
      source: selection.market?.name || null,
      type: marketType,
      line: selection.market?.line ?? null
    },
    selection: {
      source: selection.selection?.name || null
    },
    match,
    compatibility
  };
}

function convertBetSlip({
  sourceBookmaker,
  destinationBookmaker,
  sourceCode,
  selections = [],
  normalizedSlip = null,
  destinationEvents = []
}) {
  const slip = normalizedSlip || createBetSlip({
    sourceBookmaker,
    sourceCode,
    selections
  });

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
  const unavailableSelections = [];

  for (const selection of slip.selections) {
    try {
      const sourceEvent = normalizeEvent(selection.event);

      const marketType = mapMarketType(
        selection.market.name,
        selection.market.type
      );

      if (!marketType || !isSupportedMarket(marketType)) {
        unavailableSelections.push(
          unavailableSelection({
            selection,
            reason: "MARKET_NOT_SUPPORTED",
            errors: [
              `Unsupported market: ${selection.market.name || "Unknown"}`
            ],
            marketType
          })
        );

        continue;
      }

      const compatibility = getMarketCompatibility(
        marketType,
        sourceBookmaker,
        destinationBookmaker
      );

      if (compatibility.status !== "SUPPORTED") {
        unavailableSelections.push(
          unavailableSelection({
            selection,
            reason: "MARKET_NOT_SUPPORTED",
            errors: [
              compatibility.status === "UNKNOWN"
                ? `No verified ${marketType} compatibility exists for ${sourceBookmaker} -> ${destinationBookmaker}.`
                : `${marketType} is not supported by ${destinationBookmaker}.`
            ],
            marketType,
            compatibility
          })
        );

        continue;
      }

      const match = destinationEvents.length
        ? findBestEventMatch(sourceEvent, destinationEvents)
        : findBestStoredEventMatch(destinationBookmaker, sourceEvent);

      if (
        !match ||
        !match.candidate ||
        !["MATCHED", "LIKELY_MATCH"].includes(match.status)
      ) {
        unavailableSelections.push(
          unavailableSelection({
            selection,
            reason: "EVENT_NOT_FOUND",
            errors: [
              "No sufficiently confident destination event match was found."
            ],
            match,
            marketType,
            compatibility
          })
        );

        continue;
      }

      const mappedSelection = mapSelectionWithLine(
        marketType,
        selection.selection.name,
        selection.market.line,
        selection.event.home,
        selection.event.away
      );

      if (!mappedSelection || !mappedSelection.type) {
        unavailableSelections.push(
          unavailableSelection({
            selection,
            reason: "SELECTION_NOT_SUPPORTED",
            errors: [
              `No supported destination selection mapping exists for "${selection.selection.name || "Unknown"}".`
            ],
            match,
            marketType,
            compatibility
          })
        );

        continue;
      }

      const validation = validateConversion({
        matchResult: match,
        marketType,
        selectionType: mappedSelection.type,
        line: mappedSelection.line
      });

      if (!validation.valid) {
        const lineError = validation.errors.some(error =>
          /line/i.test(error)
        );

        unavailableSelections.push(
          unavailableSelection({
            selection,
            reason: lineError
              ? "LINE_NOT_SUPPORTED"
              : "SELECTION_NOT_SUPPORTED",
            errors: validation.errors,
            match,
            marketType,
            compatibility
          })
        );

        continue;
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
    } catch (error) {
      unavailableSelections.push(
        unavailableSelection({
          selection,
          reason: "DESTINATION_ERROR",
          errors: [
            error && error.message
              ? error.message
              : String(error)
          ]
        })
      );
    }
  }

  const totalSelections = slip.selections.length;
  const convertedCount = convertedSelections.length;
  const unavailableCount = unavailableSelections.length;

  let status;

  if (convertedCount === 0) {
    status = "FAILED";
  } else if (convertedCount === totalSelections) {
    status = "FULL_CONVERSION";
  } else {
    status = "PARTIAL_CONVERSION";
  }

  return {
    success: convertedCount > 0,
    status,

    source: slip.source,

    summary: {
      total: totalSelections,
      converted: convertedCount,
      unavailable: unavailableCount
    },

    selections: convertedSelections,

    unavailableSelections
  };
}

module.exports = {
  convertBetSlip
};
