const assert = require("assert");

const {
  createBookmakerCodec
} = require("../engine/bookmakerCodec");

const {
  encodeBetCodePro,
  decodeBetCodePro
} = require("../engine/canonicalCodec");

const {
  normalizeBookmakerSlip
} = require("../engine/bookmakerNormalizer");

const {
  convertBetSlip
} = require("../engine/pipeline");

const {
  buildDestinationSlip
} = require("../engine/destinationBuilder");

const {
  createDestinationAdapter
} = require("../engine/destinationAdapter");

async function run() {
  console.log("=================================");
  console.log("BETCODE PRO STEP 14 NATIVE FULL FLOW TEST");
  console.log("=================================");

  const sourceSlip = {
    version: 1,

    source: {
      bookmaker: "betcodepro",
      code: "STEP14-SOURCE"
    },

    selections: [{
      index: 1,

      sport: "football",

      event: {
        id: "BCP-STEP14-001",
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

  const sourceCodec = createBookmakerCodec({
    bookmaker: "betcodepro",
    decodeBookingCode: decodeBetCodePro,
    createBookingCode: encodeBetCodePro
  });

  const sourceCode =
    await sourceCodec.create({
      success: true,
      destinationBookmaker: "betcodepro",
      selections: sourceSlip.selections
    });

  assert.ok(
    sourceCode.startsWith("BCP1."),
    "Native source code was not created."
  );

  console.log("Step 1: Native BetCode Pro code creation PASSED");

  const decoded =
    await sourceCodec.decode(sourceCode);

  assert.strictEqual(decoded.version, 1);
  assert.strictEqual(decoded.selections.length, 1);
  assert.strictEqual(
    decoded.selections[0].event.home,
    "Arsenal"
  );
  assert.strictEqual(
    decoded.selections[0].event.away,
    "Chelsea"
  );

  console.log("Step 2: Native code decoding PASSED");

  const normalized =
    normalizeBookmakerSlip({
      bookmaker: "betcodepro",
      code: sourceCode,
      selections: decoded.selections
    });

  assert.strictEqual(normalized.bookmaker, "betcodepro");
  assert.strictEqual(normalized.bookingCode, sourceCode);
  assert.strictEqual(normalized.selections.length, 1);

  console.log("Step 3: Internal normalization PASSED");

  const converted =
    convertBetSlip({
      sourceBookmaker: "sportybet",
      destinationBookmaker: "betking",
      sourceCode,
      normalizedSlip: {
        source: {
          bookmaker: "sportybet",
          code: normalized.bookingCode
        },
        selections: normalized.selections
      },
      destinationEvents: [{
        id: "BCP-STEP14-001",
        home: "Arsenal",
        away: "Chelsea",
        competition: "Premier League",
        startTime: "2026-09-12T15:00:00Z"
      }]
    });

  assert.strictEqual(converted.success, true);
  assert.strictEqual(converted.selections.length, 1);

  console.log("Step 4: Internal conversion PASSED");

  const destination =
    buildDestinationSlip({
      destinationBookmaker: "betcodepro",
      converted
    });

  assert.strictEqual(destination.success, true);
  assert.strictEqual(destination.selections.length, 1);

  console.log("Step 5: Destination builder PASSED");

  const destinationAdapter =
    createDestinationAdapter({
      bookmaker: "betking",

      async createBookingCode(slip) {
        const code =
          await sourceCodec.create(slip);

        return {
          success: true,
          status: "created",
          bookmaker: "betking",
          code,
          selections: slip.selections.length
        };
      }
    });

  const finalResult =
    await destinationAdapter.createBookingCode(
      destination
    );

  assert.strictEqual(finalResult.success, true);
  assert.strictEqual(finalResult.status, "created");
  assert.strictEqual(finalResult.bookmaker, "betking");
  assert.ok(finalResult.code.startsWith("BCP1."));
  assert.strictEqual(finalResult.selections, 1);

  console.log("Step 6: Native destination code creation PASSED");

  const finalDecoded =
    await decodeBetCodePro(finalResult.code);

  assert.strictEqual(finalDecoded.version, 1);
  assert.strictEqual(finalDecoded.selections.length, 1);
  assert.strictEqual(
    finalDecoded.selections[0].event.home,
    "Arsenal"
  );
  assert.strictEqual(
    finalDecoded.selections[0].event.away,
    "Chelsea"
  );

  console.log("Step 7: Final code verification PASSED");

  console.log("---------------------------------");
  console.log("Native full flow: PASSED");
  console.log("Create -> Decode -> Normalize -> Convert -> Build -> Create -> Verify");
  console.log("External service calls: 0");
  console.log("Live bookmaker creation: DISABLED");
  console.log("STATUS: STEP 14 PASSED");
  console.log("=================================");
}

run().catch(error => {
  console.error("TEST FAILED:", error.message);
  process.exit(1);
});
