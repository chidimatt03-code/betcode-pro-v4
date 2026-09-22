const {
  createLiveStateObservation
} = require("./liveStateModel");

function normalizePriority(value) {
  const priority = Number(value);
  if (!Number.isFinite(priority)) return 0;
  return priority;
}

function compareObservations(a, b) {
  const priorityDifference =
    normalizePriority(b.sourcePriority) -
    normalizePriority(a.sourcePriority);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const aTime = new Date(a.observedAt).getTime();
  const bTime = new Date(b.observedAt).getTime();

  return bTime - aTime;
}

function resolveLiveStateConflict(observations) {
  if (!Array.isArray(observations)) {
    throw new TypeError("BCP_LIVE_STATE_OBSERVATIONS_INVALID");
  }

  if (observations.length === 0) {
    return null;
  }

  const normalized = observations.map((observation) =>
    Object.freeze({
      ...createLiveStateObservation(observation),
      sourcePriority: normalizePriority(observation.sourcePriority)
    })
  );

  return Object.freeze(
    normalized.slice().sort(compareObservations)[0]
  );
}

module.exports = {
  compareObservations,
  resolveLiveStateConflict
};
