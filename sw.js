const PREFIX = 'html-to-rich-';
const CACHE = PREFIX + 'v5-shared-profile';
const APP = ['/', '/index.html', '/app.css', '/app.js', '/converter-core.mjs', '/manifest.webmanifest', '/icon.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP.map(path => new Request(path, {cache: 'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      url.search || !APP.includes(url.pathname)) return;
  event.respondWith((async () => {
    let response;
    try {
      response = await fetch(request);
    } catch (error) {
      const saved = await caches.match(request, {cacheName: CACHE});
      if (saved) return saved;
      throw error;
    }
    if (response.ok) {
      try {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      } catch {
        // The online response remains usable if local storage is unavailable.
      }
    }
    return response;
  })());
});
