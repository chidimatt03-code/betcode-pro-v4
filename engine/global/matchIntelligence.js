const { calculateForm } =
  require("./formCalculator");

const { calculateHomeAwayForm } =
  require("./homeAwayFormCalculator");

const { calculateScoring } =
  require("./scoringCalculator");

const { calculateH2H } =
  require("./h2hCalculator");

function prepareTeamResults(results, teamId) {
  return results.map(result => ({
    ...result,
    team_id: teamId
  }));
}

function buildMatchIntelligence({
  results,
  homeTeamId,
  awayTeamId,
  formLimit = 5,
  h2hLimit = 5
} = {}) {
  const normalizedHomeTeamId = Number(homeTeamId);
  const normalizedAwayTeamId = Number(awayTeamId);

  if (
    !Number.isInteger(normalizedHomeTeamId) ||
    normalizedHomeTeamId <= 0 ||
    !Number.isInteger(normalizedAwayTeamId) ||
    normalizedAwayTeamId <= 0 ||
    normalizedHomeTeamId === normalizedAwayTeamId
  ) {
    throw new TypeError("BCP_INTELLIGENCE_TEAM_IDS_INVALID");
  }

  if (!Array.isArray(results)) {
    throw new TypeError("BCP_INTELLIGENCE_RESULTS_INVALID");
  }

  const homeTeamResults =
    prepareTeamResults(results, normalizedHomeTeamId);

  const awayTeamResults =
    prepareTeamResults(results, normalizedAwayTeamId);

  const homeForm = calculateForm(
    homeTeamResults.filter(result =>
      Number(result.home_team_id) === normalizedHomeTeamId ||
      Number(result.away_team_id) === normalizedHomeTeamId
    ),
    { limit: formLimit }
  );

  const awayForm = calculateForm(
    awayTeamResults.filter(result =>
      Number(result.home_team_id) === normalizedAwayTeamId ||
      Number(result.away_team_id) === normalizedAwayTeamId
    ),
    { limit: formLimit }
  );

  const homeAway = calculateHomeAwayForm(results, {
    teamId: normalizedHomeTeamId,
    limit: formLimit
  });

  const awayHome = calculateHomeAwayForm(results, {
    teamId: normalizedAwayTeamId,
    limit: formLimit
  });

  const homeScoring = calculateScoring(
    homeTeamResults.filter(result =>
      Number(result.home_team_id) === normalizedHomeTeamId ||
      Number(result.away_team_id) === normalizedHomeTeamId
    ),
    { teamId: normalizedHomeTeamId }
  );

  const awayScoring = calculateScoring(
    awayTeamResults.filter(result =>
      Number(result.home_team_id) === normalizedAwayTeamId ||
      Number(result.away_team_id) === normalizedAwayTeamId
    ),
    { teamId: normalizedAwayTeamId }
  );

  const h2h = calculateH2H(results, {
    homeTeamId: normalizedHomeTeamId,
    awayTeamId: normalizedAwayTeamId,
    limit: h2hLimit
  });

  const insufficientData =
    homeForm.sampleSize === 0 ||
    awayForm.sampleSize === 0;

  return Object.freeze({
    homeTeamId: normalizedHomeTeamId,
    awayTeamId: normalizedAwayTeamId,

    form: Object.freeze({
      home: homeForm,
      away: awayForm
    }),

    homeAway: Object.freeze({
      homeTeam: homeAway,
      awayTeam: awayHome
    }),

    scoring: Object.freeze({
      home: homeScoring,
      away: awayScoring
    }),

    h2h,

    dataQuality: Object.freeze({
      insufficientData,
      resultsAvailable: results.length,
      homeFormSample: homeForm.sampleSize,
      awayFormSample: awayForm.sampleSize,
      h2hSample: h2h.sampleSize
    })
  });
}

module.exports = {
  buildMatchIntelligence
};
