const $ = id => document.getElementById(id);
const form = $("settingsForm"), startInput = $("startTime"), endInput = $("endTime");
const intervalSelect = $("interval"), customWrap = $("customWrap"), customInput = $("customInterval");
const toggleBtn = $("toggleBtn"), dialog = $("waterDialog"), installDialog = $("installDialog");
let running = false, installPrompt = null, toastTimeout = null, tickTimeout = null;
let settings = {start:"08:00",end:"22:00",interval:60};

function showToast(message){$("toast").textContent=message;$("toast").classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$("toast").classList.remove("show"),3200)}
function hint(text){$("permissionHint").textContent=text}
function minutesOf(time){const [h,m]=time.split(":").map(Number);return h*60+m}
function formatTime(date){return date.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}
function saveRunning(){try{localStorage.setItem("paniPalRunning",running?"1":"0")}catch{}}
const isIOS=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent||"")||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const isStandalone=()=>window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;

// ---- Display only: when is the next reminder? (the server sends the real push) ----
function getNextDate(){
 const s=minutesOf(settings.start),e=minutesOf(settings.end),step=settings.interval,len=e<s?1440-s+e:e-s,now=Date.now();
 for(let d=-1;d<=2;d++){
  const base=new Date();base.setHours(0,0,0,0);base.setDate(base.getDate()+d);
  for(let t=step;t<=len;t+=step){const at=new Date(base);at.setHours(0,s+t,0,0);if(at.getTime()>now+1000)return at}
 }
 return null;
}
function updateStatus(){
 $("statusTitle").textContent=running?"Hydration mode is on":"Ready when you are";$("statusIcon").textContent=running?"💧":"🔔";
 $("statusText").textContent=running?`Reminders are active from ${settings.start} to ${settings.end}, every ${settings.interval} minutes.`:"Set your hours, choose an interval, and start your hydration routine.";
 toggleBtn.textContent=running?"Ⅱ Pause reminders":"▶ Start reminders";
 const d=running?getNextDate():null;$("nextTime").textContent=d?formatTime(d):"Not scheduled";
 clearTimeout(tickTimeout);if(running)tickTimeout=setTimeout(updateStatus,30000);
}

// ---- Push notifications ----
function urlB64ToUint8Array(b64){const pad="=".repeat((4-b64.length%4)%4);const raw=atob((b64+pad).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function api(path,body){
 const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 if(!r.ok){let m="";try{m=(await r.json()).error}catch{}throw new Error(m||("Server error "+r.status))}
 return r.json();
}
async function getPushSubscription(){
 if(!("serviceWorker"in navigator)||!("PushManager"in window)||!("Notification"in window)){
  hint(isIOS()&&!isStandalone()?"iPhone: tap Share → Add to Home Screen, then open Pani Pal from your Home Screen and press Start again.":"This browser does not support push notifications.");
  return null;
 }
 const perm=Notification.permission==="granted"?"granted":await Notification.requestPermission();
 if(perm!=="granted"){hint("Notifications are blocked. Allow them in your phone/browser settings for this app, then try again.");return null}
 const reg=await navigator.serviceWorker.ready;
 let sub=await reg.pushManager.getSubscription();
 if(!sub){
  const r=await fetch("/api/vapid-key");if(!r.ok)throw new Error("Server is not set up yet (VAPID key missing)");
  const {key}=await r.json();
  sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64ToUint8Array(key)});
 }
 return sub;
}
const tz=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";
async function syncServer(sub){await api("/api/subscribe",{subscription:sub.toJSON(),settings,tz:tz()})}

async function startReminders(){
 try{
  const sub=await getPushSubscription();if(!sub)return;
  await syncServer(sub);
  running=true;saveRunning();updateStatus();hint("Reminders will arrive in your notification bar, even when the app is closed.");showToast("Hydration reminders started.");
 }catch(e){console.error(e);showToast("Could not start: "+e.message)}
}
async function stopReminders(){
 try{
  const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();
  if(sub){await api("/api/unsubscribe",{endpoint:sub.endpoint}).catch(()=>{});await sub.unsubscribe().catch(()=>{})}
 }catch(e){console.error(e)}
 running=false;saveRunning();updateStatus();showToast("Reminders paused.");
}
async function sendTest(){
 try{
  const sub=await getPushSubscription();if(!sub)return;
  await api("/api/test-push",{subscription:sub.toJSON()});
  showToast("Test sent. Lock your phone and wait a few seconds.");
 }catch(e){console.error(e);showToast("Test failed: "+e.message)}
}

// reminder arrived while the app is open -> show the popup too
if("serviceWorker"in navigator)navigator.serviceWorker.addEventListener("message",e=>{if(e.data&&e.data.type==="reminder"&&!dialog.open&&document.visibilityState==="visible")dialog.showModal()});

intervalSelect.addEventListener("change",()=>customWrap.hidden=intervalSelect.value!=="custom");
function getInterval(){return intervalSelect.value==="custom"?Number(customInput.value):Number(intervalSelect.value)}
form.addEventListener("submit",async e=>{
 e.preventDefault();const interval=getInterval();
 if(!Number.isFinite(interval)||interval<5||interval>720){showToast("Choose an interval from 5 to 720 minutes.");return}
 settings={start:startInput.value,end:endInput.value,interval};
 try{localStorage.setItem("paniPalSettings",JSON.stringify(settings))}catch{}
 updateStatus();
 if(running){try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub)await syncServer(sub)}catch(err){showToast("Saved on phone, but server sync failed.");return}}
 showToast("Schedule saved!");
});
toggleBtn.addEventListener("click",()=>running?stopReminders():startReminders());
$("testBtn").addEventListener("click",sendTest);
$("dismissDialog").addEventListener("click",()=>dialog.close());dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});

// ---- Install help (web only; hidden inside the native app) ----
function deviceInstructions(){
 const ua=navigator.userAgent||"", platform=navigator.platform||"";
 const isIOS=/iPhone|iPad|iPod/i.test(ua)||(platform==="MacIntel"&&navigator.maxTouchPoints>1);
 const isAndroid=/Android/i.test(ua);
 const isStandalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
 if(isStandalone)return {title:"Pani Pal is installed",intro:"You are already using the installed app.",steps:["Open Pani Pal from your Home Screen whenever you need it."],action:"Done"};
 if(installPrompt)return {title:"Install Pani Pal",intro:"Tap the button below to install the app on this device.",steps:["Your browser has made the install option available."],action:"Install now",native:true};
 if(isIOS)return {title:"Install on iPhone or iPad",intro:"Use Safari to add Pani Pal to your Home Screen.",steps:["Open this website in Safari (not an in-app browser).","Tap the Share button (the square with an upward arrow).","Scroll down and tap “Add to Home Screen”.","Tap “Add”. Pani Pal will appear on your Home Screen."],action:"Got it"};
 if(isAndroid)return {title:"Install on Android",intro:"Use Chrome for the easiest install.",steps:["Open this website in Chrome.","Tap “Install app” if it appears, or open the ⋮ menu.","Choose “Install app” or “Add to Home screen”.","Confirm. Pani Pal will appear on your Home Screen."],action:"Got it"};
 return {title:"Install on your device",intro:"Installation depends on your browser.",steps:["On iPhone/iPad, open this website in Safari, tap Share, then “Add to Home Screen”.","On Android, open in Chrome and choose “Install app” or “Add to Home screen” from the menu.","On desktop, look for the install icon in your browser’s address bar or menu."],action:"Got it"};
}
async function openInstallHelp(){
 const info=deviceInstructions();$("installHelpTitle").textContent=info.title;$("installHelpIntro").textContent=info.intro;
 const ol=document.createElement("ol");info.steps.forEach(s=>{const li=document.createElement("li");li.textContent=s;ol.appendChild(li)});
 $("installInstructions").replaceChildren(ol);$("installHelpAction").textContent=info.action;
 if(!installDialog.open)installDialog.showModal();
}
async function installApp(){
 if(installPrompt){
  installPrompt.prompt();const result=await installPrompt.userChoice;installPrompt=null;
  if(result?.outcome==="accepted"){showToast("Pani Pal is being installed.");if(installDialog.open)installDialog.close()}
  else openInstallHelp();
 }else openInstallHelp();
}
$("installBtn").addEventListener("click",installApp);$("heroInstallBtn").addEventListener("click",installApp);$("openInstallHelp").addEventListener("click",openInstallHelp);
$("closeInstallHelp").addEventListener("click",()=>installDialog.close());$("installHelpAction").addEventListener("click",async()=>{if(installPrompt)await installApp();else installDialog.close()});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("installBtn").textContent="＋ Install App";$("heroInstallBtn").textContent="📲 Install Pani Pal"});
window.addEventListener("appinstalled",()=>{installPrompt=null;showToast("Pani Pal installed!")});

function loadSettings(){try{const saved=JSON.parse(localStorage.getItem("paniPalSettings"));if(saved?.start&&saved?.end&&saved?.interval){settings=saved;startInput.value=saved.start;endInput.value=saved.end;const presets=["30","45","60","90","120","180"];if(presets.includes(String(saved.interval)))intervalSelect.value=String(saved.interval);else{intervalSelect.value="custom";customWrap.hidden=false;customInput.value=saved.interval}}}catch{}}

if("serviceWorker"in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
loadSettings();
// restore "on" state only if the push subscription still exists
(async()=>{
 try{
  if(localStorage.getItem("paniPalRunning")==="1"&&"serviceWorker"in navigator){
   const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();
   if(sub){running=true;await syncServer(sub).catch(()=>{})}else{running=false;saveRunning()}
  }
 }catch{}
 updateStatus();
})();
updateStatus();
