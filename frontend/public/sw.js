/* Minimal SW for PWA speed: cache-first for static, stale-while-revalidate for API */
const PRECACHE = 'precache-v1';
const RUNTIME = 'runtime-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![PRECACHE, RUNTIME].includes(k)).map((k) => caches.delete(k)))).then(self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;

  // Static assets: cache-first
  if (url.origin === self.location.origin && (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/icons/') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js'))) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const respClone = response.clone();
        caches.open(RUNTIME).then((cache) => cache.put(request, respClone));
        return response;
      }))
    );
    return;
  }

  // API and other GETs: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        const respClone = response.clone();
        caches.open(RUNTIME).then((cache) => cache.put(request, respClone));
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// Handle incoming Push messages
// push handlers removed (reverted)



