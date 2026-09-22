const { runSourceAdapter } = require("./sourceRunner");
const { ingestAndPersistSource } = require("./eventIngestion");

async function runGlobalSourceIngestion(
  repository,
  adapter,
  options = {}
) {
  if (
    !repository ||
    typeof repository.getSourceByCode !== "function" ||
    typeof repository.updateSourceHealth !== "function"
  ) {
    throw new TypeError("BCP_GLOBAL_INGESTION_REPOSITORY_INVALID");
  }

  if (
    !adapter ||
    typeof adapter.fetchMatches !== "function"
  ) {
    throw new TypeError("BCP_GLOBAL_INGESTION_ADAPTER_INVALID");
  }

  const registry = options.registry;

  if (
    !registry ||
    typeof registry.has !== "function" ||
    typeof registry.get !== "function"
  ) {
    throw new TypeError("BCP_GLOBAL_INGESTION_REGISTRY_INVALID");
  }

  if (!registry.has(adapter.code)) {
    throw new Error("BCP_GLOBAL_INGESTION_ADAPTER_NOT_REGISTERED");
  }

  const registeredAdapter = registry.get(adapter.code);

  if (registeredAdapter !== adapter) {
    throw new Error("BCP_GLOBAL_INGESTION_ADAPTER_MISMATCH");
  }

  const source = await repository.getSourceByCode(adapter.code);

  if (!source) {
    throw new Error("BCP_GLOBAL_INGESTION_SOURCE_NOT_REGISTERED");
  }

  if (!source.enabled) {
    throw new Error("BCP_GLOBAL_INGESTION_SOURCE_DISABLED");
  }

  const observedAt =
    options.observedAt || new Date().toISOString();

  const run = await runSourceAdapter(
    repository,
    {
      ...adapter,
      async fetchMatches(fetchOptions) {
        return ingestAndPersistSource(
          repository,
          adapter,
          fetchOptions
        ).then((result) => result.events);
      }
    },
    {
      ...options,
      observedAt
    }
  );

  return Object.freeze({
    sourceCode: adapter.code,
    success: run.success,
    result: run.result,
    observedAt
  });
}

module.exports = {
  runGlobalSourceIngestion
};
