const DEFAULT_HEALTH_THRESHOLDS = Object.freeze({
  healthySeconds: 300,
  degradedSeconds: 900
});

function normalizeTimestamp(value, fieldName) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`BCP_SOURCE_HEALTH_${fieldName}_INVALID`);
  }

  return date.getTime();
}

function calculateSourceHealth(source, {
  now = new Date().toISOString(),
  healthySeconds = DEFAULT_HEALTH_THRESHOLDS.healthySeconds,
  degradedSeconds = DEFAULT_HEALTH_THRESHOLDS.degradedSeconds
} = {}) {
  if (!source || typeof source !== "object") {
    throw new TypeError("BCP_SOURCE_HEALTH_SOURCE_INVALID");
  }

  if (
    healthySeconds < 0 ||
    degradedSeconds < healthySeconds
  ) {
    throw new RangeError("BCP_SOURCE_HEALTH_THRESHOLDS_INVALID");
  }

  const nowMs = normalizeTimestamp(now, "NOW");
  const successMs = normalizeTimestamp(
    source.last_success_at,
    "LAST_SUCCESS_AT"
  );
  const failureMs = normalizeTimestamp(
    source.last_failure_at,
    "LAST_FAILURE_AT"
  );

  let state = "unknown";
  let ageSeconds = null;

  if (successMs !== null) {
    ageSeconds = Math.max(0, (nowMs - successMs) / 1000);

    if (ageSeconds < healthySeconds) {
      state = "healthy";
    } else if (ageSeconds <= degradedSeconds) {
      state = "degraded";
    } else {
      state = "stale";
    }
  }

  if (
    failureMs !== null &&
    (successMs === null || failureMs > successMs)
  ) {
    state = "failed";
    ageSeconds = Math.max(0, (nowMs - failureMs) / 1000);
  }

  return Object.freeze({
    state,
    ageSeconds,
    lastSuccessAt:
      successMs === null
        ? null
        : new Date(successMs).toISOString(),
    lastFailureAt:
      failureMs === null
        ? null
        : new Date(failureMs).toISOString(),
    lastError: source.last_error || null,
    evaluatedAt: new Date(nowMs).toISOString()
  });
}

module.exports = {
  DEFAULT_HEALTH_THRESHOLDS,
  calculateSourceHealth
};
