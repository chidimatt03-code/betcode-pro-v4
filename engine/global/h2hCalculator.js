function calculateH2H(results, {
  homeTeamId,
  awayTeamId,
  limit = 5
} = {}) {
  const normalizedHomeTeamId = Number(homeTeamId);
  const normalizedAwayTeamId = Number(awayTeamId);
  const normalizedLimit = Number(limit);

  if (
    !Number.isInteger(normalizedHomeTeamId) ||
    normalizedHomeTeamId <= 0 ||
    !Number.isInteger(normalizedAwayTeamId) ||
    normalizedAwayTeamId <= 0 ||
    normalizedHomeTeamId === normalizedAwayTeamId
  ) {
    throw new TypeError("BCP_H2H_TEAM_IDS_INVALID");
  }

  if (!Number.isInteger(normalizedLimit) || normalizedLimit <= 0) {
    throw new TypeError("BCP_H2H_LIMIT_INVALID");
  }

  if (!Array.isArray(results)) {
    throw new TypeError("BCP_H2H_RESULTS_INVALID");
  }

  const matches = results
    .filter(result => {
      const home = Number(result.home_team_id);
      const away = Number(result.away_team_id);

      return (
        (home === normalizedHomeTeamId &&
          away === normalizedAwayTeamId) ||
        (home === normalizedAwayTeamId &&
          away === normalizedHomeTeamId)
      );
    })
    .filter(result => result.status === "finished")
    .slice(0, normalizedLimit);

  let homeTeamWins = 0;
  let awayTeamWins = 0;
  let draws = 0;
  let homeTeamGoals = 0;
  let awayTeamGoals = 0;

  const history = [];

  for (const result of matches) {
    const home = Number(result.home_team_id);
    const away = Number(result.away_team_id);
    const homeScore = Number(result.home_score);
    const awayScore = Number(result.away_score);

    if (
      !Number.isInteger(homeScore) ||
      homeScore < 0 ||
      !Number.isInteger(awayScore) ||
      awayScore < 0
    ) {
      throw new TypeError("BCP_H2H_SCORE_INVALID");
    }

    const firstTeamScore =
      home === normalizedHomeTeamId ? homeScore : awayScore;

    const secondTeamScore =
      home === normalizedHomeTeamId ? awayScore : homeScore;

    homeTeamGoals += firstTeamScore;
    awayTeamGoals += secondTeamScore;

    let outcome;

    if (firstTeamScore > secondTeamScore) {
      outcome = "TEAM_1_WIN";
      homeTeamWins += 1;
    } else if (firstTeamScore < secondTeamScore) {
      outcome = "TEAM_2_WIN";
      awayTeamWins += 1;
    } else {
      outcome = "DRAW";
      draws += 1;
    }

    history.push(Object.freeze({
      matchId: Number(result.match_id),
      actualHomeTeamId: home,
      actualAwayTeamId: away,
      homeScore,
      awayScore,
      outcome,
      observedAt: result.observed_at
    }));
  }

  return Object.freeze({
    team1Id: normalizedHomeTeamId,
    team2Id: normalizedAwayTeamId,
    sampleSize: history.length,
    team1Wins: homeTeamWins,
    team2Wins: awayTeamWins,
    draws,
    team1Goals: homeTeamGoals,
    team2Goals: awayTeamGoals,
    history: Object.freeze(history)
  });
}

module.exports = {
  calculateH2H
};
