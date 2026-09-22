const ALLOWED_STATUSES = Object.freeze([
  "scheduled",
  "live",
  "halftime",
  "finished",
  "postponed",
  "cancelled",
  "suspended",
  "unknown"
]);

function normalizeScore(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number < 0) {
    throw new TypeError(`BCP_LIVE_STATE_${fieldName.toUpperCase()}_INVALID`);
  }

  return number;
}

function normalizeNullableInteger(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number < 0) {
    throw new TypeError(`BCP_LIVE_STATE_${fieldName.toUpperCase()}_INVALID`);
  }

  return number;
}

function normalizeObservedAt(value) {
  const timestamp = new Date(value);

  if (!value || Number.isNaN(timestamp.getTime())) {
    throw new TypeError("BCP_LIVE_STATE_OBSERVED_AT_INVALID");
  }

  return timestamp.toISOString();
}

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new TypeError("BCP_LIVE_STATE_STATUS_INVALID");
  }

  return status;
}

function createLiveStateObservation({
  sourceCode,
  sourceEventId,
  homeScore = null,
  awayScore = null,
  period = null,
  clockSeconds = null,
  displayClock = null,
  status,
  observedAt
}) {
  const normalizedSourceCode = String(sourceCode || "").trim();
  const normalizedSourceEventId = String(sourceEventId || "").trim();

  if (!normalizedSourceCode) {
    throw new TypeError("BCP_LIVE_STATE_SOURCE_CODE_INVALID");
  }

  if (!normalizedSourceEventId) {
    throw new TypeError("BCP_LIVE_STATE_SOURCE_EVENT_ID_INVALID");
  }

  const normalizedDisplayClock =
    displayClock === null || displayClock === undefined
      ? null
      : String(displayClock).trim() || null;

  return Object.freeze({
    sourceCode: normalizedSourceCode,
    sourceEventId: normalizedSourceEventId,
    homeScore: normalizeScore(homeScore, "home_score"),
    awayScore: normalizeScore(awayScore, "away_score"),
    period: normalizeNullableInteger(period, "period"),
    clockSeconds: normalizeNullableInteger(clockSeconds, "clock_seconds"),
    displayClock: normalizedDisplayClock,
    status: normalizeStatus(status),
    observedAt: normalizeObservedAt(observedAt)
  });
}

module.exports = {
  ALLOWED_STATUSES,
  createLiveStateObservation
};
