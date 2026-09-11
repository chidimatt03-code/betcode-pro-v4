function normalizeMarketName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MARKET_ALIASES = {
  "1x2": "1X2",
  "match result": "1X2",
  "full time result": "1X2",
  "home draw away": "1X2",

  "over under": "TOTAL_GOALS",
  "total goals": "TOTAL_GOALS",
  "goals over under": "TOTAL_GOALS",

  "both teams to score": "BTTS",
  "btts": "BTTS",

  "double chance": "DOUBLE_CHANCE",

  "asian handicap": "ASIAN_HANDICAP",
  "handicap": "HANDICAP",

  "draw no bet": "DRAW_NO_BET"
};

function mapMarketType(name, type) {
  if (type && MARKET_ALIASES[type]) {
    return MARKET_ALIASES[type];
  }

  const normalized = normalizeMarketName(name);

  return MARKET_ALIASES[normalized] || null;
}

function isSupportedMarket(type) {
  return [
    "1X2",
    "TOTAL_GOALS",
    "BTTS",
    "DOUBLE_CHANCE",
    "ASIAN_HANDICAP",
    "HANDICAP",
    "DRAW_NO_BET"
  ].includes(type);
}

module.exports = {
  normalizeMarketName,
  mapMarketType,
  isSupportedMarket
};
