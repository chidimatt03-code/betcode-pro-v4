function validateConversion({
  matchResult,
  marketType,
  selectionType,
  line = null
}) {
  const errors = [];

  if (!matchResult || !matchResult.candidate) {
    errors.push("Destination event was not found.");
  }

  if (
    matchResult &&
    !["MATCHED", "LIKELY_MATCH"].includes(matchResult.status)
  ) {
    errors.push("Event match confidence is too low.");
  }

  if (!marketType) {
    errors.push("Unsupported or missing market type.");
  }

  if (!selectionType) {
    errors.push("Unsupported or missing selection type.");
  }

  const lineMarkets = [
    "TOTAL_GOALS",
    "ASIAN_HANDICAP",
    "HANDICAP"
  ];

  if (lineMarkets.includes(marketType) && line === null) {
    errors.push("Required market line is missing.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateConversion
};
