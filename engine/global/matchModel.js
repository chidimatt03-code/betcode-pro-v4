const REQUIRED_MATCH_FIELDS = [
  "sourceCode",
  "sourceEventId",
  "sport",
  "competitionName",
  "homeTeamName",
  "awayTeamName",
  "scheduledStart",
  "status",
  "observedAt"
];

const ALLOWED_STATUSES = new Set([
  "scheduled",
  "live",
  "halftime",
  "finished",
  "postponed",
  "cancelled",
  "suspended",
  "unknown"
]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value) {
  const status = normalizeText(value).toLowerCase();

  const aliases = {
    "not start": "scheduled",
    "not_started": "scheduled",
    "not-started": "scheduled",
    "upcoming": "scheduled",
    "in play": "live",
    "in-play": "live",
    "half time": "halftime",
    "half-time": "halftime",
    "ended": "finished",
    "complete": "finished",
    "completed": "finished",
    "postponed": "postponed",
    "cancelled": "cancelled",
    "canceled": "cancelled",
    "suspended": "suspended",
    "unknown": "unknown"
  };

  return aliases[status] || status;
}

function validateMatchEvent(event) {
  if (!event || typeof event !== "object") {
    throw new TypeError("BCP_MATCH_EVENT_REQUIRED");
  }

  for (const field of REQUIRED_MATCH_FIELDS) {
    if (!(field in event)) {
      throw new Error(`BCP_MATCH_EVENT_MISSING_${field.toUpperCase()}`);
    }
  }

  const textFields = [
    "sourceCode",
    "sourceEventId",
    "sport",
    "competitionName",
    "homeTeamName",
    "awayTeamName",
    "status"
  ];

  for (const field of textFields) {
    if (!normalizeText(event[field])) {
      throw new TypeError(`BCP_MATCH_EVENT_${field.toUpperCase()}_INVALID`);
    }
  }

  if (normalizeText(event.homeTeamName) === normalizeText(event.awayTeamName)) {
    throw new Error("BCP_MATCH_EVENT_TEAMS_MUST_DIFFER");
  }

  if (!ALLOWED_STATUSES.has(normalizeStatus(event.status))) {
    throw new Error("BCP_MATCH_EVENT_STATUS_INVALID");
  }

  if (typeof event.scheduledStart !== "string" || !event.scheduledStart.trim()) {
    throw new TypeError("BCP_MATCH_EVENT_SCHEDULED_START_INVALID");
  }

  if (typeof event.observedAt !== "string" || !event.observedAt.trim()) {
    throw new TypeError("BCP_MATCH_EVENT_OBSERVED_AT_INVALID");
  }

  return true;
}

function createMatchEvent(input) {
  validateMatchEvent(input);

  return Object.freeze({
    sourceCode: normalizeText(input.sourceCode),
    sourceEventId: normalizeText(input.sourceEventId),
    sport: normalizeText(input.sport),
    competitionName: normalizeText(input.competitionName),
    homeTeamName: normalizeText(input.homeTeamName),
    awayTeamName: normalizeText(input.awayTeamName),
    scheduledStart: normalizeText(input.scheduledStart),
    status: normalizeStatus(input.status),
    observedAt: normalizeText(input.observedAt)
  });
}

module.exports = {
  REQUIRED_MATCH_FIELDS,
  ALLOWED_STATUSES,
  validateMatchEvent,
  createMatchEvent
};
