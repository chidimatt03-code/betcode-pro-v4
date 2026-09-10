function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTeamName(name) {
  let value = normalizeText(name);

  const aliases = {
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

    "liverpool fc": "liverpool"
  };

  return aliases[value] || value;
}

function normalizeCompetitionName(name) {
  return normalizeText(name)
    .replace(/\bfc\b/g, "")
    .replace(/\bfootball\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEvent(event = {}) {
  return {
    id: event.id || null,
    home: normalizeTeamName(event.home),
    away: normalizeTeamName(event.away),
    competition: normalizeCompetitionName(event.competition),
    startTime: event.startTime || null
  };
}

module.exports = {
  normalizeText,
  normalizeTeamName,
  normalizeCompetitionName,
  normalizeEvent
};
