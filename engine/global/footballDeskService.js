function normalizePositiveId(value, errorCode) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new TypeError(errorCode);
  }

  return id;
}

function requireRepository(repository) {
  if (
    !repository ||
    typeof repository.getTeamById !== "function" ||
    typeof repository.getMatchById !== "function" ||
    typeof repository.saveUserTeam !== "function" ||
    typeof repository.removeUserTeam !== "function" ||
    typeof repository.findUserSavedTeams !== "function" ||
    typeof repository.saveUserMatch !== "function" ||
    typeof repository.removeUserMatch !== "function" ||
    typeof repository.findUserSavedMatches !== "function"
  ) {
    throw new TypeError("BCP_FOOTBALL_DESK_REPOSITORY_INVALID");
  }

  return repository;
}

function normalizeUserId(userId) {
  return normalizePositiveId(
    userId,
    "BCP_FOOTBALL_DESK_USER_ID_INVALID"
  );
}

async function saveTeam(repository, userId, teamId, options = {}) {
  const db = requireRepository(repository);
  const normalizedUserId = normalizeUserId(userId);
  const normalizedTeamId = normalizePositiveId(
    teamId,
    "BCP_FOOTBALL_DESK_TEAM_ID_INVALID"
  );

  const team = await db.getTeamById(normalizedTeamId);

  if (!team) {
    throw new Error("BCP_FOOTBALL_DESK_TEAM_NOT_FOUND");
  }

  return Object.freeze(
    await db.saveUserTeam({
      userId: normalizedUserId,
      teamId: normalizedTeamId,
      now: options.now
    })
  );
}

async function removeTeam(repository, userId, teamId) {
  const db = requireRepository(repository);
  const normalizedUserId = normalizeUserId(userId);
  const normalizedTeamId = normalizePositiveId(
    teamId,
    "BCP_FOOTBALL_DESK_TEAM_ID_INVALID"
  );

  const removed = await db.removeUserTeam(
    normalizedUserId,
    normalizedTeamId
  );

  return removed ? Object.freeze(removed) : null;
}

async function listTeams(repository, userId) {
  const db = requireRepository(repository);
  const normalizedUserId = normalizeUserId(userId);

  const rows = await db.findUserSavedTeams(normalizedUserId);

  return Object.freeze(
    rows.map(row => Object.freeze({ ...row }))
  );
}

async function saveMatch(repository, userId, matchId, options = {}) {
  const db = requireRepository(repository);
  const normalizedUserId = normalizeUserId(userId);
  const normalizedMatchId = normalizePositiveId(
    matchId,
    "BCP_FOOTBALL_DESK_MATCH_ID_INVALID"
  );

  const match = await db.getMatchById(normalizedMatchId);

  if (!match) {
    throw new Error("BCP_FOOTBALL_DESK_MATCH_NOT_FOUND");
  }

  return Object.freeze(
    await db.saveUserMatch({
      userId: normalizedUserId,
      matchId: normalizedMatchId,
      now: options.now
    })
  );
}

async function removeMatch(repository, userId, matchId) {
  const db = requireRepository(repository);
  const normalizedUserId = normalizeUserId(userId);
  const normalizedMatchId = normalizePositiveId(
    matchId,
    "BCP_FOOTBALL_DESK_MATCH_ID_INVALID"
  );

  const removed = await db.removeUserMatch(
    normalizedUserId,
    normalizedMatchId
  );

  return removed ? Object.freeze(removed) : null;
}

async function listMatches(repository, userId) {
  const db = requireRepository(repository);
  const normalizedUserId = normalizeUserId(userId);

  const rows = await db.findUserSavedMatches(normalizedUserId);

  return Object.freeze(
    rows.map(row => Object.freeze({ ...row }))
  );
}

async function getFootballDesk(repository, userId) {
  const normalizedUserId = normalizeUserId(userId);

  const [teams, matches] = await Promise.all([
    listTeams(repository, normalizedUserId),
    listMatches(repository, normalizedUserId)
  ]);

  return Object.freeze({
    userId: normalizedUserId,
    savedTeams: teams,
    savedMatches: matches,
    dataQuality: Object.freeze({
      savedTeamsAvailable: teams.length,
      savedMatchesAvailable: matches.length
    })
  });
}

module.exports = {
  getFootballDesk,
  listMatches,
  listTeams,
  removeMatch,
  removeTeam,
  saveMatch,
  saveTeam
};
