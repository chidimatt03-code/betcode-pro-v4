const Database = require("better-sqlite3")("./data.db");

function now() {
  return new Date().toISOString();
}

function addEvent(event) {
  const timestamp = now();

  const result = Database.prepare(`
    INSERT INTO events (
      bookmaker,
      external_id,
      sport,
      competition,
      home_team,
      away_team,
      start_time,
      status,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.bookmaker,
    event.externalId || null,
    event.sport,
    event.competition || null,
    event.homeTeam,
    event.awayTeam,
    event.startTime || null,
    event.status || "scheduled",
    timestamp,
    timestamp
  );

  return getEvent(result.lastInsertRowid);
}

function upsertEvent(event) {
  const timestamp = now();

  if (event.externalId) {
    const existing = Database.prepare(`
      SELECT id
      FROM events
      WHERE bookmaker=? AND external_id=?
      LIMIT 1
    `).get(
      event.bookmaker,
      event.externalId
    );

    if (existing) {
      Database.prepare(`
        UPDATE events
        SET sport=?,
            competition=?,
            home_team=?,
            away_team=?,
            start_time=?,
            status=?,
            updated_at=?
        WHERE id=?
      `).run(
        event.sport,
        event.competition || null,
        event.homeTeam,
        event.awayTeam,
        event.startTime || null,
        event.status || "scheduled",
        timestamp,
        existing.id
      );

      return getEvent(existing.id);
    }
  }

  return addEvent(event);
}

function findEvents(bookmaker, query = {}) {
  let sql = `
    SELECT *
    FROM events
    WHERE bookmaker=?
  `;

  const params = [bookmaker];

  if (query.sport) {
    sql += " AND sport=?";
    params.push(query.sport);
  }

  if (query.homeTeam) {
    sql += " AND home_team LIKE ?";
    params.push(`%${query.homeTeam}%`);
  }

  if (query.awayTeam) {
    sql += " AND away_team LIKE ?";
    params.push(`%${query.awayTeam}%`);
  }

  if (query.competition) {
    sql += " AND competition LIKE ?";
    params.push(`%${query.competition}%`);
  }

  sql += " ORDER BY start_time ASC LIMIT 100";

  return Database.prepare(sql).all(...params);
}

function getEvent(id) {
  return Database.prepare(
    "SELECT * FROM events WHERE id=?"
  ).get(id);
}

/*
 * Add or update a market belonging to an event.
 */
function upsertEventMarket(eventId, market) {
  if (!eventId) {
    throw new Error("Event ID is required.");
  }

  if (!market || !market.marketType) {
    throw new Error("Market type is required.");
  }

  const timestamp = now();

  const existing = Database.prepare(`
    SELECT id
    FROM event_markets
    WHERE event_id=?
      AND market_type=?
      AND COALESCE(CAST(line AS TEXT), '')=COALESCE(CAST(? AS TEXT), '')
    LIMIT 1
  `).get(
    eventId,
    market.marketType,
    market.line ?? null
  );

  if (existing) {
    Database.prepare(`
      UPDATE event_markets
      SET market_name=?,
          updated_at=?
      WHERE id=?
    `).run(
      market.marketName || null,
      timestamp,
      existing.id
    );

    return getEventMarket(existing.id);
  }

  const result = Database.prepare(`
    INSERT INTO event_markets (
      event_id,
      market_type,
      market_name,
      line,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    market.marketType,
    market.marketName || null,
    market.line ?? null,
    timestamp,
    timestamp
  );

  return getEventMarket(result.lastInsertRowid);
}

/*
 * Add or update a selection belonging to a market.
 */
function upsertMarketSelection(marketId, selection) {
  if (!marketId) {
    throw new Error("Market ID is required.");
  }

  if (!selection || !selection.selectionType) {
    throw new Error("Selection type is required.");
  }

  const timestamp = now();

  const existing = Database.prepare(`
    SELECT id
    FROM market_selections
    WHERE market_id=?
      AND selection_type=?
      AND COALESCE(selection_value, '')=COALESCE(?, '')
    LIMIT 1
  `).get(
    marketId,
    selection.selectionType,
    selection.selectionValue ?? null
  );

  if (existing) {
    Database.prepare(`
      UPDATE market_selections
      SET selection_name=?,
          updated_at=?
      WHERE id=?
    `).run(
      selection.selectionName || null,
      timestamp,
      existing.id
    );

    return getMarketSelection(existing.id);
  }

  const result = Database.prepare(`
    INSERT INTO market_selections (
      market_id,
      selection_type,
      selection_name,
      selection_value,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    marketId,
    selection.selectionType,
    selection.selectionName || null,
    selection.selectionValue ?? null,
    timestamp,
    timestamp
  );

  return getMarketSelection(result.lastInsertRowid);
}

function getEventMarket(id) {
  return Database.prepare(`
    SELECT *
    FROM event_markets
    WHERE id=?
  `).get(id);
}

function getMarketSelection(id) {
  return Database.prepare(`
    SELECT *
    FROM market_selections
    WHERE id=?
  `).get(id);
}

function getEventMarkets(eventId) {
  return Database.prepare(`
    SELECT *
    FROM event_markets
    WHERE event_id=?
    ORDER BY id ASC
  `).all(eventId);
}

function getMarketSelections(marketId) {
  return Database.prepare(`
    SELECT *
    FROM market_selections
    WHERE market_id=?
    ORDER BY id ASC
  `).all(marketId);
}

module.exports = {
  addEvent,
  upsertEvent,
  findEvents,
  getEvent,
  upsertEventMarket,
  upsertMarketSelection,
  getEventMarket,
  getMarketSelection,
  getEventMarkets,
  getMarketSelections
};
