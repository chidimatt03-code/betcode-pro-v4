const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || "";

let pool = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
}

function requirePool() {
  if (!pool) {
    throw new Error("DATABASE_URL is required for PostgreSQL production storage.");
  }
  return pool;
}

async function query(text, params = []) {
  return requirePool().query(text, params);
}

async function get(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

async function all(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

async function run(text, params = []) {
  return query(text, params);
}

async function transaction(callback) {
  const client = await requirePool().connect();

  try {
    await client.query("BEGIN");

    const tx = {
      query: (text, params = []) => client.query(text, params),

      get: async (text, params = []) => {
        const result = await client.query(text, params);
        return result.rows[0] || null;
      },

      all: async (text, params = []) => {
        const result = await client.query(text, params);
        return result.rows;
      }
    };

    const result = await callback(tx);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function close() {
  if (pool) {
    await pool.end();
  }
}

module.exports = {
  pool,
  query,
  get,
  all,
  run,
  transaction,
  close
};
