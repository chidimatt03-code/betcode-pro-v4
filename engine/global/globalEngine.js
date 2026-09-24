const path = require("path");

const { createSqliteAdapter } = require("./sqliteAdapter");
const { initializeGlobalSchema } = require("./sqliteSchema");
const { createRepository } = require("./repository");
const { createSourceRegistry } = require("./sourceRegistry");
const { registerSource } = require("./sourceRegistration");
const { runGlobalSourceIngestion } = require("./globalIngestionRunner");
const { ingestLiveStates } = require("./liveStateIngestion");
const espn = require("./espn");

function createGlobalEngine({
  dbPath = path.join(__dirname, "../../data.db"),
  dbAdapter = null,
  initializeSchema = true,
  adapters = [espn]
} = {}) {
  const db = dbAdapter || createSqliteAdapter(dbPath);

  if (initializeSchema) {
    initializeGlobalSchema(db);
  }
  const repository = createRepository(db);
  const registry = createSourceRegistry();

  async function initialize() {
    const sources = [];

    for (const adapter of adapters) {
      const source = await registerSource(
        repository,
        registry,
        adapter
      );

      sources.push(source);
    }

    return Object.freeze({
      sources: Object.freeze(sources)
    });
  }

  async function ingestSource(code, options = {}) {
    const adapter = registry.get(code);

    if (!adapter) {
      throw new Error(`BCP_GLOBAL_SOURCE_NOT_REGISTERED:${code}`);
    }

    return runGlobalSourceIngestion(
      repository,
      adapter,
      {
        ...options,
        registry
      }
    );
  }

  async function ingestAll(options = {}) {
    const results = [];

    for (const adapter of registry.list()) {
      results.push(
        await runGlobalSourceIngestion(
          repository,
          adapter,
          {
            ...options,
            registry
          }
        )
      );
    }

    return Object.freeze(results);
  }

  async function ingestLiveSource(code, options = {}) {
    const adapter = registry.get(code);

    if (!adapter) {
      throw new Error(`BCP_GLOBAL_SOURCE_NOT_REGISTERED:${code}`);
    }

    return ingestLiveStates(
      repository,
      adapter,
      registry,
      options
    );
  }

  async function ingestAllLive(options = {}) {
    const results = [];

    for (const adapter of registry.list()) {
      if (typeof adapter.fetchLiveStates !== "function") {
        continue;
      }

      results.push(
        await ingestLiveStates(
          repository,
          adapter,
          registry,
          options
        )
      );
    }

    return Object.freeze(results);
  }

  function close() {
    db.close();
  }

  return Object.freeze({
    db,
    repository,
    registry,
    initialize,
    ingestSource,
    ingestLiveSource,
    ingestAllLive,
    ingestAll,
    close
  });
}

module.exports = {
  createGlobalEngine
};
