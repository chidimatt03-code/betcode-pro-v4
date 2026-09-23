function initializeGlobalSchema(db) {
  if (!db || typeof db.run !== "function") {
    throw new TypeError("BCP_GLOBAL_SCHEMA_DATABASE_INVALID");
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS bcp_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      source_type TEXT NOT NULL,
      base_url TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_success_at TEXT,
      last_failure_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bcp_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      country TEXT,
      region TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bcp_competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      country TEXT,
      region TEXT,
      competition_type TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bcp_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team_id INTEGER NOT NULL
        REFERENCES bcp_teams(id) ON DELETE RESTRICT,
      away_team_id INTEGER NOT NULL
        REFERENCES bcp_teams(id) ON DELETE RESTRICT,
      competition_id INTEGER
        REFERENCES bcp_competitions(id) ON DELETE SET NULL,
      scheduled_start TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK(home_team_id <> away_team_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bcp_match_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL
        REFERENCES bcp_matches(id) ON DELETE CASCADE,
      source_id INTEGER NOT NULL
        REFERENCES bcp_sources(id) ON DELETE CASCADE,
      source_event_id TEXT NOT NULL,
      source_home_name TEXT,
      source_away_name TEXT,
      source_start_time TEXT,
      observed_at TEXT NOT NULL,
      status TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(source_id, source_event_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bcp_match_state_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL
        REFERENCES bcp_matches(id) ON DELETE CASCADE,
      source_id INTEGER NOT NULL
        REFERENCES bcp_sources(id) ON DELETE CASCADE,
      source_event_id TEXT NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      period INTEGER,
      clock_seconds INTEGER,
      display_clock TEXT,
      status TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(source_id, source_event_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bcp_match_states (
      match_id INTEGER PRIMARY KEY
        REFERENCES bcp_matches(id) ON DELETE CASCADE,
      home_score INTEGER,
      away_score INTEGER,
      period INTEGER,
      clock_seconds INTEGER,
      display_clock TEXT,
      status TEXT NOT NULL,
      source_id INTEGER
        REFERENCES bcp_sources(id) ON DELETE SET NULL,
      source_observed_at TEXT,
      resolved_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_teams_normalized_name
      ON bcp_teams(normalized_name)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_competitions_normalized_name
      ON bcp_competitions(normalized_name)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_matches_teams
      ON bcp_matches(home_team_id, away_team_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_matches_start
      ON bcp_matches(scheduled_start)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_matches_competition
      ON bcp_matches(competition_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_match_sources_match
      ON bcp_match_sources(match_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_match_sources_source
      ON bcp_match_sources(source_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_match_sources_observed
      ON bcp_match_sources(observed_at)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_match_state_obs_match
      ON bcp_match_state_observations(match_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_match_state_obs_source
      ON bcp_match_state_observations(source_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_match_state_obs_observed
      ON bcp_match_state_observations(observed_at)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_match_states_status
      ON bcp_match_states(status)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bcp_match_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL
        REFERENCES bcp_matches(id) ON DELETE CASCADE,
      source_id INTEGER NOT NULL
        REFERENCES bcp_sources(id) ON DELETE CASCADE,
      source_event_id TEXT NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'finished',
      observed_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(source_id, source_event_id),
      CHECK(home_score >= 0),
      CHECK(away_score >= 0)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_match_results_match
      ON bcp_match_results(match_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_match_results_source
      ON bcp_match_results(source_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_match_results_observed
      ON bcp_match_results(observed_at)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bcp_match_states_updated
      ON bcp_match_states(updated_at)
  `);

  return true;
}

module.exports = {
  initializeGlobalSchema
};
