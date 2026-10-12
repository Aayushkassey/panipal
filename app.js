const $ = id => document.getElementById(id);
const form = $("settingsForm"), startInput = $("startTime"), endInput = $("endTime");
const intervalSelect = $("interval"), customWrap = $("customWrap"), customInput = $("customInterval");
const toggleBtn = $("toggleBtn"), dialog = $("waterDialog"), installDialog = $("installDialog");
let running = false, nextTimeout = null, installPrompt = null, toastTimeout = null;
let settings = {start:"08:00",end:"22:00",interval:60};
function showToast(message){$("toast").textContent=message;$("toast").classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$("toast").classList.remove("show"),3200)}
function minutesOf(time){const [h,m]=time.split(":").map(Number);return h*60+m}
function formatTime(date){return date.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}
function getNextDate(){
 const now=new Date(), startMin=minutesOf(settings.start), endMin=minutesOf(settings.end), nowMin=now.getHours()*60+now.getMinutes();
 let start=new Date(now), end=new Date(now);start.setHours(Math.floor(startMin/60),startMin%60,0,0);end.setHours(Math.floor(endMin/60),endMin%60,0,0);
 if(endMin<startMin){if(nowMin<=endMin)start.setDate(start.getDate()-1);else end.setDate(end.getDate()+1)}
 else if(nowMin>endMin){start.setDate(start.getDate()+1);end.setDate(end.getDate()+1)}
 let candidate=new Date(Math.max(Date.now(),start.getTime())+settings.interval*60000);
 if(candidate>end){let nextStart=new Date(start);nextStart.setDate(nextStart.getDate()+1);nextStart.setHours(Math.floor(startMin/60),startMin%60,0,0);candidate=new Date(nextStart.getTime()+settings.interval*60000)}
 return candidate;
}
function withinSchedule(date=new Date()){const n=date.getHours()*60+date.getMinutes(),s=minutesOf(settings.start),e=minutesOf(settings.end);return s<=e?n>=s&&n<=e:n>=s||n<=e}
function updateStatus(){
 $("statusTitle").textContent=running?"Hydration mode is on":"Ready when you are";$("statusIcon").textContent=running?"💧":"🔔";
 $("statusText").textContent=running?`Reminders are active from ${settings.start} to ${settings.end}, every ${settings.interval} minutes.`:"Set your hours, choose an interval, and start your hydration routine.";
 toggleBtn.textContent=running?"Ⅱ Pause reminders":"▶ Start reminders";$("nextTime").textContent=running?formatTime(getNextDate()):"Not scheduled";
}
async function requestPermission(){
 if(!("Notification"in window)){ $("permissionHint").textContent="This browser does not support browser notifications. In-page popup works while the app is open.";return false}
 if(Notification.permission==="granted")return true;
 if(Notification.permission==="denied"){ $("permissionHint").textContent="Notifications are blocked in browser settings. In-page popups still work while this page is open.";return false}
 try{const p=await Notification.requestPermission();const ok=p==="granted";$("permissionHint").textContent=ok?"Notifications enabled. Keep the app open for reliable reminders.":"Notifications were not enabled; in-page popup works while open.";return ok}catch{return false}
}
function notify(){
 if(!running)return;
 if(withinSchedule()){
  if(!dialog.open)dialog.showModal();
  if("Notification"in window&&Notification.permission==="granted"){
   try{const n=new Notification("Time to drink water! 💧",{body:"Take a few sips now. Your body will thank you.",icon:"./icons/icon-192.png",tag:"pani-pal-reminder"});n.onclick=()=>{window.focus();n.close()}}catch{}
  }
 }
 scheduleNext();
}
function scheduleNext(){clearTimeout(nextTimeout);if(!running)return;const next=getNextDate();$("nextTime").textContent=formatTime(next);nextTimeout=setTimeout(notify,Math.max(1000,next.getTime()-Date.now()))}
function stop(){running=false;clearTimeout(nextTimeout);updateStatus()}
function getInterval(){return intervalSelect.value==="custom"?Number(customInput.value):Number(intervalSelect.value)}
intervalSelect.addEventListener("change",()=>customWrap.hidden=intervalSelect.value!=="custom");
form.addEventListener("submit",e=>{e.preventDefault();const interval=getInterval();if(!Number.isFinite(interval)||interval<5||interval>720){showToast("Choose an interval from 5 to 720 minutes.");return}settings={start:startInput.value,end:endInput.value,interval};try{localStorage.setItem("paniPalSettings",JSON.stringify(settings))}catch{}if(running)scheduleNext();updateStatus();showToast("Schedule saved!")});
toggleBtn.addEventListener("click",async()=>{if(running){stop();showToast("Reminders paused.")}else{await requestPermission();running=true;scheduleNext();updateStatus();showToast("Hydration reminders started.")}});
$("testBtn").addEventListener("click",()=>{if(!dialog.open)dialog.showModal();if("Notification"in window&&Notification.permission==="granted"){try{new Notification("Pani Pal test 💧",{body:"Your water reminder popup is working!"})}catch{}}});
$("dismissDialog").addEventListener("click",()=>dialog.close());dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
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
loadSettings();updateStatus();
