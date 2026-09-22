function normalizeIdentityText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TEAM_ALIASES = Object.freeze({
  "man utd": "manchester united",
  "man united": "manchester united",
  "manchester utd": "manchester united",
  "manchester united fc": "manchester united",
  "arsenal fc": "arsenal",
  "chelsea fc": "chelsea",
  "tottenham hotspur": "tottenham",
  "tottenham hotspur fc": "tottenham",
  "spurs": "tottenham",
  "newcastle united": "newcastle",
  "newcastle united fc": "newcastle",
  "liverpool fc": "liverpool",
  "atl madrid": "atletico madrid"
});

function normalizeTeamIdentity(name) {
  const normalized = normalizeIdentityText(name);
  return TEAM_ALIASES[normalized] || normalized;
}

function normalizeCompetitionIdentity(name) {
  return normalizeIdentityText(name)
    .replace(/\bfootball\b/g, "")
    .replace(/\bfc\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = {
  TEAM_ALIASES,
  normalizeIdentityText,
  normalizeTeamIdentity,
  normalizeCompetitionIdentity
};
