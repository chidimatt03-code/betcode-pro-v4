const { calculateForm } = require("./formCalculator");
const { calculateHomeAwayForm } = require("./homeAwayFormCalculator");
const { calculateScoring } = require("./scoringCalculator");

function normalizeTeamId(teamId) {
  const id = Number(teamId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new TypeError("BCP_TEAM_PROFILE_TEAM_ID_INVALID");
  }

  return id;
}

function normalizeResults(results) {
  if (!Array.isArray(results)) {
    throw new TypeError("BCP_TEAM_PROFILE_RESULTS_INVALID");
  }

  return results.filter(
    result => result && result.status === "finished"
  );
}

function buildTeamProfile({
  team,
  results,
  formLimit = 5
} = {}) {
  if (!team || typeof team !== "object") {
    throw new TypeError("BCP_TEAM_PROFILE_TEAM_INVALID");
  }

  const teamId = normalizeTeamId(team.id);
  const finishedResults = normalizeResults(results);

  const teamResults = finishedResults.filter(result =>
    Number(result.home_team_id) === teamId ||
    Number(result.away_team_id) === teamId
  );

  const preparedResults = teamResults.map(result => ({
    ...result,
    team_id: teamId
  }));

  const form = calculateForm(preparedResults, {
    limit: formLimit
  });

  const homeAway = calculateHomeAwayForm(teamResults, {
    teamId,
    limit: formLimit
  });

  const scoring = calculateScoring(preparedResults, {
    teamId
  });

  const competitions = new Set();

  for (const result of teamResults) {
    if (result.competition_name) {
      competitions.add(String(result.competition_name));
    } else if (result.competition) {
      competitions.add(String(result.competition));
    }
  }

  return Object.freeze({
    team: Object.freeze({
      id: teamId,
      canonicalName: team.canonical_name || null,
      normalizedName: team.normalized_name || null,
      country: team.country || null,
      region: team.region || null,
      active: team.active === undefined ? true : Boolean(team.active)
    }),

    form,

    homeAway,

    scoring,

    profile: Object.freeze({
      matchesAnalyzed: teamResults.length,
      competitionsRepresented: competitions.size,
      competitionNames: Object.freeze([...competitions])
    }),

    dataQuality: Object.freeze({
      resultsAvailable: results.length,
      finishedResultsAvailable: finishedResults.length,
      teamResultsAvailable: teamResults.length,
      formSample: form.sampleSize,
      insufficientData: form.sampleSize === 0,
      completeTeamHistory: false
    })
  });
}

module.exports = {
  buildTeamProfile
};
