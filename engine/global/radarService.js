const { buildMatchIntelligence } = require("./matchIntelligence");
const { buildMatchRadar } = require("./matchRadar");

const TEST_SOURCE_CODES = new Set([
  "bcp_test_e2e_source"
]);

function requireRepository(repository) {
  if (!repository || typeof repository.findRadarCandidates !== "function") {
    throw new TypeError("BCP_RADAR_REPOSITORY_REQUIRED");
  }
}

function requirePositiveInteger(value, code) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new TypeError(code);
  }
  return normalized;
}

async function loadTeamResults(repository, teamId, limit) {
  return repository.findTeamMatchResults(teamId, { limit });
}

async function loadMatchSources(repository, matchId) {
  if (typeof repository.findMatchSources !== "function") {
    return [];
  }
  return repository.findMatchSources(matchId);
}

function hasTestSource(sources) {
  return sources.some((source) =>
    TEST_SOURCE_CODES.has(
      String(source.source_code || source.code || "")
    )
  );
}

function latestObservation(sources) {
  return sources.reduce((latest, source) => {
    const value = source.observed_at || source.observedAt || null;
    if (!value) return latest;
    if (!latest) return value;

    const currentTime = Date.parse(value);
    const latestTime = Date.parse(latest);

    if (!Number.isFinite(currentTime)) return latest;
    if (!Number.isFinite(latestTime)) return value;

    return currentTime > latestTime ? value : latest;
  }, null);
}

async function buildRadarCandidate(
  repository,
  candidate,
  {
    resultLimit = 20,
    now = new Date().toISOString()
  } = {}
) {
  const homeTeamId = requirePositiveInteger(
    candidate.home_team_id,
    "BCP_RADAR_HOME_TEAM_ID_INVALID"
  );

  const awayTeamId = requirePositiveInteger(
    candidate.away_team_id,
    "BCP_RADAR_AWAY_TEAM_ID_INVALID"
  );

  if (homeTeamId === awayTeamId) {
    throw new Error("BCP_RADAR_TEAMS_MUST_DIFFER");
  }

  const sources = await loadMatchSources(repository, candidate.id);

  if (hasTestSource(sources)) {
    return null;
  }

  const [homeResults, awayResults] = await Promise.all([
    loadTeamResults(repository, homeTeamId, resultLimit),
    loadTeamResults(repository, awayTeamId, resultLimit)
  ]);

  const intelligence = buildMatchIntelligence({
    results: [...homeResults, ...awayResults],
    homeTeamId,
    awayTeamId
  });

  const observedAt =
    latestObservation(sources) ||
    candidate.updated_at ||
    candidate.updatedAt ||
    null;

  const radar = buildMatchRadar({
    intelligence,
    observedAt,
    now
  });

  return {
    match: {
      id: candidate.id,
      homeTeamId,
      awayTeamId,
      homeTeamName: candidate.home_team_name,
      awayTeamName: candidate.away_team_name,
      competitionName: candidate.competition_name || null,
      scheduledStart: candidate.scheduled_start || null,
      status: candidate.status
    },
    radar,
    evidence: {
      sourceCount: sources.length,
      latestObservedAt: observedAt,
      homeResults: homeResults.length,
      awayResults: awayResults.length
    }
  };
}

async function getRadar(
  repository,
  {
    candidateLimit = 50,
    resultLimit = 20,
    now = new Date().toISOString()
  } = {}
) {
  requireRepository(repository);

  const normalizedCandidateLimit =
    requirePositiveInteger(candidateLimit, "BCP_RADAR_CANDIDATE_LIMIT_INVALID");

  const normalizedResultLimit =
    requirePositiveInteger(resultLimit, "BCP_RADAR_RESULT_LIMIT_INVALID");

  const candidates = await repository.findRadarCandidates({
    limit: normalizedCandidateLimit
  });

  const radar = [];

  for (const candidate of candidates) {
    const item = await buildRadarCandidate(repository, candidate, {
      resultLimit: normalizedResultLimit,
      now
    });

    if (item) {
      radar.push(item);
    }
  }

  return {
    radarVersion: 1,
    generatedAt: now,
    count: radar.length,
    items: radar,
    integrity: {
      evidenceBacked: true,
      predictionClaim: false,
      fabricatedData: false,
      testDataExcluded: true
    }
  };
}

module.exports = {
  getRadar,
  buildRadarCandidate
};
