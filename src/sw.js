const CACHE_NAME = 'echoes-of-her-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Let network handle dynamic API queries; fallback gracefully
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

