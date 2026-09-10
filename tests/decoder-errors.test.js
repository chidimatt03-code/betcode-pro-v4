const assert = require("assert");

const { decodeSourceBookingCode } = require("../engine/decoder");

(async () => {
  const missingCode = await decodeSourceBookingCode(
    "sportybet",
    ""
  );

  assert.strictEqual(missingCode.success, false);
  assert.strictEqual(missingCode.stage, "SOURCE_DECODER");
  assert.strictEqual(
    missingCode.error,
    "Booking code is missing."
  );

  const whitespaceCode = await decodeSourceBookingCode(
    "sportybet",
    "   "
  );

  assert.strictEqual(whitespaceCode.success, false);
  assert.strictEqual(whitespaceCode.stage, "SOURCE_DECODER");

  const unsupportedBookmaker = await decodeSourceBookingCode(
    "unknownbookmaker",
    "TEST123"
  );

  assert.strictEqual(
    unsupportedBookmaker.success,
    false
  );

  console.log("=================================");
  console.log("BETCODE PRO DECODER ERROR TEST");
  console.log("=================================");
  console.log("Missing code: PASSED");
  console.log("Whitespace code: PASSED");
  console.log("Unsupported bookmaker: PASSED");
  console.log("=================================");
})().catch(error => {
  console.error("DECODER ERROR TEST FAILED");
  console.error(error);
  process.exit(1);
});
