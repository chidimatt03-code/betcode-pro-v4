const assert = require("assert");
const { createBookmakerCodec } = require("../engine/bookmakerCodec");
const { encodeBetCodePro, decodeBetCodePro } = require("../engine/canonicalCodec");
const { validateBetSlip } = require("../engine/converter");

let externalCalls = 0;

async function createNativeBetCodePro(slip) {
  const errors = validateBetSlip(slip);

  if (errors.length) {
    return {
      success: false,
      status: "validation_failed",
      errors
    };
  }

  const codec = createBookmakerCodec({
    bookmaker: "betcodepro",
    decodeBookingCode: decodeBetCodePro,
    createBookingCode: encodeBetCodePro
  });

  const destination = {
    success: true,
    stage: "DESTINATION_BUILDER",
    destinationBookmaker: "betcodepro",
    selections: slip.selections
  };

  const code = await codec.create(destination);

  return {
    success: true,
    status: "created",
    code,
    selections: slip.selections.length
  };
}

(async()=>{
  const slip = {
    version: 1,
    source: {
      bookmaker: "betcodepro",
      code: "NATIVE-TEST-001"
    },
    selections: [{
      index: 1,
      sport: "football",
      event: {
        id: "BCP-NATIVE-001",
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
    }]
  };

  const result = await createNativeBetCodePro(slip);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, "created");
  assert.strictEqual(result.selections, 1);
  assert.ok(result.code.startsWith("BCP1."));

  const decoded = decodeBetCodePro(result.code);

  assert.strictEqual(decoded.version, 1);
  assert.strictEqual(decoded.selections.length, 1);
  assert.strictEqual(decoded.selections[0].event.home, "Arsenal");
  assert.strictEqual(decoded.selections[0].event.away, "Chelsea");

  assert.strictEqual(externalCalls, 0);

  console.log("BetCode Pro native create endpoint contract test passed.");
  console.log("External calls:", externalCalls);
})();
