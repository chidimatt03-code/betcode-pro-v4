const { resolveTeam, resolveCompetition } = require("./identityResolver");
const { resolveMatch } = require("./matchResolver");
const { resolveMatchObservation } = require("./matchObservationResolver");

async function requireRepository(repository) {
  if (
    !repository ||
    typeof repository.getSourceByCode !== "function" ||
    typeof repository.findTeamByNormalizedName !== "function" ||
    typeof repository.createTeam !== "function" ||
    typeof repository.findCompetitionByNormalizedName !== "function" ||
    typeof repository.createCompetition !== "function" ||
    typeof repository.createMatch !== "function" ||
    typeof repository.findMatchSource !== "function" ||
    typeof repository.createMatchSource !== "function"
  ) {
    throw new TypeError("BCP_EVENT_PERSISTENCE_REPOSITORY_INVALID");
  }

  return repository;
}

async function persistCanonicalEvent(repository, event, {
  country = null,
  region = null,
  competitionType = null,
  now = new Date().toISOString()
} = {}) {
  const db = await requireRepository(repository);

  const source = await db.getSourceByCode(event.sourceCode);

  if (!source) {
    throw new Error("BCP_EVENT_PERSISTENCE_SOURCE_NOT_FOUND");
  }

  const homeTeam = await resolveTeam(db, {
    name: event.homeTeamName,
    country,
    region,
    now
  });

  const awayTeam = await resolveTeam(db, {
    name: event.awayTeamName,
    country,
    region,
    now
  });

  const competition = await resolveCompetition(db, {
    name: event.competitionName,
    country,
    region,
    competitionType,
    now
  });

  const match = await resolveMatch(db, {
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    competitionId: competition.id,
    scheduledStart: event.scheduledStart,
    status: event.status,
    now
  });

  const observation = await resolveMatchObservation(db, {
    matchId: match.id,
    sourceId: source.id,
    sourceEventId: event.sourceEventId,
    sourceHomeName: event.homeTeamName,
    sourceAwayName: event.awayTeamName,
    sourceStartTime: event.scheduledStart,
    observedAt: event.observedAt,
    status: event.status,
    now
  });

  return Object.freeze({
    source,
    homeTeam,
    awayTeam,
    competition,
    match,
    observation
  });
}

module.exports = {
  persistCanonicalEvent
};
