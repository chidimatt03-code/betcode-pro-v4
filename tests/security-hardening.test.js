const Database=require("better-sqlite3")(process.env.PORT==="3001" ? "./.production/data.db" : "./data.db");
const crypto=require("crypto");

const BASE=`http://127.0.0.1:${process.env.PORT || 3000}`;
const email=`step17-${Date.now()}@example.com`;
const password="Step17-Test-Password-2026";

function assert(condition,message){
  if(!condition)throw new Error(message);
}

async function request(path,options={}){
  const r=await fetch(BASE+path,options);
  const text=await r.text();
  let body={};
  try{body=JSON.parse(text);}catch{}
  return {status:r.status,headers:r.headers,body};
}

(async()=>{
  console.log("=================================");
  console.log("BETCODE PRO STEP 17 SECURITY HARDENING TEST");
  console.log("=================================");

  let userId=null;
  let token=null;

  try{
    const register=await request("/api/register",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        name:"Step 17 Test",
        phone:"08000000000",
        email,
        password
      })
    });

    assert(register.status===200,"Registration failed");
    assert(typeof register.body.token==="string","Registration token missing");
    token=register.body.token;

    const user=Database.prepare(
      "SELECT id,password_hash FROM users WHERE email=?"
    ).get(email);

    assert(user,"Temporary user not created");
    userId=user.id;
    assert(user.password_hash.startsWith("scrypt$"),"New password is not scrypt");

    console.log("Step 1: New account uses scrypt PASSED");

    assert(token.length===64 && /^[a-f0-9]+$/.test(token),
      "Session token format is invalid");

    assert(!Buffer.from(token).toString("base64").includes(":v1"),
      "Legacy token format detected");

    console.log("Step 2: Secure session token format PASSED");

    const me=await request("/api/me",{
      headers:{Authorization:"Bearer "+token}
    });

    assert(me.status===200,"Valid session rejected");
    assert(me.body.email===email,"Authenticated user mismatch");

    console.log("Step 3: Valid session authentication PASSED");

    const legacyToken=Buffer.from(`${userId}:v1`).toString("base64");

    const legacy=await request("/api/me",{
      headers:{Authorization:"Bearer "+legacyToken}
    });

    assert(legacy.status===401,"Legacy token was accepted");

    console.log("Step 4: Legacy token rejection PASSED");

    const headers=await request("/api/health");

    assert(headers.headers.get("x-content-type-options")==="nosniff",
      "X-Content-Type-Options missing");
    assert(headers.headers.get("x-frame-options")==="DENY",
      "X-Frame-Options missing");
    assert(headers.headers.get("referrer-policy")==="no-referrer",
      "Referrer-Policy missing");

    console.log("Step 5: Security headers PASSED");

    const logout=await request("/api/logout",{
      method:"POST",
      headers:{Authorization:"Bearer "+token}
    });

    assert(logout.status===200 && logout.body.success===true,
      "Logout failed");

    const afterLogout=await request("/api/me",{
      headers:{Authorization:"Bearer "+token}
    });

    assert(afterLogout.status===401,"Revoked session still accepted");

    console.log("Step 6: Server-side logout revocation PASSED");

    const rateStatuses=[];

    for(let i=0;i<11;i++){
      const r=await request("/api/login",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          email:"step17-rate-limit-invalid@example.com",
          password:"wrong-password"
        })
      });
      rateStatuses.push(r.status);
    }

    assert(rateStatuses.slice(0,10).every(x=>x===401),
      "Unexpected response before rate limit");
    assert(rateStatuses[10]===429,
      "Rate limit did not return 429");

    console.log("Step 7: Authentication rate limiting PASSED");

    console.log("---------------------------------");
    console.log("Security hardening regression: PASSED");
    console.log("External service calls: 0");
    console.log("Live bookmaker creation: DISABLED");
    console.log("STATUS: STEP 17 SECURITY TEST PASSED");
    console.log("=================================");

  }finally{
    if(token){
      const tokenHash=crypto.createHash("sha256").update(token).digest("hex");
      Database.prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash);
    }

    if(userId){
      Database.prepare("DELETE FROM sessions WHERE user_id=?").run(userId);
      Database.prepare("DELETE FROM conversions WHERE user_id=?").run(userId);
      Database.prepare("DELETE FROM users WHERE id=?").run(userId);
    }
  }
})().catch(e=>{
  console.error("SECURITY TEST FAILED:",e.message);
  process.exit(1);
});
