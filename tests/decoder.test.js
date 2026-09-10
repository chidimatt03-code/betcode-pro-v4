const assert = require("assert");
const fs = require("fs");

const { decodeSourceBookingCode } = require("../engine/decoder");

const fixture = JSON.parse(
  fs.readFileSync(
    __dirname + "/fixtures/sportybet_sample.json",
    "utf8"
  )
);

const { getInternalCodec, setInternalCodec } = require("../engine/internalCodecs");

const original = getInternalCodec("sportybet");

setInternalCodec("sportybet", {
  ...original,

  async decode(code) {
    assert.strictEqual(code, fixture.sourceCode);

    return {
      selections: fixture.selections
    };
  }
});

(async () => {
  const result = await decodeSourceBookingCode(
    fixture.sourceBookmaker,
    fixture.sourceCode
  );

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.bookmaker, "sportybet");
  assert.ok(result.slip);
  assert.ok(Array.isArray(result.slip.selections));
  assert.strictEqual(result.slip.selections.length, 2);

  assert.strictEqual(
    result.slip.selections[0].market.type,
    "1X2"
  );

  assert.strictEqual(
    result.slip.selections[1].market.type,
    "TOTAL_GOALS"
  );

  assert.strictEqual(
    result.slip.selections[1].market.line,
    2.5
  );

  console.log("=================================");
  console.log("BETCODE PRO SOURCE DECODER TEST");
  console.log("=================================");
  console.log("Status: PASSED");
  console.log("Bookmaker:", result.bookmaker);
  console.log("Selections:", result.slip.selections.length);
  console.log("Market 1:", result.slip.selections[0].market.type);
  console.log("Market 2:", result.slip.selections[1].market.type);
  console.log("Line 2:", result.slip.selections[1].market.line);
  console.log("=================================");
})().catch(error => {
  console.error("DECODER TEST FAILED");
  console.error(error);
  process.exit(1);
});
