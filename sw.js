const CACHE = 'bravo-pwa-4.43';
const CORE_ASSETS = [
  '/bravo-app/',
  '/bravo-app/index.html',
  '/bravo-app/manifest.json',
  '/bravo-app/icon-192.png',
  '/bravo-app/icon-512.png'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET') return;
  const nav=event.request.mode==='navigate'||(event.request.headers.get('accept')||'').includes('text/html');
  if(nav){event.respondWith(fetch(event.request,{cache:'no-cache'}).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put('/bravo-app/index.html',c));return r}).catch(()=>caches.match('/bravo-app/index.html')));return}
  event.respondWith(caches.match(event.request).then(cached=>{const network=fetch(event.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(event.request,c));return r}).catch(()=>cached);return cached||network;}));
});
self.addEventListener('push', event => {
  let data={};try{data=event.data?event.data.json():{}}catch(e){data={body:event.data?.text()||''}}
  const title=data.title||'BRAVO';
  const options={body:data.body||'Você recebeu uma nova mensagem.',icon:'/bravo-app/icon-192.png',badge:'/bravo-app/icon-192.png',data:{url:'/bravo-app/'},vibrate:[200,100,200],tag:data.tag||'bravo-notificacao'};
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus' in c)return c.focus()}return clients.openWindow(event.notification.data?.url||'/bravo-app/')}));});
