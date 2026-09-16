function normalizeBookmaker(value) {
  return String(value || "").toLowerCase().trim();
}

function normalizeUniversalSelection(selection = {}, index = 1) {
  return {
    index,
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
  };
}

function createUniversalBetModel({
  sourceBookmaker,
  sourceCode,
  selections = []
} = {}) {
  return {
    version: 1,

    source: {
      bookmaker: normalizeBookmaker(sourceBookmaker),
      code: String(sourceCode || "").trim()
    },

    selections: Array.isArray(selections)
      ? selections.map((selection, index) =>
          normalizeUniversalSelection(selection, index + 1)
        )
      : []
  };
}

function validateUniversalBetModel(model) {
  const errors = [];

  if (!model || typeof model !== "object") {
    return ["Invalid universal bet model."];
  }

  if (model.version !== 1) {
    errors.push("Unsupported universal bet model version.");
  }

  if (!model.source || typeof model.source !== "object") {
    errors.push("Source information is missing.");
  } else {
    if (!model.source.bookmaker) {
      errors.push("Source bookmaker is missing.");
    }

    if (!model.source.code) {
      errors.push("Source booking code is missing.");
    }
  }

  if (!Array.isArray(model.selections) || model.selections.length === 0) {
    errors.push("No selections were found.");
    return errors;
  }

  for (const selection of model.selections) {
    const number = selection.index;

    if (!selection.event?.home || !selection.event?.away) {
      errors.push(`Selection ${number}: event teams are missing.`);
    }

    if (!selection.market?.type && !selection.market?.name) {
      errors.push(`Selection ${number}: market information is missing.`);
    }

    if (!selection.selection?.type && !selection.selection?.name) {
      errors.push(`Selection ${number}: selection information is missing.`);
    }
  }

  return errors;
}

function isUniversalBetModel(model) {
  return validateUniversalBetModel(model).length === 0;
}

module.exports = {
  normalizeBookmaker,
  normalizeUniversalSelection,
  createUniversalBetModel,
  validateUniversalBetModel,
  isUniversalBetModel
};
