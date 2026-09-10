const assert = require("assert");

const { convertBetSlip } = require("../engine/pipeline");
const { buildDestinationSlip } = require("../engine/destinationBuilder");
const { createDestinationAdapter } = require("../engine/destinationAdapter");

const destinationEvents = [
  {
    id: "dest-event-001",
    home: "Manchester United",
    away: "Arsenal",
    competition: "Premier League",
    startTime: "2026-09-06T18:00:00Z"
  },
  {
    id: "dest-event-002",
    home: "Chelsea",
    away: "Liverpool",
    competition: "Premier League",
    startTime: "2026-09-06T20:00:00Z"
  }
];

const sourceSelections = [
  {
    index: 1,
    event: {
      home: "Manchester United",
      away: "Arsenal",
      competition: "Premier League",
      startTime: "2026-09-06T18:00:00Z"
    },
    market: {
      name: "Match Result",
      type: "1X2"
    },
    selection: {
      name: "Manchester United"
    }
  },
  {
    index: 2,
    event: {
      home: "Chelsea",
      away: "Liverpool",
      competition: "Premier League",
      startTime: "2026-09-06T20:00:00Z"
    },
    market: {
      name: "Over/Under",
      type: "TOTAL_GOALS",
      line: 2.5
    },
    selection: {
      name: "Over 2.5"
    }
  }
];

async function run() {
  console.log("=================================");
  console.log("BETCODE PRO PHASE 4 INTEGRATION TEST");
  console.log("=================================");

  const converted = convertBetSlip({
    sourceBookmaker: "sportybet",
    destinationBookmaker: "betking",
    sourceCode: "PHASE4TEST",
    selections: sourceSelections,
    destinationEvents
  });

  assert.strictEqual(
    converted.success,
    true,
    "Conversion should succeed."
  );

  console.log("Step 1: Conversion PASSED");

  const destination = buildDestinationSlip({
    destinationBookmaker: "betking",
    converted
  });

  assert.strictEqual(
    destination.success,
    true,
    "Destination slip should be built successfully."
  );

  assert.strictEqual(
    destination.destinationBookmaker,
    "betking"
  );

  assert.strictEqual(
    destination.selections.length,
    2
  );

  console.log("Step 2: Destination builder PASSED");

  const adapter = createDestinationAdapter({
    bookmaker: "betking",

    async createBookingCode(slip) {
      return {
        success: true,
        status: "created",
        bookmaker: slip.destinationBookmaker,
        code: "TEST-DESTINATION-CODE",
        selections: slip.selections.length
      };
    }
  });

  const result = await adapter.createBookingCode(destination);

  assert.deepStrictEqual(result, {
    success: true,
    status: "created",
    bookmaker: "betking",
    code: "TEST-DESTINATION-CODE",
    selections: 2
  });

  console.log("Step 3: Destination adapter PASSED");

  console.log("---------------------------------");
  console.log("Pipeline -> Builder -> Adapter: PASSED");
  console.log("Live bookmaker creation: DISABLED");
  console.log("STATUS: PHASE 4 INTEGRATION PASSED");
  console.log("=================================");
}

run().catch(error => {
  console.error("TEST FAILED");
  console.error(error.message);
  process.exit(1);
});
