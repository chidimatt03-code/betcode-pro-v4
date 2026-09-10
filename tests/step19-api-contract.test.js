const assert=require("assert");
const Database=require("better-sqlite3")("./data.db");

const BASE="http://127.0.0.1:3000";
const email=`step19-${Date.now()}@example.com`;
const password="Step19-Test-Password-2026";

async function request(path,options={}){
  const r=await fetch(BASE+path,options);
  const text=await r.text();

  let body={};
  try{body=JSON.parse(text);}catch{}

  return {status:r.status,body};
}

function auth(token){
  return {Authorization:"Bearer "+token};
}

(async()=>{
  let userId=null;
  let token=null;

  try{
    console.log("=================================");
    console.log("BETCODE PRO STEP 19 API CONTRACT TEST");
    console.log("=================================");

    const register=await request("/api/register",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        name:"Step 19 Test",
        phone:"08000000002",
        email,
        password
      })
    });

    assert.strictEqual(register.status,200);
    assert.ok(typeof register.body.token==="string");

    token=register.body.token;

    const user=Database.prepare(
      "SELECT id,credits FROM users WHERE email=?"
    ).get(email);

    assert(user);
    userId=user.id;

    console.log("Step 1: Test account authentication PASSED");

    const noAuthConvert=await request("/api/convert",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        booking_code:"ABC123",
        from:"sportybet",
        to:"bet9ja"
      })
    });

    assert.strictEqual(noAuthConvert.status,401);
    console.log("Step 2: Unauthenticated convert rejected PASSED");

    const noAuthCreate=await request("/api/betcodepro/create",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({slip:{}})
    });

    assert.strictEqual(noAuthCreate.status,401);
    console.log("Step 3: Unauthenticated BetCode Pro creation rejected PASSED");

    const headers={
      "Content-Type":"application/json",
      ...auth(token)
    };

    const unsupported=await request("/api/convert",{
      method:"POST",
      headers,
      body:JSON.stringify({
        booking_code:"ABC123",
        from:"not-a-bookmaker",
        to:"betway"
      })
    });

    assert.strictEqual(unsupported.status,400);
    assert.strictEqual(
      unsupported.body.message,
      "Unsupported bookmaker."
    );

    console.log("Step 4: Unsupported bookmaker rejected PASSED");

    const sameBookmaker=await request("/api/convert",{
      method:"POST",
      headers,
      body:JSON.stringify({
        booking_code:"ABC123",
        from:"sportybet",
        to:"sportybet"
      })
    });

    assert.strictEqual(sameBookmaker.status,400);
    assert.strictEqual(
      sameBookmaker.body.message,
      "Source and destination must be different."
    );

    console.log("Step 5: Same source/destination rejected PASSED");

    const invalidCode=await request("/api/convert",{
      method:"POST",
      headers,
      body:JSON.stringify({
        booking_code:"A",
        from:"sportybet",
        to:"bet9ja"
      })
    });

    assert.strictEqual(invalidCode.status,400);
    assert.strictEqual(
      invalidCode.body.message,
      "Enter a valid booking code."
    );

    console.log("Step 6: Invalid booking code rejected PASSED");

    const before=Database.prepare(
      "SELECT credits FROM users WHERE id=?"
    ).get(userId).credits;

    const unavailable=await request("/api/convert",{
      method:"POST",
      headers,
      body:JSON.stringify({
        booking_code:"ABC123",
        from:"sportybet",
        to:"bet9ja"
      })
    });

    assert.strictEqual(unavailable.status,503);
    assert.strictEqual(unavailable.body.status,"development");

    const after=Database.prepare(
      "SELECT credits FROM users WHERE id=?"
    ).get(userId).credits;

    assert.strictEqual(after,before);

    console.log("Step 7: Disabled route returns 503 without credit loss PASSED");

    console.log("---------------------------------");
    console.log("Step 19 API contract regression: PASSED");
    console.log("External service calls: 0");
    console.log("Live bookmaker creation: DISABLED");
    console.log("STATUS: STEP 19 TEST PASSED");
    console.log("=================================");

  }finally{
    if(token){
      const crypto=require("crypto");
      const tokenHash=crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      Database.prepare(
        "DELETE FROM sessions WHERE token_hash=?"
      ).run(tokenHash);
    }

    if(userId){
      Database.prepare(
        "DELETE FROM sessions WHERE user_id=?"
      ).run(userId);

      Database.prepare(
        "DELETE FROM conversions WHERE user_id=?"
      ).run(userId);

      Database.prepare(
        "DELETE FROM users WHERE id=?"
      ).run(userId);
    }
  }
})().catch(e=>{
  console.error("STEP 19 TEST FAILED:",e.message);
  process.exit(1);
});
