const {
  normalizeTeamIdentity,
  normalizeCompetitionIdentity
} = require("./identity");

function requireRepository(repository) {
  if (
    !repository ||
    typeof repository.findTeamByNormalizedName !== "function" ||
    typeof repository.createTeam !== "function" ||
    typeof repository.findCompetitionByNormalizedName !== "function" ||
    typeof repository.createCompetition !== "function"
  ) {
    throw new TypeError("BCP_IDENTITY_REPOSITORY_INVALID");
  }

  return repository;
}

async function resolveTeam(repository, {
  name,
  country = null,
  region = null,
  now
}) {
  const db = requireRepository(repository);
  const canonicalName = String(name || "").trim();
  const normalizedName = normalizeTeamIdentity(canonicalName);

  if (!normalizedName) {
    throw new TypeError("BCP_TEAM_IDENTITY_NAME_INVALID");
  }

  const existing = await db.findTeamByNormalizedName(normalizedName);

  if (existing) {
    return existing;
  }

  return db.createTeam({
    canonicalName,
    normalizedName,
    country,
    region,
    now
  });
}

async function resolveCompetition(repository, {
  name,
  country = null,
  region = null,
  competitionType = null,
  now
}) {
  const db = requireRepository(repository);
  const canonicalName = String(name || "").trim();
  const normalizedName = normalizeCompetitionIdentity(canonicalName);

  if (!normalizedName) {
    throw new TypeError("BCP_COMPETITION_IDENTITY_NAME_INVALID");
  }

  const existing = await db.findCompetitionByNormalizedName(normalizedName);

  if (existing) {
    return existing;
  }

  return db.createCompetition({
    canonicalName,
    normalizedName,
    country,
    region,
    competitionType,
    now
  });
}

module.exports = {
  resolveTeam,
  resolveCompetition
};
