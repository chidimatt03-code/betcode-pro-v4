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
  `);
}

module.exports = { initSchema };
