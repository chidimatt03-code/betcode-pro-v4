const { buildTeamProfile } = require("./teamProfile");

function normalizeTeamId(teamId) {
  const id = Number(teamId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new TypeError("BCP_TEAM_PROFILE_SERVICE_TEAM_ID_INVALID");
  }

  return id;
}

function normalizeLimit(value, errorCode) {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new TypeError(errorCode);
  }

  return limit;
}

function requireRepository(repository) {
  if (
    !repository ||
    typeof repository.getTeamById !== "function" ||
    typeof repository.findTeamMatchResults !== "function" ||
    typeof repository.findTeamUpcomingMatches !== "function"
  ) {
    throw new TypeError("BCP_TEAM_PROFILE_SERVICE_REPOSITORY_INVALID");
  }

  return repository;
}

function normalizeUpcomingMatches(matches) {
  if (!Array.isArray(matches)) {
    throw new TypeError("BCP_TEAM_PROFILE_SERVICE_UPCOMING_INVALID");
  }

  return Object.freeze(
    matches.map(match =>
      Object.freeze({
        matchId: Number(match.id),
        homeTeamId: Number(match.home_team_id),
        awayTeamId: Number(match.away_team_id),
        homeTeamName: match.home_team_name || null,
        awayTeamName: match.away_team_name || null,
        competitionName: match.competition_name || null,
        scheduledStart: match.scheduled_start || null,
        status: match.status
      })
    )
  );
}

async function getTeamProfile(
  repository,
  teamId,
  {
    formLimit = 5,
    h2hLimit = 5,
    resultLimit = 20,
    upcomingLimit = 10,
    opponentTeamId = null
  } = {}
) {
  const db = requireRepository(repository);

  const normalizedTeamId = normalizeTeamId(teamId);
  const normalizedResultLimit = normalizeLimit(
    resultLimit,
    "BCP_TEAM_PROFILE_SERVICE_RESULT_LIMIT_INVALID"
  );
  const normalizedUpcomingLimit = normalizeLimit(
    upcomingLimit,
    "BCP_TEAM_PROFILE_SERVICE_UPCOMING_LIMIT_INVALID"
  );

  const team = await db.getTeamById(normalizedTeamId);

  if (!team) {
    throw new Error("BCP_TEAM_PROFILE_SERVICE_TEAM_NOT_FOUND");
  }

  const results = await db.findTeamMatchResults(normalizedTeamId, {
    limit: normalizedResultLimit
  });

  const upcomingMatches = await db.findTeamUpcomingMatches(
    normalizedTeamId,
    {
      limit: normalizedUpcomingLimit
    }
  );

  const profile = buildTeamProfile({
    team,
    results,
    formLimit,
    opponentTeamId,
    h2hLimit
  });

  return Object.freeze({
    ...profile,
    upcomingMatches: normalizeUpcomingMatches(upcomingMatches),
    dataQuality: Object.freeze({
      ...profile.dataQuality,
      upcomingMatchesAvailable: upcomingMatches.length,
      upcomingFixturesAvailable: upcomingMatches.length > 0
    })
  });
}

module.exports = {
  getTeamProfile
};
