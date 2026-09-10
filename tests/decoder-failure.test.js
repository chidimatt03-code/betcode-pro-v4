const assert = require("assert");

const { decodeSourceBookingCode } = require("../engine/decoder");
const { getInternalCodec, setInternalCodec } = require("../engine/internalCodecs");

const original = getInternalCodec("sportybet");

setInternalCodec("sportybet", {
  ...original,

  async decode() {
    throw new Error(
      "BetCode Pro internal SportyBet decode codec is not implemented yet."
    );
  }
});

(async () => {
  const result = await decodeSourceBookingCode(
    "sportybet",
    "TEST-FAIL-001"
  );

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.stage, "SOURCE_DECODER");
  assert.strictEqual(result.bookmaker, "sportybet");
  assert.strictEqual(
    result.error,
    "BetCode Pro internal SportyBet decode codec is not implemented yet."
  );

  console.log("=================================");
  console.log("BETCODE PRO DECODER FAILURE TEST");
  console.log("=================================");
  console.log("Status: PASSED");
  console.log("Failure captured: PASSED");
  console.log("Stage:", result.stage);
  console.log("Bookmaker:", result.bookmaker);
  console.log("Error:", result.error);
  console.log("=================================");
})().catch(error => {
  console.error("DECODER FAILURE TEST FAILED");
  console.error(error);
  process.exit(1);
});
