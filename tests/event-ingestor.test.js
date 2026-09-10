const assert = require("assert");

const Database = require("better-sqlite3")("./data.db");

const {
  ingestEvent
} = require("../engine/eventIngestor");

console.log("=================================");
console.log("BETCODE PRO PHASE 6 EVENT INGESTOR TEST");
console.log("=================================");

const bookmaker = "phase6_test";
const externalId = "phase6-event-001";

try {
  // Clean any previous test data.
  Database.prepare(
    "DELETE FROM events WHERE bookmaker=? AND external_id=?"
  ).run(bookmaker, externalId);

  const event = {
    externalId,
    sport: "football",
    competition: "Phase 6 Test League",
    homeTeam: "Test United",
    awayTeam: "Test City",
    startTime: "2026-09-07T18:00:00Z",
    status: "scheduled",
    markets: [
      {
        marketType: "1X2",
        marketName: "Match Result",
        line: null,
        selections: [
          {
            selectionType: "HOME",
            selectionName: "Home",
            selectionValue: null
          },
          {
            selectionType: "DRAW",
            selectionName: "Draw",
            selectionValue: null
          }
        ]
      },
      {
        marketType: "TOTAL_GOALS",
        marketName: "Over/Under",
        line: 2.5,
        selections: [
          {
            selectionType: "OVER",
            selectionName: "Over 2.5",
            selectionValue: null
          }
        ]
      }
    ]
  };

  const first = ingestEvent(bookmaker, event);

  assert.ok(first.id);
  assert.strictEqual(first.bookmaker, bookmaker);
  assert.strictEqual(first.external_id, externalId);
  assert.strictEqual(first.home_team, "Test United");
  assert.strictEqual(first.away_team, "Test City");
  assert.strictEqual(first.markets.length, 2);
  assert.strictEqual(first.markets[0].selections.length, 2);
  assert.strictEqual(first.markets[1].selections.length, 1);

  console.log("Step 1: Event ingestion PASSED");
  console.log(`Event ID: ${first.id}`);
  console.log(`Markets: ${first.markets.length}`);
  console.log(
    `Selections: ${
      first.markets.reduce((total, market) =>
        total + market.selections.length, 0)
    }`
  );

  // Ingest the same external event again.
  const second = ingestEvent(bookmaker, event);

  assert.strictEqual(second.id, first.id);
  assert.strictEqual(second.markets.length, 2);

  const storedCount = Database.prepare(`
    SELECT COUNT(*) AS count
    FROM events
    WHERE bookmaker=? AND external_id=?
  `).get(bookmaker, externalId).count;

  assert.strictEqual(storedCount, 1);

  console.log("Step 2: Event upsert PASSED");

  // Verify child records were created.
  const marketCount = Database.prepare(`
    SELECT COUNT(*) AS count
    FROM event_markets
    WHERE event_id=?
  `).get(first.id).count;

  const selectionCount = Database.prepare(`
    SELECT COUNT(*) AS count
    FROM market_selections
    WHERE market_id IN (
      SELECT id FROM event_markets WHERE event_id=?
    )
  `).get(first.id).count;

  assert.strictEqual(marketCount, 2);
  assert.strictEqual(selectionCount, 3);

  console.log("Step 3: Market and selection persistence PASSED");

  console.log("---------------------------------");
  console.log("Event ingestion pipeline: PASSED");
  console.log("Event upsert protection: PASSED");
  console.log("Market persistence: PASSED");
  console.log("Selection persistence: PASSED");
  console.log("=================================");
  console.log("STATUS: PHASE 6 EVENT INGESTOR TEST PASSED");
  console.log("=================================");

} catch (e) {
  console.error("TEST FAILED:", e.message);
  process.exitCode = 1;
} finally {
  // Remove the test event and its children.
  const testEvents = Database.prepare(`
    SELECT id FROM events
    WHERE bookmaker=? AND external_id=?
  `).all(bookmaker, externalId);

  for (const row of testEvents) {
    const markets = Database.prepare(
      "SELECT id FROM event_markets WHERE event_id=?"
    ).all(row.id);

    for (const market of markets) {
      Database.prepare(
        "DELETE FROM market_selections WHERE market_id=?"
      ).run(market.id);
    }

    Database.prepare(
      "DELETE FROM event_markets WHERE event_id=?"
    ).run(row.id);
  }

  Database.prepare(
    "DELETE FROM events WHERE bookmaker=? AND external_id=?"
  ).run(bookmaker, externalId);
}
