const COMPATIBILITY = {
  "1X2": {
    bet9ja: true,
    sportybet: true,
    betking: true
  },

  "TOTAL_GOALS": {
    bet9ja: true,
    sportybet: true,
    betking: true
  },

  "BTTS": {
    bet9ja: true,
    sportybet: true,
    betking: true
  },

  "DOUBLE_CHANCE": {
    bet9ja: true,
    sportybet: true,
    betking: true
  },

  "DRAW_NO_BET": {
    bet9ja: true,
    sportybet: true,
    betking: true
  },

  "HANDICAP": {
    bet9ja: true,
    sportybet: true,
    betking: true
  },

  "ASIAN_HANDICAP": {
    bet9ja: true,
    sportybet: true,
    betking: true
  }
,

  "WIN_EITHER_HALF": {
    bet9ja: true,
    sportybet: true,
    betking: true
  },

  "1X2_1UP": {
    bet9ja: true,
    sportybet: true,
    betking: true
  },

  "1X2_2UP": {
    bet9ja: true,
    sportybet: true,
    betking: true
  }
};

function normalizeBookmaker(bookmaker) {
  return String(bookmaker || "")
    .toLowerCase()
    .trim();
}

function normalizeMarketType(marketType) {
  return String(marketType || "")
    .toUpperCase()
    .trim();
}

function getMarketCompatibility(
  marketType,
  sourceBookmaker,
  destinationBookmaker
) {
  const type = normalizeMarketType(marketType);
  const source = normalizeBookmaker(sourceBookmaker);
  const destination = normalizeBookmaker(destinationBookmaker);

  if (!type || !source || !destination) {
    return {
      status: "UNKNOWN",
      marketType: type || null,
      sourceBookmaker: source || null,
      destinationBookmaker: destination || null
    };
  }

  const market = COMPATIBILITY[type];

  if (!market) {
    return {
      status: "UNKNOWN",
      marketType: type,
      sourceBookmaker: source,
      destinationBookmaker: destination
    };
  }

  if (market[source] !== true || market[destination] !== true) {
    return {
      status: "UNSUPPORTED",
      marketType: type,
      sourceBookmaker: source,
      destinationBookmaker: destination
    };
  }

  return {
    status: "SUPPORTED",
    marketType: type,
    sourceBookmaker: source,
    destinationBookmaker: destination
  };
}

function isMarketCompatible(
  marketType,
  sourceBookmaker,
  destinationBookmaker
) {
  return (
    getMarketCompatibility(
      marketType,
      sourceBookmaker,
      destinationBookmaker
    ).status === "SUPPORTED"
  );
}

module.exports = {
  COMPATIBILITY,
  getMarketCompatibility,
  isMarketCompatible
};
