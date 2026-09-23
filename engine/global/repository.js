const TABLES = Object.freeze({
  sources: "bcp_sources",
  teams: "bcp_teams",
  competitions: "bcp_competitions",
  matches: "bcp_matches",
  matchSources: "bcp_match_sources",
  matchResults: "bcp_match_results",
  matchStateObservations: "bcp_match_state_observations",
  matchStates: "bcp_match_states"
});

function requireAdapter(adapter) {
  if (!adapter || typeof adapter.get !== "function" || typeof adapter.all !== "function" || typeof adapter.run !== "function") {
    throw new TypeError("BCP repository requires an adapter with get(), all(), and run().");
  }

  return adapter;
}

function createRepository(adapter) {
  const db = requireAdapter(adapter);

  return Object.freeze({
    async getSourceByCode(code) {
      return db.get(
        `SELECT * FROM ${TABLES.sources} WHERE code = ? LIMIT 1`,
        [String(code)]
      );
    },

    async listSources() {
      return db.all(
        `SELECT * FROM ${TABLES.sources} ORDER BY id ASC`
      );
    },

    async createSource({
      code,
      name,
      sourceType,
      baseUrl = null,
      enabled = true,
      now = new Date().toISOString()
    }) {
      const result = await db.get(
        `INSERT INTO ${TABLES.sources}
          (code, name, source_type, base_url, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        [
          String(code),
          String(name),
          String(sourceType),
          baseUrl === null ? null : String(baseUrl),
          Boolean(enabled),
          now,
          now
        ]
      );

      return db.get(
        `SELECT * FROM ${TABLES.sources} WHERE id = ? LIMIT 1`,
        [result.id]
      );
    },

    async updateSourceHealth(
      code,
      {
        success = false,
        error = null,
        observedAt = new Date().toISOString()
      } = {}
    ) {
      if (success) {
        await db.run(
          `UPDATE ${TABLES.sources}
           SET last_success_at = ?,
               last_error = NULL,
               updated_at = ?
           WHERE code = ?`,
          [observedAt, observedAt, String(code)]
        );
      } else {
        await db.run(
          `UPDATE ${TABLES.sources}
           SET last_failure_at = ?,
               last_error = ?,
               updated_at = ?
           WHERE code = ?`,
          [
            observedAt,
            error === null ? null : String(error),
            observedAt,
            String(code)
          ]
        );
      }

      return db.get(
        `SELECT * FROM ${TABLES.sources} WHERE code = ? LIMIT 1`,
        [String(code)]
      );
    },

    async getTeamById(id) {
      return db.get(
        `SELECT * FROM ${TABLES.teams} WHERE id = ? LIMIT 1`,
        [id]
      );
    },

    async findTeamByNormalizedName(normalizedName) {
      return db.get(
        `SELECT * FROM ${TABLES.teams}
         WHERE normalized_name = ?
         ORDER BY id ASC
         LIMIT 1`,
        [String(normalizedName)]
      );
    },

    async createTeam({
      canonicalName,
      normalizedName,
      country = null,
      region = null,
      active = true,
      now = new Date().toISOString()
    }) {
      const result = await db.get(
        `INSERT INTO ${TABLES.teams}
          (canonical_name, normalized_name, country, region, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        [
          String(canonicalName),
          String(normalizedName),
          country === null ? null : String(country),
          region === null ? null : String(region),
          Boolean(active),
          now,
          now
        ]
      );

      return db.get(
        `SELECT * FROM ${TABLES.teams} WHERE id = ? LIMIT 1`,
        [result.id]
      );
    },

    async getCompetitionById(id) {
      return db.get(
        `SELECT * FROM ${TABLES.competitions} WHERE id = ? LIMIT 1`,
        [id]
      );
    },

    async findCompetitionByNormalizedName(normalizedName) {
      return db.get(
        `SELECT * FROM ${TABLES.competitions}
         WHERE normalized_name = ?
         ORDER BY id ASC
         LIMIT 1`,
        [String(normalizedName)]
      );
    },

    async createCompetition({
      canonicalName,
      normalizedName,
      country = null,
      region = null,
      competitionType = null,
      active = true,
      now = new Date().toISOString()
    }) {
      const result = await db.get(
        `INSERT INTO ${TABLES.competitions}
          (canonical_name, normalized_name, country, region, competition_type, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        [
          String(canonicalName),
          String(normalizedName),
          country === null ? null : String(country),
          region === null ? null : String(region),
          competitionType === null ? null : String(competitionType),
          Boolean(active),
          now,
          now
        ]
      );

      return db.get(
        `SELECT * FROM ${TABLES.competitions} WHERE id = ? LIMIT 1`,
        [result.id]
      );
    },

    async getMatchById(id) {
      return db.get(
        `SELECT * FROM ${TABLES.matches} WHERE id = ? LIMIT 1`,
        [id]
      );
    },

    async findMatchByTeamsAndStart({
      homeTeamId,
      awayTeamId,
      scheduledStart
    }) {
      if (!scheduledStart) {
        return null;
      }

      return db.get(
        `SELECT * FROM ${TABLES.matches}
         WHERE home_team_id = ?
           AND away_team_id = ?
           AND scheduled_start = ?
         LIMIT 1`,
        [
          homeTeamId,
          awayTeamId,
          scheduledStart
        ]
      );
    },

    async createMatch({
      homeTeamId,
      awayTeamId,
      competitionId = null,
      scheduledStart = null,
      status = "scheduled",
      now = new Date().toISOString()
    }) {
      if (homeTeamId === awayTeamId) {
        throw new Error("BCP_MATCH_TEAMS_MUST_DIFFER");
      }

      const result = await db.get(
        `INSERT INTO ${TABLES.matches}
          (home_team_id, away_team_id, competition_id, scheduled_start, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        [
          homeTeamId,
          awayTeamId,
          competitionId,
          scheduledStart,
          String(status),
          now,
          now
        ]
      );

      return db.get(
        `SELECT * FROM ${TABLES.matches} WHERE id = ? LIMIT 1`,
        [result.id]
      );
    },

    async createMatchSource({
      matchId,
      sourceId,
      sourceEventId,
      sourceHomeName = null,
      sourceAwayName = null,
      sourceStartTime = null,
      observedAt = new Date().toISOString(),
      status = null,
      now = new Date().toISOString()
    }) {
      const result = await db.get(
        `INSERT INTO ${TABLES.matchSources}
          (match_id, source_id, source_event_id,
           source_home_name, source_away_name, source_start_time,
           observed_at, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        [
          matchId,
          sourceId,
          String(sourceEventId),
          sourceHomeName,
          sourceAwayName,
          sourceStartTime,
          observedAt,
          status,
          now,
          now
        ]
      );

      return db.get(
        `SELECT * FROM ${TABLES.matchSources} WHERE id = ? LIMIT 1`,
        [result.id]
      );
    },

    async findMatchSources(matchId) {
      return db.all(
        `SELECT * FROM ${TABLES.matchSources}
         WHERE match_id = ?
         ORDER BY observed_at DESC, id DESC`,
        [matchId]
      );
    },

    async findMatchSource(sourceId, sourceEventId) {
      return db.get(
        `SELECT * FROM ${TABLES.matchSources}
         WHERE source_id = ? AND source_event_id = ?
         LIMIT 1`,
        [sourceId, String(sourceEventId)]
      );
    },

    async updateMatchSource(id, {
      matchId,
      sourceHomeName = null,
      sourceAwayName = null,
      sourceStartTime = null,
      observedAt,
      status = null,
      now = new Date().toISOString()
    }) {
      return db.get(
        `UPDATE ${TABLES.matchSources}
         SET
           match_id = ?,
           source_home_name = ?,
           source_away_name = ?,
           source_start_time = ?,
           observed_at = ?,
           status = ?,
           updated_at = ?
         WHERE id = ?
         RETURNING *`,
        [
          matchId,
          sourceHomeName,
          sourceAwayName,
          sourceStartTime,
          observedAt,
          status,
          now,
          id
        ]
      );
    },

    async createMatchResult({
      matchId,
      sourceId,
      sourceEventId,
      homeScore,
      awayScore,
      status = "finished",
      observedAt,
      now = new Date().toISOString()
    }) {
      const result = await db.get(
        `INSERT INTO ${TABLES.matchResults}
          (match_id, source_id, source_event_id,
           home_score, away_score, status,
           observed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
        [
          matchId,
          sourceId,
          String(sourceEventId),
          homeScore,
          awayScore,
          status,
          observedAt,
          now,
          now
        ]
      );

      return db.get(
        `SELECT * FROM ${TABLES.matchResults} WHERE id = ? LIMIT 1`,
        [result.id]
      );
    },

    async findMatchResult(sourceId, sourceEventId) {
      return db.get(
        `SELECT * FROM ${TABLES.matchResults}
         WHERE source_id = ? AND source_event_id = ?
         LIMIT 1`,
        [sourceId, String(sourceEventId)]
      );
    },

    async findMatchResults(matchId) {
      return db.all(
        `SELECT * FROM ${TABLES.matchResults}
         WHERE match_id = ?
         ORDER BY observed_at DESC, id DESC`,
        [matchId]
      );
    },

    async findTeamMatchResults(teamId, { limit = 20 } = {}) {
      const normalizedTeamId = Number(teamId);
      const normalizedLimit = Number(limit);

      if (!Number.isInteger(normalizedTeamId) || normalizedTeamId <= 0) {
        throw new TypeError("BCP_TEAM_RESULT_TEAM_ID_INVALID");
      }

      if (!Number.isInteger(normalizedLimit) || normalizedLimit <= 0) {
        throw new TypeError("BCP_TEAM_RESULT_LIMIT_INVALID");
      }

      return db.all(
        `SELECT
           r.*,
           m.home_team_id,
           m.away_team_id,
           m.competition_id,
           m.scheduled_start,
           ht.canonical_name AS home_team_name,
           at.canonical_name AS away_team_name,
           c.canonical_name AS competition_name
         FROM ${TABLES.matchResults} r
         JOIN ${TABLES.matches} m ON m.id = r.match_id
         JOIN ${TABLES.teams} ht ON ht.id = m.home_team_id
         JOIN ${TABLES.teams} at ON at.id = m.away_team_id
         LEFT JOIN ${TABLES.competitions} c ON c.id = m.competition_id
         WHERE r.status = 'finished'
           AND (m.home_team_id = ? OR m.away_team_id = ?)
         ORDER BY
           COALESCE(r.observed_at, m.scheduled_start) DESC,
           r.id DESC
         LIMIT ?`,
        [normalizedTeamId, normalizedTeamId, normalizedLimit]
      );
    },

    async updateMatchResult(id, {
      matchId,
      sourceId,
      sourceEventId,
      homeScore,
      awayScore,
      status = "finished",
      observedAt,
      now = new Date().toISOString()
    }) {
      await db.run(
        `UPDATE ${TABLES.matchResults}
         SET match_id = ?,
             source_id = ?,
             source_event_id = ?,
             home_score = ?,
             away_score = ?,
             status = ?,
             observed_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          matchId,
          sourceId,
          String(sourceEventId),
          homeScore,
          awayScore,
          status,
          observedAt,
          now,
          id
        ]
      );

      return db.get(
        `SELECT * FROM ${TABLES.matchResults} WHERE id = ? LIMIT 1`,
        [id]
      );
    },

    async createMatchStateObservation({
      matchId,
      sourceId,
      sourceEventId,
      homeScore = null,
      awayScore = null,
      period = null,
      clockSeconds = null,
      displayClock = null,
      status,
      observedAt = new Date().toISOString(),
      now = new Date().toISOString()
    }) {
      const result = await db.get(
        `INSERT INTO ${TABLES.matchStateObservations}
          (match_id, source_id, source_event_id,
           home_score, away_score, period, clock_seconds,
           display_clock, status, observed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        [
          matchId,
          sourceId,
          String(sourceEventId),
          homeScore,
          awayScore,
          period,
          clockSeconds,
          displayClock,
          String(status),
          observedAt,
          now,
          now
        ]
      );

      return db.get(
        `SELECT * FROM ${TABLES.matchStateObservations} WHERE id = ? LIMIT 1`,
        [result.id]
      );
    },

    async findMatchStateObservation(sourceId, sourceEventId) {
      return db.get(
        `SELECT * FROM ${TABLES.matchStateObservations}
         WHERE source_id = ? AND source_event_id = ?
         LIMIT 1`,
        [sourceId, String(sourceEventId)]
      );
    },

    async findMatchStateObservations(matchId) {
      return db.all(
        `SELECT * FROM ${TABLES.matchStateObservations}
         WHERE match_id = ?
         ORDER BY observed_at DESC, id DESC`,
        [matchId]
      );
    },

    async updateMatchStateObservation(id, {
      matchId,
      sourceId,
      sourceEventId,
      homeScore = null,
      awayScore = null,
      period = null,
      clockSeconds = null,
      displayClock = null,
      status,
      observedAt,
      now = new Date().toISOString()
    }) {
      return db.get(
        `UPDATE ${TABLES.matchStateObservations}
         SET
           match_id = ?,
           source_id = ?,
           source_event_id = ?,
           home_score = ?,
           away_score = ?,
           period = ?,
           clock_seconds = ?,
           display_clock = ?,
           status = ?,
           observed_at = ?,
           updated_at = ?
         WHERE id = ?
         RETURNING *`,
        [
          matchId,
          sourceId,
          String(sourceEventId),
          homeScore,
          awayScore,
          period,
          clockSeconds,
          displayClock,
          String(status),
          observedAt,
          now,
          id
        ]
      );
    },

    async getMatchState(matchId) {
      return db.get(
        `SELECT * FROM ${TABLES.matchStates}
         WHERE match_id = ?
         LIMIT 1`,
        [matchId]
      );
    },

    async upsertMatchState({
      matchId,
      homeScore = null,
      awayScore = null,
      period = null,
      clockSeconds = null,
      displayClock = null,
      status,
      sourceId = null,
      sourceObservedAt = null,
      resolvedAt = new Date().toISOString(),
      updatedAt = new Date().toISOString()
    }) {
      const existing = await db.get(
        `SELECT match_id FROM ${TABLES.matchStates}
         WHERE match_id = ?
         LIMIT 1`,
        [matchId]
      );

      if (existing) {
        return db.get(
          `UPDATE ${TABLES.matchStates}
           SET
             home_score = ?,
             away_score = ?,
             period = ?,
             clock_seconds = ?,
             display_clock = ?,
             status = ?,
             source_id = ?,
             source_observed_at = ?,
             resolved_at = ?,
             updated_at = ?
           WHERE match_id = ?
           RETURNING *`,
          [
            homeScore,
            awayScore,
            period,
            clockSeconds,
            displayClock,
            String(status),
            sourceId,
            sourceObservedAt,
            resolvedAt,
            updatedAt,
            matchId
          ]
        );
      }

      return db.get(
        `INSERT INTO ${TABLES.matchStates}
          (match_id, home_score, away_score, period, clock_seconds,
           display_clock, status, source_id, source_observed_at,
           resolved_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        [
          matchId,
          homeScore,
          awayScore,
          period,
          clockSeconds,
          displayClock,
          String(status),
          sourceId,
          sourceObservedAt,
          resolvedAt,
          updatedAt
        ]
      );
    }

  });
}

module.exports = {
  TABLES,
  createRepository
};
