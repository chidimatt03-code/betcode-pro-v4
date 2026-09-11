function createBetSlip({
  sourceBookmaker,
  sourceCode,
  selections = []
}) {
  return {
    version: 1,
    source: {
      bookmaker: sourceBookmaker,
      code: sourceCode
    },
    selections: selections.map((selection, index) => ({
      index: index + 1,
      sport: selection.sport || null,

      event: {
        id: selection.event?.id || null,
        home: selection.event?.home || null,
        away: selection.event?.away || null,
        competition: selection.event?.competition || null,
        startTime: selection.event?.startTime || null
      },

      market: {
        type: selection.market?.type || null,
        name: selection.market?.name || null,
        line: selection.market?.line ?? null
      },

      selection: {
        type: selection.selection?.type || null,
        name: selection.selection?.name || null,
        value: selection.selection?.value ?? null
      }
    }))
  };
}

function validateBetSlip(slip) {
  const errors = [];

  if (!slip || typeof slip !== "object") {
    return ["Invalid bet slip."];
  }

  if (!slip.source?.bookmaker) {
    errors.push("Source bookmaker is missing.");
  }

  if (!slip.source?.code) {
    errors.push("Source booking code is missing.");
  }

  if (!Array.isArray(slip.selections) || slip.selections.length === 0) {
    errors.push("No selections were found.");
  }

  for (const selection of slip.selections || []) {
    if (!selection.event.home || !selection.event.away) {
      errors.push(`Selection ${selection.index}: event teams are missing.`);
    }

    if (!selection.market.type) {
      errors.push(`Selection ${selection.index}: market type is missing.`);
    }

    if (!selection.selection.type) {
      errors.push(`Selection ${selection.index}: selection type is missing.`);
    }
  }

  return errors;
}

module.exports = {
  createBetSlip,
  validateBetSlip
};
