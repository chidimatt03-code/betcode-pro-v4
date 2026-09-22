const {
  createLiveStateObservation
} = require("./liveStateModel");
const { resolveLiveStateConflict } = require("./liveStateConflictResolver");

function requireRepository(repository) {
  if (
    !repository ||
    typeof repository.getSourceByCode !== "function" ||
    typeof repository.getMatchById !== "function" ||
    typeof repository.findMatchStateObservation !== "function" ||
    typeof repository.findMatchStateObservations !== "function" ||
    typeof repository.createMatchStateObservation !== "function" ||
    typeof repository.updateMatchStateObservation !== "function" ||
    typeof repository.upsertMatchState !== "function"
  ) {
    throw new TypeError("BCP_LIVE_STATE_REPOSITORY_INVALID");
  }

  return repository;
}

async function resolveLiveState(
  repository,
  {
    matchId,
    sourceCode,
    sourceEventId,
    homeScore = null,
    awayScore = null,
    period = null,
    clockSeconds = null,
    displayClock = null,
    status,
    observedAt,
    registry = null,
    now = new Date().toISOString()
  }
) {
  const db = requireRepository(repository);

  if (!matchId) {
    throw new TypeError("BCP_LIVE_STATE_MATCH_ID_INVALID");
  }

  const match = await db.getMatchById(matchId);

  if (!match) {
    throw new Error("BCP_LIVE_STATE_MATCH_NOT_FOUND");
  }

  const source = await db.getSourceByCode(sourceCode);

  if (!source) {
    throw new Error("BCP_LIVE_STATE_SOURCE_NOT_FOUND");
  }

  const normalized = createLiveStateObservation({
    sourceCode,
    sourceEventId,
    homeScore,
    awayScore,
    period,
    clockSeconds,
    displayClock,
    status,
    observedAt
  });

  const existing = await db.findMatchStateObservation(
    source.id,
    normalized.sourceEventId
  );

  let observation;

  if (existing) {
    observation = await db.updateMatchStateObservation(existing.id, {
      matchId,
      sourceId: source.id,
      sourceEventId: normalized.sourceEventId,
      homeScore: normalized.homeScore,
      awayScore: normalized.awayScore,
      period: normalized.period,
      clockSeconds: normalized.clockSeconds,
      displayClock: normalized.displayClock,
      status: normalized.status,
      observedAt: normalized.observedAt,
      now
    });
  } else {
    observation = await db.createMatchStateObservation({
      matchId,
      sourceId: source.id,
      sourceEventId: normalized.sourceEventId,
      homeScore: normalized.homeScore,
      awayScore: normalized.awayScore,
      period: normalized.period,
      clockSeconds: normalized.clockSeconds,
      displayClock: normalized.displayClock,
      status: normalized.status,
      observedAt: normalized.observedAt,
      now
    });
  }

  const observations = await db.findMatchStateObservations(matchId);
  const sourceRows = await db.listSources();

  const sourceById = new Map(
    sourceRows.map((row) => [Number(row.id), row])
  );

  const conflictCandidates = observations.map((item) => {
    const sourceRow = sourceById.get(Number(item.source_id));
    const adapter =
      registry && sourceRow && typeof registry.get === "function"
        ? registry.get(sourceRow.code)
        : null;

    return {
      sourceCode: sourceRow ? sourceRow.code : null,
      sourceEventId: item.source_event_id,
      homeScore: item.home_score,
      awayScore: item.away_score,
      period: item.period,
      clockSeconds: item.clock_seconds,
      displayClock: item.display_clock,
      status: item.status,
      observedAt: item.observed_at,
      sourcePriority: adapter ? adapter.priority : 0
    };
  });

  const resolved = resolveLiveStateConflict(conflictCandidates);

  const resolvedSource = resolved
    ? sourceRows.find((row) => row.code === resolved.sourceCode)
    : source;

  const state = await db.upsertMatchState({
    matchId,
    homeScore: resolved ? resolved.homeScore : normalized.homeScore,
    awayScore: resolved ? resolved.awayScore : normalized.awayScore,
    period: resolved ? resolved.period : normalized.period,
    clockSeconds: resolved
      ? resolved.clockSeconds
      : normalized.clockSeconds,
    displayClock: resolved
      ? resolved.displayClock
      : normalized.displayClock,
    status: resolved ? resolved.status : normalized.status,
    sourceId: resolvedSource ? resolvedSource.id : source.id,
    sourceObservedAt: resolved
      ? resolved.observedAt
      : normalized.observedAt,
    resolvedAt: now,
    updatedAt: now
  });

  return Object.freeze({
    match,
    source,
    observation,
    state
  });
}

module.exports = {
  resolveLiveState
};
