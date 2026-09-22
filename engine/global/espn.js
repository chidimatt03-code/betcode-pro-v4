const BASE_URL =
  process.env.ESPN_SOCCER_BASE_URL ||
  "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard";

function mapStatus(competition) {
  const type = competition?.status?.type || {};
  const state = type.state;

  if (state === "pre") return "scheduled";

  if (state === "in") {
    const name = String(type.name || "").toUpperCase();
    const detail = String(type.detail || "").toLowerCase();

    if (
      name.includes("HALFTIME") ||
      detail.includes("half time") ||
      detail === "ht"
    ) {
      return "halftime";
    }

    return "live";
  }

  if (state === "post" || type.completed === true) {
    return "finished";
  }

  return "unknown";
}

function normalizeEvent(event, observedAt) {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];

  const home = competitors.find((item) => item.homeAway === "home");
  const away = competitors.find((item) => item.homeAway === "away");

  if (!event?.id || !home?.team?.displayName || !away?.team?.displayName) {
    return null;
  }

  return {
    sourceEventId: String(event.id),
    sport: "Football",
    competitionName:
      competition?.altGameNote ||
      event?.season?.slug ||
      "Football",
    homeTeamName: home.team.displayName,
    awayTeamName: away.team.displayName,
    scheduledStart:
      competition?.startDate ||
      event?.date ||
      null,
    status: mapStatus(competition),
    observedAt
  };
}

function normalizeLiveState(event, observedAt) {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];

  const home = competitors.find(
    (item) => item.homeAway === "home"
  );

  const away = competitors.find(
    (item) => item.homeAway === "away"
  );

  if (!event?.id || !home || !away) {
    return null;
  }

  const status = mapStatus(competition);

  const homeScore =
    home.score === undefined || home.score === null
      ? null
      : Number(home.score);

  const awayScore =
    away.score === undefined || away.score === null
      ? null
      : Number(away.score);

  const clock =
    competition?.status?.clock === undefined ||
    competition?.status?.clock === null
      ? null
      : Number(competition.status.clock);

  const period =
    competition?.status?.period === undefined ||
    competition?.status?.period === null
      ? null
      : Number(competition.status.period);

  const displayClock =
    competition?.status?.displayClock || null;

  return {
    sourceEventId: String(event.id),
    homeScore,
    awayScore,
    period,
    clockSeconds: Number.isFinite(clock) ? clock : null,
    displayClock,
    status,
    observedAt
  };
}

const espn = Object.freeze({
  normalizeLiveState,
  code: "espn",
  name: "ESPN Soccer",
  sourceType: "public_api",
  baseUrl: BASE_URL,

  async fetchMatches({ fetchImpl = fetch, observedAt } = {}) {
    const response = await fetchImpl(BASE_URL);

    if (!response.ok) {
      throw new Error(`ESPN_HTTP_${response.status}`);
    }

    const payload = await response.json();

    if (!payload || !Array.isArray(payload.events)) {
      throw new TypeError("ESPN_EVENTS_INVALID");
    }

    const timestamp = observedAt || new Date().toISOString();

    return payload.events
      .map((event) => normalizeEvent(event, timestamp))
      .filter(Boolean);
  }
});

module.exports = espn;
