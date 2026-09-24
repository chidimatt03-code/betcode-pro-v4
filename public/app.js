function $(id){return document.getElementById(id)}
const names={2:"SportyBet",5:"BetKing",6:"BangBet",7:"Paripesa",8:"22Bet",9:"NairaBet",10:"MSport",11:"Football",4:"1xBet"};
const ids=[2,5,6,7,8,9,10,11,4];
for(const id of ids){$("from").insertAdjacentHTML("beforeend",`<option value="${id}">${names[id]}</option>`);$("to").insertAdjacentHTML("beforeend",`<option value="${id}">${names[id]}</option>`);}
$("to").value="2";

$("paste").onclick=async()=>{
 try{
  $("code").value=await navigator.clipboard.readText();
  updateDetection();
 }catch{
  $("status").textContent="Paste permission was not available. Paste the code manually.";
 }
};

$("code").addEventListener("input",updateDetection);
$("convert").onclick=async()=>{
 const code=$("code").value.trim(),from=$("from").value,to=$("to").value;
 $("result").classList.add("hidden");$("status").textContent="";
 if(!code)return $("status").textContent="Enter a booking code.";
 if(from===to)return $("status").textContent="Choose different bookmakers.";
 $("convert").disabled=true;$("convert").textContent="Matching selections…";
 try{
  const t=localStorage.getItem("betcode_token");
  if(!t) throw Error("Please log in again.");
  const r=await fetch("/api/convert",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+t},body:JSON.stringify({booking_code:code,from:bookmakerKey(from),to:bookmakerKey(to)})});
  const d=await r.json();if(!r.ok)throw Error(d.message||"Conversion failed.");
  if(!d.code)throw Error("The destination bookmaker did not return a converted code.");
  $("converted").textContent=d.code;
  $("events").textContent=d.number_of_events??"—";
  $("odds").textContent=d.total_odds??"—";
  if($("resultFrom")) $("resultFrom").textContent=$("from").selectedOptions[0].text;
  if($("resultTo")) $("resultTo").textContent=$("to").selectedOptions[0].text;
  $("badge").textContent="CONVERTED";$("badge").className="success";
  const flagged=d.flagged||[];
  $("warnings").innerHTML=(flagged.length?`<div class="warning"><b>Check before betting:</b><br>${flagged.map(esc).join("<br>")}</div>`:"");

  if($("matchTitle")&&$("matchDetail")){
    $("matchTitle").textContent=flagged.length?"Review matches":"Matches look good";
    $("matchDetail").textContent=flagged.length
      ? `${flagged.length} item${flagged.length===1?"":"s"} require review before betting.`
      : "No matching warnings were returned for this conversion.";
    $("matchStatus").className=flagged.length
      ?"matchStatus review"
      :"matchStatus good";
  }
  $("result").classList.remove("hidden");
 }catch(e){
  const msg=String(e.message||"Conversion failed.");
  $("status").textContent=msg.includes("Daily conversion limit")
    ?"Daily conversion limit reached. Please try again later."
    :msg;
 }finally{$("convert").disabled=false;$("convert").textContent="Convert code";}
};
$("copy").onclick=async()=>{
 try{
  await navigator.clipboard.writeText($("converted").textContent);
  $("copy").textContent="Copied ✓";
  if($("actionStatus")) $("actionStatus").textContent="Converted code copied to your clipboard.";
  setTimeout(()=>$("copy").textContent="Copy code",1400);
 }catch{
  if($("actionStatus")) $("actionStatus").textContent="Copy was not available. Please copy the code manually.";
 }
};
$("share").onclick=async()=>{
 const text=`${$("from").selectedOptions[0].text} → ${$("to").selectedOptions[0].text}\nCode: ${$("converted").textContent}`;
 try{
  if(navigator.share){
   await navigator.share({title:"BetCode Pro",text});
   if($("actionStatus")) $("actionStatus").textContent="Share sheet opened.";
  }else{
   await navigator.clipboard.writeText(text);
   $("share").textContent="Copied ✓";
   if($("actionStatus")) $("actionStatus").textContent="Share is not available here, so the conversion details were copied instead.";
   setTimeout(()=>$("share").textContent="Share",1400);
  }
 }catch{
  if($("actionStatus")) $("actionStatus").textContent="Share was cancelled or unavailable.";
 }
};
 

function detectBookmaker(code){
  const value=String(code||"").trim();
  if(!value) return null;

  // BetCode Pro native codes are identified explicitly.
  if(/^BCP1\./i.test(value)) return {id:null,name:"BetCode Pro",confidence:"high"};

  // Known public bookmaker code patterns.
  if(/^(SP|SB)[A-Z0-9._-]{5,}$/i.test(value)) return {id:"2",name:"SportyBet",confidence:"possible"};
  if(/^BK[A-Z0-9._-]{5,}$/i.test(value)) return {id:"5",name:"BetKing",confidence:"possible"};

  return null;
}

function updateDetection(){
  const code=$("code")?.value.trim()||"";
  const status=$("detectStatus");
  if(!status) return;

  const detected=detectBookmaker(code);

  if(!code){
    status.textContent="Paste a booking code and BetCode Pro will try to identify the source.";
    return;
  }

  if(detected?.id){
    $("from").value=detected.id;
    status.textContent=`Possible source detected: ${detected.name}. You can change it before converting.`;
    status.className="conversionHint detected";
  }else if(detected?.name==="BetCode Pro"){
    status.textContent="This is a BetCode Pro native code. Choose the appropriate source if you are converting it.";
    status.className="conversionHint detected";
  }else{
    status.textContent="Source not detected with confidence. Please select the bookmaker manually.";
    status.className="conversionHint";
  }
}

function bookmakerKey(id){return ({2:"sportybet",5:"betking",6:"bangbet",7:"paripesa",8:"22bet",9:"nairabet",10:"msport",11:"football",4:"1xbet"})[id]}function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
$("nativeCreate").onclick=async()=>{
  const sourceCode=$("nativeSourceCode").value.trim() || `BCP-${Date.now()}`;
  const home=$("nativeHome").value.trim();
  const away=$("nativeAway").value.trim();
  const competition=$("nativeCompetition").value.trim();
  const market=$("nativeMarket").value;
  const selection=$("nativeSelection").value;
  const lineValue=$("nativeLine").value.trim();

  $("nativeResult").classList.add("hidden");
  $("nativeStatus").textContent="";

  if(!home || !away){
    $("nativeStatus").textContent="Enter both home and away teams.";
    return;
  }

  if(market==="TOTAL_GOALS" && !lineValue){
    $("nativeStatus").textContent="Enter a line for Total Goals.";
    return;
  }

  $("nativeCreate").disabled=true;
  $("nativeCreate").textContent="Creating code…";

  try{
    const token=localStorage.getItem("betcode_token");
    if(!token) throw Error("Please log in again.");

    const line=lineValue==="" ? null : Number(lineValue);

    const slip={
      version:1,
      source:{
        bookmaker:"betcodepro",
        code:sourceCode
      },
      selections:[{
        index:1,
        sport:"football",
        event:{
          id:`BCP-${Date.now()}`,
          home,
          away,
          competition:competition || null,
          startTime:null
        },
        market:{
          type:market,
          name:market==="1X2" ? "Match Result" : "Total Goals",
          line
        },
        selection:{
          type:selection,
          name:selection,
          value:null
        }
      }]
    };

    const r=await fetch("/api/betcodepro/create",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer "+token
      },
      body:JSON.stringify({slip})
    });

    const d=await r.json().catch(()=>({}));

    if(!r.ok)
      throw Error(d.message || d.errors?.join(", ") || "BetCode Pro code creation failed.");

    if(!d.code || !d.code.startsWith("BCP1."))
      throw Error("Invalid BetCode Pro code returned.");

    $("nativeCode").textContent=d.code;
    $("nativeSelections").textContent=d.selections ?? 1;

    const me=await fetch("/api/me",{
      headers:{Authorization:"Bearer "+token}
    });
    const account=await me.json().catch(()=>({}));

    $("nativeCredits").textContent=account.credits ?? "—";
    $("nativeStatus").textContent="";
    $("nativeResult").classList.remove("hidden");

  }catch(e){
    $("nativeStatus").textContent=String(e.message || "BetCode Pro code creation failed.");
  }finally{
    $("nativeCreate").disabled=false;
    $("nativeCreate").textContent="Create BetCode Pro code";
  }
};

$("nativeCopy").onclick=async()=>{
  const code=$("nativeCode").textContent;
  if(!code || code==="—") return;

  await navigator.clipboard.writeText(code);
  $("nativeCopy").textContent="Copied ✓";
  setTimeout(()=>$("nativeCopy").textContent="Copy",1400);
};

$("nativeShare").onclick=async()=>{
  const code=$("nativeCode").textContent;
  if(!code || code==="—") return;

  if(navigator.share){
    await navigator.share({
      title:"BetCode Pro Code",
      text:code
    });
  }else{
    await navigator.clipboard.writeText(code);
    $("nativeShare").textContent="Copied ✓";
    setTimeout(()=>$("nativeShare").textContent="Share",1400);
  }
};

function saveHistory(item){
  const h=JSON.parse(localStorage.getItem("betcode_history")||"[]");
  h.unshift({...item,at:new Date().toISOString()});
  localStorage.setItem("betcode_history",JSON.stringify(h.slice(0,20)));
}
const originalConvert=$("convert").onclick;
$("convert").onclick=async()=>{
  const before=$("code").value.trim();
  await originalConvert();
  const out=$("converted").textContent;
  if(out && out!=="—") saveHistory({
    from:$("from").selectedOptions[0].text,
    to:$("to").selectedOptions[0].text,
    input:before,
    output:out
  });
};

function updateDashboard(account){
  const h = JSON.parse(localStorage.getItem("betcode_history") || "[]");

  const conversions = $("dashboardConversions");
  const plan = $("dashboardPlan");
  const credits = $("dashboardCredits");

  const currentPlan = account?.plan || "Free";
  const currentCredits = account?.credits ?? "—";

  if(conversions) conversions.textContent = h.length;
  if(plan) plan.textContent = currentPlan;
  if(credits) credits.textContent = currentCredits;

  if($("accountPlan")) $("accountPlan").textContent = currentPlan;
  if($("accountCredits")) $("accountCredits").textContent = currentCredits;
  if($("accountState")){
    $("accountState").textContent =
      `${currentPlan} · ${currentCredits} conversions remaining`;
  }

  if($("planDescription")){
    $("planDescription").textContent =
      String(currentPlan).toLowerCase()==="free"
        ? "Standard conversion access"
        : "Enhanced conversion access";
  }
}

function renderHistory(){
 const h=JSON.parse(localStorage.getItem("betcode_history")||"[]");
 const history=$("history");
 if(!history) return;

 if(!h.length){
  history.innerHTML=`<div class="historyEmpty">
    <b>No conversions yet.</b>
    <span>Your completed conversions will appear here.</span>
  </div>`;
  return;
 }

 history.innerHTML=h.slice(0,20).map((x,i)=>{
  const date=x.at?new Date(x.at).toLocaleString():"Recent conversion";
  return `<div class="historyItem">
    <div class="historyMain">
      <b>${esc(x.from)} → ${esc(x.to)}</b>
      <small>${esc(date)}</small>
      <span>${esc(x.output)}</span>
    </div>
    <button type="button" class="secondary historyCopy" data-history-index="${i}">Copy</button>
  </div>`;
 }).join("");

 history.querySelectorAll(".historyCopy").forEach(btn=>{
  btn.onclick=async()=>{
   const item=h[Number(btn.dataset.historyIndex)];
   if(!item?.output) return;
   try{
    await navigator.clipboard.writeText(item.output);
    btn.textContent="Copied ✓";
    setTimeout(()=>btn.textContent="Copy",1400);
   }catch{
    btn.textContent="Copy unavailable";
    setTimeout(()=>btn.textContent="Copy",1600);
   }
  };
 });
}

renderHistory();

$("clearHistory")?.addEventListener("click",()=>{
 const h=JSON.parse(localStorage.getItem("betcode_history")||"[]");
 if(!h.length) return;
 if(!confirm("Clear all conversion history from this device?")) return;
 localStorage.removeItem("betcode_history");
 renderHistory();
 updateDashboard({});
});

async function auth(action){
  const email = action === "register"
    ? $("registerEmail").value.trim()
    : $("loginEmail").value.trim();

  const password = action === "register"
    ? $("registerPassword").value
    : $("loginPassword").value;

  const status = action === "register"
    ? $("registerStatus")
    : $("loginStatus");

  const button = action === "register"
    ? $("registerBtn")
    : $("loginBtn");

  if(!email || !password){
    status.textContent = "Please enter your email and password.";
    status.className = "status error";
    return;
  }

  if(action === "register"){
    const name = $("registerName").value.trim();
    const phone = $("registerPhone").value.trim();
    const confirm = $("registerConfirm").value;

    if(!name || !phone){
      status.textContent = "Please enter your full name and phone number.";
      status.className = "status error";
      return;
    }

    if(password.length < 6){
      status.textContent = "Password must be at least 6 characters.";
      status.className = "status error";
      return;
    }

    if(password !== confirm){
      status.textContent = "Passwords do not match.";
      status.className = "status error";
      return;
    }
  }

  button.disabled = true;
  button.innerHTML = action === "register"
    ? '<span class="authSpinner"></span>Creating account...'
    : '<span class="authSpinner"></span>Signing in...';

  status.textContent = action === "register"
    ? "Creating your account..."
    : "Signing you in...";
  status.className = "status loading";

  try{
    const body = {email,password};

    if(action === "register"){
      body.name = $("registerName").value.trim();
      body.phone = $("registerPhone").value.trim();
    }

    const r = await fetch("/api/"+action,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });

    const d = await r.json();

    if(!r.ok){
      throw new Error(d.message || "Authentication failed.");
    }

    if(action === "register" && d.verificationRequired){
      window.pendingVerificationEmail = email;

      $("registerScreen").classList.add("hidden");
      $("verificationScreen").classList.remove("hidden");
      $("verificationEmail").textContent = d.email || email;
      $("verificationCode").value = "";
      $("verificationStatus").textContent =
        "A 6-digit verification code has been sent to your email.";
      $("verificationStatus").className = "status success";

      startVerificationCountdown(d.expiresIn || 600);
      $("verificationCode").focus();
      return;
    }

    localStorage.setItem("betcode_token",d.token);

    status.textContent = action === "register"
      ? "✓ Account created successfully!"
      : "✓ Login successful!";
    status.className = "status success";

    $("accountName").textContent = d.name || email.split("@")[0];
    $("accountEmail").textContent = d.email || email;
    $("accountPhone").textContent = d.phone || "Not provided";
    $("accountState").textContent =
      `${d.plan || "free"} · ${d.credits ?? 10} conversions remaining`;
    updateDashboard(d);
    if(typeof initB7Analyst==="function"){
      await initB7Analyst();
    }
    if(typeof initB8Radar==="function"){
      await initB8Radar();
    }

    setTimeout(()=>{
      $("loginScreen").classList.add("hidden");
      $("registerScreen").classList.add("hidden");
      $("verificationScreen").classList.add("hidden");
      $("mainApp").classList.remove("hidden");
    },150);

  }catch(e){
    status.textContent = "✕ " + e.message;
    status.className = "status error";
  }finally{
    button.disabled = false;
    button.innerHTML = action === "register"
      ? "Create account"
      : "Log in";
  }
}

let verificationTimer = null;
window.pendingVerificationEmail = "";

function startVerificationCountdown(seconds){
  clearInterval(verificationTimer);

  let remaining = Number(seconds) || 600;

  const update = ()=>{
    const minutes = Math.floor(remaining / 60);
    const secs = remaining % 60;

    $("verificationCountdown").textContent =
      `Code expires in ${minutes}:${String(secs).padStart(2,"0")}`;

    if(remaining <= 0){
      clearInterval(verificationTimer);
      $("verificationCountdown").textContent =
        "Verification code expired. Please request a new code.";
    }

    remaining--;
  };

  update();
  verificationTimer = setInterval(update,1000);
}

async function verifyRegistration(){
  const email = window.pendingVerificationEmail;
  const code = $("verificationCode").value.trim();
  const status = $("verificationStatus");
  const button = $("verifyBtn");

  if(!email){
    status.textContent =
      "Verification session expired. Please start registration again.";
    status.className = "status error";
    return;
  }

  if(!/^\d{6}$/.test(code)){
    status.textContent = "Please enter the 6-digit verification code.";
    status.className = "status error";
    return;
  }

  button.disabled = true;
  button.textContent = "Verifying...";
  status.textContent = "Verifying your code...";
  status.className = "status loading";

  try{
    const r = await fetch("/api/register/verify",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email,code})
    });

    const d = await r.json();

    if(!r.ok){
      throw new Error(d.message || "Verification failed.");
    }

    localStorage.setItem("betcode_token",d.token);
    clearInterval(verificationTimer);

    $("accountName").textContent = d.name || email.split("@")[0];
    $("accountEmail").textContent = d.email || email;
    $("accountPhone").textContent = d.phone || "Not provided";
    $("accountState").textContent =
      `${d.plan || "free"} · ${d.credits ?? 10} conversions remaining`;
    updateDashboard(d);
    if(typeof initB7Analyst==="function"){
      await initB7Analyst();
    }
    if(typeof initB8Radar==="function"){
      await initB8Radar();
    }

    status.textContent =
      "✓ Email verified. Your account has been created.";
    status.className = "status success";

    setTimeout(()=>{
      $("verificationScreen").classList.add("hidden");
      $("mainApp").classList.remove("hidden");
      window.pendingVerificationEmail = "";
    },150);

  }catch(e){
    status.textContent = "✕ " + e.message;
    status.className = "status error";
  }finally{
    button.disabled = false;
    button.textContent = "Verify & Create Account";
  }
}

async function resendVerification(){
  const email = window.pendingVerificationEmail;
  const status = $("verificationStatus");
  const button = $("resendVerificationBtn");

  if(!email){
    status.textContent =
      "Verification session expired. Please start registration again.";
    status.className = "status error";
    return;
  }

  button.disabled = true;
  status.textContent = "Sending a new verification code...";
  status.className = "status loading";

  try{
    const r = await fetch("/api/register/resend",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email})
    });

    const d = await r.json();

    if(!r.ok){
      throw new Error(d.message || "Unable to resend verification code.");
    }

    $("verificationEmail").textContent = d.email || email;
    status.textContent = "✓ A new verification code has been sent.";
    status.className = "status success";
    startVerificationCountdown(d.expiresIn || 600);

  }catch(e){
    status.textContent = "✕ " + e.message;
    status.className = "status error";
  }finally{
    button.disabled = false;
  }
}

$("verifyBtn").onclick=verifyRegistration;
$("resendVerificationBtn").onclick=resendVerification;

$("verificationBackBtn").onclick=()=>{
  clearInterval(verificationTimer);
  window.pendingVerificationEmail = "";
  $("verificationScreen").classList.add("hidden");
  $("registerScreen").classList.remove("hidden");
  $("verificationStatus").textContent = "";
  $("verificationCode").value = "";
};

$("showRegister").onclick=()=>{
  $("loginScreen").classList.add("hidden");
  $("registerScreen").classList.remove("hidden");
  $("loginStatus").textContent="";
};

$("showLogin").onclick=()=>{
  $("registerScreen").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
  $("registerStatus").textContent="";
};

$("registerBtn").onclick=()=>auth("register");
$("loginBtn").onclick=()=>auth("login");

$("logout").onclick=async()=>{
  const token=localStorage.getItem("betcode_token");

  try{
    if(token){
      await fetch("/api/logout",{
        method:"POST",
        headers:{Authorization:"Bearer "+token}
      });
    }
  }catch(e){
    // Local logout still proceeds if the server is unreachable.
  }

  localStorage.removeItem("betcode_token");
  $("mainApp").classList.add("hidden");
  $("registerScreen").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
};

(async()=>{
  const t=localStorage.getItem("betcode_token");

  if(!t){
    showPublicHome();
    return;
  }

  try{
    const r=await fetch("/api/me",{
      headers:{Authorization:"Bearer "+t}
    });

    if(r.ok){
      const d=await r.json();

      $("accountName").textContent = d.name || "User";
      $("accountEmail").textContent = d.email || "Email not available";
      $("accountPhone").textContent = d.phone || "Not provided";

      $("accountState").textContent =
        `${d.plan || "free"} · ${d.credits ?? 0} conversions remaining`;
      updateDashboard(d);
      if(typeof initB7Analyst==="function"){
        await initB7Analyst();
      }
      if(typeof initB8Radar==="function"){
        await initB8Radar();
      }

      $("loginScreen").classList.add("hidden");
      $("registerScreen").classList.add("hidden");
      $("mainApp").classList.remove("hidden");
    }else{
      localStorage.removeItem("betcode_token");
    }
  }catch(e){
    console.log("Session check failed:",e);
  }
})();


/* =========================================================
   PHASE 1 — PUBLIC HOMEPAGE NAVIGATION
   ========================================================= */

function showPublicHome(){
  $("publicHome").classList.remove("hidden");
  $("loginScreen").classList.add("hidden");
  $("registerScreen").classList.add("hidden");
  $("verificationScreen").classList.add("hidden");
  $("mainApp").classList.add("hidden");
}

function showLoginScreen(){
  $("publicHome").classList.add("hidden");
  $("registerScreen").classList.add("hidden");
  $("verificationScreen").classList.add("hidden");
  $("mainApp").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
}

function showRegisterScreen(){
  $("publicHome").classList.add("hidden");
  $("loginScreen").classList.add("hidden");
  $("verificationScreen").classList.add("hidden");
  $("mainApp").classList.add("hidden");
  $("registerScreen").classList.remove("hidden");
}

$("homeLoginBtn").onclick=showLoginScreen;
$("heroLogin").onclick=showLoginScreen;

$("homeRegisterBtn").onclick=showRegisterScreen;
$("heroGetStarted").onclick=showRegisterScreen;
$("bottomGetStarted").onclick=showRegisterScreen;

document.querySelectorAll(".togglePassword").forEach(btn=>{
  btn.onclick=()=>{
    const input=document.getElementById(btn.dataset.target);
    const isVisible=input.type==="password";
    input.type=isVisible?"text":"password";
    btn.classList.toggle("is-visible",isVisible);
    btn.setAttribute("aria-label",isVisible?"Hide password":"Show password");
    btn.setAttribute("aria-pressed",String(isVisible));
  };
});

const resetParams=new URLSearchParams(window.location.search);
const resetToken=resetParams.get("reset_token") || resetParams.get("token");

if(resetToken){
  $("publicHome")?.classList.add("hidden");
  $("loginScreen")?.classList.add("hidden");
  $("registerScreen")?.classList.add("hidden");
  $("resetPasswordScreen")?.classList.remove("hidden");
}

$("resetPasswordBtn")?.addEventListener("click",async()=>{
  const password=$("resetPassword").value;
  const confirm=$("resetPasswordConfirm").value;
  const status=$("resetPasswordStatus");
  const button=$("resetPasswordBtn");

  if(!resetToken){
    status.textContent="✕ This reset link is missing or invalid.";
    status.className="status error";
    return;
  }

  if(!password || !confirm){
    status.textContent="Please enter and confirm your new password.";
    status.className="status error";
    return;
  }

  if(password.length<6){
    status.textContent="Password must be at least 6 characters.";
    status.className="status error";
    return;
  }

  if(password!==confirm){
    status.textContent="Passwords do not match.";
    status.className="status error";
    return;
  }

  button.disabled=true;
  button.textContent="Resetting...";
  status.textContent="Resetting your password...";
  status.className="status loading";

  try{
    const r=await fetch("/api/reset-password",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token:resetToken,password})
    });

    const d=await r.json();

    if(!r.ok)throw new Error(d.message||"Unable to reset password.");

    status.textContent="✓ "+d.message;
    status.className="status success";

    $("resetPassword").value="";
    $("resetPasswordConfirm").value="";

    setTimeout(()=>{
      $("resetPasswordScreen").classList.add("hidden");
      $("loginScreen").classList.remove("hidden");
      $("loginStatus").textContent="";
      history.replaceState({},document.title,window.location.pathname);
    },1200);

  }catch(e){
    status.textContent="✕ "+e.message;
    status.className="status error";
  }finally{
    button.disabled=false;
    button.textContent="Reset password";
  }
});

$("backToLoginFromReset")?.addEventListener("click",()=>{
  $("resetPasswordScreen").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
});

function showForgotPasswordScreen(){
  $("publicHome").classList.add("hidden");
  $("loginScreen").classList.add("hidden");
  $("registerScreen").classList.add("hidden");
  $("verificationScreen").classList.add("hidden");
  $("resetPasswordScreen").classList.add("hidden");
  $("mainApp").classList.add("hidden");
  $("forgotPasswordScreen").classList.remove("hidden");
  $("forgotEmail").focus();
}

$("forgotPasswordBtn").onclick=showForgotPasswordScreen;

$("backToLoginFromForgot").onclick=()=>{
  $("forgotPasswordScreen").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
  $("forgotPasswordStatus").textContent="";
  $("forgotEmail").value="";
};

$("sendForgotPasswordBtn").onclick=async()=>{
  const email=$("forgotEmail").value.trim();
  const status=$("forgotPasswordStatus");
  const button=$("sendForgotPasswordBtn");

  if(!email){
    status.textContent="Please enter your email address.";
    status.className="status error";
    return;
  }

  button.disabled=true;
  button.textContent="Sending...";
  status.textContent="Sending password reset request...";
  status.className="status loading";

  try{
    const r=await fetch("/api/forgot-password",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email})
    });

    const d=await r.json();

    if(!r.ok)throw new Error(d.message||"Unable to process request.");

    status.textContent="✓ "+d.message;
    status.className="status success";
  }catch(e){
    status.textContent="✕ "+e.message;
    status.className="status error";
  }finally{
    button.disabled=false;
    button.textContent="Send reset link";
  }
};

const _fetch=window.fetch;

window.fetch=(...args)=>{
  if(args[1]?.body?.includes?.('"booking_code"')){
    args[1].headers={
      ...(args[1].headers||{}),
      ...(localStorage.getItem("betcode_token")
        ? {Authorization:"Bearer "+localStorage.getItem("betcode_token")}
        : {})
    };
  }

  return _fetch(...args);
};

/* P9 — Account plan panel */
$("upgradePlan")?.addEventListener("click",()=>{
  const panel=$("plansPanel");
  if(!panel) return;

  const opening=panel.classList.contains("hidden");
  panel.classList.toggle("hidden",!opening);
  $("upgradePlan").textContent=opening?"Hide plans":"View plans";
});

$("multiToggle")?.addEventListener("click",()=>{
  const panel=$("multiPanel");
  if(!panel) return;

  const opening=panel.classList.contains("hidden");
  panel.classList.toggle("hidden",!opening);
  $("multiToggle").textContent=opening?"Hide":"Enable";
});

$("multiConvert")?.addEventListener("click",async()=>{
  const raw=$("multiCodes")?.value||"";
  const codes=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const from=$("from")?.value;
  const to=$("to")?.value;
  const status=$("multiStatus");
  const results=$("multiResults");

  if(status) status.textContent="";
  if(results) results.innerHTML="";

  if(!codes.length){
    if(status) status.textContent="Enter at least one booking code.";
    return;
  }

  if(from===to){
    if(status) status.textContent="Choose different bookmakers.";
    return;
  }

  const t=localStorage.getItem("betcode_token");
  if(!t){
    if(status) status.textContent="Please log in again.";
    return;
  }

  const button=$("multiConvert");
  if(button){
    button.disabled=true;
    button.textContent="Converting…";
  }

  let success=0;
  let failed=0;

  try{
    for(let i=0;i<codes.length;i++){
      const code=codes[i];

      if(status) status.textContent=`Converting ${i+1} of ${codes.length}…`;

      const item=document.createElement("div");
      item.className="multiResult";
      item.innerHTML=`<b>Code ${i+1}</b><span>${esc(code)}</span><small>Processing…</small>`;
      results?.appendChild(item);

      try{
        const r=await fetch("/api/convert",{
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization":"Bearer "+t
          },
          body:JSON.stringify({
            booking_code:code,
            from:bookmakerKey(from),
            to:bookmakerKey(to)
          })
        });

        const d=await r.json();

        if(!r.ok) throw Error(d.message||"Conversion failed.");
        if(!d.code) throw Error("No converted code returned.");

        success++;

        item.innerHTML=`
          <b>Code ${i+1} · Converted ✓</b>
          <span>${esc(code)}</span>
          <strong>${esc(d.code)}</strong>
          <small>${d.number_of_events??"—"} events · ${d.total_odds??"—"} total odds</small>
        `;

        saveHistory({
          from:$("from").selectedOptions[0].text,
          to:$("to").selectedOptions[0].text,
          input:code,
          output:d.code
        });
      }catch(e){
        failed++;
        item.innerHTML=`
          <b>Code ${i+1} · Failed</b>
          <span>${esc(code)}</span>
          <small>${esc(e.message||"Conversion failed.")}</small>
        `;
      }
    }

    if(status){
      status.textContent=`Completed: ${success} converted, ${failed} failed.`;
    }

    renderHistory();
    updateDashboard({});
  }finally{
    if(button){
      button.disabled=false;
      button.textContent="Convert all";
    }
  }
});

function showRecovery(title,detail){
  const panel=$("recoveryPanel");
  if(!panel) return;

  if($("recoveryTitle")) $("recoveryTitle").textContent=title;
  if($("recoveryDetail")) $("recoveryDetail").textContent=detail;

  panel.classList.remove("hidden");
}

function hideRecovery(){
  $("recoveryPanel")?.classList.add("hidden");
}

$("retryConvert")?.addEventListener("click",()=>{
  hideRecovery();
  $("convert")?.click();
});

$("clearCode")?.addEventListener("click",()=>{
  if($("code")) $("code").value="";
  updateDetection();
  hideRecovery();
  if($("status")) $("status").textContent="";
  $("code")?.focus();
});

const originalSingleConvert=$("convert").onclick;

$("convert").onclick=async()=>{
  hideRecovery();
  await originalSingleConvert();

  const statusText=$("status")?.textContent||"";

  if(statusText){
    showRecovery(
      "Conversion could not be completed",
      statusText
    );
  }
};

/* ===== B7 EVIDENCE-BASED MATCH ANALYST ===== */

async function initB7Analyst(){
  const matchSelect=$("analystMatch");
  const runButton=$("analystRun");
  const status=$("analystStatus");
  const result=$("analystResult");

  if(!matchSelect||!runButton||!status||!result) return;

  const token=localStorage.getItem("betcode_token");
  if(!token) return;

  function showStatus(message){
    status.textContent=message;
    status.classList.remove("hidden");
  }

  function hideStatus(){
    status.textContent="";
    status.classList.add("hidden");
  }

  function escapeHTML(value){
    return String(value??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function formatInsight(insight){
    const evidence=Array.isArray(insight?.evidence)
      ? insight.evidence
      : [];

    const evidenceText=evidence.map(item=>{
      const statement=escapeHTML(item?.statement||"");
      const sample=item?.sampleSize!=null
        ? ` · sample ${escapeHTML(item.sampleSize)}`
        : "";
      return `<div class="analystEvidenceLine">${statement}${sample}</div>`;
    }).join("");

    return `
      <article class="analystInsight">
        <div class="analystInsightTitle">
          ${escapeHTML(insight?.title||"Evidence")}
        </div>
        <p><strong>Observation:</strong> ${escapeHTML(insight?.observation||"—")}</p>
        <p><strong>Interpretation:</strong> ${escapeHTML(insight?.interpretation||"—")}</p>
        ${insight?.limitation
          ? `<p><strong>Limitation:</strong> ${escapeHTML(insight.limitation)}</p>`
          : ""}
        ${evidenceText}
      </article>
    `;
  }

  function renderAnalysis(data){
    const analyst=data?.analyst||{};
    const insights=Array.isArray(analyst.insights)
      ? analyst.insights
      : [];
    const warnings=Array.isArray(analyst.warnings)
      ? analyst.warnings
      : [];
    const matrix=analyst.evidenceMatrix||{};

    $("analystHeadline").textContent=analyst.headline||"No strong conclusion available.";
    $("analystConfidence").textContent=analyst.confidence||"insufficient";
    $("analystEvidenceCount").textContent=Array.isArray(analyst.evidence)
      ? analyst.evidence.length
      : 0;
    $("analystLayerCount").textContent=
      `${matrix.availableLayers??0}/${matrix.totalLayers??0}`;
    $("analystWarningCount").textContent=warnings.length;

    $("analystInsightsList").innerHTML=insights.length
      ? insights.map(formatInsight).join("")
      : `<div class="analystWarning">There is not enough verified evidence to produce a detailed insight.</div>`;

    if(warnings.length){
      $("analystWarningsList").innerHTML=warnings
        .map(w=>`<div class="analystWarning">${escapeHTML(w)}</div>`)
        .join("");
      $("analystWarnings").classList.remove("hidden");
    }else{
      $("analystWarningsList").innerHTML="";
      $("analystWarnings").classList.add("hidden");
    }

    result.classList.remove("hidden");
  }

  async function loadMatches(){
    try{
      const response=await fetch("/api/analyst/matches",{
        headers:{
          "Authorization":"Bearer "+token
        }
      });

      const data=await response.json();

      if(!response.ok||!data.success)
        throw new Error(data.message||"Unable to load verified matches.");

      const matches=Array.isArray(data.matches)?data.matches:[];

      for(const match of matches){
        const option=document.createElement("option");
        option.value=String(match.id);

        const date=match.scheduledStart
          ? new Date(match.scheduledStart)
          : null;

        const dateText=date&&!Number.isNaN(date.getTime())
          ? date.toLocaleDateString(undefined,{day:"numeric",month:"short"})
          : "";

        option.textContent=
          `${match.homeTeam} vs ${match.awayTeam}`+
          `${match.competition?" · "+match.competition:""}`+
          `${dateText?" · "+dateText:""}`;

        option.dataset.homeTeamId=String(match.homeTeamId);
        option.dataset.awayTeamId=String(match.awayTeamId);

        matchSelect.appendChild(option);
      }

      if(!matches.length){
        showStatus("No verified matches are currently available for analysis.");
        runButton.disabled=true;
      }else{
        hideStatus();
      }
    }catch(error){
      showStatus(error.message||"Unable to load verified matches.");
      runButton.disabled=true;
    }
  }

  runButton.addEventListener("click",async()=>{
    const option=matchSelect.selectedOptions[0];

    if(!option||!option.value){
      showStatus("Choose a verified match first.");
      return;
    }

    const homeTeamId=Number(option.dataset.homeTeamId);
    const awayTeamId=Number(option.dataset.awayTeamId);

    if(!Number.isInteger(homeTeamId)||!Number.isInteger(awayTeamId)){
      showStatus("This match does not have valid team identities.");
      return;
    }

    runButton.disabled=true;
    runButton.textContent="Analysing…";
    hideStatus();

    try{
      const response=await fetch("/api/analyst/match",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":"Bearer "+token
        },
        body:JSON.stringify({
          homeTeamId,
          awayTeamId
        })
      });

      const data=await response.json();

      if(!response.ok||!data.success)
        throw new Error(data.message||"Unable to produce the verified analysis.");

      renderAnalysis(data);
      result.scrollIntoView({behavior:"smooth",block:"nearest"});
    }catch(error){
      showStatus(error.message||"Unable to produce the verified analysis.");
      result.classList.add("hidden");
    }finally{
      runButton.disabled=false;
      runButton.textContent="Analyse match";
    }
  });

  await loadMatches();
}

/* =========================
   B8 — MATCH RADAR
   ========================= */

(function initB8Radar(){
  const workspace=$("radarWorkspace");
  if(!workspace) return;

  const matchCount=$("radarMatchCount");
  const signalCount=$("radarSignalCount");
  const updatedAt=$("radarUpdatedAt");
  const status=$("radarStatus");
  const empty=$("radarEmpty");
  const results=$("radarResults");

  function radarStatus(message){
    if(!status) return;
    status.textContent=message;
    status.classList.remove("hidden");
  }

  function clearRadarStatus(){
    if(!status) return;
    status.textContent="";
    status.classList.add("hidden");
  }

  function formatRadarTime(value){
    if(!value) return "—";
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString(undefined,{
      hour:"2-digit",
      minute:"2-digit"
    });
  }

  function signalLabel(signal){
    const labels={
      formSeparation:"Form separation",
      scoringSeparation:"Scoring profile",
      dataCoverage:"Data coverage",
      h2hContext:"H2H context",
      freshness:"Freshness"
    };
    return labels[signal] || signal;
  }

  function renderRadar(data){
    const items=Array.isArray(data?.items)?data.items:[];
    const count=Number(data?.count)||0;

    matchCount.textContent=String(count);

    const usableSignals=items.reduce((total,item)=>{
      return total+(Number(item?.radar?.usableSignals)||0);
    },0);

    signalCount.textContent=String(usableSignals);
    updatedAt.textContent=formatRadarTime(data?.generatedAt);

    results.innerHTML="";

    if(!items.length){
      results.classList.add("hidden");
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
    results.classList.remove("hidden");

    results.innerHTML=items.map(item=>{
      const match=item?.match||{};
      const radar=item?.radar||{};
      const signals=radar?.signals&&typeof radar.signals==="object"
        ? radar.signals
        : {};

      const usable=Object.entries(signals)
        .filter(([,signal])=>signal&&signal.level&&signal.level!=="none")
        .map(([key,signal])=>{
          const level=String(signal.level);
          const levelClass=
            level==="strong"
              ? "radarSignal radarSignalStrong"
              : level==="moderate"
                ? "radarSignal radarSignalModerate"
                : "radarSignal";

          return `<span class="${levelClass}">
            ${escapeHTML(signalLabel(key))} · ${escapeHTML(level)}
          </span>`;
        })
        .join("");

      const evidence=item?.evidence||{};

      return `
        <article class="radarCard">
          <div class="radarCardHead">
            <div>
              <div class="radarMatchName">
                ${escapeHTML(match.homeTeamName||"Home team")}
                vs
                ${escapeHTML(match.awayTeamName||"Away team")}
              </div>
              <div class="radarCompetition">
                ${escapeHTML(match.competitionName||"Competition unavailable")}
              </div>
            </div>
            <span class="radarAttention">
              Attention ${Number(radar.attentionScore)||0}
            </span>
          </div>

          <div class="radarSignals">
            ${usable || '<span class="radarSignal">Limited verified signal</span>'}
          </div>

          <div class="radarEvidence">
            <div class="radarEvidenceItem">
              <strong>${Number(evidence.homeResults)||0}</strong>
              <small>Home-team results</small>
            </div>
            <div class="radarEvidenceItem">
              <strong>${Number(evidence.awayResults)||0}</strong>
              <small>Away-team results</small>
            </div>
            <div class="radarEvidenceItem">
              <strong>${Number(evidence.sourceCount)||0}</strong>
              <small>Verified sources</small>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  async function loadRadar(){
    const token=localStorage.getItem("betcode_token");

    if(!token){
      radarStatus("Sign in to access Match Radar.");
      return;
    }

    try{
      clearRadarStatus();

      const response=await fetch("/api/radar",{
        headers:{
          "Authorization":"Bearer "+token
        }
      });

      const data=await response.json();

      if(!response.ok||!data.success){
        throw new Error(data.message||"Unable to load Match Radar.");
      }

      renderRadar(data);
    }catch(error){
      radarStatus(error.message||"Unable to load Match Radar.");
      results.classList.add("hidden");
    }
  }

  window.initB8Radar=loadRadar;
  loadRadar();
})();
