/* Mój Grafik i Urlopy PWA — service worker v1.7.5 */
const CACHE = 'moj-grafik-pwa-v1.7.5';
const PREFIX = 'moj-grafik-pwa-';
const APP_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const OFFLINE_PAGE = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Do not cache unrelated paths or query-based endpoints on the same origin.
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if (response.ok) {
          // Cache write failure must not prevent online navigation.
          try {
            const cache = await caches.open(CACHE);
            await cache.put(OFFLINE_PAGE, response.clone());
          } catch (err) {
            console.warn('PWA: nie udało się zapisać strony offline', err);
          }
        }
        return response;
      } catch (err) {
        const cached = await caches.match(OFFLINE_PAGE);
        if (cached) return cached;
        return Response.error();
      }
    })());
    return;
  }

  // Refresh the manifest and icons on a successful service worker update;
  // other requests use cached resources where available.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    return fetch(req);
  })());
});
