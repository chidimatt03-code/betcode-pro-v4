const DEFAULT_TIMEOUT_MS = 15000;

function getConfig(bookmaker) {
  const key = String(bookmaker || "").toLowerCase().trim();

  const configs = {
    sportybet: {
      name: "SportyBet",
      apiUrl: process.env.SPORTYBET_API_URL || "",
      apiKey: process.env.SPORTYBET_API_KEY || "",
      decodePath: process.env.SPORTYBET_DECODE_PATH || "",
      eventsPath: process.env.SPORTYBET_EVENTS_PATH || "",
      createPath: process.env.SPORTYBET_CREATE_PATH || ""
    },

    bet9ja: {
      name: "Bet9ja",
      apiUrl: process.env.BET9JA_API_URL || "",
      apiKey: process.env.BET9JA_API_KEY || "",
      decodePath: process.env.BET9JA_DECODE_PATH || "",
      eventsPath: process.env.BET9JA_EVENTS_PATH || "",
      createPath: process.env.BET9JA_CREATE_PATH || ""
    },

    betking: {
      name: "BetKing",
      apiUrl: process.env.BETKING_API_URL || "",
      apiKey: process.env.BETKING_API_KEY || "",
      decodePath: process.env.BETKING_DECODE_PATH || "",
      eventsPath: process.env.BETKING_EVENTS_PATH || "",
      createPath: process.env.BETKING_CREATE_PATH || ""
    }
  };

  return configs[key] || null;
}

function joinUrl(base, endpoint) {
  const baseUrl = String(base || "").trim();
  const path = String(endpoint || "").trim();

  if (!baseUrl || !path) {
    throw new Error("Authorized connector endpoint is not configured.");
  }

  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

  if (url.protocol !== "https:") {
    throw new Error("Authorized bookmaker connectors must use HTTPS.");
  }

  return url;
}

async function request(bookmaker, endpoint, body) {
  const config = getConfig(bookmaker);

  if (!config) {
    throw new Error(`Unsupported bookmaker connector: ${bookmaker}.`);
  }

  if (!config.apiUrl || !config.apiKey) {
    throw new Error(`${config.name} authorized connector is not configured.`);
  }

  const url = joinUrl(config.apiUrl, endpoint);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const text = await response.text();

    let payload = null;

    if (text.trim()) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(
          `Authorized ${config.name} connector returned a non-JSON response.`
        );
      }
    }

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        `Authorized ${config.name} connector returned HTTP ${response.status}.`;

      throw new Error(String(message).slice(0, 300));
    }

    if (!payload || typeof payload !== "object") {
      throw new Error(
        `Authorized ${config.name} connector returned an empty response.`
      );
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `Authorized ${config.name} connector request timed out.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function connectorStatus(bookmaker) {
  const config = getConfig(bookmaker);

  if (!config) {
    return {
      bookmaker: String(bookmaker || "").toLowerCase().trim(),
      configured: false,
      reason: "Unsupported bookmaker."
    };
  }

  return {
    bookmaker: String(bookmaker).toLowerCase().trim(),
    configured: Boolean(
      config.apiUrl &&
      config.apiKey &&
      config.decodePath &&
      config.eventsPath &&
      config.createPath
    ),
    hasApiUrl: Boolean(config.apiUrl),
    hasApiKey: Boolean(config.apiKey),
    hasDecodePath: Boolean(config.decodePath),
    hasEventsPath: Boolean(config.eventsPath),
    hasCreatePath: Boolean(config.createPath)
  };
}

function validateAuthorizedConnectorConfig(bookmaker) {
  const status = connectorStatus(bookmaker);

  if (!status || !status.bookmaker) {
    return {
      valid: false,
      errors: ["Bookmaker is missing."]
    };
  }

  const errors = [];

  if (!status.hasApiUrl) {
    errors.push("API URL is not configured.");
  }

  if (!status.hasApiKey) {
    errors.push("API key is not configured.");
  }

  if (!status.hasDecodePath) {
    errors.push("Decode endpoint is not configured.");
  }

  if (!status.hasEventsPath) {
    errors.push("Events endpoint is not configured.");
  }

  if (!status.hasCreatePath) {
    errors.push("Create endpoint is not configured.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function requireAuthorizedConnectorConfig(bookmaker) {
  const validation = validateAuthorizedConnectorConfig(bookmaker);

  if (!validation.valid) {
    throw new Error(
      `Authorized ${String(bookmaker || "").trim()} connector is not ready: ` +
      validation.errors.join(" ")
    );
  }

  return true;
}

function createAuthorizedConnector(bookmaker) {
  const key = String(bookmaker || "").toLowerCase().trim();
  const config = getConfig(key);

  if (!config) {
    throw new Error(`Unsupported bookmaker connector: ${bookmaker}.`);
  }

  return {
    bookmaker: key,

    status() {
      return connectorStatus(key);
    },

    async decodeBookingCode(code) {
      const value = String(code || "").trim();

      if (!value) {
        throw new Error("Booking code is missing.");
      }

      return request(key, config.decodePath, {
        booking_code: value
      });
    },

    async findEvents(query = {}) {
      return request(key, config.eventsPath, query);
    },

    async createBookingCode(destinationSlip) {
      if (!destinationSlip || typeof destinationSlip !== "object") {
        throw new Error("Destination slip is missing.");
      }

      return request(key, config.createPath, {
        slip: destinationSlip
      });
    }
  };
}

module.exports = {
  connectorStatus,
  validateAuthorizedConnectorConfig,
  requireAuthorizedConnectorConfig,
  createAuthorizedConnector
};
