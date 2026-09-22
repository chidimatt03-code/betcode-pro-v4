const Database = require("better-sqlite3");
const path = require("path");

function createSqliteAdapter(dbPath = path.join(__dirname, "../../data.db")) {
  const db = new Database(dbPath);

  function prepare(sql) {
    return db.prepare(sql);
  }

  function normalizeParams(params) {
    return params.map((value) => {
      if (typeof value === "boolean") {
        return value ? 1 : 0;
      }
      return value;
    });
  }

  const adapter = {
    get(sql, params = []) {
      return prepare(sql).get(...normalizeParams(params));
    },

    all(sql, params = []) {
      return prepare(sql).all(...normalizeParams(params));
    },

    run(sql, params = []) {
      return prepare(sql).run(...normalizeParams(params));
    },

    transaction(callback) {
      const tx = db.transaction(() => callback({
        get(sql, params = []) {
          return prepare(sql).get(...params);
        },

        all(sql, params = []) {
          return prepare(sql).all(...params);
        },

        run(sql, params = []) {
          return prepare(sql).run(...params);
        }
      }));

      return tx();
    },

    close() {
      db.close();
    }
  };

  return adapter;
}

module.exports = {
  createSqliteAdapter
};
