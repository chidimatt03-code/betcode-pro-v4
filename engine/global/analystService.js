const { buildMatchIntelligence } =
  require("./matchIntelligence");

const { getTeamProfile } =
  require("./teamProfileService");

const { analyzeBetDNA } =
  require("./betDNA");

const { analyzeMarketDNA } =
  require("./marketDNA");

const { buildMatchAnalyst } =
  require("./aiAnalyst");

function requireRepository(repository) {
  if (
    !repository ||
    typeof repository.getTeamById !== "function" ||
    typeof repository.findTeamMatchResults !== "function" ||
    typeof repository.findTeamUpcomingMatches !== "function"
  ) {
    throw new TypeError("BCP_ANALYST_SERVICE_REPOSITORY_INVALID");
  }

  return repository;
}

function normalizeTeamId(value, code) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new TypeError(code);
  }

  return id;
}

function normalizeResults(results) {
  if (!Array.isArray(results)) {
    throw new TypeError("BCP_ANALYST_SERVICE_RESULTS_INVALID");
  }

  const seen = new Set();

  return results.filter(result => {
    const matchId = Number(result?.match_id);

    if (!Number.isInteger(matchId) || matchId <= 0) {
      return false;
    }

    if (seen.has(matchId)) {
      return false;
    }

    seen.add(matchId);
    return true;
  });
}

async function buildMatchAnalystService(
  repository,
  {
    homeTeamId,
    awayTeamId,
    betModel = null,
    formLimit = 5,
    h2hLimit = 5,
    resultLimit = 20,
    upcomingLimit = 10
  } = {}
) {
  const db = requireRepository(repository);

  const normalizedHomeTeamId = normalizeTeamId(
    homeTeamId,
    "BCP_ANALYST_SERVICE_HOME_TEAM_ID_INVALID"
  );

  const normalizedAwayTeamId = normalizeTeamId(
    awayTeamId,
    "BCP_ANALYST_SERVICE_AWAY_TEAM_ID_INVALID"
  );

  if (normalizedHomeTeamId === normalizedAwayTeamId) {
    throw new TypeError("BCP_ANALYST_SERVICE_TEAM_IDS_INVALID");
  }

  const homeTeam = await db.getTeamById(normalizedHomeTeamId);
  const awayTeam = await db.getTeamById(normalizedAwayTeamId);

  if (!homeTeam) {
    throw new Error("BCP_ANALYST_SERVICE_HOME_TEAM_NOT_FOUND");
  }

  if (!awayTeam) {
    throw new Error("BCP_ANALYST_SERVICE_AWAY_TEAM_NOT_FOUND");
  }

  const homeResults = await db.findTeamMatchResults(
    normalizedHomeTeamId,
    { limit: resultLimit }
  );

  const awayResults = await db.findTeamMatchResults(
    normalizedAwayTeamId,
    { limit: resultLimit }
  );

  const combinedResults = normalizeResults([
    ...homeResults,
    ...awayResults
  ]);

  const intelligence = buildMatchIntelligence({
    results: combinedResults,
    homeTeamId: normalizedHomeTeamId,
    awayTeamId: normalizedAwayTeamId,
    formLimit,
    h2hLimit
  });

  const homeTeamProfile = await getTeamProfile(
    db,
    normalizedHomeTeamId,
    {
      formLimit,
      h2hLimit,
      resultLimit,
      upcomingLimit,
      opponentTeamId: normalizedAwayTeamId
    }
  );

  const awayTeamProfile = await getTeamProfile(
    db,
    normalizedAwayTeamId,
    {
      formLimit,
      h2hLimit,
      resultLimit,
      upcomingLimit,
      opponentTeamId: normalizedHomeTeamId
    }
  );

  let betDNA = null;
  let marketDNA = null;

  if (betModel !== null) {
    betDNA = analyzeBetDNA(betModel);
    marketDNA = analyzeMarketDNA(betModel);
  }

  const analyst = buildMatchAnalyst({
    intelligence,
    homeTeamName: homeTeam.canonical_name,
    awayTeamName: awayTeam.canonical_name,
    homeTeamProfile,
    awayTeamProfile,
    betDNA,
    marketDNA
  });

  return Object.freeze({
    analyst,
    intelligence,
    homeTeamProfile,
    awayTeamProfile,
    betDNA,
    marketDNA,
    evidenceSource: Object.freeze({
      verifiedDatabaseResults: combinedResults.length,
      homeTeamId: normalizedHomeTeamId,
      awayTeamId: normalizedAwayTeamId
    })
  });
}

module.exports = {
  buildMatchAnalystService
};
