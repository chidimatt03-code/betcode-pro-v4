const productionDb = require("../../.production/db");

function convertPlaceholders(sql) {
  let index = 0;
  return String(sql).replace(/\?/g, () => `$${++index}`);
}

function createPostgresAdapter() {
  const adapter = {
    async get(sql, params = []) {
      return productionDb.get(convertPlaceholders(sql), params);
    },

    async all(sql, params = []) {
      return productionDb.all(convertPlaceholders(sql), params);
    },

    async run(sql, params = []) {
      return productionDb.run(convertPlaceholders(sql), params);
    },

    async transaction(callback) {
      return productionDb.transaction(async (tx) => {
        return callback({
          async get(sql, params = []) {
            return tx.get(convertPlaceholders(sql), params);
          },

          async all(sql, params = []) {
            return tx.all(convertPlaceholders(sql), params);
          },

          async run(sql, params = []) {
            return tx.query(convertPlaceholders(sql), params);
          }
        });
      });
    },

    async close() {
      await productionDb.close();
    }
  };

  return adapter;
}

module.exports = {
  createPostgresAdapter
};
