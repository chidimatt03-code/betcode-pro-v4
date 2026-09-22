const db = require("./db");

async function initSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT,
      phone TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      credits INTEGER NOT NULL DEFAULT 10,
      created_at TEXT NOT NULL,
      reset_token TEXT,
      reset_expires TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_sent_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_email_verifications_email
      ON email_verifications(email);

    CREATE TABLE IF NOT EXISTS conversions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      original_code TEXT,
      converted_code TEXT,
      from_bookie TEXT,
      to_bookie TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_hash TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id
      ON sessions(user_id);

    CREATE INDEX IF NOT EXISTS idx_conversions_user_id
      ON conversions(user_id);

    CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
      ON api_keys(user_id);

    CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email);

    CREATE INDEX IF NOT EXISTS idx_users_reset_token
      ON users(reset_token);

    CREATE TABLE IF NOT EXISTS bcp_sources (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      source_type TEXT NOT NULL,
      base_url TEXT,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      last_success_at TEXT,
      last_failure_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bcp_teams (
      id BIGSERIAL PRIMARY KEY,
      canonical_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      country TEXT,
      region TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bcp_competitions (
      id BIGSERIAL PRIMARY KEY,
      canonical_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      country TEXT,
      region TEXT,
      competition_type TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bcp_matches (
      id BIGSERIAL PRIMARY KEY,
      home_team_id BIGINT NOT NULL
        REFERENCES bcp_teams(id)
        ON DELETE RESTRICT,
      away_team_id BIGINT NOT NULL
        REFERENCES bcp_teams(id)
        ON DELETE RESTRICT,
      competition_id BIGINT
        REFERENCES bcp_competitions(id)
        ON DELETE SET NULL,
      scheduled_start TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK(home_team_id <> away_team_id)
    );

    CREATE TABLE IF NOT EXISTS bcp_match_sources (
      id BIGSERIAL PRIMARY KEY,
      match_id BIGINT NOT NULL
        REFERENCES bcp_matches(id)
        ON DELETE CASCADE,
      source_id BIGINT NOT NULL
        REFERENCES bcp_sources(id)
        ON DELETE CASCADE,
      source_event_id TEXT NOT NULL,
      source_home_name TEXT,
      source_away_name TEXT,
      source_start_time TEXT,
      observed_at TEXT NOT NULL,
      status TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(source_id, source_event_id)
    );

    CREATE INDEX IF NOT EXISTS idx_bcp_teams_normalized_name
      ON bcp_teams(normalized_name);

    CREATE INDEX IF NOT EXISTS idx_bcp_competitions_normalized_name
      ON bcp_competitions(normalized_name);

    CREATE INDEX IF NOT EXISTS idx_bcp_matches_teams
      ON bcp_matches(home_team_id, away_team_id);

    CREATE INDEX IF NOT EXISTS idx_bcp_matches_start
      ON bcp_matches(scheduled_start);

    CREATE INDEX IF NOT EXISTS idx_bcp_matches_competition
      ON bcp_matches(competition_id);

    CREATE INDEX IF NOT EXISTS idx_bcp_match_sources_match
      ON bcp_match_sources(match_id);

    CREATE INDEX IF NOT EXISTS idx_bcp_match_sources_source
      ON bcp_match_sources(source_id);

    CREATE INDEX IF NOT EXISTS idx_bcp_match_sources_observed
      ON bcp_match_sources(observed_at);


    CREATE TABLE IF NOT EXISTS bcp_match_state_observations (
      id BIGSERIAL PRIMARY KEY,
      match_id BIGINT NOT NULL
        REFERENCES bcp_matches(id)
        ON DELETE CASCADE,
      source_id BIGINT NOT NULL
        REFERENCES bcp_sources(id)
        ON DELETE CASCADE,
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
    );

    CREATE TABLE IF NOT EXISTS bcp_match_states (
      match_id BIGINT PRIMARY KEY
        REFERENCES bcp_matches(id)
        ON DELETE CASCADE,
      home_score INTEGER,
      away_score INTEGER,
      period INTEGER,
      clock_seconds INTEGER,
      display_clock TEXT,
      status TEXT NOT NULL,
      source_id BIGINT
        REFERENCES bcp_sources(id)
        ON DELETE SET NULL,
      source_observed_at TEXT,
      resolved_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bcp_match_state_obs_match
      ON bcp_match_state_observations(match_id);

    CREATE INDEX IF NOT EXISTS idx_bcp_match_state_obs_source
      ON bcp_match_state_observations(source_id);

    CREATE INDEX IF NOT EXISTS idx_bcp_match_state_obs_observed
      ON bcp_match_state_observations(observed_at);

    CREATE INDEX IF NOT EXISTS idx_bcp_match_states_status
      ON bcp_match_states(status);

    CREATE INDEX IF NOT EXISTS idx_bcp_match_states_updated
      ON bcp_match_states(updated_at);
  `);
}

module.exports = { initSchema };
