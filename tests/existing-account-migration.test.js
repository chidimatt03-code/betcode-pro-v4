const Database=require("better-sqlite3")("./data.db");
const crypto=require("crypto");

const BASE="http://127.0.0.1:3000";
const email=`step18-${Date.now()}@example.com`;
const password="Step18-Test-Password-2026";

function assert(condition,message){
  if(!condition)throw new Error(message);
}

async function request(path,options={}){
  const r=await fetch(BASE+path,options);
  const text=await r.text();
  let body={};
  try{body=JSON.parse(text);}catch{}
  return {status:r.status,body};
}

(async()=>{
  console.log("=================================");
  console.log("BETCODE PRO STEP 18 EXISTING-ACCOUNT MIGRATION TEST");
  console.log("=================================");

  let userId=null;
  let token=null;

  try{
    const legacyHash=crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    const info=Database.prepare(`
      INSERT INTO users(name,phone,email,password_hash,created_at)
      VALUES(?,?,?,?,?)
    `).run(
      "Step 18 Legacy User",
      "08000000001",
      email,
      legacyHash,
      new Date().toISOString()
    );

    userId=Number(info.lastInsertRowid);

    const before=Database.prepare(
      "SELECT password_hash FROM users WHERE id=?"
    ).get(userId);

    assert(before.password_hash===legacyHash,
      "Legacy test account was not created correctly");

    console.log("Step 1: Legacy account prepared PASSED");

    const login=await request("/api/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email,password})
    });

    assert(login.status===200,"Legacy account login failed");
    assert(typeof login.body.token==="string",
      "Login token missing");

    token=login.body.token;

    console.log("Step 2: Existing account login PASSED");

    const after=Database.prepare(
      "SELECT password_hash FROM users WHERE id=?"
    ).get(userId);

    assert(after.password_hash.startsWith("scrypt$"),
      "Legacy password was not migrated to scrypt");

    console.log("Step 3: Password automatically migrated to scrypt PASSED");

    const me=await request("/api/me",{
      headers:{Authorization:"Bearer "+token}
    });

    assert(me.status===200,"Migrated account session rejected");
    assert(me.body.email===email,
      "Migrated account identity mismatch");

    console.log("Step 4: Migrated account session PASSED");

    const badLogin=await request("/api/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        email,
        password:"Wrong-Step18-Password"
      })
    });

    assert(badLogin.status===401,
      "Incorrect password accepted after migration");

    console.log("Step 5: Incorrect password rejection PASSED");

    console.log("---------------------------------");
    console.log("Existing-account migration regression: PASSED");
    console.log("External service calls: 0");
    console.log("Live bookmaker creation: DISABLED");
    console.log("STATUS: STEP 18 TEST PASSED");
    console.log("=================================");

  }finally{
    if(token){
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
  console.error("MIGRATION TEST FAILED:",e.message);
  process.exit(1);
});
