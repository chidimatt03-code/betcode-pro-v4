const fs = require("fs");
const assert = require("assert");

const { convertBetSlip } = require("../engine/pipeline");

const fixture = JSON.parse(
  fs.readFileSync(
    __dirname + "/fixtures/sportybet_sample.json",
    "utf8"
  )
);

const destinationEvents = [
  {
    id: "dest-event-001",
    home: "Man Utd",
    away: "Arsenal FC",
    competition: "Premier League",
    startTime: "2026-09-06T18:00:00Z"
  },
  {
    id: "dest-event-002",
    home: "Chelsea FC",
    away: "Liverpool",
    competition: "Premier League",
    startTime: "2026-09-06T20:00:00Z"
  }
];

const result = convertBetSlip({
  sourceBookmaker: fixture.sourceBookmaker,
  destinationBookmaker: "betking",
  sourceCode: fixture.sourceCode,
  selections: fixture.selections,
  destinationEvents
});

assert.strictEqual(result.success, true);
assert.strictEqual(result.selections.length, 2);

assert.strictEqual(
  result.selections[0].event.status,
  "MATCHED"
);

assert.strictEqual(
  result.selections[0].selection.type,
  "HOME"
);

assert.strictEqual(
  result.selections[1].event.status,
  "MATCHED"
);

assert.strictEqual(
  result.selections[1].market.type,
  "TOTAL_GOALS"
);

assert.strictEqual(
  result.selections[1].selection.type,
  "OVER"
);

assert.strictEqual(
  result.selections[1].market.line,
  2.5
);

console.log("=================================");
console.log("BETCODE PRO PIPELINE TEST");
console.log("=================================");
console.log("Status: PASSED");
console.log("Selections tested:", result.selections.length);
console.log("Event 1:", result.selections[0].event.status);
console.log("Event 2:", result.selections[1].event.status);
console.log("Market 1:", result.selections[0].market.type);
console.log("Market 2:", result.selections[1].market.type);
console.log("Selection 1:", result.selections[0].selection.type);
console.log("Selection 2:", result.selections[1].selection.type);
console.log("=================================");
