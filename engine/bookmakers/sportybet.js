const BASE_URL =
  process.env.SPORTYBET_PUBLIC_BASE_URL ||
  "https://www.sportybet.com";

const REGION =
  process.env.SPORTYBET_PUBLIC_REGION ||
  "ng";

const TIMEOUT_MS = 15000;

function clean(value) {
  return String(value ?? "").trim();
}

function buildUrl(path) {
  return `${BASE_URL.replace(/\/+$/, "")}/api/${REGION}${path}`;
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path), {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Current-Country": "NG",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36",
        ...(options.headers || {})
      },
      body: options.body,
      signal: controller.signal
    });

    const text = await response.text();

    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(
        `SportyBet returned non-JSON response (HTTP ${response.status}).`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `SportyBet request failed with HTTP ${response.status}.`
      );
    }

    if (!data || data.bizCode !== 10000) {
      throw new Error(
        data?.message ||
          "SportyBet returned an unsuccessful response."
      );
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

function marketType(market = {}) {
  const id = clean(market.id);
  const desc = clean(market.desc).toLowerCase();
  const name = clean(market.name).toLowerCase();

  if (
    id === "1" ||
    desc === "1x2" ||
    name === "1x2" ||
    desc.startsWith("1x2 -") ||
    name.startsWith("1x2 -")
  ) {
    return "1X2";
  }

  if (
    id === "18" ||
    id === "19" ||
    id === "20" ||
    desc.includes("over/under") ||
    name.includes("over/under")
  ) {
    return "TOTAL_GOALS";
  }

  if (
    desc.includes("both teams") ||
    desc.includes("btts") ||
    desc.includes("gg/ng") ||
    desc.includes("gg ng") ||
    name.includes("both teams") ||
    name.includes("btts") ||
    name.includes("gg/ng") ||
    name.includes("gg ng")
  ) {
    return "BTTS";
  }

  if (
    desc.includes("double chance") ||
    name.includes("double chance")
  ) {
    return "DOUBLE_CHANCE";
  }

  if (
    desc.includes("draw no bet") ||
    name.includes("draw no bet")
  ) {
    return "DRAW_NO_BET";
  }

  if (
    desc.includes("handicap") ||
    name.includes("handicap")
  ) {
    return "HANDICAP";
  }

  return desc || name || id;
}

function parseLine(market = {}, outcome = {}) {
  const specifier = clean(market.specifier);

  const handicapMatch = specifier.match(
    /(?:handicap|hcp)=(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?)/
  );

  if (handicapMatch) {
    return `${handicapMatch[1]}:${handicapMatch[2]}`;
  }

  const match = specifier.match(
    /(?:total|goals)=(-?\d+(?:\.\d+)?)/
  );

  if (match) {
    return Number(match[1]);
  }

  const outcomeDesc = clean(outcome.desc);

  const outcomeMatch = outcomeDesc.match(
    /(?:over|under)\s+(-?\d+(?:\.\d+)?)/i
  );

  if (outcomeMatch) {
    return Number(outcomeMatch[1]);
  }

  return null;
}

function normalizeOutcome(event, market, outcome) {
  return {
    sport: clean(event?.sport?.name),

    event: {
      id: clean(event?.eventId),
      home: clean(event?.homeTeamName),
      away: clean(event?.awayTeamName),
      competition: clean(
        event?.sport?.category?.tournament?.name
      ),
      startTime:
        event?.estimateStartTime ||
        null
    },

    market: {
      type: marketType(market),
      name: clean(market?.desc || market?.name || market?.id),
      line: parseLine(market, outcome)
    },

    selection: {
      type: null,
      name: clean(outcome?.desc),
      value: clean(outcome?.id),
      odds: outcome?.odds ?? null
    }
  };
}


async function fetchUpcomingEvents(options = {}) {
  const sportId = options.sportId || "sr:sport:1";
  const marketId =
    options.marketId || "1,18,10,29,11,26,36,14,60100";
  const pageSize = String(options.pageSize || 100);
  const pageNum = String(options.pageNum || 1);
  const todayGames =
    options.todayGames === undefined ? "false" : String(options.todayGames);
  const timeline = String(options.timeline || 720);

  const params = new URLSearchParams({
    sportId,
    marketId,
    pageSize,
    pageNum,
    todayGames,
    timeline,
    _t: String(Date.now())
  });

  const data = await request(
    `/factsCenter/pcUpcomingEvents?${params.toString()}`
  );

  if (!data || data.bizCode !== 10000) {
    throw new Error("SportyBet event feed unavailable");
  }

  const tournaments = Array.isArray(data.data?.tournaments)
    ? data.data.tournaments
    : [];

  const events = [];

  for (const tournament of tournaments) {
    for (const event of Array.isArray(tournament.events)
      ? tournament.events
      : []) {

      events.push({
        bookmaker: "sportybet",
        externalId: clean(event.eventId),
        sport: clean(event.sport?.name || "Football"),
        competition: clean(
          event.sport?.category?.tournament?.name ||
          tournament.name
        ),
        homeTeam: clean(event.homeTeamName),
        awayTeam: clean(event.awayTeamName),
        startTime: event.estimateStartTime
          ? new Date(Number(event.estimateStartTime)).toISOString()
          : null,
        status: clean(event.matchStatus),

        markets: Array.isArray(event.markets)
          ? event.markets
              .filter(m => m && m.id)
              .filter(m => [
                "1X2",
                "Over/Under",
                "GG/NG",
                "Double Chance",
                "Handicap",
                "Draw No Bet"
              ].includes(clean(m.name || m.desc || m.id)))
              .map(m => ({
                bookmakerMarketId: clean(m.id),
                bookmakerSpecifier: clean(m.specifier),
                name: clean(m.name || m.desc || m.id),
                type: marketType(m),
                line: parseLine(m),

                selections: Array.isArray(m.outcomes)
                  ? m.outcomes
                      .filter(o => o && o.id)
                      .map(o => ({
                        bookmakerOutcomeId: clean(o.id),
                                            selectionType: (() => {
                                                const outcomeName = clean(o.desc || o.id).toLowerCase().trim();
                                                const marketName = clean(m.name || m.desc || m.id).toLowerCase().trim();

                                                if (marketName.includes("1x2")) {
                                                    if (outcomeName.startsWith("home")) return "HOME";
                                                    if (outcomeName === "draw" || outcomeName.startsWith("draw ")) return "DRAW";
                                                    if (outcomeName.startsWith("away")) return "AWAY";
                                                }

                                                if (marketName.includes("over/under") || marketName.includes("over under")) {
                                                    if (outcomeName.startsWith("over")) return "OVER";
                                                    if (outcomeName.startsWith("under")) return "UNDER";
                                                }

                                                if (
                                                    marketName.includes("both teams") ||
                                                    marketName.includes("gg/ng") ||
                                                    marketName.includes("gg ng")
                                                ) {
                                                    if (outcomeName === "yes" || outcomeName === "gg") return "YES";
                                                    if (outcomeName === "no" || outcomeName === "ng") return "NO";
                                                }

                                                if (marketName.includes("draw no bet")) {
                                                    if (outcomeName.startsWith("home")) return "HOME";
                                                    if (outcomeName.startsWith("away")) return "AWAY";
                                                }

                                                if (marketName.includes("double chance")) {
                                                    if (outcomeName.includes("home") && outcomeName.includes("draw")) return "HOME_OR_DRAW";
                                                    if (outcomeName.includes("home") && outcomeName.includes("away")) return "HOME_OR_AWAY";
                                                    if (outcomeName.includes("draw") && outcomeName.includes("away")) return "DRAW_OR_AWAY";
                                                }

                                                if (marketName.includes("handicap")) {
                                                    if (outcomeName.startsWith("home")) return "HOME";
                                                    if (outcomeName.startsWith("draw")) return "DRAW";
                                                    if (outcomeName.startsWith("away")) return "AWAY";
                                                }

                                                return null;
                                            })(),
                        name: clean(o.desc || o.id),
                        odds: o.odds ?? null
                      }))
                  : []
              }))
          : []
      });
    }
  }

  return {
    success: true,
    bookmaker: "sportybet",
    total: events.length,
    events
  };
}

async function decodeBookingCode(code) {
  const value = clean(code);

  if (!value) {
    throw new Error("SportyBet booking code is missing.");
  }

  const result = await request(
    `/orders/share/${encodeURIComponent(value)}`
  );

  const data = result.data || {};
  const ticket = data.ticket || {};
  const selections = Array.isArray(ticket.selections)
    ? ticket.selections
    : [];

  const outcomes = Array.isArray(data.outcomes)
    ? data.outcomes
    : [];

  if (!selections.length) {
    throw new Error(
      "SportyBet booking code contains no selections."
    );
  }

  const normalized = [];

  for (const ticketSelection of selections) {
    const event = outcomes.find(
      item =>
        clean(item.eventId) ===
        clean(ticketSelection.eventId)
    );

    if (!event) {
      throw new Error(
        `SportyBet event ${ticketSelection.eventId} was not returned.`
      );
    }

    const market = Array.isArray(event.markets)
      ? event.markets.find(
          item =>
            clean(item.id) ===
              clean(ticketSelection.marketId) &&
            clean(item.specifier) ===
              clean(ticketSelection.specifier)
        ) ||
        event.markets.find(
          item =>
            clean(item.id) ===
            clean(ticketSelection.marketId)
        )
      : null;

    if (!market) {
      throw new Error(
        `SportyBet market ${ticketSelection.marketId} was not returned for event ${ticketSelection.eventId}.`
      );
    }

    const outcome = Array.isArray(market.outcomes)
      ? market.outcomes.find(
          item =>
            clean(item.id) ===
            clean(ticketSelection.outcomeId)
        )
      : null;

    if (!outcome) {
      throw new Error(
        `SportyBet outcome ${ticketSelection.outcomeId} was not returned for event ${ticketSelection.eventId}.`
      );
    }

    normalized.push(
      normalizeOutcome(event, market, outcome)
    );
  }

  return {
    bookmaker: "sportybet",
    bookingCode:
      clean(data.shareCode) || value,
    selections: normalized,

    sportybet: {
      shareCode:
        clean(data.shareCode) || value,
      shareURL: clean(data.shareURL),
      bookingStatus: clean(
        outcomes[0]?.bookingStatus
      ),
      totalSelections: normalized.length
    },

    raw: {
      ticket,
      outcomes
    }
  };
}

module.exports = {
  fetchUpcomingEvents,
  decodeBookingCode
};

async function createBookingCode(destinationSlip) {
  if (!destinationSlip || destinationSlip.success !== true) {
    throw new Error("SportyBet destination slip is not ready.");
  }

  if (
    !Array.isArray(destinationSlip.selections) ||
    !destinationSlip.selections.length
  ) {
    throw new Error("SportyBet destination slip has no selections.");
  }

  const selections = destinationSlip.selections.map((item, index) => {
    const native = item?.native;

    if (!native) {
      throw new Error(
        `SportyBet selection ${item?.index || index + 1} has no native metadata.`
      );
    }

    if (!clean(native.eventId)) {
      throw new Error(
        `SportyBet selection ${item?.index || index + 1} is missing eventId.`
      );
    }

    if (!clean(native.marketId)) {
      throw new Error(
        `SportyBet selection ${item?.index || index + 1} is missing marketId.`
      );
    }

    if (!clean(native.outcomeId)) {
      throw new Error(
        `SportyBet selection ${item?.index || index + 1} is missing outcomeId.`
      );
    }

    return {
      eventId: clean(native.eventId),
      marketId: clean(native.marketId),
      specifier: clean(native.specifier),
      outcomeId: clean(native.outcomeId)
    };
  });

  const result = await request("/orders/share", {
    method: "POST",
    body: JSON.stringify({
      selections
    })
  });

  const data = result.data || {};
  const code = clean(data.shareCode);

  if (!code) {
    throw new Error(
      "SportyBet accepted the request but did not return a booking code."
    );
  }

  return {
    success: true,
    status: "created",
    bookmaker: "sportybet",
    code,
    officialInterface: "SportyBet public orders/share",
    bookingCodeCreationSupported: true,
    shareURL: clean(data.shareURL),
    deadline: data.deadline || null,
    totalSelections: selections.length
  };
}

module.exports.createBookingCode = createBookingCode;
