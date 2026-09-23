const crypto = require("crypto");

const {
  validateUniversalBetModel
} = require("../universalBetModel");

const {
  mapMarketType,
  isSupportedMarket
} = require("../marketMapper");

const {
  mapSelectionWithLine
} = require("../selectionMapper");

const BET_DNA_VERSION = 1;

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function increment(map, key) {
  const normalized = normalize(key) || "UNRESOLVED";
  map[normalized] = (map[normalized] || 0) + 1;
}

function canonicalSelectionFingerprint(selection) {
  return {
    sport: selection.sport || null,
    event: {
      id: selection.event?.id || null,
      home: selection.event?.home || null,
      away: selection.event?.away || null,
      competition: selection.event?.competition || null,
      startTime: selection.event?.startTime || null
    },
    market: {
      type: selection.market?.type || null,
      name: selection.market?.name || null,
      line: selection.market?.line ?? null
    },
    selection: {
      type: selection.selection?.type || null,
      name: selection.selection?.name || null,
      value: selection.selection?.value ?? null
    }
  };
}

function createBetDNAFingerprint(selections) {
  const canonicalSelections = selections
    .map(canonicalSelectionFingerprint)
    .sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b))
    );

  const payload = JSON.stringify({
    version: BET_DNA_VERSION,
    selections: canonicalSelections
  });

  return crypto
    .createHash("sha256")
    .update(payload, "utf8")
    .digest("hex");
}

function analyzeBetDNA(model) {
  const errors = validateUniversalBetModel(model);

  if (errors.length) {
    throw new Error(`Invalid universal bet model: ${errors.join(" ")}`);
  }

  const selections = model.selections;
  const fingerprint = createBetDNAFingerprint(selections);

  const matches = new Map();
  const competitions = new Map();
  const teams = new Map();
  const markets = {};
  const selectionTypes = {};
  const goalExposure = {
    totalGoalsCount: 0,
    bttsCount: 0,
    goalMarketCount: 0,
    totalGoalsLines: new Set()
  };

  const relationshipCounts = {
    sameMatchSelectionPairs: 0,
    sameTeamSelectionPairs: 0
  };

  let recognizedMarkets = 0;
  let unresolvedMarkets = 0;
  let recognizedSelections = 0;
  let unresolvedSelections = 0;

  for (const item of selections) {
    const event = item.event || {};
    const market = item.market || {};
    const selection = item.selection || {};

    const eventId = String(event.id || "").trim();

    const matchKey = eventId ||
      [
        normalize(event.home),
        normalize(event.away),
        String(event.startTime || "").trim()
      ].join("|");

    if (!matches.has(matchKey)) {
      matches.set(matchKey, {
        key: matchKey,
        eventId: eventId || null,
        home: event.home || null,
        away: event.away || null,
        competition: event.competition || null,
        startTime: event.startTime || null,
        selectionCount: 0
      });
    }

    matches.get(matchKey).selectionCount += 1;

    const competitionKey =
      normalize(event.competition) || "UNRESOLVED";

    competitions.set(
      competitionKey,
      (competitions.get(competitionKey) || 0) + 1
    );

    const teamEntries = [
      { name: event.home, role: "HOME" },
      { name: event.away, role: "AWAY" }
    ];

    for (const teamEntry of teamEntries) {
      const teamName = String(teamEntry.name || "").trim();

      if (!teamName) {
        continue;
      }

      const teamKey = normalize(teamName);

      if (!teams.has(teamKey)) {
        teams.set(teamKey, {
          name: teamName,
          selectionCount: 0,
          homeMatchKeys: new Set(),
          awayMatchKeys: new Set(),
          matchKeys: new Set()
        });
      }

      const team = teams.get(teamKey);

      team.selectionCount += 1;

      if (teamEntry.role === "HOME") {
        team.homeMatchKeys.add(matchKey);
      } else {
        team.awayMatchKeys.add(matchKey);
      }

      team.matchKeys.add(matchKey);
    }

    const canonicalMarket =
      mapMarketType(market.name, market.type);

    if (canonicalMarket === "TOTAL_GOALS") {
      goalExposure.totalGoalsCount += 1;
      goalExposure.goalMarketCount += 1;

      if (
        market.line !== null &&
        market.line !== undefined &&
        market.line !== ""
      ) {
        goalExposure.totalGoalsLines.add(String(market.line));
      }
    } else if (canonicalMarket === "BTTS") {
      goalExposure.bttsCount += 1;
      goalExposure.goalMarketCount += 1;
    }

    const marketRecognized =
      Boolean(canonicalMarket) &&
      isSupportedMarket(canonicalMarket);

    if (marketRecognized) {
      recognizedMarkets += 1;
      increment(markets, canonicalMarket);
    } else {
      unresolvedMarkets += 1;
      increment(markets, "UNRESOLVED");
    }

    const canonicalSelection =
      mapSelectionWithLine(
        canonicalMarket || market.type,
        selection.name,
        market.line,
        event.home,
        event.away
      ).type;

    if (canonicalSelection) {
      recognizedSelections += 1;
      increment(selectionTypes, canonicalSelection);
    } else {
      unresolvedSelections += 1;
      increment(selectionTypes, "UNRESOLVED");
    }
  }

  const repeatedMatches = [...matches.values()]
    .filter(match => match.selectionCount > 1)
    .map(match => ({ ...match }));

  for (const match of matches.values()) {
    const count = match.selectionCount;

    if (count > 1) {
      relationshipCounts.sameMatchSelectionPairs +=
        (count * (count - 1)) / 2;
    }
  }

  const teamSelectionCounts = new Map();

  for (const team of teams.values()) {
    teamSelectionCounts.set(
      normalize(team.name),
      team.selectionCount
    );
  }

  for (const count of teamSelectionCounts.values()) {
    if (count > 1) {
      relationshipCounts.sameTeamSelectionPairs +=
        (count * (count - 1)) / 2;
    }
  }

  const teamExposure = Object.fromEntries(
    [...teams.entries()].map(([teamKey, team]) => [
      teamKey,
      {
        name: team.name,
        selectionCount: team.selectionCount,
        homeMatchCount: team.homeMatchKeys.size,
        awayMatchCount: team.awayMatchKeys.size,
        uniqueMatchCount: team.matchKeys.size
      }
    ])
  );

  return {
    version: BET_DNA_VERSION,
    fingerprint,

    source: {
      bookmaker: model.source.bookmaker,
      code: model.source.code
    },

    composition: {
      selectionCount: selections.length,
      uniqueMatchCount: matches.size,
      uniqueCompetitionCount: competitions.size,
      uniqueMarketCount: Object.keys(markets)
        .filter(key => key !== "UNRESOLVED")
        .length
    },

    marketProfile: {
      counts: markets
    },

    selectionProfile: {
      counts: selectionTypes
    },

    competitionProfile: {
      counts: Object.fromEntries(competitions)
    },

    teamExposure,

    goalExposure: {
      totalGoalsCount: goalExposure.totalGoalsCount,
      bttsCount: goalExposure.bttsCount,
      goalMarketCount: goalExposure.goalMarketCount,
      totalGoalsLines: [...goalExposure.totalGoalsLines].sort()
    },

    relationships: {
      sameMatchSelectionPairs:
        relationshipCounts.sameMatchSelectionPairs,
      sameTeamSelectionPairs:
        relationshipCounts.sameTeamSelectionPairs
    },

    matchStructure: {
      matches: [...matches.values()],
      repeatedMatchCount: repeatedMatches.length,
      repeatedMatches
    },

    dataQuality: {
      recognizedMarkets,
      unresolvedMarkets,
      recognizedSelections,
      unresolvedSelections,
      completeMarketCoverage:
        unresolvedMarkets === 0,
      completeSelectionCoverage:
        unresolvedSelections === 0
    }
  };
}

module.exports = {
  BET_DNA_VERSION,
  analyzeBetDNA,
  createBetDNAFingerprint
};
