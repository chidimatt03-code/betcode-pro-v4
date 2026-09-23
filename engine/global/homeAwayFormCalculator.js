const { calculateForm } = require("./formCalculator");

function calculateHomeAwayForm(results, {
  teamId,
  limit = 5
} = {}) {
  const normalizedTeamId = Number(teamId);

  if (!Number.isInteger(normalizedTeamId) || normalizedTeamId <= 0) {
    throw new TypeError("BCP_HOME_AWAY_TEAM_ID_INVALID");
  }

  if (!Array.isArray(results)) {
    throw new TypeError("BCP_HOME_AWAY_RESULTS_INVALID");
  }

  const homeResults = results
    .filter(result => Number(result.home_team_id) === normalizedTeamId);

  const awayResults = results
    .filter(result => Number(result.away_team_id) === normalizedTeamId);

  return Object.freeze({
    teamId: normalizedTeamId,
    home: calculateForm(
      homeResults.map(result => ({
        ...result,
        team_id: normalizedTeamId
      })),
      { limit }
    ),
    away: calculateForm(
      awayResults.map(result => ({
        ...result,
        team_id: normalizedTeamId
      })),
      { limit }
    )
  });
}

module.exports = {
  calculateHomeAwayForm
};
