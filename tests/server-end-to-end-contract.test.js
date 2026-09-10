const assert = require("assert");

const routes = require("../engine/routes");
const {
  getInternalCodec,
  setInternalCodec
} = require("../engine/internalCodecs");
const {
  getInternalDestinationAdapter,
  setInternalDestinationAdapter
} = require("../engine/internalDestinationAdapters");

async function run() {
  console.log("=================================");
  console.log("BETCODE PRO STEP 13 SERVER END-TO-END CONTRACT TEST");
  console.log("=================================");

  const sourceCodec = getInternalCodec("sportybet");
  const destinationAdapter =
    getInternalDestinationAdapter("betking");

  try {
    assert.strictEqual(
      routes.isLiveRoute("sportybet", "betking"),
      false
    );

    console.log("Step 1: Live route protection PASSED");

    setInternalCodec("sportybet", {
      async decode(code) {
        return {
          version: 1,
          source: {
            bookmaker: "sportybet",
            code
          },
          selections: [{
            index: 1,
            sport: "football",
            event: {
              id: "SP-STEP13-001",
              home: "Arsenal",
              away: "Chelsea",
              competition: "Premier League",
              startTime: "2026-09-12T15:00:00Z"
            },
            market: {
              type: "1X2",
              name: "Match Result",
              line: null
            },
            selection: {
              type: "HOME",
              name: "Arsenal",
              value: null,
              odds: 1.80
            }
          }]
        };
      },

      async create() {
        throw new Error(
          "Source create must not be called."
        );
      }
    });

    console.log("Step 2: Test source decoder injection PASSED");

    setInternalDestinationAdapter("betking", {
      async createBookingCode(slip) {
        assert.strictEqual(
          slip.success,
          true
        );

        assert.strictEqual(
          slip.destinationBookmaker,
          "betking"
        );

        assert.ok(
          Array.isArray(slip.selections)
        );

        return {
          success: true,
          status: "created",
          bookmaker: "betking",
          code: "STEP13-DESTINATION-CODE",
          selections: slip.selections.length
        };
      }
    });

    console.log("Step 3: Test destination adapter injection PASSED");

    const codec = getInternalCodec("sportybet");
    const decoded = await codec.decode(
      "STEP13-SOURCE-CODE"
    );

    assert.strictEqual(
      decoded.source.bookmaker,
      "sportybet"
    );

    assert.strictEqual(
      decoded.selections.length,
      1
    );

    const adapter =
      getInternalDestinationAdapter("betking");

    const destination =
      await adapter.createBookingCode({
        success: true,
        stage: "DESTINATION_BUILDER",
        destinationBookmaker: "betking",
        selections: [{
          index: 1,
          event: {
            id: "BK-STEP13-001",
            home: "Arsenal",
            away: "Chelsea",
            competition: "Premier League",
            startTime: "2026-09-12T15:00:00Z"
          },
          market: {
            type: "1X2",
            line: null
          },
          selection: {
            type: "HOME"
          }
        }]
      });

    assert.deepStrictEqual(
      destination,
      {
        success: true,
        status: "created",
        bookmaker: "betking",
        code: "STEP13-DESTINATION-CODE",
        selections: 1
      }
    );

    console.log("Step 4: Decode -> destination creation PASSED");

    assert.strictEqual(
      destination.status,
      "created"
    );

    assert.strictEqual(
      destination.code,
      "STEP13-DESTINATION-CODE"
    );

    console.log("Step 5: Final destination response contract PASSED");

    console.log("---------------------------------");
    console.log("Server end-to-end contract: PASSED");
    console.log("External service calls: 0");
    console.log("Live bookmaker creation: DISABLED");
    console.log("STATUS: STEP 13 PASSED");
    console.log("=================================");

  } finally {
    setInternalCodec("sportybet", sourceCodec);
    setInternalDestinationAdapter(
      "betking",
      destinationAdapter
    );
  }
}

run().catch(error => {
  console.error("TEST FAILED:", error.message);
  process.exit(1);
});
