function requireRepository(repository) {
  if (
    !repository ||
    typeof repository.getTeamById !== "function" ||
    typeof repository.getCompetitionById !== "function" ||
    typeof repository.createMatch !== "function"
  ) {
    throw new TypeError("BCP_MATCH_RESOLVER_REPOSITORY_INVALID");
  }

  return repository;
}

function normalizeStartTime(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError("BCP_MATCH_START_TIME_INVALID");
  }

  return date.toISOString();
}

function requireDifferentTeams(homeTeamId, awayTeamId) {
  if (homeTeamId === awayTeamId) {
    throw new Error("BCP_MATCH_TEAMS_MUST_DIFFER");
  }
}

async function resolveMatch(repository, {
  homeTeamId,
  awayTeamId,
  competitionId = null,
  scheduledStart = null,
  status = "scheduled",
  now
}) {
  const db = requireRepository(repository);

  requireDifferentTeams(homeTeamId, awayTeamId);

  const homeTeam = await db.getTeamById(homeTeamId);
  const awayTeam = await db.getTeamById(awayTeamId);

  if (!homeTeam || !awayTeam) {
    throw new Error("BCP_MATCH_TEAM_NOT_FOUND");
  }

  if (competitionId !== null) {
    const competition = await db.getCompetitionById(competitionId);

    if (!competition) {
      throw new Error("BCP_MATCH_COMPETITION_NOT_FOUND");
    }
  }

  const normalizedStart = normalizeStartTime(scheduledStart);

  const existing = await db.findMatchByTeamsAndStart({
    homeTeamId,
    awayTeamId,
    scheduledStart: normalizedStart
  });

  if (existing) {
    return existing;
  }

  return db.createMatch({
    homeTeamId,
    awayTeamId,
    competitionId,
    scheduledStart: normalizedStart,
    status,
    now
  });
}

module.exports = {
  normalizeStartTime,
  resolveMatch
};
