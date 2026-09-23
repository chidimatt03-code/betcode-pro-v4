const ALLOWED_STATUS = "finished";

function normalizeScore(value, fieldName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 0) {
    throw new TypeError(`BCP_MATCH_RESULT_${fieldName.toUpperCase()}_INVALID`);
  }

  return number;
}

function normalizeObservedAt(value) {
  const timestamp = new Date(value);

  if (!value || Number.isNaN(timestamp.getTime())) {
    throw new TypeError("BCP_MATCH_RESULT_OBSERVED_AT_INVALID");
  }

  return timestamp.toISOString();
}

function createMatchResult({
  sourceCode,
  sourceEventId,
  homeScore,
  awayScore,
  status = ALLOWED_STATUS,
  observedAt
}) {
  const normalizedSourceCode = String(sourceCode || "").trim();
  const normalizedSourceEventId = String(sourceEventId || "").trim();
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (!normalizedSourceCode) {
    throw new TypeError("BCP_MATCH_RESULT_SOURCE_CODE_INVALID");
  }

  if (!normalizedSourceEventId) {
    throw new TypeError("BCP_MATCH_RESULT_SOURCE_EVENT_ID_INVALID");
  }

  if (normalizedStatus !== ALLOWED_STATUS) {
    throw new TypeError("BCP_MATCH_RESULT_STATUS_INVALID");
  }

  return Object.freeze({
    sourceCode: normalizedSourceCode,
    sourceEventId: normalizedSourceEventId,
    homeScore: normalizeScore(homeScore, "home_score"),
    awayScore: normalizeScore(awayScore, "away_score"),
    status: ALLOWED_STATUS,
    observedAt: normalizeObservedAt(observedAt)
  });
}

module.exports = {
  ALLOWED_STATUS,
  createMatchResult
};
