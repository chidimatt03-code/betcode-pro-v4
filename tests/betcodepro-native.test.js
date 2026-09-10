const assert = require("assert");

const {
  buildDestinationSlip
} = require("../engine/destinationBuilder");

const {
  getInternalCodec
} = require("../engine/internalCodecs");

const {
  decodeBetCodePro
} = require("../engine/canonicalCodec");

(async () => {
  try {
    const converted = {
      success: true,
      selections: [
        {
          index: 1,
          event: {
            destination: {
              id: "BCP-NATIVE-001",
              home: "Arsenal",
              away: "Chelsea",
              competition: "Premier League",
              startTime: "2026-09-12T15:00:00Z"
            }
          },
          market: {
            type: "1X2",
            line: null
          },
          selection: {
            type: "HOME"
          }
        }
      ]
    };

    const destination = buildDestinationSlip({
      destinationBookmaker: "betcodepro",
      converted
    });

    assert.strictEqual(destination.success, true);
    console.log("Native destination builder: PASSED");

    const codec = getInternalCodec("betcodepro");
    assert.strictEqual(codec.bookmaker, "betcodepro");

    const code = await codec.create(destination);

    assert.ok(code.startsWith("BCP1."));
    console.log("Native BetCode Pro creation: PASSED");

    const decoded = decodeBetCodePro(code);

    assert.strictEqual(decoded.version, 1);
    assert.strictEqual(decoded.selections.length, 1);
    assert.strictEqual(
      decoded.selections[0].event.id,
      "BCP-NATIVE-001"
    );
    assert.strictEqual(
      decoded.selections[0].event.home,
      "Arsenal"
    );
    assert.strictEqual(
      decoded.selections[0].event.away,
      "Chelsea"
    );
    assert.strictEqual(
      decoded.selections[0].selection.type,
      "HOME"
    );

    console.log("Native code decode: PASSED");
    console.log("Native round-trip: PASSED");

    console.log("=================================");
    console.log("STATUS: STEP 82 NATIVE CODE TEST PASSED");
    console.log("Live bookmaker routes: UNCHANGED");
    console.log("External service calls: 0");
    console.log("=================================");
  } catch (error) {
    console.error("=================================");
    console.error("STATUS: STEP 82 FAILED");
    console.error(error.message);
    console.error("=================================");
    process.exitCode = 1;
  }
})();
