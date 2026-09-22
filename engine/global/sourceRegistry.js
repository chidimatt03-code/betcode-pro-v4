const { assertSourceAdapter } = require("./sourceAdapter");

function createSourceRegistry() {
  const adapters = new Map();

  return Object.freeze({
    register(adapter) {
      assertSourceAdapter(adapter);

      const code = adapter.code.trim();

      if (adapters.has(code)) {
        throw new Error("BCP_SOURCE_ADAPTER_ALREADY_REGISTERED");
      }

      adapters.set(code, adapter);

      return adapter;
    },

    get(code) {
      return adapters.get(String(code).trim()) || null;
    },

    has(code) {
      return adapters.has(String(code).trim());
    },

    list() {
      return Array.from(adapters.values());
    },

    unregister(code) {
      return adapters.delete(String(code).trim());
    }
  });
}

module.exports = {
  createSourceRegistry
};
