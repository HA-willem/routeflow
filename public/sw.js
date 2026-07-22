// PWA-medewerker service worker (20_PWA.md § 2/3). Handmatig, geen Workbox —
// MVP-scope is bewust smal: offline-tolerant (laatst bekende dagroute blijft
// zichtbaar, mutaties gaan via de IndexedDB-queue in lib/pwa/offline-queue.ts),
// géén volledige offline-first-synchronisatie-engine (20 § "Belangrijk
// onderscheid").
const CACHE_NAME = 'servops-m-v1';
const SCOPE_PREFIX = '/m';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

// Navigatie-verzoeken binnen /m: network-first met cache-fallback (20 § 2 —
// "API-data: network-first met cache-fallback"; onze "API" is hier de
// server-gerenderde /m-pagina zelf, RSC-first). Alleen GET/navigatie; POSTs
// (Server Actions) worden nooit hier onderschept — die lopen via de
// offline-queue zodra ze mislukken (lib/pwa/offline-queue.ts).
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }
  const url = new URL(request.url);
  if (!url.pathname.startsWith(SCOPE_PREFIX)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match(SCOPE_PREFIX))),
  );
});
