const {
  findEvents
} = require("./eventStore");

const {
  normalizeTeamName
} = require("./normalizer");

const {
  findBestEventMatch
} = require("./matcher");

function findBestStoredEventMatch(bookmaker, sourceEvent) {
  /*
   * The database stores bookmaker team names exactly as received.
   * Candidate retrieval therefore uses a broad lookup first, then
   * the real matcher performs normalized alias matching.
   *
   * This is necessary because:
   *   "Man Utd" -> "Manchester United"
   *   "Manchester United" -> "Manchester United"
   */

  const normalizedHome = normalizeTeamName(sourceEvent?.home);
  const normalizedAway = normalizeTeamName(sourceEvent?.away);

  let candidates = findEvents(bookmaker, {
    sport: sourceEvent?.sport,
    homeTeam: sourceEvent?.home,
    awayTeam: sourceEvent?.away
  });

  /*
   * If alias normalization changed either team name, the raw SQL
   * lookup may have excluded the correct candidate. Retry using
   * normalized names when they differ from the source names.
   */
  if (
    candidates.length === 0 &&
    (
      normalizedHome !== String(sourceEvent?.home || "").toLowerCase().trim() ||
      normalizedAway !== String(sourceEvent?.away || "").toLowerCase().trim()
    )
  ) {
    candidates = findEvents(bookmaker, {
      sport: sourceEvent?.sport,
      homeTeam: normalizedHome,
      awayTeam: normalizedAway
    });
  }

  const normalizedCandidates = candidates.map(event => ({
    id: event.id,
    bookmaker: event.bookmaker,
    externalId: event.external_id,
    sport: event.sport,
    competition: event.competition,
    home: event.home_team,
    away: event.away_team,
    startTime: event.start_time,
    status: event.status
  }));

  return findBestEventMatch(
    sourceEvent,
    normalizedCandidates
  );
}

module.exports = {
  findBestStoredEventMatch
};
