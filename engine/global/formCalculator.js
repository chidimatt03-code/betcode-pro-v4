function normalizeLimit(value) {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new TypeError("BCP_FORM_LIMIT_INVALID");
  }

  return limit;
}

function calculateForm(results, { limit = 5 } = {}) {
  if (!Array.isArray(results)) {
    throw new TypeError("BCP_FORM_RESULTS_INVALID");
  }

  const normalizedLimit = normalizeLimit(limit);
  const selected = results
    .filter(result => result && result.status === "finished")
    .slice(0, normalizedLimit);

  const form = [];
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let points = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const result of selected) {
    const homeScore = Number(result.home_score);
    const awayScore = Number(result.away_score);
    const teamId = Number(result.team_id);

    if (
      !Number.isInteger(homeScore) ||
      homeScore < 0 ||
      !Number.isInteger(awayScore) ||
      awayScore < 0
    ) {
      continue;
    }

    if (!Number.isInteger(teamId) || teamId <= 0) {
      throw new TypeError("BCP_FORM_TEAM_ID_INVALID");
    }

    const isHome = Number(result.home_team_id) === teamId;
    const isAway = Number(result.away_team_id) === teamId;

    if (!isHome && !isAway) {
      throw new TypeError("BCP_FORM_TEAM_NOT_IN_MATCH");
    }

    const teamScore = isHome ? homeScore : awayScore;
    const opponentScore = isHome ? awayScore : homeScore;

    let outcome;
    let earnedPoints;

    if (teamScore > opponentScore) {
      outcome = "W";
      earnedPoints = 3;
      wins += 1;
    } else if (teamScore === opponentScore) {
      outcome = "D";
      earnedPoints = 1;
      draws += 1;
    } else {
      outcome = "L";
      earnedPoints = 0;
      losses += 1;
    }

    points += earnedPoints;
    goalsFor += teamScore;
    goalsAgainst += opponentScore;

    form.push(Object.freeze({
      matchId: Number(result.match_id),
      opponentTeamId: isHome
        ? Number(result.away_team_id)
        : Number(result.home_team_id),
      opponentTeamName: isHome
        ? result.away_team_name
        : result.home_team_name,
      venue: isHome ? "home" : "away",
      teamScore,
      opponentScore,
      outcome,
      points: earnedPoints,
      observedAt: result.observed_at
    }));
  }

  return Object.freeze({
    matches: Object.freeze(form),
    sampleSize: form.length,
    wins,
    draws,
    losses,
    points,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst
  });
}

module.exports = {
  calculateForm
};
