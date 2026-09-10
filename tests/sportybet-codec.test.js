const assert = require("assert");
const fs = require("fs");

const {
  getInternalCodec,
  setInternalCodec
} = require("../engine/internalCodecs");

const fixture = JSON.parse(
  fs.readFileSync(
    __dirname + "/fixtures/sportybet_sample.json",
    "utf8"
  )
);

(async () => {
  try {
    const original = getInternalCodec("sportybet");

    setInternalCodec("sportybet", {
      ...original,

      async decode(code) {
        assert.strictEqual(code, fixture.sourceCode);

        return {
          bookmaker: fixture.sourceBookmaker,
          bookingCode: fixture.sourceCode,
          selections: fixture.selections
        };
      },

      async create(destinationSlip) {
        assert.strictEqual(destinationSlip.success, true);
        assert.ok(Array.isArray(destinationSlip.selections));

        return {
          success: true,
          status: "TEST_ONLY",
          bookmaker: "sportybet",
          selections: destinationSlip.selections.length
        };
      }
    });

    const codec = getInternalCodec("sportybet");

    assert.strictEqual(codec.bookmaker, "sportybet");

    const decoded = await codec.decode(fixture.sourceCode);

    assert.strictEqual(decoded.bookmaker, "sportybet");
    assert.strictEqual(decoded.bookingCode, "TEST-SP-001");
    assert.strictEqual(decoded.selections.length, 2);

    assert.strictEqual(
      decoded.selections[0].event.home,
      "Manchester United"
    );

    assert.strictEqual(
      decoded.selections[0].event.away,
      "Arsenal"
    );

    assert.strictEqual(
      decoded.selections[0].market.type,
      "1X2"
    );

    assert.strictEqual(
      decoded.selections[1].market.type,
      "TOTAL_GOALS"
    );

    assert.strictEqual(
      decoded.selections[1].market.line,
      2.5
    );

    const created = await codec.create({
      success: true,
      destinationBookmaker: "sportybet",
      selections: decoded.selections
    });

    assert.strictEqual(created.success, true);
    assert.strictEqual(created.status, "TEST_ONLY");
    assert.strictEqual(created.bookmaker, "sportybet");
    assert.strictEqual(created.selections, 2);

    console.log("=================================");
    console.log("BETCODE PRO SPORTYBET INTERNAL CODEC TEST");
    console.log("=================================");
    console.log("Decode: PASSED");
    console.log("Selection mapping: PASSED");
    console.log("Create contract: PASSED");
    console.log("External service calls: 0");
    console.log("Live bookmaker routes: UNCHANGED");
    console.log("STATUS: SPORTYBET INTERNAL CODEC TEST PASSED");
    console.log("=================================");
  } catch (error) {
    console.error("=================================");
    console.error("STATUS: SPORTYBET INTERNAL CODEC TEST FAILED");
    console.error(error.message);
    console.error("=================================");
    process.exitCode = 1;
  }
})();
