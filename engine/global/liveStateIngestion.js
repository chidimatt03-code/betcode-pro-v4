const { resolveLiveState } = require("./liveStateResolver");

function requireRepository(repository) {
  if (
    !repository ||
    typeof repository.getSourceByCode !== "function" ||
    typeof repository.getMatchById !== "function"
  ) {
    throw new TypeError("BCP_LIVE_STATE_INGESTION_REPOSITORY_INVALID");
  }

  return repository;
}

async function ingestLiveStates(
  repository,
  adapter,
  registry,
  options = {}
) {
  const db = requireRepository(repository);

  if (
    !adapter ||
    typeof adapter.fetchLiveStates !== "function"
  ) {
    throw new TypeError("BCP_LIVE_STATE_ADAPTER_INVALID");
  }

  if (
    !registry ||
    typeof registry.get !== "function"
  ) {
    throw new TypeError("BCP_LIVE_STATE_REGISTRY_INVALID");
  }

  if (!registry.get(adapter.code)) {
    throw new Error("BCP_LIVE_STATE_ADAPTER_NOT_REGISTERED");
  }

  const observedAt =
    options.observedAt || new Date().toISOString();

  const states = await adapter.fetchLiveStates({
    ...options,
    observedAt
  });

  if (!Array.isArray(states)) {
    throw new TypeError("BCP_LIVE_STATE_RESULT_INVALID");
  }

  const results = [];
  const skipped = [];

  for (const liveState of states) {
    const source = await db.getSourceByCode(adapter.code);

    if (!source) {
      throw new Error("BCP_LIVE_STATE_SOURCE_NOT_REGISTERED");
    }

    const sourceObservation =
      await db.findMatchSource(
        source.id,
        liveState.sourceEventId
      );

    if (!sourceObservation) {
      skipped.push({
        sourceEventId: liveState.sourceEventId,
        reason: "MATCH_OBSERVATION_NOT_FOUND"
      });
      continue;
    }

    const result = await resolveLiveState(
      db,
      {
        matchId: sourceObservation.match_id,
        sourceCode: adapter.code,
        sourceEventId: liveState.sourceEventId,
        homeScore: liveState.homeScore,
        awayScore: liveState.awayScore,
        period: liveState.period,
        clockSeconds: liveState.clockSeconds,
        displayClock: liveState.displayClock,
        status: liveState.status,
        observedAt: liveState.observedAt,
        registry
      }
    );

    results.push(result);
  }

  return Object.freeze({
    sourceCode: adapter.code,
    received: states.length,
    resolved: results.length,
    skipped: skipped.length,
    results: Object.freeze(results),
    skipped: Object.freeze(skipped)
  });
}

module.exports = {
  ingestLiveStates
};
