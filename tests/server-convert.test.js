const assert = require("assert");

const routes = require("../engine/routes");

console.log("=================================");
console.log("BETCODE PRO PHASE 5 SERVER TEST");
console.log("=================================");

try {
  // Verify all development routes remain disabled.
  const pairs = [
    ["sportybet", "bet9ja"],
    ["bet9ja", "sportybet"],
    ["sportybet", "betking"],
    ["betking", "sportybet"],
    ["bet9ja", "betking"],
    ["betking", "bet9ja"]
  ];

  for (const [from, to] of pairs) {
    assert.strictEqual(
      routes.isLiveRoute(from, to),
      false,
      `${from} -> ${to} must remain disabled`
    );
  }

  console.log("Step 1: Live route protection PASSED");

  // Verify the route registry contains the expected development routes.
  for (const [from, to] of pairs) {
    const route = routes.getRoute(from, to);

    assert.ok(route, `Missing route: ${from} -> ${to}`);
    assert.strictEqual(route.status, "development");
    assert.strictEqual(route.sourceDecode, false);
    assert.strictEqual(route.destinationCreate, false);
  }

  console.log("Step 2: Development route registry PASSED");

  console.log("---------------------------------");
  console.log("Server conversion safeguards: PASSED");
  console.log("Live bookmaker creation: DISABLED");
  console.log("STATUS: PHASE 5 SERVER TEST PASSED");
  console.log("=================================");

} catch (e) {
  console.error("TEST FAILED:", e.message);
  process.exit(1);
}
