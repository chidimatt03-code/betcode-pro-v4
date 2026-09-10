const assert = require("assert");

const {
  getInternalDestinationAdapter,
  internalDestinationAdapterStatus,
  setInternalDestinationAdapter
} = require("../engine/internalDestinationAdapters");

async function run() {
  console.log("=================================");
  console.log("INTERNAL DESTINATION ADAPTER TEST");
  console.log("=================================");

  for (const bookmaker of ["sportybet", "bet9ja", "betking"]) {
    const adapter = getInternalDestinationAdapter(bookmaker);

    assert.strictEqual(adapter.bookmaker, bookmaker);

    const status = internalDestinationAdapterStatus(bookmaker);

    assert.deepStrictEqual(status, {
      bookmaker,
      available: true,
      internal: true,
      externalCalls: false
    });

    console.log(`${bookmaker}: REGISTRY PASSED`);
  }

  await assert.rejects(
    () =>
      getInternalDestinationAdapter("betking").createBookingCode({
        success: true,
        destinationBookmaker: "betking",
        selections: []
      }),
    /destination creation is not implemented yet/
  );

  console.log("Unimplemented adapter protection: PASSED");

  assert.throws(
    () =>
      getInternalDestinationAdapter("unsupported"),
    /Unsupported internal destination adapter/
  );

  assert.throws(
    () =>
      setInternalDestinationAdapter("betking", {}),
    /Invalid internal destination adapter/
  );

  console.log("Adapter validation guards: PASSED");

  const originalBetkingAdapter =
    getInternalDestinationAdapter("betking");

  setInternalDestinationAdapter("betking", {
    bookmaker: "betking",

    async createBookingCode(slip) {
      return {
        success: true,
        status: "TEST_ONLY",
        bookmaker: slip.destinationBookmaker,
        selections: slip.selections.length
      };
    }
  });

  try {
    const adapter =
      getInternalDestinationAdapter("betking");

    const result =
      await adapter.createBookingCode({
        success: true,
        stage: "DESTINATION_BUILDER",
        destinationBookmaker: "betking",
        selections: [
          { index: 1 },
          { index: 2 }
        ]
      });

    assert.deepStrictEqual(result, {
      success: true,
      status: "TEST_ONLY",
      bookmaker: "betking",
      selections: 2
    });

    console.log("Destination adapter success path: PASSED");
  } finally {
    setInternalDestinationAdapter(
      "betking",
      originalBetkingAdapter
    );
  }

  console.log("---------------------------------");
  console.log("STATUS: INTERNAL DESTINATION ADAPTER TEST PASSED");
  console.log("External calls: 0");
  console.log("Live bookmaker creation: DISABLED");
  console.log("=================================");
}

run().catch(error => {
  console.error("TEST FAILED");
  console.error(error);
  process.exit(1);
});
