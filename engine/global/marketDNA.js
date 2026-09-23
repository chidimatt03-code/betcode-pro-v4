const crypto = require("crypto");

const { mapMarketType, isSupportedMarket } = require("../marketMapper");

const MARKET_DNA_VERSION = 1;

function incrementCount(map, key) {
  const normalized = key || "UNKNOWN";
  map[normalized] = (map[normalized] || 0) + 1;
}

function normalizeLine(line) {
  if (line === null || line === undefined || line === "") return null;
  return String(line).trim();
}

function canonicalMarketFingerprint(selection) {
  const marketType = mapMarketType(
    selection?.market?.name,
    selection?.market?.type
  );

  return {
    marketType: marketType || null,
    line: normalizeLine(selection?.market?.line)
  };
}

function createMarketDNAFingerprint(selections = []) {
  const markets = selections
    .map(canonicalMarketFingerprint)
    .sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b))
    );

  const payload = JSON.stringify({
    version: MARKET_DNA_VERSION,
    markets
  });

  return crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");
}

function analyzeMarketDNA(model) {
  if (!model || typeof model !== "object") {
    throw new Error("Invalid universal bet model.");
  }

  if (!Array.isArray(model.selections) || model.selections.length === 0) {
    throw new Error("No selections were found.");
  }

  const marketCounts = {};
  const marketLines = {};
  const unresolvedMarkets = [];

  for (const selection of model.selections) {
    const market = selection?.market || {};

    const marketType = mapMarketType(
      market.name,
      market.type
    );

    if (!marketType || !isSupportedMarket(marketType)) {
      unresolvedMarkets.push({
        index: selection.index,
        name: market.name || null,
        type: market.type || null,
        line: normalizeLine(market.line)
      });
      continue;
    }

    incrementCount(marketCounts, marketType);

    const line = normalizeLine(market.line);

    if (!marketLines[marketType]) {
      marketLines[marketType] = {};
    }

    incrementCount(marketLines[marketType], line || "NO_LINE");
  }

  const recognizedMarketCount =
    model.selections.length - unresolvedMarkets.length;

  const uniqueMarketTypes = Object.keys(marketCounts).length;

  const marketConcentration = {};

  for (const [marketType, count] of Object.entries(marketCounts)) {
    marketConcentration[marketType] =
      recognizedMarketCount > 0
        ? Number((count / recognizedMarketCount).toFixed(6))
        : 0;
  }

  return {
    version: MARKET_DNA_VERSION,

    fingerprint: createMarketDNAFingerprint(model.selections),

    source: {
      bookmaker: model.source?.bookmaker || null,
      code: model.source?.code || null
    },

    composition: {
      selectionCount: model.selections.length,
      recognizedMarketCount,
      unresolvedMarketCount: unresolvedMarkets.length,
      uniqueMarketTypes
    },

    marketProfile: {
      counts: marketCounts,
      lines: marketLines,
      concentration: marketConcentration
    },

    diversity: {
      uniqueMarketTypes,
      recognizedMarketRatio:
        model.selections.length > 0
          ? Number(
              (recognizedMarketCount / model.selections.length).toFixed(6)
            )
          : 0
    },

    dataQuality: {
      recognizedMarkets: recognizedMarketCount,
      unresolvedMarkets: unresolvedMarkets.length,
      completeMarketCoverage: unresolvedMarkets.length === 0,
      unresolved: unresolvedMarkets
    }
  };
}

module.exports = {
  MARKET_DNA_VERSION,
  analyzeMarketDNA,
  createMarketDNAFingerprint
};
