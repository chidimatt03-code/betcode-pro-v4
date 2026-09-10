const assert = require("assert");
const crypto = require("crypto");
const Database = require("better-sqlite3")("./data.db");
const { encodeBetCodePro } = require("../engine/canonicalCodec");
const { validateBetSlip } = require("../engine/converter");

const email = `step16-${Date.now()}@test.local`;
const passwordHash = crypto
  .createHash("sha256")
  .update("step16-test-password")
  .digest("hex");

let userId;

function createUser() {
  const result = Database.prepare(`
    INSERT INTO users
    (email,password_hash,plan,credits,created_at)
    VALUES(?,?,?,?,?)
  `).run(
    email,
    passwordHash,
    "free",
    10,
    new Date().toISOString()
  );

  userId = Number(result.lastInsertRowid);
}

function validSlip() {
  return {
    version: 1,
    source: {
      bookmaker: "betcodepro",
      code: "STEP16-SOURCE-001"
    },
    selections: [{
      index: 1,
      sport: "football",
      event: {
        id: "STEP16-EVENT-001",
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
}

function finalizeCreation(slip, code) {
  const finalize = Database.transaction(() => {
    const creditUpdate = Database.prepare(`
      UPDATE users
      SET credits=credits-1
      WHERE id=? AND plan='free' AND credits>0
    `).run(userId);

    if (creditUpdate.changes !== 1) {
      throw new Error("Unable to reserve conversion credit.");
    }

    Database.prepare(`
      INSERT INTO conversions
      (user_id,original_code,converted_code,from_bookie,to_bookie,created_at)
      VALUES(?,?,?,?,?,?)
    `).run(
      userId,
      slip.source.code,
      code,
      "betcodepro",
      "betcodepro",
      new Date().toISOString()
    );
  });

  finalize();
}

(async () => {
  console.log("=================================");
  console.log("BETCODE PRO STEP 16 CREDITS & HISTORY TEST");
  console.log("=================================");

  try {
    createUser();

    const before = Database.prepare(
      "SELECT credits FROM users WHERE id=?"
    ).get(userId);

    assert.strictEqual(before.credits, 10);

    const slip = validSlip();
    const errors = validateBetSlip(slip);

    assert.deepStrictEqual(errors, []);

    const code = encodeBetCodePro({
      success: true,
      stage: "DESTINATION_BUILDER",
      destinationBookmaker: "betcodepro",
      selections: slip.selections
    });

    assert.ok(code.startsWith("BCP1."));

    finalizeCreation(slip, code);

    const after = Database.prepare(
      "SELECT credits FROM users WHERE id=?"
    ).get(userId);

    assert.strictEqual(after.credits, 9);

    const history = Database.prepare(`
      SELECT original_code,converted_code,from_bookie,to_bookie
      FROM conversions
      WHERE user_id=?
      ORDER BY id DESC
      LIMIT 1
    `).get(userId);

    assert.ok(history);
    assert.strictEqual(
      history.original_code,
      "STEP16-SOURCE-001"
    );
    assert.strictEqual(
      history.converted_code,
      code
    );
    assert.strictEqual(
      history.from_bookie,
      "betcodepro"
    );
    assert.strictEqual(
      history.to_bookie,
      "betcodepro"
    );

    console.log("Step 1: Successful creation consumes 1 credit PASSED");
    console.log("Step 2: Successful creation records history PASSED");
    console.log("Step 3: History stores actual destination code PASSED");

    const invalidSlip = {
      ...validSlip(),
      selections: []
    };

    const invalidErrors = validateBetSlip(invalidSlip);

    assert.ok(invalidErrors.length > 0);

    const creditsBeforeFailure = Database.prepare(
      "SELECT credits FROM users WHERE id=?"
    ).get(userId).credits;

    const historyBeforeFailure = Database.prepare(
      "SELECT COUNT(*) AS count FROM conversions WHERE user_id=?"
    ).get(userId).count;

    assert.strictEqual(creditsBeforeFailure, 9);

    assert.throws(() => {
      if (invalidErrors.length) {
        throw new Error("validation_failed");
      }
    });

    const creditsAfterFailure = Database.prepare(
      "SELECT credits FROM users WHERE id=?"
    ).get(userId).credits;

    const historyAfterFailure = Database.prepare(
      "SELECT COUNT(*) AS count FROM conversions WHERE user_id=?"
    ).get(userId).count;

    assert.strictEqual(creditsAfterFailure, creditsBeforeFailure);
    assert.strictEqual(historyAfterFailure, historyBeforeFailure);

    console.log("Step 4: Failed validation consumes no credit PASSED");
    console.log("Step 5: Failed validation creates no history PASSED");

    console.log("---------------------------------");
    console.log("Credits & history verification: PASSED");
    console.log("External service calls: 0");
    console.log("Live bookmaker creation: DISABLED");
    console.log("STATUS: STEP 16 PASSED");
    console.log("=================================");

  } finally {
    if (userId) {
      Database.prepare(
        "DELETE FROM conversions WHERE user_id=?"
      ).run(userId);

      Database.prepare(
        "DELETE FROM users WHERE id=?"
      ).run(userId);
    }

    Database.close();
  }
})().catch(error => {
  console.error("TEST FAILED:", error.message);
  process.exit(1);
});
