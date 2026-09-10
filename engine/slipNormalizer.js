const {
  createBetSlip,
  validateBetSlip
} = require("./converter");

function normalizeDecodedSlip({
  sourceBookmaker,
  sourceCode,
  decodedSlip
}) {
  if (!decodedSlip || typeof decodedSlip !== "object") {
    return {
      success: false,
      stage: "SLIP_NORMALIZATION",
      errors: ["Decoded bet slip is missing."]
    };
  }

  const selections = Array.isArray(decodedSlip.selections)
    ? decodedSlip.selections
    : [];

  const slip = createBetSlip({
    sourceBookmaker,
    sourceCode,
    selections
  });

  const errors = validateBetSlip(slip);

  if (errors.length) {
    return {
      success: false,
      stage: "SLIP_VALIDATION",
      errors
    };
  }

  return {
    success: true,
    slip
  };
}

module.exports = {
  normalizeDecodedSlip
};
