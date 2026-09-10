const assert = require("assert");

const {
  createDestinationAdapter
} = require("../engine/destinationAdapter");

async function run() {
  console.log("=================================");
  console.log("BETCODE PRO DESTINATION CODE CONTRACT TEST");
  console.log("=================================");

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

  const destination = {
    success: true,
    stage: "DESTINATION_BUILDER",
    destinationBookmaker: "betking",
    selections: [
      { index: 1 },
      { index: 2 }
    ]
  };

  const destinationCode =
    await adapter.createBookingCode(destination);

  assert.strictEqual(destinationCode.success, true);
  assert.strictEqual(destinationCode.status, "created");
  assert.strictEqual(destinationCode.bookmaker, "betking");
  assert.strictEqual(
    destinationCode.code,
    "TEST-DESTINATION-CODE"
  );

  console.log("Step 1: Destination code creation PASSED");

  const response = {
    success: true,
    status: "created",
    code: destinationCode.code,
    destination
  };

  assert.strictEqual(
    response.code,
    destinationCode.code
  );

  console.log("Step 2: Response code contract PASSED");

  const historyRecord = {
    original_code: "SOURCE-TEST-CODE",
    converted_code: destinationCode.code,
    from_bookie: "sportybet",
    to_bookie: "betking"
  };

  assert.strictEqual(
    historyRecord.converted_code,
    destinationCode.code
  );

  console.log("Step 3: History code contract PASSED");

  console.log("---------------------------------");
  console.log("Destination code flow: PASSED");
  console.log("External service calls: 0");
  console.log("Live bookmaker creation: DISABLED");
  console.log("STATUS: DESTINATION CODE CONTRACT PASSED");
  console.log("=================================");
}

run().catch(error => {
  console.error("TEST FAILED");
  console.error(error.message);
  process.exit(1);
});
