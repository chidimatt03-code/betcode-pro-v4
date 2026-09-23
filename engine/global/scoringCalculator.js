function calculateScoring(results, { teamId } = {}) {
  const normalizedTeamId = Number(teamId);

  if (!Number.isInteger(normalizedTeamId) || normalizedTeamId <= 0) {
    throw new TypeError("BCP_SCORING_TEAM_ID_INVALID");
  }

  if (!Array.isArray(results)) {
    throw new TypeError("BCP_SCORING_RESULTS_INVALID");
  }

  const finished = results.filter(
    result => result && result.status === "finished"
  );

  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;
  let failedToScore = 0;

  for (const result of finished) {
    const homeScore = Number(result.home_score);
    const awayScore = Number(result.away_score);

    if (
      !Number.isInteger(homeScore) ||
      homeScore < 0 ||
      !Number.isInteger(awayScore) ||
      awayScore < 0
    ) {
      throw new TypeError("BCP_SCORING_SCORE_INVALID");
    }

    const isHome = Number(result.home_team_id) === normalizedTeamId;
    const isAway = Number(result.away_team_id) === normalizedTeamId;

    if (!isHome && !isAway) {
      throw new TypeError("BCP_SCORING_TEAM_NOT_IN_MATCH");
    }

    const scored = isHome ? homeScore : awayScore;
    const conceded = isHome ? awayScore : homeScore;

    goalsFor += scored;
    goalsAgainst += conceded;

    if (conceded === 0) cleanSheets += 1;
    if (scored === 0) failedToScore += 1;
  }

  const matches = finished.length;

  return Object.freeze({
    teamId: normalizedTeamId,
    sampleSize: matches,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    averageGoalsFor: matches ? goalsFor / matches : 0,
    averageGoalsAgainst: matches ? goalsAgainst / matches : 0,
    cleanSheets,
    failedToScore
  });
}

module.exports = {
  calculateScoring
};
