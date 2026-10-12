const CACHE_NAME="pani-pal-v6";
const ASSETS=["./","./index.html","./style.css","./app.js","./manifest.json","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 if(new URL(e.request.url).pathname.startsWith("/api/"))return; // never cache API calls
 e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,copy))}return r}).catch(()=>caches.match("./index.html"))));
});

// ---- Push: show the reminder in the notification bar ----
self.addEventListener("push",e=>{
 let d={};try{d=e.data?e.data.json():{}}catch{}
 const title=d.title||"Time to drink water! 💧", body=d.body||"Take a few sips now. Your body will thank you.";
 e.waitUntil((async()=>{
  await self.registration.showNotification(title,{body,icon:"./icons/icon-192.png",badge:"./icons/icon-192.png",tag:"pani-pal-reminder",renotify:true});
  const cs=await clients.matchAll({type:"window",includeUncontrolled:true});
  cs.forEach(c=>c.postMessage({type:"reminder"}));
 })());
});
self.addEventListener("notificationclick",e=>{
 e.notification.close();
 e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{for(const c of cs){if("focus"in c)return c.focus()}return clients.openWindow("./")}));
});
