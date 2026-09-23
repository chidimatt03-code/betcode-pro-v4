const { createMatchResult } = require("./matchResultModel");

function requireRepository(repository) {
  if (
    !repository ||
    typeof repository.getSourceByCode !== "function" ||
    typeof repository.findMatchSource !== "function" ||
    typeof repository.createMatchResult !== "function" ||
    typeof repository.findMatchResult !== "function" ||
    typeof repository.updateMatchResult !== "function"
  ) {
    throw new TypeError("BCP_RESULT_INGESTION_REPOSITORY_INVALID");
  }

  return repository;
}

async function ingestMatchResults(
  repository,
  adapter,
  options = {}
) {
  const db = requireRepository(repository);

  if (
    !adapter ||
    typeof adapter.fetchResults !== "function"
  ) {
    throw new TypeError("BCP_RESULT_ADAPTER_INVALID");
  }

  const source = await db.getSourceByCode(adapter.code);

  if (!source) {
    throw new Error("BCP_RESULT_SOURCE_NOT_REGISTERED");
  }

  const observedAt =
    options.observedAt || new Date().toISOString();

  const rawResults = await adapter.fetchResults({
    ...options,
    observedAt
  });

  if (!Array.isArray(rawResults)) {
    throw new TypeError("BCP_RESULT_FETCH_RESULT_INVALID");
  }

  const results = [];
  const skipped = [];

  for (const rawResult of rawResults) {
    const result = createMatchResult({
      ...rawResult,
      sourceCode: adapter.code,
      observedAt: rawResult.observedAt || observedAt
    });

    const sourceObservation =
      await db.findMatchSource(
        source.id,
        result.sourceEventId
      );

    if (!sourceObservation) {
      skipped.push({
        sourceEventId: result.sourceEventId,
        reason: "MATCH_OBSERVATION_NOT_FOUND"
      });
      continue;
    }

    const existing =
      await db.findMatchResult(
        source.id,
        result.sourceEventId
      );

    const persisted = existing
      ? await db.updateMatchResult(existing.id, {
          matchId: sourceObservation.match_id,
          sourceId: source.id,
          sourceEventId: result.sourceEventId,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          status: result.status,
          observedAt: result.observedAt,
          now: observedAt
        })
      : await db.createMatchResult({
          matchId: sourceObservation.match_id,
          sourceId: source.id,
          sourceEventId: result.sourceEventId,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          status: result.status,
          observedAt: result.observedAt,
          now: observedAt
        });

    results.push(persisted);
  }

  return Object.freeze({
    sourceCode: adapter.code,
    received: rawResults.length,
    persisted: results.length,
    skipped: skipped.length,
    results: Object.freeze(results),
    skippedResults: Object.freeze(skipped)
  });
}

module.exports = {
  ingestMatchResults
};
