const CACHE = 'bravo-pwa-4.41';
const BASE = '/bravo-app/';
const INDEX = BASE + 'index.html';
const CORE_ASSETS = [BASE, INDEX, BASE + 'manifest.json', BASE + 'icon-192.png', BASE + 'icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({type:'window', includeUncontrolled:true}))
      .then(clients => Promise.all(clients.map(client => client.navigate(client.url).catch(() => {}))))
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(event.request, {cache: 'no-store'})
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then(cache => cache.put(INDEX, copy)));
          }
          return response;
        })
        .catch(() => caches.match(INDEX))
    );
    return;
  }

  // index.html is always network-first; this also covers direct requests to it.
  if (url.pathname === INDEX) {
    event.respondWith(
      fetch(event.request, {cache: 'no-store'})
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then(cache => cache.put(INDEX, copy)));
          }
          return response;
        })
        .catch(() => caches.match(INDEX))
    );
    return;
  }

  // Other files keep the offline-first behavior.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
