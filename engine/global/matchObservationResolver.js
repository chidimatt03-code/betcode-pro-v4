function requireRepository(repository) {
  if (
    !repository ||
    typeof repository.findMatchSource !== "function" ||
    typeof repository.createMatchSource !== "function" ||
    typeof repository.findMatchSources !== "function"
  ) {
    throw new TypeError("BCP_MATCH_OBSERVATION_REPOSITORY_INVALID");
  }

  return repository;
}

async function resolveMatchObservation(repository, {
  matchId,
  sourceId,
  sourceEventId,
  sourceHomeName = null,
  sourceAwayName = null,
  sourceStartTime = null,
  observedAt = new Date().toISOString(),
  status = null,
  now = new Date().toISOString()
}) {
  const db = requireRepository(repository);

  if (!matchId) {
    throw new TypeError("BCP_MATCH_OBSERVATION_MATCH_ID_INVALID");
  }

  if (!sourceId) {
    throw new TypeError("BCP_MATCH_OBSERVATION_SOURCE_ID_INVALID");
  }

  const normalizedSourceEventId = String(sourceEventId || "").trim();

  if (!normalizedSourceEventId) {
    throw new TypeError("BCP_MATCH_OBSERVATION_EVENT_ID_INVALID");
  }

  const existing = await db.findMatchSource(
    sourceId,
    normalizedSourceEventId
  );

  if (existing) {
    const updated = await db.updateMatchSource(existing.id, {
      matchId,
      sourceHomeName,
      sourceAwayName,
      sourceStartTime,
      observedAt,
      status,
      now
    });

    return updated;
  }

  return db.createMatchSource({
    matchId,
    sourceId,
    sourceEventId: normalizedSourceEventId,
    sourceHomeName,
    sourceAwayName,
    sourceStartTime,
    observedAt,
    status,
    now
  });
}

module.exports = {
  resolveMatchObservation
};
