const { assertSourceAdapter } = require("./sourceAdapter");

async function registerSource(repository, registry, adapter, {
  baseUrl = null,
  enabled = true,
  now = new Date().toISOString()
} = {}) {
  if (
    !repository ||
    typeof repository.getSourceByCode !== "function" ||
    typeof repository.createSource !== "function"
  ) {
    throw new TypeError("BCP_SOURCE_REGISTRATION_REPOSITORY_INVALID");
  }

  if (
    !registry ||
    typeof registry.register !== "function"
  ) {
    throw new TypeError("BCP_SOURCE_REGISTRATION_REGISTRY_INVALID");
  }

  assertSourceAdapter(adapter);

  const sourcePriority =
    adapter.priority === undefined || adapter.priority === null
      ? 0
      : Number(adapter.priority);


  const existing = await repository.getSourceByCode(
    adapter.code.trim()
  );

  if (existing) {
    if (registry.has(adapter.code)) {
      const registeredAdapter = registry.get(adapter.code);

      if (registeredAdapter !== adapter) {
        throw new Error("BCP_SOURCE_ADAPTER_ALREADY_REGISTERED");
      }
    } else {
      registry.register(adapter);
    }

    return Object.freeze({
      adapter,
      source: existing,
      created: false
    });
  }

  registry.register(adapter);

  const source = await repository.createSource({
    code: adapter.code.trim(),
    name: adapter.name.trim(),
    sourceType: adapter.sourceType.trim(),
    sourcePriority,
    baseUrl,
    enabled,
    now
  });

  return Object.freeze({
    adapter,
    source,
    created: true
  });
}

module.exports = {
  registerSource
};
