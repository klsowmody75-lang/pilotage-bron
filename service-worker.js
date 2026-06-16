// Version du cache — à incrémenter à chaque déploiement majeur
const CACHE_NAME = 'app-cache-v5.9';
const urlsToCache = ['/'];

// Installation : mise en cache minimale
self.addEventListener('install', event => {
  self.skipWaiting(); // Active immédiatement sans attendre
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
      .catch(err => console.log('Cache install failed:', err))
  );
});

// Activation : supprime tous les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim()) // Prend le contrôle immédiatement
  );
});

// Fetch : network first pour index.html, cache first pour le reste
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Firebase/Firestore/APIs externes : réseau uniquement
  if (
    url.hostname.includes('firestore') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // index.html : TOUJOURS réseau en premier pour avoir la dernière version
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request)) // Fallback cache si hors-ligne
    );
    return;
  }

  // Autres assets GET : cache first
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
          }
          return response;
        }).catch(() => new Response('Offline', { status: 503 }));
      })
    );
    return;
  }

  // POST/PUT/DELETE : réseau uniquement
  event.respondWith(fetch(request));
});
