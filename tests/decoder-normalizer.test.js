const assert = require("assert");
const fs = require("fs");

const { decodeSourceBookingCode } = require("../engine/decoder");
const { normalizeDecodedSlip } = require("../engine/slipNormalizer");

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
  const decoded = await decodeSourceBookingCode(
    fixture.sourceBookmaker,
    fixture.sourceCode
  );

  assert.strictEqual(decoded.success, true);

  const normalized = normalizeDecodedSlip({
    sourceBookmaker: decoded.bookmaker,
    sourceCode: fixture.sourceCode,
    decodedSlip: decoded.slip
  });

  assert.strictEqual(normalized.success, true);
  assert.strictEqual(
    normalized.slip.source.bookmaker,
    "sportybet"
  );
  assert.strictEqual(
    normalized.slip.source.code,
    fixture.sourceCode
  );
  assert.strictEqual(
    normalized.slip.selections.length,
    2
  );

  console.log("=================================");
  console.log("DECODER → NORMALIZER TEST");
  console.log("=================================");
  console.log("Status: PASSED");
  console.log("Decoded: PASSED");
  console.log("Normalized: PASSED");
  console.log("Selections:", normalized.slip.selections.length);
  console.log("Source:", normalized.slip.source.bookmaker);
  console.log("=================================");
})().catch(error => {
  console.error("DECODER → NORMALIZER TEST FAILED");
  console.error(error);
  process.exit(1);
});
