const { assertSourceAdapter } = require("./sourceAdapter");

function requireRepository(repository) {
  if (!repository || typeof repository.updateSourceHealth !== "function") {
    throw new TypeError("BCP_SOURCE_RUNNER_REPOSITORY_INVALID");
  }

  return repository;
}

async function runSourceAdapter(repository, adapter, options = {}) {
  const db = requireRepository(repository);
  assertSourceAdapter(adapter);

  const observedAt =
    options.observedAt || new Date().toISOString();

  try {
    const result = await adapter.fetchMatches(options);

    await db.updateSourceHealth(adapter.code, {
      success: true,
      observedAt
    });

    return Object.freeze({
      sourceCode: adapter.code,
      success: true,
      result
    });
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : String(error);

    await db.updateSourceHealth(adapter.code, {
      success: false,
      error: message,
      observedAt
    });

    throw error;
  }
}

module.exports = {
  runSourceAdapter
};
