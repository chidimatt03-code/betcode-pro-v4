const DEFAULT_THRESHOLDS = Object.freeze({
  freshSeconds: 60,
  agingSeconds: 300
});

function normalizeTimestamp(value, fieldName) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new TypeError(`BCP_FRESHNESS_${fieldName}_INVALID`);
  }

  return date.getTime();
}

function calculateFreshness(observedAt, {
  now = new Date().toISOString(),
  freshSeconds = DEFAULT_THRESHOLDS.freshSeconds,
  agingSeconds = DEFAULT_THRESHOLDS.agingSeconds
} = {}) {
  const observedMs = normalizeTimestamp(observedAt, "OBSERVED_AT");
  const nowMs = normalizeTimestamp(now, "NOW");

  if (freshSeconds < 0 || agingSeconds < freshSeconds) {
    throw new RangeError("BCP_FRESHNESS_THRESHOLDS_INVALID");
  }

  const ageSeconds = Math.max(0, (nowMs - observedMs) / 1000);

  let state = "stale";

  if (ageSeconds <= freshSeconds) {
    state = "fresh";
  } else if (ageSeconds <= agingSeconds) {
    state = "aging";
  }

  return Object.freeze({
    state,
    ageSeconds,
    observedAt: new Date(observedMs).toISOString(),
    evaluatedAt: new Date(nowMs).toISOString()
  });
}

module.exports = {
  DEFAULT_THRESHOLDS,
  calculateFreshness
};
