const CACHE_NAME = 'app-cache-v5.1';
const urlsToCache = [
  '/',
  '/index.html',
  // CSS/JS bundled dans index.html
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    }).catch(err => console.log('Cache install failed:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Firestore, Firebase, external APIs: network first
  if (url.hostname.includes('firestore') || url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(request, response.clone()));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Local assets: cache first, fallback network
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
          }
          return res;
        }).catch(() => {
          // Offline fallback
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // POST, PUT, DELETE: network only
  event.respondWith(fetch(request));
});
