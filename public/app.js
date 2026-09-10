function $(id){return document.getElementById(id)}
const names={2:"SportyBet",5:"BetKing",6:"BangBet",7:"Paripesa",8:"22Bet",9:"NairaBet",10:"MSport",11:"Football",4:"1xBet"};
const ids=[2,5,6,7,8,9,10,11,4];
for(const id of ids){$("from").insertAdjacentHTML("beforeend",`<option value="${id}">${names[id]}</option>`);$("to").insertAdjacentHTML("beforeend",`<option value="${id}">${names[id]}</option>`);}
$("to").value="2";

$("paste").onclick=async()=>{try{$("code").value=await navigator.clipboard.readText()}catch{ $("status").textContent="Paste permission was not available. Paste the code manually."}};
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
  $("converted").textContent=d.code;$("events").textContent=d.number_of_events??"—";$("odds").textContent=d.total_odds??"—";
  $("badge").textContent="CONVERTED";$("badge").className="success";
  $("warnings").innerHTML=(d.flagged?.length?`<div class="warning"><b>Check before betting:</b><br>${d.flagged.map(esc).join("<br>")}</div>`:"");
  $("result").classList.remove("hidden");
 }catch(e){
  const msg=String(e.message||"Conversion failed.");
  $("status").textContent=msg.includes("Daily conversion limit")
    ?"Daily conversion limit reached. Please try again later."
    :msg;
 }finally{$("convert").disabled=false;$("convert").textContent="Convert code";}
};
$("copy").onclick=async()=>{await navigator.clipboard.writeText($("converted").textContent);$("copy").textContent="Copied ✓";setTimeout(()=>$("copy").textContent="Copy",1400)};
$("share").onclick=async()=>{const text=`${$("from").selectedOptions[0].text} → ${$("to").selectedOptions[0].text}\nCode: ${$("converted").textContent}`;if(navigator.share)await navigator.share({title:"BetCode Pro",text});else{await navigator.clipboard.writeText(text);$("share").textContent="Copied ✓";setTimeout(()=>$("share").textContent="Share",1400)}};
 
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

function renderHistory(){
 const h=JSON.parse(localStorage.getItem("betcode_history")||"[]");
 $("history").innerHTML=h.length?h.slice(0,8).map(x=>`<div class="historyItem"><b>${esc(x.from)} → ${esc(x.to)}</b><br><span>${esc(x.output)}</span></div>`).join(""):"No conversions yet.";
}
renderHistory();

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

    setTimeout(()=>{
      $("loginScreen").classList.add("hidden");
      $("registerScreen").classList.add("hidden");
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
    $("loginScreen").classList.remove("hidden");
    $("registerScreen").classList.add("hidden");
    $("mainApp").classList.add("hidden");
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

document.querySelectorAll(".togglePassword").forEach(btn=>{
  btn.onclick=()=>{
    const input=document.getElementById(btn.dataset.target);
    input.type=input.type==="password"?"text":"password";
    btn.textContent=input.type==="password"?"👁️":"🙈";
  };
});

$("forgotPasswordBtn").onclick=async()=>{
  const email=prompt("Enter the email address on your BetCode Pro account:");

  if(!email)return;

  const status=$("loginStatus");
  status.textContent="Sending password reset request...";
  status.className="status loading";

  try{
    const r=await fetch("/api/forgot-password",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:email.trim()})
    });

    const d=await r.json();

    if(!r.ok)throw new Error(d.message||"Unable to process request.");

    status.textContent="✓ "+d.message;
    status.className="status success";
  }catch(e){
    status.textContent="✕ "+e.message;
    status.className="status error";
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
