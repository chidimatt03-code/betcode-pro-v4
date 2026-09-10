const assert = require("assert");

const { buildDestinationSlip } = require("../engine/destinationBuilder");

const converted = {
  success: true,

  source: {
    bookmaker: "sportybet",
    code: "TEST-SP-001"
  },

  selections: [
    {
      index: 1,

      event: {
        source: {
          home: "Manchester United",
          away: "Arsenal"
        },
        destination: {
          id: "dest-event-001",
          home: "Man Utd",
          away: "Arsenal FC",
          competition: "Premier League",
          startTime: "2026-09-06T18:00:00Z"
        },
        confidence: 0.95,
        status: "MATCHED"
      },

      market: {
        source: "Match Result",
        type: "1X2",
        line: null
      },

      selection: {
        source: "Home",
        type: "HOME"
      }
    },

    {
      index: 2,

      event: {
        source: {
          home: "Chelsea",
          away: "Liverpool"
        },
        destination: {
          id: "dest-event-002",
          home: "Chelsea FC",
          away: "Liverpool",
          competition: "Premier League",
          startTime: "2026-09-06T20:00:00Z"
        },
        confidence: 0.95,
        status: "MATCHED"
      },

      market: {
        source: "Over/Under",
        type: "TOTAL_GOALS",
        line: 2.5
      },

      selection: {
        source: "Over 2.5",
        type: "OVER"
      }
    }
  ]
};

const result = buildDestinationSlip({
  destinationBookmaker: "betking",
  converted
});

assert.strictEqual(result.success, true);
assert.strictEqual(result.destinationBookmaker, "betking");
assert.strictEqual(result.selections.length, 2);

assert.strictEqual(
  result.selections[0].event.id,
  "dest-event-001"
);

assert.strictEqual(
  result.selections[0].market.type,
  "1X2"
);

assert.strictEqual(
  result.selections[0].selection.type,
  "HOME"
);

assert.strictEqual(
  result.selections[1].event.id,
  "dest-event-002"
);

assert.strictEqual(
  result.selections[1].market.type,
  "TOTAL_GOALS"
);

assert.strictEqual(
  result.selections[1].market.line,
  2.5
);

assert.strictEqual(
  result.selections[1].selection.type,
  "OVER"
);

console.log("=================================");
console.log("BETCODE PRO DESTINATION BUILDER TEST");
console.log("=================================");
console.log("Status: PASSED");
console.log("Destination:", result.destinationBookmaker);
console.log("Selections:", result.selections.length);
console.log("Event 1:", result.selections[0].event.id);
console.log("Event 2:", result.selections[1].event.id);
console.log("Market 1:", result.selections[0].market.type);
console.log("Market 2:", result.selections[1].market.type);
console.log("Selection 1:", result.selections[0].selection.type);
console.log("Selection 2:", result.selections[1].selection.type);
console.log("=================================");
