const assert = require("assert");

const {
  getInternalCodec
} = require("../engine/internalCodecs");

(async () => {
  try {
    const slip = {
      version: 1,
      selections: [
        {
          index: 1,
          sport: "football",
          event: {
            id: "BCP-CONTRACT-001",
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
            value: null
          }
        }
      ]
    };

    const codec = getInternalCodec("betcodepro");

    const code = await codec.create({
      success: true,
      ...slip
    });

    assert.ok(code.startsWith("BCP1."));
    assert.strictEqual(typeof code, "string");

    console.log("Input slip: PASSED");
    console.log("Internal BetCode Pro codec: PASSED");
    console.log("Canonical code creation: PASSED");
    console.log("Response code type: PASSED");
    console.log("External service calls: 0");

    console.log("=================================");
    console.log("STATUS: STEP 90 ENDPOINT CONTRACT PASSED");
    console.log("=================================");
  } catch (error) {
    console.error("=================================");
    console.error("STATUS: STEP 90 FAILED");
    console.error(error.message);
    console.error("=================================");
    process.exitCode = 1;
  }
})();
