const CACHE = 'bravo-pwa-v4-41';
const BASE = new URL('./', self.registration.scope);
const INDEX = new URL('./index.html', BASE).href;
const CORE_ASSETS = [
  BASE.href,
  INDEX,
  new URL('./manifest.json', BASE).href,
  new URL('./icon-192.png', BASE).href,
  new URL('./icon-512.png', BASE).href
];

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
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const isNavigation =
    event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    // Always ask the server for the newest HTML. The cache is only a
    // fallback when the device is offline or the request fails.
    event.respondWith(
      fetch(event.request, {cache: 'no-store'})
        .then(response => {
          if (!response || !response.ok) throw new Error('HTML request failed');
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then(cache => cache.put(INDEX, copy))
          );
          return response;
        })
        .catch(() => caches.match(INDEX))
    );
    return;
  }

  // Other assets: use the cache immediately and refresh it in the
  // background when the network is available.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE).then(cache => cache.put(event.request, copy))
            );
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
