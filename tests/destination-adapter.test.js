const { createDestinationAdapter } = require("../engine/destinationAdapter");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log("=================================");
  console.log("BETCODE PRO DESTINATION ADAPTER TEST");
  console.log("=================================");

  let passed = 0;

  // Test 1: valid adapter
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

  assert(
    adapter.bookmaker === "betking",
    "Test 1 failed: bookmaker was not normalized."
  );

  const testResult = await adapter.createBookingCode({
    success: true,
    destinationBookmaker: "betking",
    selections: [{ index: 1 }]
  });

  assert(
    testResult &&
    testResult.success === true &&
    testResult.status === "created" &&
    testResult.bookmaker === "betking" &&
    typeof testResult.code === "string" &&
    testResult.code.length > 0,
    "Test 1 failed: invalid destination creation result."
  );

  passed++;
  console.log("Test 1: Valid adapter PASSED");

  // Test 2: missing bookmaker
  try {
    createDestinationAdapter({
      bookmaker: "",
      async createBookingCode() {}
    });

    throw new Error("Test 2 failed: missing bookmaker was accepted.");
  } catch (error) {
    assert(
      error.message === "Destination bookmaker is missing.",
      "Test 2 failed: wrong error for missing bookmaker."
    );
  }

  passed++;
  console.log("Test 2: Missing bookmaker PASSED");

  // Test 3: missing createBookingCode
  try {
    createDestinationAdapter({
      bookmaker: "betking"
    });

    throw new Error(
      "Test 3 failed: missing createBookingCode was accepted."
    );
  } catch (error) {
    assert(
      error.message.includes(
        "must provide createBookingCode()"
      ),
      "Test 3 failed: wrong error for missing createBookingCode."
    );
  }

  passed++;
  console.log("Test 3: Missing createBookingCode PASSED");

  // Test 4: missing destination slip
  try {
    await adapter.createBookingCode(null);

    throw new Error(
      "Test 4 failed: missing destination slip was accepted."
    );
  } catch (error) {
    assert(
      error.message === "Destination slip is missing.",
      "Test 4 failed: wrong error for missing destination slip."
    );
  }

  passed++;
  console.log("Test 4: Missing destination slip PASSED");

  // Test 5: destination slip not ready
  try {
    await adapter.createBookingCode({
      success: false
    });

    throw new Error(
      "Test 5 failed: unsuccessful destination slip was accepted."
    );
  } catch (error) {
    assert(
      error.message === "Destination slip is not ready.",
      "Test 5 failed: wrong error for unsuccessful destination slip."
    );
  }

  passed++;
  console.log("Test 5: Unsuccessful destination slip PASSED");

  console.log("---------------------------------");
  console.log(`Passed: ${passed}/5`);
  console.log("STATUS: ALL DESTINATION ADAPTER TESTS PASSED");
  console.log("=================================");
}

run().catch(error => {
  console.error("TEST FAILED");
  console.error(error.message);
  process.exit(1);
});
