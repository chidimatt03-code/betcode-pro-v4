require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3")("./data.db");
function hashPassword(password){
  const salt=crypto.randomBytes(16).toString("hex");
  const hash=crypto.scryptSync(String(password),salt,64,{
    N:16384,
    r:8,
    p:1
  }).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password,stored){
  const value=String(stored||"");

  if(value.startsWith("scrypt$")){
    const parts=value.split("$");
    if(parts.length!==3)return false;

    const salt=parts[1];
    const expected=parts[2];
    const actual=crypto.scryptSync(String(password),salt,64,{
      N:16384,
      r:8,
      p:1
    }).toString("hex");

    if(expected.length!==actual.length)return false;

    return crypto.timingSafeEqual(
      Buffer.from(expected,"hex"),
      Buffer.from(actual,"hex")
    );
  }

  if(/^[a-f0-9]{64}$/i.test(value)){
    const actual=crypto.createHash("sha256")
      .update(String(password))
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(value,"hex"),
      Buffer.from(actual,"hex")
    );
  }

  return false;
}

Database.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT "free",
  credits INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  original_code TEXT,
  converted_code TEXT,
  from_bookie TEXT,
  to_bookie TEXT,
  created_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);


const app = express();

app.use((req,res,next)=>{
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Referrer-Policy","no-referrer");
  next();
});

const authRateLimits = new Map();

function authRateLimit(req,res,next){
  const key=`${req.ip}:${req.path}`;
  const now=Date.now();
  const windowMs=15*60*1000;
  const maxAttempts=10;

  let entry=authRateLimits.get(key);

  if(!entry || now-entry.startedAt>=windowMs){
    entry={startedAt:now,count:0};
    authRateLimits.set(key,entry);
  }

  entry.count++;

  if(entry.count>maxAttempts){
    return res.status(429).json({
      message:"Too many authentication attempts. Please try again later."
    });
  }

  next();
}

app.use(express.json({limit:"20kb"}));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "BetCode Pro" });
});

const { internalCodecStatus } = require("./engine/internalCodecs");

app.get("/api/connectors/status", (req, res) => {
  const user = authUser(req) || apiKeyUser(req);

  if (!user) {
    return res.status(401).json({
      ok: false,
      error: "Authentication required."
    });
  }

  res.json({
    ok: true,
    connectors: {
      sportybet: {
        ...internalCodecStatus("sportybet")
      },
      bet9ja: {
        ...internalCodecStatus("bet9ja")
      },
      betking: {
        ...internalCodecStatus("betking")
      }
    }
  });
});

app.use(express.static(path.join(__dirname,"public")));

const BOOKMAKERS = {
  sportybet: {id: 2, name: "SportyBet"},
  bet9ja: {id: 3, name: "Bet9ja"},
  betking: {id: 5, name: "BetKing"},
  bangbet: {id: 6, name: "BangBet"},
  paripesa: {id: 7, name: "Paripesa"},
  "22bet": {id: 8, name: "22Bet"},
  nairabet: {id: 9, name: "NairaBet"},
  msport: {id: 10, name: "MSport"},
  football: {id: 11, name: "Football"},
  "1xbet": {id: 4, name: "1xBet"}
};

function cleanCode(v){ return String(v||"").trim().replace(/\s+/g,"").toUpperCase(); }

function createSession(userId){
  const token=crypto.randomBytes(32).toString("hex");
  const tokenHash=crypto.createHash("sha256").update(token).digest("hex");

  Database.prepare(`
    INSERT INTO sessions(token_hash,user_id,created_at)
    VALUES(?,?,?)
  `).run(tokenHash,userId,new Date().toISOString());

  return token;
}

function authUser(req){
  const header=req.headers.authorization||"";
  const token=header.startsWith("Bearer ")?header.slice(7).trim():"";
  if(!token)return null;

  try{
    const tokenHash=crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const session=Database.prepare(`
      SELECT token_hash,user_id,created_at
      FROM sessions
      WHERE token_hash=?
    `).get(tokenHash);

    if(!session)return null;

    const sessionAge=Date.now()-new Date(session.created_at).getTime();
    const maxSessionAge=30*24*60*60*1000;

    if(!Number.isFinite(sessionAge) || sessionAge>maxSessionAge){
      Database.prepare("DELETE FROM sessions WHERE token_hash=?")
        .run(tokenHash);
      return null;
    }

    return Database.prepare("SELECT * FROM users WHERE id=?")
      .get(session.user_id) || null;
  }catch(e){
    return null;
  }
}

app.post("/api/register", authRateLimit,(req,res)=>{
 try{
  const name=String(req.body.name||"").trim();
  const phone=String(req.body.phone||"").trim();
  const email=String(req.body.email||"").trim().toLowerCase();
  const password=String(req.body.password||"");

  if(name.length<2)
   return res.status(400).json({message:"Please enter your full name."});

  if(phone.length<7)
   return res.status(400).json({message:"Please enter a valid phone number."});

  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
   return res.status(400).json({message:"Please enter a valid email address."});

  if(password.length<6)
   return res.status(400).json({message:"Password must be at least 6 characters."});

  const info=Database.prepare(
   "INSERT INTO users(name,phone,email,password_hash,created_at) VALUES(?,?,?,?,?)"
  ).run(name,phone,email,hashPassword(password),new Date().toISOString());

  const token=createSession(Number(info.lastInsertRowid));

  res.json({token,plan:"free",credits:Database.prepare("SELECT credits FROM users WHERE id=?").get(Number(info.lastInsertRowid)).credits,name,email});
 }catch(e){
  res.status(409).json({message:"Account already exists or could not be created."});
 }
});

function apiKeyUser(req){
  const key = String(req.headers["x-api-key"] || "").trim();

  if(!key || !key.startsWith("bc_live_")) return null;

  const keyHash = crypto
    .createHash("sha256")
    .update(key)
    .digest("hex");

  const apiKey = Database.prepare(`
    SELECT * FROM api_keys
    WHERE key_hash=? AND revoked=0
  `).get(keyHash);

  if(!apiKey) return null;

  const user = Database.prepare(
    "SELECT * FROM users WHERE id=?"
  ).get(apiKey.user_id);

  if(!user) return null;

  Database.prepare(
    "UPDATE api_keys SET last_used_at=? WHERE id=?"
  ).run(new Date().toISOString(), apiKey.id);

  return user;
}

app.post("/api/login", authRateLimit,(req,res)=>{
 const email=String(req.body.email||"").trim().toLowerCase();
 const password=String(req.body.password||"");

 const u=Database.prepare("SELECT * FROM users WHERE email=?").get(email);

 if(!u || !verifyPassword(password,u.password_hash))
   return res.status(401).json({message:"Invalid email or password."});

 if(/^[a-f0-9]{64}$/i.test(String(u.password_hash||""))){
   Database.prepare("UPDATE users SET password_hash=? WHERE id=?")
     .run(hashPassword(password),u.id);
 }

 const token=createSession(u.id);
 res.json({token,plan:u.plan,credits:u.credits});
});
app.post("/api/logout",(req,res)=>{
  const header=req.headers.authorization||"";
  const token=header.startsWith("Bearer ")?header.slice(7).trim():"";

  if(token){
    const tokenHash=crypto.createHash("sha256").update(token).digest("hex");
    Database.prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash);
  }

  res.json({success:true});
});

app.get("/api/me",(req,res)=>{
 const u=authUser(req) || apiKeyUser(req);
 if(!u)return res.status(401).json({message:"Not signed in."});
 res.json({id:u.id,name:u.name,phone:u.phone,email:u.email,plan:u.plan,credits:u.credits});
});
app.post("/api/api-keys", (req,res)=>{
  try{
    const user=authUser(req) || apiKeyUser(req);

    if(!user)
      return res.status(401).json({
        message:"Please log in to manage API keys."
      });

    const name=String(req.body?.name||"Default").trim().slice(0,80);

    const key="bc_live_"+crypto.randomBytes(32).toString("hex");

    const keyHash=crypto
      .createHash("sha256")
      .update(key)
      .digest("hex");

    const createdAt=new Date().toISOString();

    const result=Database.prepare(`
      INSERT INTO api_keys
      (user_id,key_hash,name,created_at,revoked)
      VALUES(?,?,?,?,0)
    `).run(
      user.id,
      keyHash,
      name || "Default",
      createdAt
    );

    res.json({
      success:true,
      id:result.lastInsertRowid,
      name:name || "Default",
      api_key:key,
      created_at:createdAt,
      warning:"Save this API key now. It cannot be recovered later."
    });

  }catch(e){
    console.error(e);
    res.status(500).json({
      message:"Unable to generate API key."
    });
  }
});

app.get("/api/bookmakers",(req,res)=>res.json(Object.entries(BOOKMAKERS).map(([key,v])=>({key,...v}))));

app.post("/api/forgot-password", authRateLimit,(req,res)=>{
  try{
    const email=String(req.body.email||"").trim().toLowerCase();

    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return res.status(400).json({message:"Please enter a valid email address."});

    const user=Database.prepare("SELECT id FROM users WHERE email=?").get(email);

    // Always return the same message for security.
    if(user){
      const token=crypto.randomBytes(32).toString("hex");
      const expires=new Date(Date.now()+15*60*1000).toISOString();

      Database.prepare(
        "UPDATE users SET reset_token=?, reset_expires=? WHERE id=?"
      ).run(token,expires,user.id);

      console.log("PASSWORD RESET TOKEN:",token);
    }

    res.json({
      message:"If an account exists with that email, a password reset link has been generated."
    });
  }catch(e){
    console.error(e);
    res.status(500).json({message:"Unable to process your request."});
  }
});

app.post("/api/betcodepro/create",async(req,res)=>{
  try{
    const user=authUser(req) || apiKeyUser(req);

    if(!user)
      return res.status(401).json({
        message:"Please log in to create a BetCode Pro code."
      });

    const slip=req.body?.slip;

    const { validateBetSlip } = require("./engine/converter");
    const errors=validateBetSlip(slip);

    if(errors.length)
      return res.status(422).json({
        success:false,
        status:"validation_failed",
        errors
      });

    if(user.credits<=0 && user.plan==="free")
      return res.status(402).json({
        success:false,
        message:"Free conversions used up. Upgrade your plan to continue."
      });

    const { getInternalCodec } = require("./engine/internalCodecs");
    const codec=getInternalCodec("betcodepro");

    const destination={
      success:true,
      stage:"DESTINATION_BUILDER",
      destinationBookmaker:"betcodepro",
      selections:slip.selections
    };

    const code=await codec.create(destination);

    if(!code || !String(code).startsWith("BCP1."))
      throw new Error("BetCode Pro code creation failed.");

    if(user.plan==="free"){
      const finalizeCreation=Database.transaction(()=>{
        const creditUpdate=Database.prepare(`
          UPDATE users
          SET credits=credits-1
          WHERE id=? AND plan='free' AND credits>0
        `).run(user.id);

        if(creditUpdate.changes!==1)
          throw new Error("Unable to reserve conversion credit.");

        Database.prepare(`
          INSERT INTO conversions
          (user_id,original_code,converted_code,from_bookie,to_bookie,created_at)
          VALUES(?,?,?,?,?,?)
        `).run(
          user.id,
          slip.source.code,
          code,
          "betcodepro",
          "betcodepro",
          new Date().toISOString()
        );
      });

      finalizeCreation();
    }

    return res.status(200).json({
      success:true,
      status:"created",
      code,
      selections:slip.selections.length
    });

  }catch(e){
    console.error(e);
    res.status(502).json({
      success:false,
      message:e.message||"BetCode Pro code creation failed."
    });
  }
});

app.post("/api/convert",async(req,res)=>{
  try{
    const user=authUser(req) || apiKeyUser(req);

    if(!user)
      return res.status(401).json({
        message:"Please log in to convert a booking code."
      });

    const {booking_code,from,to}=req.body||{};

    if(!BOOKMAKERS[from]||!BOOKMAKERS[to])
      return res.status(400).json({
        message:"Unsupported bookmaker."
      });

    if(from===to)
      return res.status(400).json({
        message:"Source and destination must be different."
      });

    const code=cleanCode(booking_code);

    if(code.length<3||code.length>80)
      return res.status(400).json({
        message:"Enter a valid booking code."
      });

    if(user.credits<=0 && user.plan==="free")
      return res.status(402).json({
        message:"Free conversions used up. Upgrade your plan to continue."
      });

    const {
      isLiveRoute
    } = require("./engine/routes");

    if(!isLiveRoute(from,to)){
      return res.status(503).json({
        success:false,
        status:"development",
        message:
          `The ${BOOKMAKERS[from].name} → ${BOOKMAKERS[to].name} ` +
          "conversion connector is not live yet."
      });
    }

    const {
      decodeSourceBookingCode
    } = require("./engine/decoder");

    const decoded=await decodeSourceBookingCode(from,code);

    if(!decoded.success){
      return res.status(502).json({
        success:false,
        status:"decoder_unavailable",
        message:decoded.error||"Unable to decode the booking code."
      });
    }

    const {
      normalizeDecodedSlip
    } = require("./engine/slipNormalizer");

    const normalized=normalizeDecodedSlip({
      sourceBookmaker: from,
      sourceCode: code,
      decodedSlip: decoded.slip
    });

    if(!normalized.success){
      return res.status(422).json({
        success:false,
        status:normalized.stage,
        errors:normalized.errors
      });
    }

    const {
      convertBetSlip
    } = require("./engine/pipeline");

    const converted=convertBetSlip({
      sourceBookmaker: from,
      destinationBookmaker: to,
      sourceCode: code,
      normalizedSlip: normalized.slip
    });

    if(!converted.success){
      return res.status(422).json({
        success:false,
        status:converted.stage,
        errors:converted.errors,
        selection:converted.selection,
        match:converted.match
      });
    }

    const {
      buildDestinationSlip
    } = require("./engine/destinationBuilder");

    const destination=buildDestinationSlip({
      destinationBookmaker: to,
      converted
    });

    if(!destination.success){
      return res.status(422).json({
        success:false,
        status:destination.stage,
        errors:destination.errors
      });
    }

    const {
      getInternalDestinationAdapter
    } = require("./engine/internalDestinationAdapters");

    const destinationAdapter =
      getInternalDestinationAdapter(to);

    let destinationCode;

    try {
      destinationCode =
        await destinationAdapter.createBookingCode(destination);
    } catch (error) {
      return res.status(502).json({
        success:false,
        status:"destination_creation_unavailable",
        message:error.message ||
          "Destination booking-code creation is not available yet."
      });
    }

    if (!destinationCode) {
      return res.status(502).json({
        success:false,
        status:"destination_creation_unavailable",
        message:"Destination bookmaker returned no booking code."
      });
    }

    // Consume one credit and record history only after the
    // destination payload and destination adapter have succeeded.
    if(user.plan==="free"){
      const finalizeConversion=Database.transaction(()=>{
        const creditUpdate=Database.prepare(`
          UPDATE users
          SET credits=credits-1
          WHERE id=? AND plan='free' AND credits>0
        `).run(user.id);

        if(creditUpdate.changes!==1)
          throw new Error("Unable to reserve conversion credit.");

        Database.prepare(`
          INSERT INTO conversions
          (user_id,original_code,converted_code,from_bookie,to_bookie,created_at)
          VALUES(?,?,?,?,?,?)
        `).run(
          user.id,
          code,
          destinationCode.code,
          from,
          to,
          new Date().toISOString()
        );
      });

      finalizeConversion();
    }

    return res.status(200).json({
      success:true,
      status:"created",
      message:
        "The bet slip was decoded, normalized, internally converted, and created for the destination bookmaker.",
      code: destinationCode.code,
      destination
    });

  }catch(e){
    console.error(e);
    res.status(502).json({
      message:e.message||"Conversion failed."
    });
  }
});

app.post("/api/reset-password", authRateLimit,(req,res)=>{
  try{
    const token=String(req.body.token||"").trim();
    const password=String(req.body.password||"");

    if(!token || password.length<6)
      return res.status(400).json({message:"Invalid reset request."});

    const user=Database.prepare(
      "SELECT id FROM users WHERE reset_token=? AND reset_expires>?"
    ).get(token,new Date().toISOString());

    if(!user)
      return res.status(400).json({message:"This reset link is invalid or has expired."});

    Database.prepare(
      "UPDATE users SET password_hash=?, reset_token=NULL, reset_expires=NULL WHERE id=?"
    ).run(hashPassword(password),user.id);

    res.json({message:"Password reset successfully. You can now log in."});
  }catch(e){
    console.error(e);
    res.status(500).json({message:"Unable to reset password."});
  }
});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(process.env.PORT||3000,()=>console.log("BetCode Pro running"));
